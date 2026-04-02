"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Search, Plus, Users, BookOpen, BarChart3 } from "lucide-react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"

type Module = {
    id: number
    name: string
    description: string
}

type Student = {
    id: string
    name: string
    progress: number
}

export default function ClassroomPage() {
    const [search, setSearch] = useState("")
    const [modules, setModules] = useState<Module[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)

    // New module state
    const [showCreate, setShowCreate] = useState(false)
    const [newModuleName, setNewModuleName] = useState("")
    const [newModuleDescription, setNewModuleDescription] = useState("")
    const [creating, setCreating] = useState(false)

    const params = useParams()
    const roomId = params.id as string
    const supabase = createClient()
    const { user } = useAuth()

    // Fetch modules for this room
    const fetchModules = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("modules")
            .select("*")
            .eq("room_id", roomId)
            .order("id", { ascending: true })

        if (error) console.error("Error fetching modules:", error)
        else setModules(data || [])

        setLoading(false)
    }

    const fetchStudents = async () => {
        setLoading(true)

        // 1️⃣ fetch room_members
        const { data: members, error: membersError } = await supabase
            .from("room_members")
            .select("*")
            .eq("room_id", roomId)

        if (membersError) {
            console.error("Error fetching room_members:", membersError)
            setLoading(false)
            return
        }

        // 2️⃣ fetch profiles for all user_ids
        const userIds = members.map((m: any) => m.user_id)
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id, name")
            .in("user_id", userIds)

        if (profilesError) {
            console.error("Error fetching profiles:", profilesError)
            setLoading(false)
            return
        }

        // 3️⃣ combine data
        const formatted: Student[] = members.map((m: any) => ({
            id: m.user_id,
            name: profiles.find((p: any) => p.user_id === m.user_id)?.name || "Unknown",
            progress: Math.floor(Math.random() * 100),
        }))

        setStudents(formatted)
        setLoading(false)
    }

    // Create new module
    const createModule = async () => {
        if (!newModuleName) return alert("Module name is required")
        setCreating(true)

        const { data, error } = await supabase
            .from("modules")
            .insert({
                room_id: roomId,
                name: newModuleName,
                description: newModuleDescription || "",
            })
            .select()
            .single()

        if (error) console.error("Error creating module:", error)
        else {
            setModules((prev) => [...prev, data])
            setShowCreate(false)
            setNewModuleName("")
            setNewModuleDescription("")
        }

        setCreating(false)
    }

    useEffect(() => {
        if (!roomId || !user) return
        fetchModules()
        fetchStudents()
    }, [user])

    return (
        <div className="p-6 space-y-6">
            <Header />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Classroom</h1>
                    <p className="text-muted-foreground">Manage modules, students, and analytics</p>
                </div>
                {/** Show create button only if teacher/owner (RLS will enforce) */}
                <Button
                    className="flex items-center gap-2"
                    onClick={() => setShowCreate((prev) => !prev)}
                >
                    <Plus className="w-4 h-4" /> {showCreate ? "Cancel" : "Create Module"}
                </Button>
            </div>

            {showCreate && (
                <Card className="p-4">
                    <CardHeader>
                        <CardTitle>Create New Module</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Input
                            placeholder="Module Name"
                            value={newModuleName}
                            onChange={(e) => setNewModuleName(e.target.value)}
                        />
                        <Input
                            placeholder="Description"
                            value={newModuleDescription}
                            onChange={(e) => setNewModuleDescription(e.target.value)}
                        />
                        <Button
                            onClick={createModule}
                            disabled={creating}
                        >
                            {creating ? "Creating..." : "Create Module"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <Users />
                        <div>
                            <p className="text-sm text-muted-foreground">Students</p>
                            <p className="text-xl font-bold">{students.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <BookOpen />
                        <div>
                            <p className="text-sm text-muted-foreground">Modules</p>
                            <p className="text-xl font-bold">{modules.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <BarChart3 />
                        <div>
                            <p className="text-sm text-muted-foreground">Avg Progress</p>
                            <p className="text-xl font-bold">
                                {students.length
                                    ? Math.floor(students.reduce((a, s) => a + s.progress, 0) / students.length)
                                    : 0}
                                %
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="modules">
                <TabsList>
                    <TabsTrigger value="modules">Modules</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                {/* Modules Tab */}
                <TabsContent value="modules" className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        <Input
                            placeholder="Search modules..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading
                            ? <p>Loading modules...</p>
                            : modules
                                .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
                                .map((module) => (
                                    <Card key={module.id} className="hover:shadow-lg transition">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{module.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <Badge>Lessons: N/A</Badge>
                                            <Progress value={0} /> {/* Add real progress if available */}
                                            <Button variant="outline" className="w-full">
                                                Open Module
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                    </div>
                </TabsContent>

                {/* Students Tab */}
                <TabsContent value="students" className="space-y-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading
                            ? <p>Loading students...</p>
                            : students.map((student) => (
                                <Card key={student.id}>
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <Avatar>
                                            <AvatarFallback>{student.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium">{student.name}</p>
                                            <Progress value={student.progress} />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Charts and insights (connect with analytics later)
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}