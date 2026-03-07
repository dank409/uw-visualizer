import { useEffect, useMemo, useState } from "react"
import { Search, AlertTriangle } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { CatalogPathwayGraph } from "@/components/graph/CatalogPathwayGraph"
import {
  buildCourseTreeFromCatalog,
  clearCatalogCache,
  resolveCourseByCode,
  searchCatalogCourses,
  type CatalogCourseSearchItem,
  type CourseNodeData,
} from "@/lib/uwCatalog"

type RequirementOption = {
  id: string
  label: string
  kind: "course" | "program"
  code?: string
  gradeMin?: number
}

type RequirementGroup = {
  id: string
  title: string
  mode: "any" | "all"
  options: RequirementOption[]
}

type SavedCourseStatus = "completed" | "in_progress" | "planned"

type SavedCourse = {
  code: string
  status: SavedCourseStatus
}

function normalize(code: string) {
  return code.replace(/\s+/g, "").toUpperCase()
}

function isCourseCode(text: string) {
  return /^[A-Z]{2,}\d{2,4}[A-Z]?$/.test(normalize(text))
}

function parseGradeRules(html?: string) {
  const out = new Map<string, number>()
  if (!html) return out
  const doc = new DOMParser().parseFromString(html, "text/html")
  const rows = Array.from(doc.querySelectorAll('[data-test$="-result"]'))

  for (const row of rows) {
    const text = (row.textContent || "").replace(/\s+/g, " ")
    const g = text.match(/minimum grade of\s*(\d+)%/i)
    if (!g) continue
    const grade = Number(g[1])
    const anchors = Array.from(row.querySelectorAll("a"))
      .map((a) => normalize(a.textContent || ""))
      .filter((x) => isCourseCode(x))
    for (const code of anchors) out.set(code, grade)
  }

  return out
}

function makeSummarySentence(code: string, prereqCodes: string[], html?: string) {
  if (!code) return ""
  const grades = [...parseGradeRules(html).values()]
  const gradePhrase = grades.length
    ? `${Math.min(...grades)}–${Math.max(...grades)}% minimum grades may apply`
    : "grade minimums may apply"
  const programReq = html && /enrolled in/i.test(html) ? "plus program enrollment" : ""
  return `${code} requires ${Math.max(1, prereqCodes.length)} prerequisite option(s), ${gradePhrase}${programReq ? `, ${programReq}` : ""}.`
}

const SAVED_KEY = "uwv.myCourses.v1"

function loadSavedCourses(): SavedCourse[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as SavedCourse[]
    return arr
      .map((x) => ({ code: normalize(x.code), status: x.status }))
      .filter((x) => ["completed", "in_progress", "planned"].includes(x.status))
  } catch {
    return []
  }
}

function saveSavedCourses(courses: SavedCourse[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(courses))
}

function statusIcon(status: SavedCourseStatus) {
  if (status === "completed") return "✓"
  if (status === "in_progress") return "⏳"
  return "★"
}

function statusColor(status: SavedCourseStatus) {
  if (status === "completed") return "text-[hsl(var(--brand-dark))]"
  if (status === "in_progress") return "text-blue-500"
  return "text-amber-500"
}

function suggestNextCourses(targetCode: string, allSatisfied: boolean): string[] {
  const map: Record<string, string[]> = {
    MATH237: ["MATH237", "AMATH231", "STAT230", "MATH239", "CO250", "PMATH351"],
    CS136: ["CS136", "CS245", "CS246", "STAT230", "MATH239", "CS240"],
  }
  const base = map[targetCode] || [targetCode, "STAT230", "CO250", "MATH239", "AMATH231"]
  return allSatisfied ? base : base.slice(1)
}

