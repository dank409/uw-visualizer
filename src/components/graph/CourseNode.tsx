import { useState, useEffect } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { cn } from "@/lib/utils"
import { getCourseStatus } from "@/lib/storage/courseStatusStore"
import type { CourseCode, CourseStatus } from "@/lib/types"

interface CourseNodeData {
  code: CourseCode
  label: string
  isTarget: boolean
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
        <div className="font-bold text-sm tracking-tight text-foreground">{data.code}</div>
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
  )
}

