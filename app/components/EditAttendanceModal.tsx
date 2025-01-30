"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface EditAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  currentStatus: "present" | "absent"
  onUpdate: (date: Date, status: "present" | "absent") => void
}

export function EditAttendanceModal({ isOpen, onClose, date, currentStatus, onUpdate }: EditAttendanceModalProps) {
  const [status, setStatus] = useState<"present" | "absent">(currentStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await onUpdate(date, status)
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-600">Edit Attendance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Date: {date.toLocaleDateString("en-IN")}</Label>
          </div>
          <div className="space-y-2">
            <Label>Attendance Status</Label>
            <RadioGroup value={status} onValueChange={(value: "present" | "absent") => setStatus(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="present" id="present" />
                <Label htmlFor="present">Present (Class Taken)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="absent" id="absent" />
                <Label htmlFor="absent">Absent (Class Not Taken)</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Updating..." : "Update Attendance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

