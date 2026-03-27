import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, ExternalLink, X, Search } from "lucide-react"
import { motion } from "framer-motion"
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
import { cn } from "@/lib/utils"

type SavedCourseStatus = "completed" | "in_progress" | "planned"
type SavedCourse = { code: string; status: SavedCourseStatus }

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

const statusConfig = {
  completed: { icon: "✓", color: "text-[hsl(var(--brand-dark))]", label: "Completed" },
  in_progress: { icon: "●", color: "text-blue-500", label: "In Progress" },
  planned: { icon: "○", color: "text-amber-500", label: "Planned" },
} as const

const quickStartCourses = ["CS245", "CS246", "CS341", "MATH237", "CO250", "AMATH231", "STAT230", "PHYS122"]

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
        setError(`Could not fetch data for ${targetCode}. Please verify at the official catalog.`)
        console.error(e)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => { active = false }
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

  const effectiveCompletedCodes = useMemo(() => new Set<string>(completedCodes), [completedCodes])

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
  const courseGroupsSatisfied = groupState.filter((g) => g.id !== "program").every((g) => g.satisfied)
  const antireqConflicts = useMemo(() => {
    if (!target) return []
    return target.antirequisiteCodes.filter((code) => completedCodes.has(code))
  }, [target, completedCodes])

  const nextPossibleCourses = useMemo(() => suggestNextCourses(targetCode, allSatisfied), [targetCode, allSatisfied])

  useEffect(() => {
    const q = myAddQuery.trim()
    if (!q) { setMyAddResults([]); return }
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6"
    >
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left sidebar panel */}
        <div className="space-y-3">
          {/* Course info card */}
          <section className="glass-panel rounded-2xl p-4">
            <h1 className="text-base font-semibold text-foreground">Course Explorer</h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Search for a course using the navbar to visualize its prerequisite pathway.
            </p>

            {loading && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full border-2 border-[hsl(var(--brand))] border-t-transparent animate-spin" />
                Fetching catalog data...
              </div>
            )}

            {target && (
              <div className="mt-3 rounded-xl border border-border/50 bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Target</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{target.code}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{target.title}</div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <a
                    href={target.catalogUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-card/60 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Calendar
                  </a>
                  <a
                    href={`https://uwflow.com/course/${target.code.toLowerCase()}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-card/60 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    UWFlow
                  </a>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">{courseMap.size} nodes in graph</div>
              </div>
            )}
          </section>

          {/* My Courses card */}
          <section className="glass-panel rounded-2xl p-4">
            <button
              onClick={() => setMyCoursesExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-sm font-semibold text-foreground">My Courses</h3>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", myCoursesExpanded && "rotate-180")} />
            </button>

            {myCoursesExpanded && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    <input
                      value={myAddQuery}
                      onChange={(e) => { setMyAddQuery(e.target.value); setMyAddOpen(true) }}
                      onFocus={() => setMyAddOpen(true)}
                      placeholder="Add course..."
                      className="w-full rounded-lg glass-input pl-7 pr-2 py-1.5 text-xs"
                    />
                    {myAddOpen && myAddResults.length > 0 && (
                      <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl glass-elevated">
                        {myAddResults.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              upsertSavedCourse(normalize(r.__catalogCourseId), myAddStatus)
                              setMyAddQuery("")
                              setMyAddOpen(false)
                            }}
                            className="w-full px-2.5 py-2 text-left hover:bg-accent/60 first:rounded-t-xl last:rounded-b-xl transition-colors"
                          >
                            <div className="text-xs font-semibold">{normalize(r.__catalogCourseId)}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1">{r.title}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <select
                    value={myAddStatus}
                    onChange={(e) => setMyAddStatus(e.target.value as SavedCourseStatus)}
                    className="rounded-lg glass-input px-2 py-1.5 text-[11px] bg-card/50"
                  >
                    <option value="completed">Done</option>
                    <option value="in_progress">In Progress</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>

                {savedCourses.length > 0 ? (
                  <>
                    <div className="max-h-56 space-y-1 overflow-auto pr-0.5">
                      {savedCourses.map((c) => {
                        const cfg = statusConfig[c.status]
                        return (
                          <div key={c.code} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/30 px-2.5 py-1.5 text-xs group">
                            <span className={cn("text-[10px]", cfg.color)}>{cfg.icon}</span>
                            <span className="font-medium flex-1 text-foreground">{c.code}</span>
                            <select
                              value={c.status}
                              onChange={(e) => upsertSavedCourse(c.code, e.target.value as SavedCourseStatus)}
                              className="rounded border border-border/40 bg-transparent px-1 py-0.5 text-[10px] text-muted-foreground"
                            >
                              <option value="completed">Done</option>
                              <option value="in_progress">In Progress</option>
                              <option value="planned">Planned</option>
                            </select>
                            <button
                              onClick={() => removeSavedCourse(c.code)}
                              className="text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => {
                        if (!confirm("Clear all saved courses?")) return
                        setSavedCourses([])
                        saveSavedCourses([])
                        setCompletedCodes(new Set())
                        setCompletedPrograms(new Set())
                      }}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear all
                    </button>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Add courses you've taken or plan to take.</p>
                )}
              </div>
            )}
          </section>

          {/* Data source notice */}
          <div className="rounded-xl border border-[hsl(var(--brand)/0.2)] bg-[hsl(var(--brand-subtle))] p-3 text-xs text-[hsl(var(--brand-dark))]">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p className="leading-relaxed">Data from official UW catalog API. Verify on the official site if unsure.</p>
            </div>
            <button
              onClick={() => {
                clearCatalogCache()
                if (targetCode) setTargetCode("")
                setTimeout(() => setTargetCode(normalize(searchParams.get("course") || "")), 0)
              }}
              className="mt-2 rounded-lg border border-[hsl(var(--brand)/0.3)] bg-[hsl(var(--brand-muted)/0.3)] px-2 py-1 text-[11px] font-medium hover:bg-[hsl(var(--brand-muted)/0.5)] transition-colors"
            >
              Refresh data
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="space-y-3">
          {/* Graph or empty state */}
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

              {/* Mobile fallback */}
              <div className="md:hidden glass-panel rounded-2xl p-4">
                <h3 className="text-sm font-semibold">Pathway levels</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">Full interactive graph available on desktop.</p>
                <div className="mt-3 space-y-2.5">
                  {mobileLevels.map((row) => (
                    <div key={row.level} className="rounded-xl border border-border/40 bg-card/30 p-2.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                        {row.level === 0 ? "Target" : `Level ${row.level}`}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {row.courses.map((c) => (
                          <button
                            key={`${row.level}-${c.code}`}
                            onClick={() => setSearchParams({ course: c.code })}
                            className="rounded-lg border border-border/40 bg-card/40 px-2 py-1.5 text-left text-xs hover:bg-accent/50 transition-colors"
                          >
                            <div className="font-semibold text-foreground">{c.code}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1">{c.title}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center">
              <div className="text-sm text-muted-foreground">Search for a course to visualize its pathway.</div>
              <div className="mt-4 text-xs text-muted-foreground">Try one of these:</div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                {quickStartCourses.map((code) => (
                  <button
                    key={code}
                    onClick={() => setSearchParams({ course: code })}
                    className="rounded-lg border border-border/50 bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/60 hover:border-border transition-all"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Requirement groups & immediate prereqs */}
          {target && (
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-foreground">Prerequisite groups</h3>
                {immediatePrereqs.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">{immediatePrereqs.length} direct</span>
                )}
              </div>
              {immediatePrereqs.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {immediatePrereqs.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => setSearchParams({ course: p.code })}
                      className="rounded-lg border border-border/50 bg-card/40 px-2.5 py-1 text-xs font-medium hover:bg-accent/60 transition-colors"
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No immediate prerequisites detected.</p>
              )}

              {savedCourses.some((c) => c.status === "completed") && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <h4 className="text-xs font-semibold text-foreground">Suggested next</h4>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {nextPossibleCourses.slice(0, 6).map((code) => (
                      <button
                        key={code}
                        onClick={() => setSearchParams({ course: code })}
                        className="rounded-lg border border-border/50 bg-card/40 px-2.5 py-1 text-xs hover:bg-accent/60 transition-colors"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive tracker */}
          {selected && (
            <div className="glass-panel rounded-2xl p-4 space-y-4">
              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold text-foreground">{selected.code}</h2>
                  <span className="text-xs text-muted-foreground">{selected.title}</span>
                </div>
                {summarySentence && <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{summarySentence}</p>}
              </div>

              <div className="rounded-xl border border-border/40 bg-card/30 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Prerequisite tracker</h3>
                  <button
                    onClick={() => { setCompletedCodes(new Set()); setCompletedPrograms(new Set()) }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideSatisfiedAlternatives}
                    onChange={(e) => setHideSatisfiedAlternatives(e.target.checked)}
                    className="rounded"
                  />
                  Hide satisfied alternatives in graph
                </label>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {trackerProgress.done}/{trackerProgress.total} groups satisfied
                    </span>
                    <span className="font-medium text-foreground">{trackerProgress.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-light))] transition-all duration-300"
                      style={{ width: `${trackerProgress.pct}%` }}
                    />
                  </div>
                </div>

                {/* Status messages */}
                {courseGroupsSatisfied && !allSatisfied && (
                  <div className="mt-3 rounded-lg border border-[hsl(var(--brand)/0.2)] bg-[hsl(var(--brand-subtle))] px-3 py-2 text-xs text-[hsl(var(--brand-dark))]">
                    Course prerequisites met. Program enrollment still required.
                  </div>
                )}
                {allSatisfied && (
                  <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                    Fully eligible based on your selections.
                  </div>
                )}

                {/* Groups */}
                <div className="mt-3 space-y-2">
                  {groupState.map((group) => (
                    <details key={group.id} open className="rounded-xl border border-border/40 bg-card/20 overflow-hidden">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-accent/30 transition-colors">
                        <span className="text-foreground">{group.title}</span>
                        <span className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          group.satisfied
                            ? "bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand-dark))]"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {group.satisfied ? "Satisfied" : "Required"}
                        </span>
                      </summary>
                      <div className="px-3 pb-2.5 space-y-1">
                        {group.options.map((opt) => {
                          const checked = opt.kind === "course" ? completedCodes.has(opt.code || "") : completedPrograms.has(opt.id)
                          return (
                            <label
                              key={opt.id}
                              className={cn(
                                "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-pointer transition-colors",
                                checked
                                  ? "border-[hsl(var(--brand)/0.3)] bg-[hsl(var(--brand-subtle)/0.5)]"
                                  : "border-border/30 bg-transparent hover:bg-accent/20"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleOption(opt, e.target.checked)}
                                className="mt-0.5 rounded"
                              />
                              <span className="text-foreground">
                                <strong>{opt.label}</strong>
                                {opt.gradeMin ? (
                                  <span className="text-[hsl(var(--brand-dark))] ml-1">(min {opt.gradeMin}%)</span>
                                ) : null}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </details>
                  ))}
                </div>

                {antireqConflicts.length > 0 && (
                  <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    Warning: {antireqConflicts.join(", ")} conflicts with {target?.code} (antirequisite).
                  </div>
                )}
              </div>

              {/* Official prereqs HTML */}
              <div className="rounded-xl border border-border/40 bg-card/30 p-3.5">
                <h3 className="text-sm font-semibold text-foreground">Official prerequisites</h3>
                {selected.prerequisitesHtml ? (
                  <div
                    className="mt-2 text-xs leading-relaxed text-muted-foreground [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_a]:text-[hsl(var(--brand-dark))] [&_a]:underline [&_a]:underline-offset-2"
                    dangerouslySetInnerHTML={{ __html: selected.prerequisitesHtml }}
                  />
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No prerequisites listed.</p>
                )}
              </div>

              {/* Antirequisites */}
              <div className="rounded-xl border border-border/40 bg-card/30 p-3.5">
                <h3 className="text-sm font-semibold text-foreground">Antirequisites</h3>
                {selected.antirequisiteCodes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.antirequisiteCodes.map((code) => (
                      <span key={code} className="rounded-lg border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-xs text-destructive">
                        {code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No antirequisites listed.</p>
                )}
                {selected.antirequisitesHtml && (
                  <div
                    className="mt-2 text-xs leading-relaxed text-muted-foreground [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2"
                    dangerouslySetInnerHTML={{ __html: selected.antirequisitesHtml }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
