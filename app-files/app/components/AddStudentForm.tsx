"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addStudent } from "../actions/studentActions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function AddStudentForm() {
  const [studentName, setStudentName] = useState("")
  const [parentName, setParentName] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [dailyCharge, setDailyCharge] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const validateForm = () => {
    if (!studentName || !parentName || !whatsappNumber || !dailyCharge) {
      setError("All fields are required")
      return false
    }

    if (isNaN(Number(dailyCharge)) || Number(dailyCharge) <= 0) {
      setError("Daily charge must be a valid positive number")
      return false
    }

    // Basic WhatsApp number validation
    const whatsappPattern = /^\d{10}$/
    if (!whatsappPattern.test(whatsappNumber)) {
      setError("Please enter a valid 10-digit mobile number")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await addStudent({
        studentName,
        parentName,
        whatsappNumber,
        dailyCharge: Number.parseFloat(dailyCharge),
      })
      
      toast.success("Student added successfully!")
      
      // Reset form
      setStudentName("")
      setParentName("")
      setWhatsappNumber("")
      setDailyCharge("")
      
      router.refresh() // Refresh the page to show the new student
    } catch (err) {
      console.error("Error in handleSubmit:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to add student"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-md" role="alert">
          <span className="block text-sm">{error}</span>
        </div>
      )}
      <div>
        <Label htmlFor="studentName">Student Name</Label>
        <Input 
          id="studentName" 
          value={studentName} 
          onChange={(e) => setStudentName(e.target.value)} 
          placeholder="Enter student name"
          required 
        />
      </div>
      <div>
        <Label htmlFor="parentName">Parent Name</Label>
        <Input 
          id="parentName" 
          value={parentName} 
          onChange={(e) => setParentName(e.target.value)} 
          placeholder="Enter parent name"
          required 
        />
      </div>
      <div>
        <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
        <Input
          id="whatsappNumber"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="Enter 10-digit mobile number"
          required
          minLength={10}
          maxLength={10}
          pattern="\d{10}"
        />
      </div>
      <div>
        <Label htmlFor="dailyCharge">Daily Charge (₹)</Label>
        <Input
          id="dailyCharge"
          type="number"
          value={dailyCharge}
          onChange={(e) => setDailyCharge(e.target.value)}
          placeholder="Enter daily fee amount"
          min="0"
          step="1"
          required
        />
      </div>
      <Button type="submit" loading={isSubmitting} className="w-full">
        Add Student
      </Button>
    </form>
  )
}
