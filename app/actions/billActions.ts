"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { generateBillPDF } from "../utils/pdfGenerator"
import type { AttendanceRecord } from "../types/attendance"

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

export async function generateBill(studentId: string, startDate: string, endDate: string) {
  try {
    console.log("Starting bill generation with params:", { studentId, startDate, endDate })
    
    const supabase = getSupabase()
    const tutorId = await getCurrentUserId()

    // Verify student belongs to the current tutor
    await verifyStudentOwnership(supabase, studentId, tutorId)

    // 1. Create bill record first in pending state
    console.log("Creating initial bill record...")
    const { data: bill, error: billError } = await supabase
      .from("bills")
      .insert({
        student_id: studentId,
        tutor_id: tutorId,
        date_from: startDate,
        date_to: endDate,
        status: "pending",
        whatsapp_sent: false,
      })
      .select()
      .single()

    if (billError) {
      console.error("Error creating initial bill record:", billError)
      throw new Error(`Failed to create bill record: ${billError.message}`)
    }
    console.log("Initial bill record created:", bill)

    // 2. Fetch student data
    console.log("Fetching student data...")
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .eq("tutor_id", tutorId)
      .single()

    if (studentError) {
      console.error("Error fetching student:", studentError)
      throw new Error(`Failed to fetch student: ${studentError.message}`)
    }
    console.log("Student data fetched:", { 
      name: student.name, 
      parent_name: student.parent_name 
    })

    // 3. Fetch attendance data
    console.log("Fetching attendance records...")
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .eq("tutor_id", tutorId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })

    if (attendanceError) {
      console.error("Error fetching attendance:", attendanceError)
      throw new Error(`Failed to fetch attendance: ${attendanceError.message}`)
    }
    console.log(`Found ${attendance.length} attendance records`)

    // 4. Process attendance records
    const presentDays = attendance.filter(r => r.status === "present").length
    const totalAmount = presentDays * student.daily_charge

    // 5. Update bill with calculated details
    console.log("Updating bill with calculated details...")
    const { error: updateError } = await supabase
      .from("bills")
      .update({
        amount: totalAmount,
        present_days: presentDays,
      })
      .eq("id", bill.id)
      .eq("tutor_id", tutorId)

    if (updateError) {
      console.error("Error updating bill details:", updateError)
      throw new Error(`Failed to update bill details: ${updateError.message}`)
    }
    console.log("Bill details updated successfully")

    // 6. Generate PDF
    console.log("Generating PDF...")
    try {
      const pdfBase64 = await generateBillPDF({
        studentId,
        studentName: student.name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        presentDays,
        dailyCharge: student.daily_charge,
        totalAmount
      })
      console.log("PDF generated successfully")

      // 7. Prepare WhatsApp message
      const billText = `
Monthly Bill for ${student.name}

Period: ${startDate} to ${endDate}
Total Classes Taken: ${presentDays}
Total Amount: ₹${totalAmount.toFixed(2)}

The detailed bill has been is given below in the attached PDF. 
`

      return {
        billText,
        pdfBase64,
        billId: bill.id
      }
    } catch (pdfError) {
      console.error("Error generating PDF:", pdfError)
      throw new Error(`Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`)
    }
  } catch (error) {
    console.error("Error in generateBill:", error)
    throw error
  }
}
