"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface StudentDetailsProps {
  student: {
    name: string
    parent_name: string
    whatsapp_number: string
    daily_charge: number
  }
}

export function CollapsibleStudentDetails({ student }: StudentDetailsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{student.name}</h2>
              <p className="text-sm text-muted-foreground">{student.parent_name}</p>
            </div>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="hover:bg-primary/10 hover:text-primary"
              >
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle details</span>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">WhatsApp Number</h3>
                <p className="text-foreground">{student.whatsapp_number}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Daily Charge</h3>
                <p className="text-foreground">₹{student.daily_charge}</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
