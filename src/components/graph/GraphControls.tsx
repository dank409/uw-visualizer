import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GraphControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onReset: () => void
  className?: string
}

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onReset,
  className,
}: GraphControlsProps) {
  return (
    <div className={cn("absolute bottom-6 right-6 flex flex-col gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomIn}
        className="glass border-border text-foreground transition-all duration-200 hover:bg-accent/50 hover:scale-105"
        style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
      >
        +
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomOut}
        className="glass border-border text-foreground transition-all duration-200 hover:bg-accent/50 hover:scale-105"
        style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
      >
        −
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onFitView}
        className="glass border-border text-foreground transition-all duration-200 hover:bg-accent/50 hover:scale-105"
        style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
      >
        Fit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="glass border-border text-foreground transition-all duration-200 hover:bg-accent/50 hover:scale-105"
        style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
      >
        Reset
      </Button>
    </div>
  )
}

