"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, BookOpen, Video, Mic, BarChart3 } from "lucide-react"
import { ProtectedRoute } from "@/lib/route-guards"
import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"

export default function DashboardPage() {

    const { user, logout, loading } = useAuth()

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-black text-white p-6 space-y-6">
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
                            <CardContent className="space-y-3">
                                <div className="flex gap-2">
                                    <Input placeholder="Enter room code..." />
                                    <Button>Join</Button>
                                </div>
                                <p className="text-sm text-gray-400">Joined Rooms</p>
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
