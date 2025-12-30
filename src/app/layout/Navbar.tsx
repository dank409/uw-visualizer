import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

const navItems = [
  { path: "/courses", label: "Courses" },
  { path: "/programmes", label: "Programmes" },
  { path: "/about", label: "About" },
]

export function Navbar() {
  const location = useLocation()

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-sm" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link 
          to="/" 
          className="text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          UW Visualizer
        </Link>
        <div className="flex gap-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

