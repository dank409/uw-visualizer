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
    <header className="sticky top-0 z-30 w-full backdrop-blur-md border-b bg-background/95" style={{ borderColor: 'hsl(var(--header-border) / 0.5)' }}>
      <nav className="relative flex items-center max-w-screen-xl mx-auto h-[70px] px-6 md:px-10 lg:px-16">
        <Link to="/" className="flex items-center flex-shrink-0 absolute left-4 md:left-6 lg:left-8">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="hsl(var(--brand))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="hsl(var(--brand))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="hsl(var(--brand))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xl font-bold text-foreground ml-2">UW Visualizer</span>
        </Link>

        <div 
          ref={searchRef}
          className="hidden md:flex items-center absolute left-1/2 transform -translate-x-1/2 w-full max-w-md"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
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
              className="w-full pl-10 pr-4 py-2 rounded-md bg-[hsl(var(--search-bg))] border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))] focus:border-transparent transition-all text-sm"
              style={{ borderColor: 'hsl(var(--search-border))' }}
            />
            {isOpen && results.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-xl bg-[hsl(var(--dropdown-bg))]" style={{ borderColor: 'hsl(var(--dropdown-border))' }}>
                {results.map((course: Course, index: number) => (
                  <button
                    key={course.code}
                    type="button"
                    onClick={() => handleSelect(course)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-accent transition-colors",
                      index === focusedIndex && "bg-accent"
                    )}
                  >
                    <div className="font-semibold text-foreground">{course.code}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">{course.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center flex-shrink-0 absolute right-4 md:right-6 lg:right-8">
          <ThemeSwitch />
        </div>

      </nav>
    </header>
  )
}

