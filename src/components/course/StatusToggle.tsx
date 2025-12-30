import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CourseStatus } from "@/lib/types"

interface StatusToggleProps {
  status: CourseStatus
  onStatusChange: (status: CourseStatus) => void
  className?: string
}

export function StatusToggle({
  status,
  onStatusChange,
  className,
}: StatusToggleProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        variant={status === "completed" ? "default" : "outline"}
        size="sm"
        onClick={() => onStatusChange("completed")}
        className={cn(
          status === "completed" && "bg-green-600 hover:bg-green-700"
        )}
      >
        Completed
      </Button>
      <Button
        variant={status === "in_progress" ? "default" : "outline"}
        size="sm"
        onClick={() => onStatusChange("in_progress")}
        className={cn(
          status === "in_progress" && "bg-blue-600 hover:bg-blue-700"
        )}
      >
        In Progress
      </Button>
      <Button
        variant={status === "not_taken" ? "default" : "outline"}
        size="sm"
        onClick={() => onStatusChange("not_taken")}
      >
        Not Taken
      </Button>
    </div>
  )
}

