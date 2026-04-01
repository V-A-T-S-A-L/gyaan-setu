"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Users, BookOpen, Trash2, Pencil } from "lucide-react"
import Head from "next/head"
import { Header } from "@/components/header"
import ProtectedRoute from "@/lib/route-guards"

interface Room {
    id: number
    name: string
    subject: string
    code: string
}

export default function TeacherDashboard() {
    const supabase = createClient()

    const [rooms, setRooms] = useState<Room[]>([])
    const [loading, setLoading] = useState(true)

    const [newRoom, setNewRoom] = useState({ name: "", subject: "" })
    const [editingRoom, setEditingRoom] = useState<Room | null>(null)

    // 🔹 Fetch Rooms
    const fetchRooms = async () => {
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .order("created_at", { ascending: false })

        if (!error && data) setRooms(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchRooms()
    }, [])

    // 🔹 Create Room
    const handleCreateRoom = async () => {
        if (!newRoom.name || !newRoom.subject) return

        const { error } = await supabase.from("rooms").insert([
            {
                name: newRoom.name,
                subject: newRoom.subject,
            },
        ])

        if (!error) {
            setNewRoom({ name: "", subject: "" })
            fetchRooms()
        }
    }

    // 🔹 Delete Room
    const handleDelete = async (id: number) => {
        await supabase.from("rooms").delete().eq("id", id)
        fetchRooms()
    }

    // 🔹 Update Room
    const handleUpdate = async () => {
        if (!editingRoom) return

        await supabase
            .from("rooms")
            .update({ name: editingRoom.name, subject: editingRoom.subject })
            .eq("id", editingRoom.id)

        setEditingRoom(null)
        fetchRooms()
    }

    return (
        <ProtectedRoute allowedRole="teacher">
            <div className="p-6 space-y-6">
                <Header />
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Teacher Dashboard 👋</h1>
                        <p className="text-muted-foreground">Manage your classrooms</p>
                    </div>

                    {/* Create Room */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="flex items-center gap-2">
                                <Plus size={16} /> Create Room
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Room</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div>
                                    <Label>Room Name</Label>
                                    <Input
                                        value={newRoom.name}
                                        onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label>Subject</Label>
                                    <Input
                                        value={newRoom.subject}
                                        onChange={(e) => setNewRoom({ ...newRoom, subject: e.target.value })}
                                    />
                                </div>

                                <Button onClick={handleCreateRoom} className="w-full">
                                    Create
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Total Rooms</p>
                            <p className="text-xl font-semibold">{rooms.length}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Active Rooms</p>
                            <p className="text-xl font-semibold">{rooms.length}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge>Live</Badge>
                        </CardContent>
                    </Card>
                </div>

                {/* Rooms */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Rooms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            rooms.map((room) => (
                                <div
                                    key={room.id}
                                    className="flex items-center justify-between border rounded-xl p-4"
                                >
                                    <div>
                                        <p className="font-medium">{room.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {room.subject}
                                        </p>
                                        <p className="text-xs mt-1">Code: {room.code}</p>
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Edit */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setEditingRoom(room)}
                                        >
                                            <Pencil size={16} />
                                        </Button>

                                        {/* Delete */}
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleDelete(room.id)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={!!editingRoom} onOpenChange={() => setEditingRoom(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Room</DialogTitle>
                        </DialogHeader>

                        {editingRoom && (
                            <div className="space-y-4">
                                <Input
                                    value={editingRoom.name}
                                    onChange={(e) =>
                                        setEditingRoom({ ...editingRoom, name: e.target.value })
                                    }
                                />

                                <Input
                                    value={editingRoom.subject}
                                    onChange={(e) =>
                                        setEditingRoom({ ...editingRoom, subject: e.target.value })
                                    }
                                />

                                <Button onClick={handleUpdate} className="w-full">
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </ProtectedRoute>

    )
}
