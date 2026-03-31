// lib/auth-utils.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Server-side function to require authentication
 * Use this in Server Components or Server Actions
 */
export async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?auth=required')
  }

  return user
}

/**
 * Server-side function to get current user (doesn't redirect)
 * Use this when you want to check auth but not force login
 */
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

/**
 * Server-side function to check if user has specific role
 * Assumes you have a user_roles table or metadata
 */
export async function requireRole(role: string) {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()

  // Option 1: Check user metadata
  const userRole = user.user_metadata?.role

  if (userRole !== role) {
    redirect('/?error=unauthorized')
  }

  // Option 2: Check from a user_roles table
  // const { data: userRole } = await supabase
  //   .from('user_roles')
  //   .select('role')
  //   .eq('user_id', user.id)
  //   .single()
  //
  // if (userRole?.role !== role) {
  //   redirect('/?error=unauthorized')
  // }

  return user
}