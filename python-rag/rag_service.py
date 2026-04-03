"""
RAG Microservice for Gyaan Setu — Talk to PDF
FastAPI + ChromaDB + SentenceTransformers + Groq

Endpoints:
POST /ingest        — chunk, embed, store in ChromaDB
DELETE /ingest/{doc_id} — clear chunks (before re-ingesting)
POST /query         — retrieve + Groq answer
GET  /status/{doc_id}   — check if doc is indexed
GET  /health        — health check
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import httpx
import os
import re
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Gyaan Setu RAG Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock down to your Next.js domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ChromaDB — persistent local storage ──────────────────────────────────────
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# ── Embedding model — local, no API key, 80MB ────────────────────────────────
# all-MiniLM-L6-v2: fast, good quality for educational text
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# ── Config from .env ─────────────────────────────────────────────────────────
GROQ_API_KEY         = os.getenv("GROQ_API_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
CHAT_MODEL           = os.getenv("CHAT_MODEL", "llama-3.3-70b-versatile")
TOP_K                = int(os.getenv("TOP_K", "5"))
SENTENCES_PER_CHUNK  = int(os.getenv("SENTENCES_PER_CHUNK", "8"))
OVERLAP_SENTENCES    = int(os.getenv("OVERLAP_SENTENCES", "2"))

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_collection(doc_id: str):
    """Get or create a ChromaDB collection per document."""
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", doc_id)
    return chroma_client.get_or_create_collection(
        name=f"doc_{safe_id}",
        metadata={"hnsw:space": "cosine"}
    )

def sentences_to_chunks(sentences: list[str]) -> list[str]:
    """
    Combine sentences into overlapping chunks.
    SENTENCES_PER_CHUNK sentences per chunk, OVERLAP_SENTENCES overlap.
    Mirrors the logic in rag-ingest/route.ts exactly.
    """
    chunks = []
    step   = SENTENCES_PER_CHUNK - OVERLAP_SENTENCES  # slide window by 6

    for i in range(0, len(sentences), step):
        slice_ = sentences[i : i + SENTENCES_PER_CHUNK]
        if len(slice_) < 2:
            break
        chunks.append(" ".join(slice_))

    return chunks

async def fetch_parsed_sentences(parsed_url: str) -> list[str]:
    """
    Fetch the parsed JSON from Supabase Storage and return sentences list.
    Expects structure: { meta: {...}, sentences: [{ id, text }] }
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(parsed_url, timeout=30)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=404,
                detail=f"Parsed JSON not found at: {parsed_url}"
            )

    data = resp.json()

    if isinstance(data, dict) and "sentences" in data:
        sentences = [s["text"] for s in data["sentences"] if s.get("text", "").strip()]
    else:
        raise HTTPException(
            status_code=422,
            detail="Unexpected JSON structure. Expected { sentences: [{ id, text }] }"
        )

    return sentences

# ── Request / Response models ─────────────────────────────────────────────────

class IngestRequest(BaseModel):
    doc_id     : str  # UUID from docs table
    parsed_url : str  # full public URL to parsed JSON in Supabase Storage

class IngestResponse(BaseModel):
    success      : bool
    doc_id       : str
    chunks_stored: int
    sentences    : int

class QueryRequest(BaseModel):
    doc_id  : str
    question: str
    top_k   : int = TOP_K

class QueryResponse(BaseModel):
    answer    : str
    sources   : list[str]
    confidence: str  # "high" / "medium" / "low"

# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/ingest", response_model=IngestResponse)
async def ingest_document(req: IngestRequest):
    """
    Called after teacher uploads + parse-pdf completes.
    Reads parsed JSON → sentences → chunks → embeds → stores in ChromaDB.
    """

    # 1. Fetch sentences from Supabase Storage
    sentences = await fetch_parsed_sentences(req.parsed_url)

    if len(sentences) < 2:
        raise HTTPException(status_code=422, detail="Not enough sentences to build chunks")

    # 2. Build overlapping chunks from sentences
    chunks = sentences_to_chunks(sentences)

    if not chunks:
        raise HTTPException(status_code=422, detail="Chunking produced no results")

    # 3. Embed all chunks locally (no API call needed)
    embeddings = embedder.encode(
        chunks,
        batch_size=32,
        show_progress_bar=False
    ).tolist()

    # 4. Clear existing chunks for this doc (safe re-ingest)
    collection = get_collection(req.doc_id)
    try:
        existing = collection.get()
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    # 5. Store chunks + embeddings
    collection.upsert(
        ids        =[f"{req.doc_id}_chunk_{i}" for i in range(len(chunks))],
        documents  =chunks,
        embeddings =embeddings,
        metadatas  =[{"chunk_index": i, "doc_id": req.doc_id} for i in range(len(chunks))],
    )

    return IngestResponse(
        success       =True,
        doc_id        =req.doc_id,
        chunks_stored =len(chunks),
        sentences     =len(sentences),
    )


