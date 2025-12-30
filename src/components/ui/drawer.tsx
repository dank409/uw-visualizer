import * as React from "react"
import { cn } from "@/lib/utils"

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Drawer({ open, onOpenChange, children }: DrawerProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-background shadow-lg transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ backgroundColor: 'hsl(var(--background))' }}
      >
        {children}
      </div>
    </>
  )
}

interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DrawerContent({ className, children, ...props }: DrawerContentProps) {
  return (
    <div className={cn("flex h-full flex-col", className)} {...props}>
      {children}
    </div>
  )
}

interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
}

interface DrawerTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
}

interface DrawerDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function DrawerDescription({ className, ...props }: DrawerDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  return (
    <div className={cn("mt-auto flex flex-col gap-2 p-6", className)} {...props} />
  )
}

