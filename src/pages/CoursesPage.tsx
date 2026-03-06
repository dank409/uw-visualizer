import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CheckCircle2, Circle, Search } from "lucide-react"
import { buildPrerequisiteTree, type PrerequisiteRule, type CourseRequirement } from "@/lib/prereq/prereqTree"
import { getCourse, loadCourseIndex, searchCourses } from "@/lib/courseIndex"
import type { Course } from "@/lib/types"

function normalizeCode(code: string) {
  return code.replace(/\s+/g, "").toUpperCase()
}

function evaluateRequirement(
  requirement: PrerequisiteRule | CourseRequirement,
  completed: Set<string>
): boolean {
  if (requirement.type === "course") {
    return completed.has(normalizeCode(requirement.course_code))
  }

  if (requirement.logic === "AND") {
    return requirement.requirements.every((r) => evaluateRequirement(r, completed))
  }

  return requirement.requirements.some((r) => evaluateRequirement(r, completed))
}

function RequirementNode({
  requirement,
  completed,
  onToggle,
  depth = 0,
}: {
  requirement: PrerequisiteRule | CourseRequirement
  completed: Set<string>
  onToggle: (code: string) => void
  depth?: number
}) {
  if (requirement.type === "course") {
    const code = normalizeCode(requirement.course_code)
    const course = getCourse(code)
    const done = completed.has(code)
    return (
      <button
        onClick={() => onToggle(code)}
        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
          done
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-border bg-card hover:bg-accent"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{code}</div>
            <div className="text-xs text-muted-foreground line-clamp-1">{course?.title || "Course"}</div>
            {requirement.grade_min ? (
              <div className="mt-1 text-[11px] text-amber-600">Minimum grade: {requirement.grade_min}%</div>
            ) : null}
          </div>
          {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" /> : <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />}
        </div>
      </button>
    )
  }

  const satisfied = evaluateRequirement(requirement, completed)

  return (
    <div className="space-y-2">
      <div
        className={`rounded-lg border px-3 py-2 text-xs font-medium ${
          satisfied
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-border bg-muted/30 text-foreground"
        }`}
      >
        {requirement.logic === "AND" ? "All of the following" : "At least one of the following"}
      </div>
      <div className={`space-y-2 ${depth > 0 ? "pl-3 border-l border-border/70" : ""}`}>
        {requirement.requirements.map((child, idx) => (
          <RequirementNode
            key={idx}
            requirement={child}
            completed={completed}
            onToggle={onToggle}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  )
}

export function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCourseIndex().then(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return
    const code = searchParams.get("course")
    if (!code) return
    const course = getCourse(code)
    if (course) setSelectedCourse(course)
  }, [loading, searchParams])

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchCourses(query).slice(0, 12)
  }, [query])

  const tree = useMemo(() => {
    if (!selectedCourse) return null
    return buildPrerequisiteTree(selectedCourse.code)
  }, [selectedCourse])

  const academicReady = useMemo(() => {
    if (!tree?.prerequisites) return true
    return evaluateRequirement(tree.prerequisites, completed)
  }, [tree, completed])

  const toggleCourse = (code: string) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const selectCourse = (course: Course) => {
    setSelectedCourse(course)
    setSearchParams({ course: course.code })
    setQuery("")
    setOpen(false)
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading course data…</div>
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <section className="rounded-xl border border-border bg-card p-4">
          <h1 className="text-xl font-semibold">Course Planner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a course, then mark completed courses to check if you’re ready.
          </p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search by code or title"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--brand))/0.4]"
            />
            {open && results.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                {results.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => selectCourse(c)}
                    className="w-full px-3 py-2 text-left hover:bg-accent"
                  >
                    <div className="text-sm font-semibold">{c.code}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{c.title}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {selectedCourse ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Selected course</div>
              <div className="mt-1 font-semibold">{selectedCourse.code}</div>
              <div className="text-sm text-muted-foreground">{selectedCourse.title}</div>
            </div>
          ) : null}

          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Academic readiness</div>
            <div className={`mt-1 text-sm font-semibold ${academicReady ? "text-emerald-600" : "text-amber-600"}`}>
              {selectedCourse ? (academicReady ? "Eligible (academically)" : "Not yet eligible") : "Select a course"}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Toggle requirement cards on the right to simulate completed courses.</div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          {!selectedCourse ? (
            <div className="py-16 text-center text-muted-foreground">Select a course to view prerequisite structure.</div>
          ) : tree?.error ? (
            <div className="text-sm text-destructive">{tree.error}</div>
          ) : !tree?.prerequisites ? (
            <div className="py-16 text-center text-muted-foreground">No prerequisites listed for this course.</div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Prerequisite Structure</h2>
              <RequirementNode requirement={tree.prerequisites} completed={completed} onToggle={toggleCourse} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
