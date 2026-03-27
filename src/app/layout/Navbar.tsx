import { Link, useNavigate, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Search, Layers } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { searchCatalogCourses, type CatalogCourseSearchItem } from "@/lib/uwCatalog"
import ThemeSwitch from "@/components/ui/theme-switch"

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/programmes", label: "Programs" },
  { to: "/about", label: "About" },
]

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [results, setResults] = useState<CatalogCourseSearchItem[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setResults([])
      return
    }

    let active = true
    const t = setTimeout(() => {
      searchCatalogCourses(q)
        .then((rows) => {
          if (!active) return
          setResults(rows.slice(0, 12))
        })
        .catch(() => {
          if (!active) return
          setResults([])
        })
    }, 120)

    return () => {
      active = false
      clearTimeout(t)
    }
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const normalize = (code: string) => code.replace(/\s+/g, "").toUpperCase()

  const handleSelect = (course: CatalogCourseSearchItem) => {
    navigate(`/courses?course=${encodeURIComponent(normalize(course.__catalogCourseId))}`)
    setSearchQuery("")
    setIsOpen(false)
    setFocusedIndex(-1)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setFocusedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
      setIsOpen(true)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === "Enter" && focusedIndex >= 0 && results[focusedIndex]) {
      e.preventDefault()
      handleSelect(results[focusedIndex])
    } else if (e.key === "Enter" && results.length === 1) {
      e.preventDefault()
      handleSelect(results[0])
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setFocusedIndex(-1)
    }
  }

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-30 w-full">
      <nav className="glass-panel mx-auto flex h-14 items-center gap-2 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0 mr-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand-dark))] shadow-sm">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="hidden sm:inline text-sm font-semibold tracking-tight text-foreground">
            UW Visualizer
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5 ml-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                isActive(link.to)
                  ? "text-foreground bg-accent/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div ref={searchRef} className="relative flex-1 max-w-md ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
              setFocusedIndex(-1)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search courses..."
            className="w-full rounded-lg glass-input py-1.5 pl-8 pr-3 text-[13px] text-foreground placeholder-muted-foreground"
          />
          {isOpen && results.length > 0 && (
            <div className="absolute z-[1200] mt-1.5 max-h-72 w-full overflow-auto rounded-xl glass-elevated">
              {results.map((course, index: number) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleSelect(course)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={cn(
                    "w-full px-3 py-2.5 text-left transition-colors first:rounded-t-xl last:rounded-b-xl",
                    index === focusedIndex
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="text-[13px] font-semibold text-foreground">{normalize(course.__catalogCourseId)}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground mt-0.5">{course.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 ml-2">
          <ThemeSwitch />
        </div>
      </nav>
    </header>
  )
}
