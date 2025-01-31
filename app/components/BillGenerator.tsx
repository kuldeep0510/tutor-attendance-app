import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { GenerateBillButton } from "./GenerateBillButton"

interface Student {
  id: string;
  name: string;
  whatsapp_number: string;
}

export function BillGenerator({ students }: { students: Student[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Generate Bills</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Bills</DialogTitle>
          <DialogDescription>
            Select students and generate bills for the selected period.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {students.map((student) => (
            <div key={student.id} className="p-4 border rounded">
              <h3 className="font-medium mb-2">{student.name}</h3>
              <GenerateBillButton studentId={student.id} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
