import { Link, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"
import { useState, useMemo, useRef, useEffect } from "react"
import { searchCourses, loadCourseIndex } from "@/lib/courseIndex"
import type { Course } from "@/lib/types"
import ThemeSwitch from "@/components/ui/theme-switch"

export function Navbar() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  // Load course index on mount
  useEffect(() => {
    loadCourseIndex()
  }, [])

  const results = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchCourses(searchQuery).slice(0, 10)
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

  useEffect(() => {
    const updateRect = () => {
      if (!inputRef.current) return
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownRect({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }

    updateRect()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [isOpen, searchQuery])

  const handleSelect = (course: Course) => {
    navigate(`/courses?course=${encodeURIComponent(course.code)}`)
    setSearchQuery("")
    setIsOpen(false)
    setFocusedIndex(-1)
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
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setFocusedIndex(-1)
    }
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/70 backdrop-blur-xl" style={{ borderColor: 'hsl(var(--header-border) / 0.45)' }}>
      <nav className="mx-auto flex h-[74px] max-w-screen-xl items-center gap-3 px-4 md:px-6 lg:px-8">
        <Link to="/" className="flex items-center shrink-0 min-w-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="hsl(var(--brand))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="hsl(var(--brand))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="hsl(var(--brand))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="ml-2 hidden text-base font-semibold tracking-tight text-foreground sm:inline">UW Visualizer</span>
        </Link>

        <div ref={searchRef} className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            placeholder="Search courses by code or title"
            className="w-full rounded-xl liquid-glass-soft py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))/0.45]"
            style={{ borderColor: 'hsl(var(--search-border))' }}
          />
          {isOpen && results.length > 0 && (
            <div
              className="fixed z-[1200] max-h-64 overflow-auto rounded-xl border liquid-glass animate-in fade-in-0 zoom-in-95 duration-100"
              style={{
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                borderColor: 'hsl(var(--dropdown-border) / 0.65)'
              }}
            >
              {results.map((course: Course, index: number) => (
                <button
                  key={course.code}
                  type="button"
                  onClick={() => handleSelect(course)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-accent",
                    index === focusedIndex && "bg-accent"
                  )}
                >
                  <div className="font-semibold text-foreground">{course.code}</div>
                  <div className="line-clamp-1 text-sm text-muted-foreground">{course.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <ThemeSwitch />
        </div>
      </nav>
    </header>
  )
}

