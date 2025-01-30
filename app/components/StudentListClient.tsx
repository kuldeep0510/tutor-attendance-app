"use client"

import { useState, useEffect } from "react"
import { User, Edit, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditStudentModal } from "./EditStudentModal"
import { deleteStudent } from "../actions/studentActions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"

interface Student {
  id: string
  name: string
  parent_name: string
  whatsapp_number: string
  daily_charge: number
}

interface StudentListClientProps {
  initialStudents: Student[] | undefined
}

export function StudentListClient({ initialStudents }: StudentListClientProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents || [])
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (initialStudents) {
      setStudents(initialStudents)
    }
  }, [initialStudents])

  const handleDelete = async () => {
    if (!deletingStudent) return

    setIsDeleting(true)
    try {
      setStudents((currentStudents) => currentStudents.filter((student) => student.id !== deletingStudent.id))
      await deleteStudent(deletingStudent.id)
      toast.success("Student deleted successfully")
    } catch (error) {
      setStudents(initialStudents || [])
      setError("Failed to delete student. Please try again.")
      toast.error("Failed to delete student")
      console.error("Failed to delete student:", error)
    } finally {
      setIsDeleting(false)
      setDeletingStudent(null)
      router.refresh()
    }
  }

  const handleUpdate = (updatedStudent: Student) => {
    setStudents((currentStudents) =>
      currentStudents.map((student) => (student.id === updatedStudent.id ? updatedStudent : student))
    )
    setEditingStudent(null)
    toast.success("Student updated successfully")
    router.refresh()
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
          <Button onClick={() => router.refresh()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">No students found. Add a student to get started.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {students.map((student) => (
          <Card
            key={student.id}
            className="group hover:shadow-lg transition-all duration-200 cursor-pointer bg-card hover:bg-accent/50 relative touch-manipulation"
            onClick={() => router.push(`/student/${student.id}`)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20 shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground truncate">
                      {student.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {student.parent_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingStudent(student)
                    }}
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingStudent(student)
                    }}
                    className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingStudent && (
        <EditStudentModal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          student={editingStudent}
          onUpdate={handleUpdate}
        />
      )}

      <AlertDialog open={!!deletingStudent} onOpenChange={() => setDeletingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete {deletingStudent?.name}'s record and all associated attendance data. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
