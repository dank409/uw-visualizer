import React, { useState, useMemo } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { searchCourses } from "@/lib/courseIndex"
import type { Course } from "@/lib/types"

interface CourseSearchCommandProps {
  selectedCourse: Course | null
  onSelectCourse: (course: Course) => void
}

export function CourseSearchCommand({
  selectedCourse,
  onSelectCourse,
}: CourseSearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Search courses based on query
  const courses = useMemo(() => {
    if (!searchQuery.trim()) {
      return []
    }
    return searchCourses(searchQuery).slice(0, 50) // Limit to 50 results
  }, [searchQuery])

  const handleSelect = (value: string) => {
    // Extract course code from the value (format: "CODE Title")
    const courseCode = value.split(" ")[0]
    const course = courses.find((c) => c.code === courseCode)
    if (course) {
      onSelectCourse(course)
      setOpen(false)
      setSearchQuery("")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-input border-border text-foreground px-3 font-normal outline-offset-0 hover:bg-input focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20"
          style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
        >
          <span className={cn("truncate", !selectedCourse && "text-muted-foreground")}>
            {selectedCourse
              ? `${selectedCourse.code} - ${selectedCourse.title}`
              : "Search by code or title..."}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground/80"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full min-w-[var(--radix-popover-trigger-width)] border-input p-0 bg-card"
        align="start"
        style={{ 
          borderColor: 'hsl(var(--border) / 0.5)',
          backgroundColor: 'hsl(var(--card))'
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search courses..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="text-foreground"
          />
          <CommandList>
            <CommandEmpty>No course found.</CommandEmpty>
            <CommandGroup>
              {courses.map((course) => (
                <CommandItem
                  key={course.code}
                  value={`${course.code} ${course.title}`}
                  onSelect={handleSelect}
                  className="text-foreground"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold">{course.code}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {course.title}
                    </span>
                  </div>
                  {selectedCourse?.code === course.code && (
                    <Check size={16} strokeWidth={2} className="ml-auto shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

