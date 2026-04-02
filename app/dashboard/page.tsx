"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, BookOpen, Video, Mic, BarChart3 } from "lucide-react"
import ProtectedRoute from "@/lib/route-guards"
import { useAuth } from "@/lib/auth-context"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"

export default function DashboardPage() {

    const { user, logout, loading } = useAuth()
    const [code, setCode] = useState("")
    const [rooms, setRooms] = useState<any[]>([])
    const [loadingRooms, setLoading] = useState(true)

    const supabase = createClient()


    // 🔹 Fetch Rooms
    const fetchRooms = async () => {
        setLoading(true)

        // 1. get memberships (ONLY current user due to RLS)
        const { data: memberships, error: memError } = await supabase
            .from("room_members")
            .select("room_id")
            .eq("user_id", user?.id)

        if (memError) {
            console.error("Membership fetch error:", memError)
            setLoading(false)
            return
        }

        if (!memberships || memberships.length === 0) {
            setRooms([])
            setLoading(false)
            return
        }

        // 2. get rooms
        const roomIds = memberships.map((m) => m.room_id)

        const { data: roomsData, error: roomError } = await supabase
            .from("rooms")
            .select("*")
            .in("id", roomIds)

        if (roomError) {
            console.error("Rooms fetch error:", roomError)
            setLoading(false)
            return
        }

        setRooms(roomsData || [])
        setLoading(false)
    }

    useEffect(() => {
        if (!user?.id) return   // ⛔ prevent early call

        fetchRooms()
    }, [user])

    // 🔹 Join room via code
    const handleJoin = async () => {
        if (!code) return

        // find room by code
        const { data: room, error } = await supabase
            .rpc("get_room_by_code", { room_code: code })
            .single()

        if (error || !room) {
            alert("Room not found")
            return
        }

        if (!room) {
            alert("Room not found")
            return
        }

        // insert into room_members
        const {
            data: { user },
        } = await supabase.auth.getUser()

        await supabase.from("room_members").insert({
            room_id: room.id,
            user_id: user?.id,
        })

        setCode("")
        fetchRooms()
    }


    return (
        <ProtectedRoute allowedRole="student">
            <Header />
            <div className="min-h-screen p-6 space-y-6">
                {/* Header */}
                <Card className="bg-gradient-to-r from-blue-900 to-slate-900 border-none">
                    <CardContent className="flex justify-between items-center p-6">
                        <div>
                            <h1 className="text-2xl font-semibold">Good afternoon, {user?.email}! 👋</h1>
                            <p className="text-sm text-gray-300">Ready to continue your learning journey? Here's what you have today.</p>
                        </div>

                        <div className="flex gap-4">
                            <StatBox title="Lessons" value="3" subtitle="Today" />
                            <StatBox title="Study time" value="60 mins" subtitle="" />
                            <StatBox title="Weekly goal" value="82%" subtitle="" />
                        </div>
                    </CardContent>
                </Card>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Today's Schedule</CardTitle>
                                <p className="text-sm text-gray-400 flex items-center gap-2"><CalendarDays size={16} /> Tuesday, Mar 31</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ScheduleItem
                                    title="Mathematics: Fractions"
                                    time="10:30 AM - 11:15 AM"
                                    teacher="Ms. Johnson"
                                    status="completed"
                                    tag="Mathematics"
                                />
                                <ScheduleItem
                                    title="Reading Comprehension"
                                    time="1:00 PM - 1:45 PM"
                                    teacher="Mr. Davis"
                                    status="completed"
                                    tag="Reading"
                                />
                                <ScheduleItem
                                    title="Science: Solar System"
                                    time="3:15 PM - 4:00 PM"
                                    teacher="Dr. Martinez"
                                    status="join"
                                    tag="Science"
                                />
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Learning Progress</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ProgressItem label="Mathematics" value={65} />
                                    <ProgressItem label="Reading & Language" value={78} />
                                    <ProgressItem label="Science" value={42} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Weekly Goals</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <GoalItem label="Complete 5 lessons" progress={60} rightText="3/5" />
                                    <GoalItem label="Practice 30 minutes daily" progress={70} rightText="4/7 days" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Rooms</CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Join */}
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter room code..."
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                    />
                                    <Button onClick={handleJoin}>Join</Button>
                                </div>

                                {/* Joined Rooms */}
                                <p className="text-sm text-gray-400">Joined Rooms</p>

                                {loadingRooms ? (
                                    <p>Loading...</p>
                                ) : rooms.length === 0 ? (
                                    <p className="text-sm text-gray-500">No rooms joined</p>
                                ) : (
                                    rooms.map((r) => (
                                        <div
                                            key={r.room_id}
                                            className="border rounded-lg p-3"
                                        >
                                            <p className="font-medium">{r.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {r.subject}
                                            </p>
                                            <p className="text-xs mt-1">
                                                Code: {r.code}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>


                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <ActionButton icon={<BookOpen size={18} />} label="Start Lesson" />
                                <ActionButton icon={<Video size={18} />} label="Join Session" />
                                <Button className="bg-gradient-to-r from-blue-500 to-purple-500"> <Mic size={18} /> Ask AI</Button>
                                <ActionButton icon={<BarChart3 size={18} />} label="View Progress" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}

function StatBox({ title, value, subtitle }: any) {
    return (
        <div className="bg-black/40 px-4 py-2 rounded-xl text-center">
            <p className="text-xs text-gray-400">{title}</p>
            <p className="font-semibold">{value}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
    )
}

function ScheduleItem({ title, time, teacher, status, tag }: any) {
    return (
        <div className="flex justify-between items-center border rounded-lg p-3">
            <div>
                <p className="font-medium">{title}</p>
                <p className="text-xs text-gray-400">{time} • {teacher}</p>
            </div>

            <div className="flex items-center gap-3">
                <Badge variant="secondary">{tag}</Badge>
                {status === "completed" ? (
                    <Badge variant="outline">Completed</Badge>
                ) : (
                    <Button size="sm">Join</Button>
                )}
            </div>
        </div>
    )
}

function ProgressItem({ label, value }: any) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <Progress value={value} />
        </div>
    )
}

function GoalItem({ label, progress, rightText }: any) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span>{label}</span>
                <span>{rightText}</span>
            </div>
            <Progress value={progress} />
        </div>
    )
}

function ActionButton({ icon, label }: any) {
    return (
        <Button variant="outline" className="flex gap-2 justify-center">
            {icon}
            {label}
        </Button>
    )
}
