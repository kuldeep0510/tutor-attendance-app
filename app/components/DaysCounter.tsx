"use client"

import { useEffect, useState } from "react"
import { Calendar } from "lucide-react"
import { supabase } from "../lib/supabase"
import { Card, CardContent } from "@/components/ui/card"

export function DaysCounter({ studentId }: { studentId: string }) {
  const [daysCount, setDaysCount] = useState<number>(0)
  const [lastBillEndDate, setLastBillEndDate] = useState<string>("1970-01-01")
  const [isLoading, setIsLoading] = useState(true)

  const updateDaysCount = async () => {
    try {
      // Get last bill's date_to field
      const { data: billData } = await supabase
        .from("bills")
        .select("date_to")
        .eq("student_id", studentId)
        .order("date_to", { ascending: false })
        .limit(1)

      // If no bill exists, use very old date to count all attendance
      const endDate = billData?.[0]?.date_to || "1970-01-01"
      setLastBillEndDate(endDate)

      // Count attendance entries after the last bill's end date
      const { count } = await supabase
        .from("attendance")
        .select("*", { count: "exact" })
        .eq("student_id", studentId)
        .eq("status", "present")
        .gt("date", endDate)

      setDaysCount(count || 0)
    } catch (error) {
      console.error("Error fetching days count:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    updateDaysCount()
    
    // Subscribe to changes in bills table
    const billsChannel = supabase
      .channel('bills-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          console.log('Bills table changed, updating count...')
          updateDaysCount()
        }
      )
      .subscribe()

    // Subscribe to changes in attendance table
    const attendanceChannel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          console.log('Attendance table changed, updating count...')
          updateDaysCount()
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(billsChannel)
      supabase.removeChannel(attendanceChannel)
    }
  }, [studentId])

  const formatDate = (dateStr: string) => {
    if (dateStr === "1970-01-01") return "No previous bill"
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: 'numeric',
      month: 'short'
    })
  }

  if (isLoading) {
    return (
      <Card className="bg-primary/5 dark:bg-primary/10 border-0">
        <CardContent className="p-3">
          <div className="h-14 flex items-center justify-center">
            <div className="h-5 bg-primary/10 rounded w-48 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-primary/5 dark:bg-primary/10 border-0">
      <CardContent className="p-3">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center justify-center mb-1">
            <Calendar className="h-5 w-5 text-primary mr-2" />
            <span className="text-primary font-medium">
              {daysCount} {daysCount === 1 ? 'Day' : 'Days'} Present
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Since {formatDate(lastBillEndDate)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