function parseTrackerGroups(html?: string): RequirementGroup[] {
  if (!html) return []

  const doc = new DOMParser().parseFromString(html, "text/html")
  const rows = Array.from(doc.querySelectorAll('[data-test$="-result"]')).map((row, idx) => {
    const text = (row.textContent || "").replace(/\s+/g, " ").trim()
    const anchors = Array.from(row.querySelectorAll("a")).map((a) => (a.textContent || "").trim())
    const courses = anchors.map(normalize).filter((a) => isCourseCode(a))
    const programs = anchors.filter((a) => !isCourseCode(a))
    const gradeMatch = text.match(/minimum grade of\s*(\d+)%/i)
    const gradeMin = gradeMatch ? Number(gradeMatch[1]) : undefined
    return { idx, text, courses, programs, gradeMin }
  })

  const used = new Set<number>()
  const groups: RequirementGroup[] = []

  // 1) Linear algebra style row: at least 1 with many course options
  const linear = rows.find((r) => /at least\s*1\s*of the following/i.test(r.text) && r.courses.length > 1)
  if (linear) {
    used.add(linear.idx)
    groups.push({
      id: "linear",
      title: "Linear Algebra (at least 1 required)",
      mode: "any",
      options: linear.courses.map((c) => ({ id: `course:${c}`, label: c, kind: "course", code: c })),
    })
  }

  // 2) Calculus variant rows: appears in many UW rules as a "Complete 1 of following" block with 1-course rows
  const hasOneOfBlock = /Complete\s*(?:<!--\s*-->)?\s*1\s*(?:<!--\s*-->)?\s*of the following/i.test(html)
  const calcCandidateRows = rows.filter(
    (r) =>
      !used.has(r.idx) &&
      !/enrolled in/i.test(r.text) &&
      r.courses.length >= 1 &&
      (/minimum grade/i.test(r.text) || /Must have completed the following/i.test(r.text))
  )

  if (hasOneOfBlock && calcCandidateRows.length >= 2) {
    calcCandidateRows.forEach((r) => used.add(r.idx))
    const calcOptions = calcCandidateRows.flatMap((r) =>
      r.courses.map((c) => ({ id: `course:${c}`, label: c, kind: "course" as const, code: c, gradeMin: r.gradeMin }))
    )
    const dedup = new Map(calcOptions.map((o) => [o.id, o]))
    groups.push({
      id: "calc2",
      title: "Calculus 2 path (one variant)",
      mode: "any",
      options: [...dedup.values()],
    })
  }

  // 3) Program rows
  const programRows = rows.filter((r) => /enrolled in/i.test(r.text))
  if (programRows.length > 0) {
    programRows.forEach((r) => used.add(r.idx))
    const programOptions: RequirementOption[] = []

    for (const row of programRows) {
      if (row.programs.length) {
        row.programs.forEach((p) => {
          const id = `program:${p.toLowerCase()}`
          if (!programOptions.find((x) => x.id === id)) {
            programOptions.push({ id, label: p, kind: "program" })
          }
        })
      } else {
        const m = row.text.match(/Enrolled in\s*(.+)$/i)
        const label = m ? m[1] : row.text
        const id = `program:${label.toLowerCase()}`
        if (!programOptions.find((x) => x.id === id)) {
          programOptions.push({ id, label, kind: "program" })
        }
      }
    }

    if (programOptions.length) {
      groups.push({
        id: "program",
        title: "Program enrollment (one required)",
        mode: "any",
        options: programOptions,
      })
    }
  }

  // 4) Fallback for leftover rows that include course links
  const leftovers = rows.filter((r) => !used.has(r.idx) && r.courses.length > 0)
  if (leftovers.length) {
    const opts = leftovers.flatMap((r) =>
      r.courses.map((c) => ({ id: `course:${c}`, label: c, kind: "course" as const, code: c, gradeMin: r.gradeMin }))
    )
    const dedup = new Map(opts.map((o) => [o.id, o]))
    groups.push({
      id: "other",
      title: "Additional requirements",
      mode: "all",
      options: [...dedup.values()],
    })
  }

  return groups
}

