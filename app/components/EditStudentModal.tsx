"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { updateStudent } from "../actions/studentActions"
import { toast } from "sonner"

interface Student {
  id: string
  name: string
  parent_name: string
  whatsapp_number: string
  daily_charge: number
}

interface EditStudentModalProps {
  isOpen: boolean
  onClose: () => void
  student: Student
  onUpdate: (updatedStudent: Student) => void
}

export function EditStudentModal({ isOpen, onClose, student, onUpdate }: EditStudentModalProps) {
  const [studentName, setStudentName] = useState(student.name)
  const [parentName, setParentName] = useState(student.parent_name)
  const [whatsappNumber, setWhatsappNumber] = useState(student.whatsapp_number)
  const [dailyCharge, setDailyCharge] = useState(student.daily_charge.toString())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      // Validate Indian phone number
      const phoneRegex = /^[6-9]\d{9}$/
      if (!phoneRegex.test(whatsappNumber)) {
        throw new Error("Please enter a valid 10-digit Indian phone number")
      }

      const updatedStudent = await updateStudent({
        id: student.id,
        studentName,
        parentName,
        whatsappNumber,
        dailyCharge: Number.parseFloat(dailyCharge),
      })

      onUpdate(updatedStudent)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast.error("Failed to update student details")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-600">Edit Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="studentName">Student Name</Label>
            <Input id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentName">Parent Name</Label>
            <Input id="parentName" value={parentName} onChange={(e) => setParentName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp Number (10 digits)</Label>
            <Input
              id="whatsappNumber"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              required
              placeholder="e.g., 9876543210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyCharge">Daily Charge (₹)</Label>
            <Input
              id="dailyCharge"
              type="number"
              value={dailyCharge}
              onChange={(e) => setDailyCharge(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Updating..." : "Update Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

