import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: "top" | "bottom" | "left" | "right"
}

export function Tooltip({ children, content, side = "top" }: TooltipProps) {
  const [show, setShow] = React.useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={cn(
            "absolute z-50 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow-md",
            {
              "bottom-full left-1/2 mb-2 -translate-x-1/2": side === "top",
              "top-full left-1/2 mt-2 -translate-x-1/2": side === "bottom",
              "right-full top-1/2 mr-2 -translate-y-1/2": side === "left",
              "left-full top-1/2 ml-2 -translate-y-1/2": side === "right",
            }
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

