import { useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { CatalogPathwayGraph } from "@/components/graph/CatalogPathwayGraph"
import {
  buildCourseTreeFromCatalog,
  clearCatalogCache,
  searchCatalogCourses,
  type CatalogCourseSearchItem,
  type CourseNodeData,
} from "@/lib/uwCatalog"
import { parseTrackerGroups, type RequirementOption } from "@/lib/prereqGroups"

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
  const list = allSatisfied ? base : base.slice(1)
  return [...new Set(list)]
}



export function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [targetCode, setTargetCode] = useState("")
  const [courseMap, setCourseMap] = useState<Map<string, CourseNodeData>>(new Map())
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


  const target = useMemo(() => (targetCode ? courseMap.get(targetCode) || null : null), [targetCode, courseMap])
  const selected = target

  const trackerGroups = useMemo(() => parseTrackerGroups(target?.prerequisitesHtml), [target])

  const immediatePrereqs = useMemo(() => {
    if (!target) return []
    const topCodes = [...new Set(
      trackerGroups
        .flatMap((g) => g.options)
        .filter((o) => o.kind === "course" && o.code)
        .map((o) => o.code as string)
    )]
    return topCodes.map((c) => courseMap.get(c)).filter((c): c is CourseNodeData => Boolean(c))
  }, [target, trackerGroups, courseMap])

  const summarySentence = useMemo(
    () => (target ? makeSummarySentence(target.code, immediatePrereqs.map((c) => c.code), target.prerequisitesHtml) : ""),
    [target, immediatePrereqs]
  )

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
    // Only treat explicitly checked/saved courses as completed.
    // Auto-inferring transitive prerequisites from graph edges over-highlights OR branches.
    return new Set<string>(completedCodes)
  }, [completedCodes])

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

    const altHidden = new Set<string>()

    // Global pass: apply satisfied-OR hiding to every node in the visible tree,
    // not only the target course's own requirement groups.
    for (const node of courseMap.values()) {
      const groups = parseTrackerGroups(node.prerequisitesHtml)
      const anyCourseGroups = groups.filter((g) => g.mode === "any" && g.options.some((o) => o.kind === "course" && o.code))

      for (const group of groups) {
        const courseOptions = group.options.filter((o) => o.kind === "course" && o.code) as Array<RequirementOption & { code: string }>
        if (courseOptions.length === 0) continue

        const checked = courseOptions.filter((o) => effectiveCompletedCodes.has(o.code))
        if (group.mode === "any" && checked.length > 0) {
          const hidden = courseOptions.filter((o) => !checked.some((c) => c.code === o.code))
          for (const opt of hidden) {
            for (const code of getClosure(opt.code)) altHidden.add(code)
          }
        }
      }

      // Fallback for nested "Complete 1 of the following" structures that may not
      // be fully captured by row-level parsing (e.g., CS136-style wrapper rules).
      if (anyCourseGroups.length === 0 && /Complete\s*(?:<!-- -->)?1(?:<!-- -->)?\s*of the following/i.test(node.prerequisitesHtml) && node.prerequisiteCodes.length > 1) {
        const options = node.prerequisiteCodes
        const checked = options.filter((code) => effectiveCompletedCodes.has(code))
        if (checked.length > 0) {
          for (const alt of options) {
            if (checked.includes(alt)) continue
            for (const c of getClosure(alt)) altHidden.add(c)
          }
        }
      }
    }

    // Recompute what is still needed from target after hiding alternatives.
    const needed = new Set<string>()
    const walkNeeded = (code: string) => {
      if (needed.has(code)) return
      needed.add(code)
      const node = courseMap.get(code)
      if (!node) return
      for (const p of node.prerequisiteCodes) {
        if (altHidden.has(p)) continue
        walkNeeded(p)
      }
    }
    walkNeeded(target.code)

    const hidden = new Set<string>()
    for (const code of courseMap.keys()) {
      if (!needed.has(code) && code !== target.code) hidden.add(code)
    }
    return hidden
  }, [target, courseMap, hideSatisfiedAlternatives, effectiveCompletedCodes])

  const statusByCode = useMemo(() => new Map(savedCourses.map((c) => [c.code, c.status])), [savedCourses])

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

          <div className="mt-4 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Use the top navigation search to find and jump to any course (same behavior across homepage and course pages).
          </div>

          {loading ? <p className="mt-4 text-sm text-muted-foreground">Fetching official catalog data…</p> : null}

          {target ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Target course</div>
              <div className="mt-1 font-semibold">{target.code}</div>
              <div className="text-sm text-muted-foreground">{target.title}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <a
                  href={target.catalogUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-muted-foreground transition hover:border-[hsl(var(--brand))/0.45] hover:text-foreground"
                >
                  <span aria-hidden>📅</span>
                  <span>Official Calendar page</span>
                </a>
                <a
                  href={`https://uwflow.com/course/${target.code.toLowerCase()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-muted-foreground transition hover:border-[hsl(var(--brand))/0.45] hover:text-foreground"
                >
                  <span aria-hidden>⭐</span>
                  <span>UWFlow reviews</span>
                </a>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Nodes shown: {courseMap.size}</div>
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
                  statusByCode={statusByCode}
                  onSetStatus={(code, status) => upsertSavedCourse(code, status)}
                  onRemoveStatus={(code) => removeSavedCourse(code)}
                  onViewCourse={(code) => setSearchParams({ course: code })}
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
                            onClick={() => setSearchParams({ course: c.code })}
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
                    <button key={p.code} onClick={() => setSearchParams({ course: p.code })} className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent">
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
                {summarySentence ? <p className="mt-2 text-xs text-muted-foreground">{summarySentence}</p> : null}
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
