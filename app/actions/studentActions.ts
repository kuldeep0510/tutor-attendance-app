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

export async function getStudents(page = 1, pageSize = 10) {
  const supabase = getSupabase()
  const tutorId = await getCurrentUserId()
  
  // Calculate the range based on page and pageSize
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  // First get total count
  const { count } = await supabase
    .from("students")
    .select("*", { count: 'exact', head: true })
    .eq("tutor_id", tutorId)

  // Then get paginated data
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("tutor_id", tutorId)
    .order('name', { ascending: true })
    .range(start, end)

  if (error) {
    console.error("Supabase error:", error)
    throw new Error("Failed to fetch students")
  }

  return {
    students: data,
    totalCount: count || 0,
    currentPage: page,
    totalPages: Math.ceil((count || 0) / pageSize)
  }
}

export async function getStudentById(id: string) {
  try {
    const supabase = getSupabase()
    const tutorId = await getCurrentUserId()

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .eq("tutor_id", tutorId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        console.error(`Student not found with id: ${id}`)
        return null
      }
      console.error("Supabase error:", error)
      throw new Error("Failed to fetch student")
    }

    return data
  } catch (error) {
    console.error("Error fetching student:", error)
    throw new Error("Failed to fetch student")
  }
}

export async function addStudent({
  studentName,
  parentName,
  whatsappNumber,
  dailyCharge,
}: {
  studentName: string
  parentName: string
  whatsappNumber: string
  dailyCharge: number
}) {
  try {
    if (!studentName || !parentName || !whatsappNumber || !dailyCharge) {
      throw new Error("All fields are required")
    }

    if (isNaN(dailyCharge) || dailyCharge <= 0) {
      throw new Error("Daily charge must be a valid positive number")
    }

    const whatsappPattern = /^\d{10}$/
    if (!whatsappPattern.test(whatsappNumber)) {
      throw new Error("Please enter a valid 10-digit mobile number")
    }

    const supabase = getSupabase()
    const tutorId = await getCurrentUserId()

    const { data: existingStudent } = await supabase
      .from("students")
      .select("id")
      .eq("name", studentName)
      .eq("parent_name", parentName)
      .eq("tutor_id", tutorId)
      .single()

    if (existingStudent) {
      throw new Error("A student with the same name and parent already exists")
    }

    const { data, error } = await supabase
      .from("students")
      .insert({
        name: studentName,
        parent_name: parentName,
        whatsapp_number: whatsappNumber,
        daily_charge: dailyCharge,
        tutor_id: tutorId
      })
      .select()

    if (error) {
      console.error("Supabase error:", error)
      if (error.code === "23505") {
        throw new Error("A student with this information already exists")
      }
      throw new Error(error.message || "Failed to add student")
    }

    return data[0]
  } catch (error) {
    console.error("Add student operation failed:", error)
    throw error instanceof Error ? error : new Error("Failed to add student")
  }
}

export async function updateStudent({
  id,
  studentName,
  parentName,
  whatsappNumber,
  dailyCharge,
}: {
  id: string
  studentName: string
  parentName: string
  whatsappNumber: string
  dailyCharge: number
}) {
  try {
    const supabase = getSupabase()
    const tutorId = await getCurrentUserId()

    const { data: existingStudent, error: fetchError } = await supabase
      .from("students")
      .select("id")
      .eq("id", id)
      .eq("tutor_id", tutorId)
      .single()

    if (fetchError || !existingStudent) {
      throw new Error("Student not found or access denied")
    }

    const { data, error } = await supabase
      .from("students")
      .update({
        name: studentName,
        parent_name: parentName,
        whatsapp_number: whatsappNumber,
        daily_charge: dailyCharge,
      })
      .eq("id", id)
      .eq("tutor_id", tutorId)
      .select()

    if (error) {
      console.error("Supabase error:", error)
      throw new Error("Failed to update student")
    }

    return data[0]
  } catch (error) {
    console.error("Update student operation failed:", error)
    throw error instanceof Error ? error : new Error("Failed to update student")
  }
}

export async function deleteStudent(id: string) {
  try {
    const supabase = getSupabase()
    const tutorId = await getCurrentUserId()

    const { data: existingStudent, error: fetchError } = await supabase
      .from("students")
      .select("id")
      .eq("id", id)
      .eq("tutor_id", tutorId)
      .single()

    if (fetchError || !existingStudent) {
      throw new Error("Student not found or access denied")
    }

    const { error: attendanceError } = await supabase
      .from("attendance")
      .delete()
      .eq("student_id", id)

    if (attendanceError) {
      console.error("Supabase attendance delete error:", attendanceError)
      throw new Error("Failed to delete attendance records")
    }

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id)
      .eq("tutor_id", tutorId)

    if (error) {
      console.error("Supabase student delete error:", error)
      throw new Error("Failed to delete student")
    }

    return true
  } catch (error) {
    console.error("Delete operation failed:", error)
    throw error instanceof Error ? error : new Error("Failed to delete student")
  }
}
