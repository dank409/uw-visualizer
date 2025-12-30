import React, { useState, useMemo, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { searchCourses } from "@/lib/courseIndex"
import type { Course } from "@/lib/types"

interface CourseSearchProps {
  onSelectCourse: (course: Course) => void
  selectedCourse?: Course | null
  className?: string
}

export function CourseSearch({
  onSelectCourse,
  selectedCourse,
  className,
}: CourseSearchProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchCourses(query).slice(0, 10)
  }, [query])

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
    onSelectCourse(course)
    setQuery("")
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
    <div ref={searchRef} className={cn("relative w-full", className)}>
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search for a course (e.g., CS135, MATH137)..."
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setQuery(e.target.value)
          setIsOpen(true)
          setFocusedIndex(-1)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full"
      />
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-lg">
          {results.map((course: Course, index: number) => (
            <button
              key={course.code}
              type="button"
              onClick={() => handleSelect(course)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={cn(
                "w-full px-4 py-2 text-left hover:bg-accent",
                index === focusedIndex && "bg-accent"
              )}
            >
              <div className="font-medium">{course.code}</div>
              <div className="text-sm text-muted-foreground">{course.title}</div>
            </button>
          ))}
        </div>
      )}
      {selectedCourse && (
        <div className="mt-2 text-sm text-muted-foreground">
          Selected: <span className="font-medium">{selectedCourse.code}</span> - {selectedCourse.title}
        </div>
      )}
    </div>
  )
}

