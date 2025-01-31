"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AddStudentModal } from "./AddStudentModal"
import { UserPlus } from "lucide-react"

export function AddStudentButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button 
        onClick={() => setIsModalOpen(true)} 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        size="lg"
      >
        <UserPlus className="w-5 h-5 mr-2" />
        Add New Student
      </Button>
      <AddStudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
