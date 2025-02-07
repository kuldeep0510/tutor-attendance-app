"use client"

import React, { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAttendance, markAttendance } from "../actions/attendanceActions"
import { EditAttendanceModal } from "./EditAttendanceModal"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

type AttendanceStatus = "present" | "absent"

export function AttendanceCalendar({ studentId }: { studentId: string }) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [date, setDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const getISTDate = (date: Date) => {
    return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0]
  }

  const fetchAttendance = async () => {
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    try {
      const data = await getAttendance(studentId, getISTDate(startDate), getISTDate(endDate))
      const attendanceMap: Record<string, AttendanceStatus> = {}
      data.forEach((item) => {
        const localDate = new Date(item.date)
        attendanceMap[localDate.toISOString().split("T")[0]] = item.status as AttendanceStatus
      })
      setAttendance(attendanceMap)
      setError(null)
    } catch (error) {
      console.error("Failed to fetch attendance:", error)
      setError("Failed to load attendance data. Please try again.")
      toast.error("Failed to load attendance data")
    }
  }

  useEffect(() => {
    fetchAttendance()
  }, [studentId, date]) 

  const handleDateClick = (day: Date | undefined) => {
    if (day) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      day.setHours(0, 0, 0, 0)

      if (day > today) {
        toast.error("Cannot mark attendance for future dates")
        return
      }
      setSelectedDate(day)
    }
  }

  const handleAttendanceUpdate = async (selectedDate: Date, status: AttendanceStatus) => {
    try {
      const todayIST = getISTDate(new Date())
      const selectedIST = getISTDate(selectedDate)
      if (selectedIST > todayIST) {
        throw new Error("Cannot mark attendance for future dates")
      }

      await markAttendance(studentId, selectedIST, status)
      toast.success("Attendance updated successfully")
      fetchAttendance()
      router.refresh()
    } catch (error) {
      console.error("Failed to update attendance:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update attendance")
    }
    setSelectedDate(null)
  }

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
    }
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button onClick={fetchAttendance} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-primary mb-4">Attendance Calendar</h2>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-auto touch-manipulation">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
              className="rounded-md border dark:border-border mx-auto md:mx-0"
              modifiers={{
                present: (day) => attendance[getISTDate(day)] === "present",
                absent: (day) => attendance[getISTDate(day)] === "absent",
                marked: (day) => !!attendance[getISTDate(day)]
              }}
              modifiersStyles={{
                present: { 
                  backgroundColor: "hsl(142.1 76.2% 36.3%)", 
                  color: "white",
                  borderRadius: "4px",
                  margin: "2px"
                },
                absent: { 
                  backgroundColor: "hsl(0 72.2% 50.6%)", 
                  color: "white",
                  borderRadius: "4px",
                  margin: "2px"
                },
                marked: { 
                  fontWeight: "bold"
                }
              }}
              onDayClick={handleDateClick}
              fromMonth={new Date(2024, 0)}
              classNames={{
                day_today: "font-bold border-2 border-current",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary/90",
                day: "h-8 w-8 text-sm p-0 font-normal m-0.5",
                nav_button_previous: "h-7 w-7",
                nav_button_next: "h-7 w-7",
                cell: "p-0",
                head_cell: "text-muted-foreground font-normal text-xs"
              }}
            />
          </div>
          <div className="w-full md:w-auto space-y-4 mt-4 md:mt-0">
            <div className="p-4 rounded-lg bg-card border">
              <h3 className="font-medium mb-3 text-foreground">Legend</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <span className="inline-block w-6 h-6 bg-[hsl(142.1_76.2%_36.3%)] rounded-md mr-3"></span>
                  <span className="text-muted-foreground">Present</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-6 h-6 bg-[hsl(0_72.2%_50.6%)] rounded-md mr-3"></span>
                  <span className="text-muted-foreground">Absent</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
              <p>Click on any date to mark or edit attendance.</p>
              <p className="mt-2 text-xs">Future dates cannot be marked.</p>
            </div>
          </div>
        </div>
      {selectedDate && (
        <EditAttendanceModal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          currentStatus={attendance[getISTDate(selectedDate)] || "absent"}
          onUpdate={handleAttendanceUpdate}
        />
      )}
    </div>
  )
}