@app.delete("/ingest/{doc_id}")
async def delete_document_index(doc_id: str):
    """Clear all chunks for a doc — call before re-ingesting."""
    try:
        collection = get_collection(doc_id)
        existing   = collection.get()
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
        return {"success": True, "doc_id": doc_id, "deleted": len(existing["ids"])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query", response_model=QueryResponse)
async def query_document(req: QueryRequest):
    """
    Student asks a question.
    Embed → retrieve top-k chunks → unified flexible prompt → Groq LLM → answer.
    """

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # 1. Embed the question locally
    question_embedding = embedder.encode([req.question])[0].tolist()

    # 2. Retrieve from ChromaDB
    collection = get_collection(req.doc_id)

    count = collection.count()
    if count == 0:
        raise HTTPException(
            status_code=404,
            detail="Document not indexed yet. Please wait for ingestion to complete."
        )

    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=min(req.top_k, count),
        include=["documents", "distances", "metadatas"]
    )

    retrieved_chunks = results["documents"][0]   # list[str]
    distances        = results["distances"][0]   # cosine distances

    # 3. Determine confidence label for the frontend (informational only, no gating)
    best_distance = distances[0] if distances else 1.0
    if best_distance < 0.25:
        confidence = "high"
    elif best_distance < 0.55:
        confidence = "medium"
    else:
        confidence = "low"

    # 4. Build unified flexible prompt
    context = "\n\n---\n\n".join(retrieved_chunks)

    prompt = f"""You are a friendly and intelligent educational assistant for Gyaan Setu, \
a learning platform designed for students with dyslexia, autism, and other learning differences.

Below are excerpts from the student's uploaded study material. Use them as helpful context \
where relevant. You are NOT limited to them — if the question goes beyond the document, \
answer from your general knowledge as well. Always give the most complete, helpful, \
and accurate answer you can.

GUIDELINES:
- Use simple, clear language suitable for school students.
- Keep answers concise and friendly. Use short sentences.
- If the study material is relevant, use it and build on it.
- If the study material is not relevant to the question, answer from your own knowledge.
- Never say "I can't answer that" or "it's not in the document" — always try to help.

STUDY MATERIAL EXCERPTS:
{context}

STUDENT QUESTION: {req.question}

ANSWER:"""

    # 5. Call Groq
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type" : "application/json",
            },
            json={
                "model"      : CHAT_MODEL,
                "temperature": 0.3,
                "max_tokens" : 512,
                "messages"   : [
                    {
                        "role"   : "system",
                        "content": (
                            "You are a helpful educational assistant for college students. "
                            "Use the provided study material as context, but also draw on your "
                            "general knowledge to give complete, accurate, and friendly answers. "
                            "Always respond — never refuse to answer a student's question."
                        )
                    },
                    {
                        "role"   : "user",
                        "content": prompt
                    }
                ],
            },
            timeout=30
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Groq API error {resp.status_code}: {resp.text[:200]}"
        )

    answer = resp.json()["choices"][0]["message"]["content"].strip()

    return QueryResponse(
        answer    =answer,
        sources   =retrieved_chunks,
        confidence=confidence,
    )


@app.get("/status/{doc_id}")
async def check_index_status(doc_id: str):
    """Check if a document has been indexed and how many chunks exist."""
    try:
        collection = get_collection(doc_id)
        count      = collection.count()
        return {"doc_id": doc_id, "indexed": count > 0, "chunks": count}
    except Exception:
        return {"doc_id": doc_id, "indexed": False, "chunks": 0}


@app.get("/health")
def health():
    return {
        "status"  : "ok",
        "service" : "Gyaan Setu RAG",
        "model"   : CHAT_MODEL,
        "embedder": "all-MiniLM-L6-v2",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("rag_service:app", host="0.0.0.0", port=8000, reload=True)
