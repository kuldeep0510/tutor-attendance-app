"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { markAttendance } from "../actions/attendanceActions"
import { Check, MessageCircle, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "../lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWhatsApp } from "../contexts/whatsapp-context"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AttendanceMarker({ studentId, whatsappNumber }: { studentId: string; whatsappNumber: string }) {
  const [isMarking, setIsMarking] = useState(false)
  const [isMarked, setIsMarked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { isConnected, sendMessage } = useWhatsApp()

  const getISTDate = () => {
    const now = new Date()
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    return istTime.toISOString().split("T")[0]
  }

  const checkTodayAttendance = async () => {
    try {
      const today = getISTDate()
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .eq("date", today)
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      setIsMarked(!!data)
    } catch (error) {
      console.error("Error checking attendance:", error)
      toast.error("Failed to check attendance status")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkTodayAttendance()
    const timer = setInterval(() => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        checkTodayAttendance()
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [studentId])

  const handleMarkAttendanceOnly = async () => {
    setIsMarking(true)
    try {
      const today = getISTDate()
      await markAttendance(studentId, today, "present")
      toast.success("Attendance marked successfully!")
      setIsMarked(true)
    } catch (error) {
      console.error("Failed to mark attendance:", error)
      toast.error("Failed to mark attendance. Please try again.")
    } finally {
      setIsMarking(false)
    }
  }

  const handleMarkAttendanceWithMessage = async () => {
    if (!isConnected) {
      toast.error("WhatsApp is not connected. Please connect WhatsApp first in Settings.")
      return
    }

    setIsMarking(true)
    try {
      const today = getISTDate()
      await markAttendance(studentId, today, "present")

      try {
        let formattedNumber = whatsappNumber.replace(/\D/g, '').replace(/^(\+?91)/, '')
        if (formattedNumber.length !== 10) {
          throw new Error("Phone number must be 10 digits")
        }
        formattedNumber = `91${formattedNumber}` // Ensure 91 prefix for WhatsApp
        // Update the message to include attendance details
        const message = `Attendance marked for date: ${new Date(today).toLocaleDateString("en-IN")}. Status: Present. Thank you!`
        
        await sendMessage(formattedNumber, message)
        toast.success("Attendance marked and WhatsApp message sent!")
      } catch (msgError) {
        console.error("Failed to send WhatsApp message:", msgError)
        toast.success("Attendance marked successfully!")
        toast.error("Failed to send WhatsApp message. Please try sending manually.")
      }

      setIsMarked(true)
    } catch (error) {
      console.error("Failed to mark attendance:", error)
      toast.error("Failed to mark attendance. Please try again.")
    } finally {
      setIsMarking(false)
    }
  }

  const MarkAndSendButton = () => {
    if (!isConnected) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="w-full bg-primary/50 cursor-not-allowed"
                disabled
              >
                <AlertCircle className="mr-2 h-4 w-4" /> Mark & Send
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>WhatsApp is not connected. Please connect WhatsApp in Settings.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <Button 
        onClick={handleMarkAttendanceWithMessage} 
        loading={isMarking}
        className="w-full bg-primary hover:bg-primary/90"
      >
        <MessageCircle className="mr-2 h-4 w-4" /> Mark & Send
      </Button>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-primary/5 dark:bg-primary/10">
        <CardTitle className="text-primary">Today's Attendance</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Checking attendance status...</span>
          </div>
        ) : isMarked ? (
          <div className="text-center py-4">
            <Button disabled variant="outline" className="w-full border-primary/20">
              <Check className="mr-2 h-4 w-4 text-primary" /> 
              <span className="text-primary">Attendance Marked for Today</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={handleMarkAttendanceOnly} 
              loading={isMarking} 
              variant="outline"
              className="w-full border-primary hover:bg-primary/10 hover:text-primary text-primary"
            >
              <Check className="mr-2 h-4 w-4" /> Mark Only
            </Button>
            <MarkAndSendButton />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
