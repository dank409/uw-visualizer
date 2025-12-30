import React from "react"
import { CourseSearchCommand } from "./CourseSearchCommand"
import type { Course } from "@/lib/types"

interface CourseSidebarProps {
  selectedCourse: Course | null
  onSelectCourse: (course: Course) => void
}

export function CourseSidebar({
  selectedCourse,
  onSelectCourse,
}: CourseSidebarProps) {

  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-background/95 backdrop-blur-sm" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
      {/* Header */}
      <div className="border-b border-border p-5" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Course Graph</h1>
      </div>

      {/* Search Section */}
      <div className="flex-1 p-5">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Search Courses
        </h2>
        <CourseSearchCommand
          selectedCourse={selectedCourse}
          onSelectCourse={onSelectCourse}
        />
      </div>


    </div>
  )
}