export function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CatalogCourseSearchItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [targetCode, setTargetCode] = useState("")
  const [courseMap, setCourseMap] = useState<Map<string, CourseNodeData>>(new Map())
  const [selectedCode, setSelectedCode] = useState("")
  const [completedCodes, setCompletedCodes] = useState<Set<string>>(new Set())
  const [completedPrograms, setCompletedPrograms] = useState<Set<string>>(new Set())
  const [hideSatisfiedAlternatives, setHideSatisfiedAlternatives] = useState(true)

  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([])
  const [myCoursesExpanded, setMyCoursesExpanded] = useState(false)
  const [myAddQuery, setMyAddQuery] = useState("")
  const [myAddResults, setMyAddResults] = useState<CatalogCourseSearchItem[]>([])
  const [myAddOpen, setMyAddOpen] = useState(false)
  const [myAddStatus, setMyAddStatus] = useState<SavedCourseStatus>("completed")

  useEffect(() => {
    const initial = loadSavedCourses()
    setSavedCourses(initial)
    setMyCoursesExpanded(initial.length > 0)
  }, [])

  useEffect(() => {
    const code = searchParams.get("course")
    if (!code) return
    setTargetCode(normalize(code))
  }, [searchParams])

  useEffect(() => {
    if (!targetCode) return
    let active = true
    setLoading(true)
    setError(null)

    buildCourseTreeFromCatalog(targetCode, 4)
      .then((map) => {
        if (!active) return
        setCourseMap(map)
        setSelectedCode(targetCode)
        setCompletedCodes(new Set())
        setCompletedPrograms(new Set())
      })
      .catch((e) => {
        if (!active) return
        setError(`Could not fetch accurate data from the official catalog for ${targetCode}. Please verify at https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/courses`)
        console.error(e)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [targetCode])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }

    const handle = setTimeout(() => {
      searchCatalogCourses(q)
        .then((r) => setResults(r.slice(0, 12)))
        .catch(() => setResults([]))
    }, 180)

    return () => clearTimeout(handle)
  }, [query])

  const selected = useMemo(() => (selectedCode ? courseMap.get(selectedCode) || null : null), [selectedCode, courseMap])
  const target = useMemo(() => (targetCode ? courseMap.get(targetCode) || null : null), [targetCode, courseMap])

  const immediatePrereqs = useMemo(() => {
    if (!target) return []
    return target.prerequisiteCodes.map((c) => courseMap.get(c)).filter((c): c is CourseNodeData => Boolean(c))
  }, [target, courseMap])

  const summarySentence = useMemo(
    () => (target ? makeSummarySentence(target.code, target.prerequisiteCodes, target.prerequisitesHtml) : ""),
    [target]
  )

  const trackerGroups = useMemo(() => parseTrackerGroups(target?.prerequisitesHtml), [target])

  useEffect(() => {
    if (!target) return
    const completed = new Set(
      savedCourses.filter((c) => c.status === "completed").map((c) => normalize(c.code))
    )
    setCompletedCodes(completed)
  }, [savedCourses, target])

  const groupState = useMemo(() => {
    return trackerGroups.map((group) => {
      const checkedOptions = group.options.filter((opt) =>
        opt.kind === "course" ? completedCodes.has(opt.code || "") : completedPrograms.has(opt.id)
      )
      const satisfied = group.mode === "any" ? checkedOptions.length > 0 : checkedOptions.length === group.options.length
      return { ...group, checkedOptions, satisfied }
    })
  }, [trackerGroups, completedCodes, completedPrograms])

  const trackerProgress = useMemo(() => {
    const total = groupState.length
    const done = groupState.filter((g) => g.satisfied).length
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [groupState])

  const effectiveCompletedCodes = useMemo(() => {
    const next = new Set<string>(completedCodes)
    const walk = (code: string) => {
      const node = courseMap.get(code)
      if (!node) return
      for (const p of node.prerequisiteCodes) {
        if (!next.has(p)) {
          next.add(p)
          walk(p)
        }
      }
    }
    for (const code of completedCodes) walk(code)
    return next
  }, [completedCodes, courseMap])

  const hiddenCodes = useMemo(() => {
    if (!hideSatisfiedAlternatives || !target) return new Set<string>()

    const closureCache = new Map<string, Set<string>>()
    const getClosure = (start: string): Set<string> => {
      if (closureCache.has(start)) return closureCache.get(start)!
      const seen = new Set<string>()
      const walk = (code: string) => {
        if (seen.has(code)) return
        seen.add(code)
        const node = courseMap.get(code)
        if (!node) return
        for (const p of node.prerequisiteCodes) walk(p)
      }
      walk(start)
      closureCache.set(start, seen)
      return seen
    }

    const keep = new Set<string>([target.code])
    const hideCandidates = new Set<string>()

    for (const group of groupState) {
      const courseOptions = group.options.filter((o) => o.kind === "course" && o.code) as Array<RequirementOption & { code: string }>
      if (courseOptions.length === 0) continue

      const checked = group.checkedOptions.filter((o) => o.kind === "course" && o.code) as Array<RequirementOption & { code: string }>
      const visible = group.satisfied && group.mode === "any" ? checked : courseOptions

      for (const opt of visible) {
        for (const code of getClosure(opt.code)) keep.add(code)
      }

      if (group.satisfied && group.mode === "any") {
        const hidden = courseOptions.filter((o) => !checked.some((c) => c.code === o.code))
        for (const opt of hidden) {
          for (const code of getClosure(opt.code)) hideCandidates.add(code)
        }
      }
    }

    const hidden = new Set<string>()
    for (const code of hideCandidates) {
      if (!keep.has(code) && code !== target.code) hidden.add(code)
    }
    return hidden
  }, [groupState, target, courseMap, hideSatisfiedAlternatives])

  const allSatisfied = trackerProgress.total > 0 && trackerProgress.done === trackerProgress.total
  const courseGroupsSatisfied = groupState
    .filter((g) => g.id !== "program")
    .every((g) => g.satisfied)

  const missingGroupTitles = groupState.filter((g) => !g.satisfied).map((g) => g.title)

  const antireqConflicts = useMemo(() => {
    if (!target) return []
    return target.antirequisiteCodes.filter((code) => completedCodes.has(code))
  }, [target, completedCodes])

  const nextPossibleCourses = useMemo(() => suggestNextCourses(targetCode, allSatisfied), [targetCode, allSatisfied])

  useEffect(() => {
    const q = myAddQuery.trim()
    if (!q) {
      setMyAddResults([])
      return
    }
    const t = setTimeout(() => {
      searchCatalogCourses(q)
        .then((r) => setMyAddResults(r.slice(0, 8)))
        .catch(() => setMyAddResults([]))
    }, 150)
    return () => clearTimeout(t)
  }, [myAddQuery])

  const mobileLevels = useMemo(() => {
    if (!target) return [] as Array<{ level: number; courses: CourseNodeData[] }>
    const levels = new Map<number, Set<string>>()
    const seen = new Set<string>()

    const walk = (code: string, level: number) => {
      if (level > 4) return
      if (!levels.has(level)) levels.set(level, new Set())
      levels.get(level)!.add(code)
      if (seen.has(`${code}:${level}`)) return
      seen.add(`${code}:${level}`)

      const node = courseMap.get(code)
      if (!node) return
      node.prerequisiteCodes.forEach((p) => walk(p, level + 1))
    }

    walk(target.code, 0)

    return [...levels.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([level, codes]) => ({
        level,
        courses: [...codes].map((c) => courseMap.get(c)).filter((c): c is CourseNodeData => Boolean(c)),
      }))
  }, [target, courseMap])

  const selectResult = async (item: CatalogCourseSearchItem) => {
    const code = normalize(item.__catalogCourseId)
    setQuery("")
    setOpen(false)
    setSearchParams({ course: code })

    const exact = await resolveCourseByCode(code)
    if (!exact) {
      setError(`Official catalog could not resolve ${code}. Please verify directly on the calendar site.`)
    }
  }

  const upsertSavedCourse = (code: string, status: SavedCourseStatus) => {
    const normalized = normalize(code)
    setSavedCourses((prev) => {
      const existing = prev.find((p) => p.code === normalized)
      const next = existing
        ? prev.map((p) => (p.code === normalized ? { ...p, status } : p))
        : [...prev, { code: normalized, status }]
      saveSavedCourses(next)
      return next
    })
  }

  const removeSavedCourse = (code: string) => {
    const normalized = normalize(code)
    setSavedCourses((prev) => {
      const next = prev.filter((p) => p.code !== normalized)
      saveSavedCourses(next)
      return next
    })
  }

  const toggleOption = (opt: RequirementOption, checked: boolean) => {
    if (opt.kind === "course") {
      const code = opt.code || ""
      if (checked) upsertSavedCourse(code, "completed")
      else {
        const existing = savedCourses.find((s) => s.code === code)
        if (existing?.status === "completed") removeSavedCourse(code)
      }

      setCompletedCodes((prev) => {
        const next = new Set(prev)
        if (checked) next.add(code)
        else next.delete(code)
        return next
      })
    } else {
      setCompletedPrograms((prev) => {
        const next = new Set(prev)
        if (checked) next.add(opt.id)
        else next.delete(opt.id)
        return next
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      {error ? (
        <div className="mb-4 rounded-xl border-2 border-red-400 bg-red-50 p-4 text-sm text-red-800">
          <strong>Official data error:</strong> {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-border bg-card p-4 h-fit">
          <h1 className="text-xl font-semibold">UWVisualizer</h1>
          <p className="mt-1 text-sm text-muted-foreground">Official-data course pathway visualizer for UWaterloo.</p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search course (e.g., MATH237)"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--brand))/0.35]"
            />
            {open && results.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                {results.map((c) => (
                  <button key={c.id} onClick={() => selectResult(c)} className="w-full px-3 py-2 text-left hover:bg-accent">
                    <div className="text-sm font-semibold">{normalize(c.__catalogCourseId)}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{c.title}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {loading ? <p className="mt-4 text-sm text-muted-foreground">Fetching official catalog data…</p> : null}

          {target ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Target course</div>
              <div className="mt-1 font-semibold">{target.code}</div>
              <div className="text-sm text-muted-foreground">{target.title}</div>
              <div className="mt-2 text-xs text-muted-foreground">Nodes shown: {courseMap.size} (depth-limited to 4 levels)</div>
            </div>
          ) : null}

          <div className="mt-4 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p>
                Data source: Official UWaterloo Undergraduate Calendar API only. If a course fails to load accurately,
                verify directly on the official site.
              </p>
            </div>
            <button
              onClick={() => {
                clearCatalogCache()
                if (targetCode) setTargetCode("")
                setTimeout(() => setTargetCode(normalize(searchParams.get("course") || "")), 0)
              }}
              className="rounded-md border border-amber-400/70 bg-white/70 px-2 py-1 text-[11px] hover:bg-white"
            >
              Refresh data from official source
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-card p-3">
            <button
              onClick={() => setMyCoursesExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-sm font-semibold">My Completed & Planned Courses</h3>
              <span className="text-xs text-muted-foreground">{myCoursesExpanded ? "−" : "+"}</span>
            </button>

            {myCoursesExpanded ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={myAddQuery}
                      onChange={(e) => {
                        setMyAddQuery(e.target.value)
                        setMyAddOpen(true)
                      }}
                      onFocus={() => setMyAddOpen(true)}
                      placeholder="Add course"
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    {myAddOpen && myAddResults.length > 0 ? (
                      <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
                        {myAddResults.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              upsertSavedCourse(normalize(r.__catalogCourseId), myAddStatus)
                              setMyAddQuery("")
                              setMyAddOpen(false)
                            }}
                            className="w-full px-2 py-1.5 text-left hover:bg-accent"
                          >
                            <div className="text-xs font-semibold">{normalize(r.__catalogCourseId)}</div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1">{r.title}</div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <select
                    value={myAddStatus}
                    onChange={(e) => setMyAddStatus(e.target.value as SavedCourseStatus)}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>

                {savedCourses.length > 0 ? (
                  <>
                    <div className="max-h-64 space-y-1 overflow-auto pr-1">
                      {savedCourses.map((c) => (
                        <div key={c.code} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                          <span className={statusColor(c.status)}>{statusIcon(c.status)}</span>
                          <span className="font-medium flex-1">{c.code}</span>
                          <select
                            value={c.status}
                            onChange={(e) => upsertSavedCourse(c.code, e.target.value as SavedCourseStatus)}
                            className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]"
                          >
                            <option value="completed">Completed</option>
                            <option value="in_progress">In Progress</option>
                            <option value="planned">Planned</option>
                          </select>
                          <button onClick={() => removeSavedCourse(c.code)} className="text-muted-foreground hover:text-red-600">✕</button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (!confirm("Clear all saved courses?")) return
                        setSavedCourses([])
                        saveSavedCourses([])
                        setCompletedCodes(new Set())
                        setCompletedPrograms(new Set())
                      }}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
                    >
                      Clear all saved
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Add courses you've taken/planned using + or by checking in trackers.</p>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          {targetCode && courseMap.size > 0 ? (
            <>
              <div className="hidden md:block">
                <CatalogPathwayGraph
                  targetCode={targetCode}
                  courseMap={courseMap}
                  completedCodes={effectiveCompletedCodes}
                  directCompletedCodes={completedCodes}
                  hiddenCodes={hiddenCodes}
                  onSelectCode={(code) => setSelectedCode(code)}
                />
              </div>

              <div className="md:hidden rounded-xl border border-border bg-card p-3">
                <h3 className="text-sm font-semibold">Pathway levels (mobile view)</h3>
                <p className="mt-1 text-xs text-muted-foreground">Desktop shows full interactive graph. Mobile shows the same path by levels.</p>
                <div className="mt-3 space-y-3">
                  {mobileLevels.map((row) => (
                    <div key={row.level} className="rounded-lg border border-border bg-muted/20 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {row.level === 0 ? "Target" : `Level ${row.level} prerequisites`}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {row.courses.map((c) => (
                          <button
                            key={`${row.level}-${c.code}`}
                            onClick={() => setSelectedCode(c.code)}
                            className="rounded-md border border-border bg-background px-2 py-1 text-left text-xs hover:bg-accent"
                          >
                            <div className="font-semibold">{c.code}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-2">{c.title}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-[460px] md:h-[620px] rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground">
              Search for a course to visualize pathways
            </div>
          )}


          {target ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">At-a-glance requirement groups</h3>
              {immediatePrereqs.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {immediatePrereqs.map((p) => (
                    <button key={p.code} onClick={() => setSelectedCode(p.code)} className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent">
                      {p.code}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No immediate prerequisites detected in official data.</p>
              )}

              <div className="mt-3 pt-3 border-t border-border/70">
                <h4 className="text-xs font-semibold">Next possible courses</h4>
                {savedCourses.some((c) => c.status === "completed") ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nextPossibleCourses.slice(0, 6).map((code) => (
                      <button
                        key={code}
                        onClick={() => setSearchParams({ course: code })}
                        className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Mark more courses as completed to see next options.</p>
                )}
              </div>
            </div>
          ) : null}

          {selected ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.code}</h2>
                <p className="text-sm text-muted-foreground">{selected.title}</p>
                <a
                  href={`https://uwflow.com/course/${selected.code.toLowerCase()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-md border border-[hsl(var(--brand))/0.55] bg-[hsl(var(--brand))/0.16] px-2.5 py-1 text-xs font-medium text-[hsl(var(--brand-dark))] underline decoration-[hsl(var(--brand-dark))]/60"
                >
                  {selected.code} — See reviews, ratings & stats on UWFlow →
                </a>
                {summarySentence ? <p className="mt-2 text-xs text-muted-foreground">{summarySentence}</p> : null}
                <a href={selected.catalogUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[hsl(var(--brand-dark))] underline">
                  Open official calendar page
                </a>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Interactive prerequisite tracker</h3>
                  <button
                    onClick={() => {
                      setCompletedCodes(new Set())
                      setCompletedPrograms(new Set())
                    }}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
                  >
                    Reset completed courses
                  </button>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={hideSatisfiedAlternatives}
                    onChange={(e) => setHideSatisfiedAlternatives(e.target.checked)}
                  />
                  Hide satisfied alternatives
                </label>

                <div className="mt-2 text-xs text-muted-foreground">
                  {trackerProgress.done} of {trackerProgress.total} groups satisfied
                  {missingGroupTitles.length ? ` — missing: ${missingGroupTitles.join(", ")}` : ""}
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-background border border-border overflow-hidden">
                  <div className="h-full bg-[hsl(var(--brand))] transition-all" style={{ width: `${trackerProgress.pct}%` }} />
                </div>

                {courseGroupsSatisfied && !allSatisfied ? (
                  <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    All course prerequisites satisfied. Program enrollment still required.
                  </div>
                ) : null}
                {allSatisfied ? (
                  <div className="mt-3 rounded-md border border-[hsl(var(--brand))/0.45] bg-[hsl(var(--brand))/0.14] px-2 py-1 text-xs text-[hsl(var(--brand-dark))]">
                    Fully eligible based on selected completion inputs.
                  </div>
                ) : null}

                <div className="mt-3 space-y-3">
                  {groupState.map((group) => (
                    <details key={group.id} open className="rounded-md border border-border bg-background p-2">
                      <summary className="cursor-pointer list-none text-xs font-semibold flex items-center justify-between">
                        <span>{group.title}</span>
                        <span className={group.satisfied ? "text-[hsl(var(--brand-dark))]" : "text-amber-500"}>
                          {group.satisfied ? "Satisfied" : "Not satisfied"}
                        </span>
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {group.options.map((opt) => {
                          const checked = opt.kind === "course" ? completedCodes.has(opt.code || "") : completedPrograms.has(opt.id)
                          return (
                            <label key={opt.id} className={`flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs ${checked ? "border-[hsl(var(--brand))/0.45] bg-[hsl(var(--brand))/0.08]" : "border-border bg-background"}`}>
                              <input type="checkbox" checked={checked} onChange={(e) => toggleOption(opt, e.target.checked)} className="mt-0.5" />
                              <span>
                                <strong>{opt.label}</strong>
                                {opt.gradeMin ? <span className="text-amber-600"> (min {opt.gradeMin}%)</span> : null}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </details>
                  ))}
                </div>

                {antireqConflicts.length > 0 ? (
                  <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">
                    Warning: {antireqConflicts.join(", ")} conflicts with {target?.code} (antirequisite).
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <h3 className="text-sm font-semibold">Official prerequisites</h3>
                {selected.prerequisitesHtml ? (
                  <div className="mt-2 text-xs leading-5 text-foreground [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_a]:underline" dangerouslySetInnerHTML={{ __html: selected.prerequisitesHtml }} />
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No prerequisites listed.</p>
                )}
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                <h3 className="text-sm font-semibold text-red-800">Antirequisite conflicts</h3>
                {selected.antirequisiteCodes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.antirequisiteCodes.map((code) => (
                      <span key={code} className="rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs text-red-700">
                        {code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No antirequisites listed.</p>
                )}
                {selected.antirequisitesHtml ? (
                  <div className="mt-2 text-xs leading-5 text-foreground [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_a]:underline" dangerouslySetInnerHTML={{ __html: selected.antirequisitesHtml }} />
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
