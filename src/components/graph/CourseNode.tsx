import { useState, useEffect } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { cn } from "@/lib/utils"
import { getCourseStatus } from "@/lib/storage/courseStatusStore"
import type { CourseCode, CourseStatus } from "@/lib/types"

interface CourseNodeData {
  code: CourseCode
  label: string
  isTarget: boolean
  gradeRequirement?: string // For displaying grade badges
  hasOrPrerequisites?: boolean // Indicates "Complete any ONE" requirement
}

export function CourseNode({ data, selected }: NodeProps<CourseNodeData>) {
  const [status, setStatus] = useState<CourseStatus>(getCourseStatus(data.code))
  const isHighlighted = selected

  useEffect(() => {
    const handleStatusChange = () => {
      setStatus(getCourseStatus(data.code))
    }
    
    window.addEventListener("courseStatusChanged", handleStatusChange)
    return () => {
      window.removeEventListener("courseStatusChanged", handleStatusChange)
    }
  }, [data.code])

  const statusStyles: Record<CourseStatus, string> = {
    completed: "bg-green-500/15 border-green-500/50 text-green-400 shadow-green-500/10",
    in_progress: "bg-blue-500/15 border-blue-500/50 text-blue-400 shadow-blue-500/10",
    not_taken: "bg-muted/30 border-border text-muted-foreground",
  }

  return (
    <div className="flex flex-col items-center">
      {data.hasOrPrerequisites && (
        <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-200 dark:bg-blue-800 border-2 border-blue-400 dark:border-blue-600 shadow-md">
          <span className="text-[10px] font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
            Requires:
          </span>
          <span className="text-[10px] font-medium text-blue-800 dark:text-blue-200">
            Any one of the following
          </span>
        </div>
      )}
      <div
        className={cn(
          "min-w-[180px] rounded-xl border border-border bg-card/80 p-4 shadow-lg backdrop-blur-sm transition-all duration-200",
          statusStyles[status],
          data.isTarget && "ring-2 ring-blue-500/50 ring-offset-2 ring-offset-background shadow-xl shadow-blue-500/20",
          isHighlighted && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background scale-105 shadow-xl",
          "hover:shadow-xl hover:scale-[1.02]"
        )}
        style={{ borderColor: status === 'not_taken' ? 'hsl(var(--border) / 0.5)' : undefined }}
      >
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!h-2 !w-2 !border-2 !border-primary/50 !bg-background" 
        />
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="font-bold text-sm tracking-tight text-foreground">{data.code}</div>
          {data.gradeRequirement && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 border border-purple-400 dark:border-purple-600">
              {data.gradeRequirement}
            </span>
          )}
          </div>
          <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {data.label}
          </div>
        </div>

        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="!h-2 !w-2 !border-2 !border-primary/50 !bg-background" 
        />
      </div>
    </div>
  )
}

