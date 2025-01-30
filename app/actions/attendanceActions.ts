"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const getSupabase = () => {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    }
  )
}

async function getCurrentUserId() {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error("Not authenticated")
  }
  
  return session.user.id
}

async function verifyStudentOwnership(supabase: any, studentId: string, tutorId: string) {
  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("tutor_id", tutorId)
    .single()

  if (error || !data) {
    throw new Error("Student not found or access denied")
  }

  return true
}

export async function markAttendance(studentId: string, date: string, status: "present" | "absent") {
  try {
    const supabase = getSupabase()
    const tutorId = await getCurrentUserId()

    // Verify student belongs to the current tutor
    await verifyStudentOwnership(supabase, studentId, tutorId)

    const { data, error } = await supabase
      .from("attendance")
      .upsert({ 
        student_id: studentId,
        date,
        status,
        tutor_id: tutorId  // Also store tutor_id in attendance for extra security
      }, {
        onConflict: 'student_id,date',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error("Supabase error:", error)
      throw new Error("Failed to mark attendance")
    }

    return data[0]
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to mark attendance")
  }
}

export async function getAttendance(studentId: string, startDate: string, endDate: string) {
  try {
    const supabase = getSupabase()
    const tutorId = await getCurrentUserId()

    // Verify student belongs to the current tutor
    await verifyStudentOwnership(supabase, studentId, tutorId)

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .eq("tutor_id", tutorId) // Additional security check
      .gte("date", startDate)
      .lte("date", endDate)

    if (error) {
      console.error("Supabase error:", error)
      throw new Error("Failed to fetch attendance")
    }
    return data
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to fetch attendance")
  }
}
