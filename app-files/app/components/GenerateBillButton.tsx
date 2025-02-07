"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { generateBill } from "../actions/billActions"
import { supabase } from "../lib/supabase"
import { getStudentById } from "../actions/studentActions"
import { FileText, CalendarIcon, AlertCircle } from "lucide-react"
import { format } from 'date-fns'
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { generateBillPDF } from "../utils/pdfGenerator"
import { sendWhatsAppMessage, checkWhatsAppStatus } from "../utils/whatsapp"
import { useWhatsAppConnection } from "../contexts/whatsapp-context"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function getUPILink(amount: number): string {
  const cleanAmount = Math.round(amount).toString()
  return `upi://pay?pa=7667943738@ybl&pn=Rupesh%20Kumar%20Yadav&am=${cleanAmount}&cu=INR`
}

export function GenerateBillButton({ studentId }: { studentId: string }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const { connectionStatus } = useWhatsAppConnection()

  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(firstDay)
    setEndDate(lastDay)
  }, [])

  const handleGenerateBill = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select a date range")
      return
    }

    if (connectionStatus !== "connected") {
      toast.error("WhatsApp is not connected. Please connect WhatsApp first in Settings.")
      return
    }

    setIsGenerating(true)
    try {
      // First check WhatsApp connection
      await checkWhatsAppStatus()

      const formattedStartDate = format(startDate, "yyyy-MM-dd")
      const formattedEndDate = format(endDate, "yyyy-MM-dd")

      // Get student details for WhatsApp number
      const student = await getStudentById(studentId)
      if (!student) throw new Error("Student not found")

      // Generate bill using server action
      const { billText, pdfBase64, billId } = await generateBill(
        studentId,
        formattedStartDate,
        formattedEndDate
      )

      // Send WhatsApp message with PDF
      await sendWhatsAppMessage(student.whatsapp_number, billText, pdfBase64)

      // Update bill status after successful message sending
      const { error: updateError } = await supabase
        .from("bills")
        .update({ 
          status: "sent", 
          whatsapp_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq("id", billId)

      if (updateError) {
        console.error("Error updating bill status:", updateError)
        toast.error("Bill sent but status update failed")
        return
      }

      toast.success("Bill generated and sent via WhatsApp")
    } catch (error) {
      console.error("Error in handleGenerateBill:", error)
      toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const GenerateButton = () => {
    if (connectionStatus !== "connected") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                disabled 
                className="w-full bg-green-500/50 cursor-not-allowed"
              >
                <AlertCircle className="mr-2 h-4 w-4" /> Generate and Send Bill
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
        onClick={handleGenerateBill} 
        loading={isGenerating}
        className="w-full bg-green-500 hover:bg-green-600"
      >
        <FileText className="mr-2 h-4 w-4" /> Generate and Send Bill
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <div className="flex-1">
          <Label htmlFor="start-date">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="start-date"
                variant={"outline"}
                disabled={isGenerating}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd MMMM yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1">
          <Label htmlFor="end-date">End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="end-date"
                variant={"outline"}
                disabled={isGenerating}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd MMMM yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <GenerateButton />
    </div>
  )
}
