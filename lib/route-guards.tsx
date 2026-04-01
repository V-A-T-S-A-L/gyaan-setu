// lib/route-guards.tsx
'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from "@/lib/supabase/client";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient();

  const [checkingRole, setCheckingRole] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push(`/?redirectTo=${pathname}`)
      return
    }

    const checkAdmin = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (error || data?.role !== 'admin') {
        router.push('/') // or /403
        return
      }

      setIsAdmin(true)
      setCheckingRole(false)
    }

    checkAdmin()
  }, [user, loading, router, pathname])

  if (loading || checkingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}


/**
 * Client-side component to protect routes
 * Wrap pages that need authentication
 */
export default function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: React.ReactNode
  allowedRole: "teacher" | "student"
}) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      // 🔹 Get logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/")
        return
      }

      // 🔹 Get profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single()

      if (error || !profile) {
        // no profile → onboarding
        router.replace("/onboarding")
        return
      }

      // 🔹 Role check
      if (profile.role !== allowedRole) {
        if (profile.role === "teacher") {
          router.replace("/teacher-dashboard")
        } else {
          router.replace("/dashboard")
        }
        return
      }

      setLoading(false)
    }

    checkAccess()
  }, [router, supabase, allowedRole])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Checking access...</p>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Client-side component to redirect if authenticated
 * Use on login/signup pages
 */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return <>{children}</>
}