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

function normalize(code: string) {
  return code.replace(/\s+/g, "").toUpperCase()
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

  useEffect(() => {
    const code = searchParams.get("course")
    if (!code) return
    const normalized = normalize(code)
    setTargetCode(normalized)
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

  const selected = useMemo(() => {
    if (!selectedCode) return null
    return courseMap.get(selectedCode) || null
  }, [selectedCode, courseMap])

  const target = useMemo(() => {
    if (!targetCode) return null
    return courseMap.get(targetCode) || null
  }, [targetCode, courseMap])

  const immediatePrereqs = useMemo(() => {
    if (!target) return []
    return target.prerequisiteCodes
      .map((code) => courseMap.get(code))
      .filter((c): c is CourseNodeData => Boolean(c))
  }, [target, courseMap])

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
      for (const prereq of node.prerequisiteCodes) {
        walk(prereq, level + 1)
      }
    }

    walk(target.code, 0)

    return [...levels.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([level, codes]) => ({
        level,
        courses: [...codes]
          .map((c) => courseMap.get(c))
          .filter((c): c is CourseNodeData => Boolean(c)),
      }))
  }, [target, courseMap])

  const selectResult = async (item: CatalogCourseSearchItem) => {
    const code = normalize(item.__catalogCourseId)
    setQuery("")
    setOpen(false)
    setSearchParams({ course: code })

    // sanity check that exact code resolves in official API
    const exact = await resolveCourseByCode(code)
    if (!exact) {
      setError(`Official catalog could not resolve ${code}. Please verify directly on the calendar site.`)
      return
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-border bg-card p-4 h-fit">
          <h1 className="text-xl font-semibold">UWVisualizer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Official-data course pathway visualizer for UWaterloo.
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
              placeholder="Search course (e.g., MATH237)"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--brand))/0.35]"
            />
            {open && results.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                {results.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectResult(c)}
                    className="w-full px-3 py-2 text-left hover:bg-accent"
                  >
                    <div className="text-sm font-semibold">{normalize(c.__catalogCourseId)}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{c.title}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {loading ? <p className="mt-4 text-sm text-muted-foreground">Fetching official catalog data…</p> : null}
          {error ? (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">{error}</div>
          ) : null}

          {target ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Target course</div>
              <div className="mt-1 font-semibold">{target.code}</div>
              <div className="text-sm text-muted-foreground">{target.title}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Nodes shown: {courseMap.size} (depth-limited to 4 levels)
              </div>
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
        </section>

        <section className="space-y-4">
          {targetCode && courseMap.size > 0 ? (
            <>
              <div className="hidden md:block">
                <CatalogPathwayGraph
                  targetCode={targetCode}
                  courseMap={courseMap}
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
                    <button
                      key={p.code}
                      onClick={() => setSelectedCode(p.code)}
                      className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent"
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No immediate prerequisites detected in official data.</p>
              )}
            </div>
          ) : null}

          {selected ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.code}</h2>
                <p className="text-sm text-muted-foreground">{selected.title}</p>
                {target ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    To enroll in {target.code}, complete one of {Math.max(1, target.prerequisiteCodes.length)} immediate prerequisite options
                    and satisfy all official grade/program conditions shown below.
                  </p>
                ) : null}
                <a
                  href={selected.catalogUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-[hsl(var(--brand-dark))] underline"
                >
                  Open official calendar page
                </a>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <h3 className="text-sm font-semibold">Official prerequisites</h3>
                {selected.prerequisitesHtml ? (
                  <div
                    className="mt-2 text-xs leading-5 text-foreground [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: selected.prerequisitesHtml }}
                  />
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
                  <div
                    className="mt-2 text-xs leading-5 text-foreground [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: selected.antirequisitesHtml }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
