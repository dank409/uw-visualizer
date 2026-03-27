import { useEffect, useState } from "react"
import { Monitor } from "lucide-react"

export function MobileBlocker() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  if (!isMobile) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--brand-subtle))] flex items-center justify-center mx-auto mb-4">
          <Monitor className="w-6 h-6 text-[hsl(var(--brand-dark))]" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          Desktop recommended
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          The graph visualizer works best on a larger screen. Please switch to a desktop browser for the full experience.
        </p>
      </div>
    </div>
  )
}
