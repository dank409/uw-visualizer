import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getCourse, loadCourseIndex } from "@/lib/courseIndex"
import { extractProgramCourseCodes, getProgramById, searchPrograms } from "@/lib/programCatalog"
import type { Prereq } from "@/lib/types"

type SavedCourse = { code: string; status: "completed" | "in_progress" | "planned" }

type ProgramItem = { id: string; code: string; title: string }

type ProgramDetail = {
  id: string
  code: string
  title: string
  courseRequirementsNoUnits?: string
  declarationRequirements?: string
  minimumAverageSRequired?: string
  graduationRequirements?: string
}

const SAVED_KEY = "uwv.myCourses.v1"

function normalize(code: string) {
  return code.replace(/\s+/g, "").toUpperCase()
}

function prereqComplexity(pr: Prereq | null | undefined): number {
  if (!pr) return 0
  if ((pr as any).type === "COURSE") return 1
  const items = (pr as any).items as Prereq[]
  if (!items || !items.length) return 0
  return 1 + Math.max(...items.map((x) => prereqComplexity(x)))
}

function loadSaved(): SavedCourse[] {
  try {
    return (JSON.parse(localStorage.getItem(SAVED_KEY) || "[]") as SavedCourse[]).map((x) => ({
      ...x,
      code: normalize(x.code),
    }))
  } catch {
    return []
  }
}

export function ProgrammesPage() {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<ProgramItem[]>([])
  const [selected, setSelected] = useState<ProgramDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<SavedCourse[]>([])

  useEffect(() => {
    loadCourseIndex()
    setSaved(loadSaved())
  }, [])

  useEffect(() => {
    const query = q.trim()
    if (!query) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      searchPrograms(query)
        .then((r) => setResults(r.slice(0, 12)))
        .catch(() => setResults([]))
    }, 150)
    return () => clearTimeout(t)
  }, [q])

  const selectProgram = async (id: string) => {
    setLoading(true)
    try {
      const detail = await getProgramById(id)
      setSelected(detail)
      setQ("")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const requiredCodes = useMemo(
    () => extractProgramCourseCodes(selected?.courseRequirementsNoUnits),
    [selected]
  )

  const completed = useMemo(
    () => new Set(saved.filter((s) => s.status === "completed").map((s) => s.code)),
    [saved]
  )

  const progress = useMemo(() => {
    const total = requiredCodes.length
    const done = requiredCodes.filter((c) => completed.has(c)).length
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [requiredCodes, completed])

  const bottlenecks = useMemo(() => {
    const missing = requiredCodes.filter((c) => !completed.has(c))
    return missing
      .map((code) => {
        const course = getCourse(code)
        const prereqCount = prereqComplexity(course?.prereq)
        return { code, prereqCount }
      })
      .sort((a, b) => b.prereqCount - a.prereqCount)
      .slice(0, 6)
  }, [requiredCodes, completed])

  const termPlanPreview = useMemo(() => {
    const missing = requiredCodes.filter((c) => !completed.has(c))
      .map((code) => ({ code, depth: prereqComplexity(getCourse(code)?.prereq) }))

    return {
      nextTerm: missing.filter((x) => x.depth <= 1).slice(0, 6),
      later: missing.filter((x) => x.depth > 1).slice(0, 8),
    }
  }, [requiredCodes, completed])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="rounded-xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold">Programmes Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search a UW program, load required-course structure, and see what you’ve already satisfied from My Courses.
        </p>

        <div className="relative mt-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search programme (e.g. Actuarial, Computer Science)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {results.length > 0 ? (
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProgram(p.id)}
                  className="w-full px-3 py-2 text-left hover:bg-accent"
                >
                  <div className="text-sm font-semibold">{p.code}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{p.title}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {loading ? <div className="mt-4 text-sm text-muted-foreground">Loading program roadmap…</div> : null}

        {!selected ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <h3 className="text-sm font-semibold">1) Pick a programme</h3>
              <p className="mt-1 text-xs text-muted-foreground">Search by name or code (e.g. Computer Science, Actuarial Science).</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <h3 className="text-sm font-semibold">2) Compare against My Courses</h3>
              <p className="mt-1 text-xs text-muted-foreground">Completed courses are auto-counted toward requirement coverage.</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <h3 className="text-sm font-semibold">3) Plan around bottlenecks</h3>
              <p className="mt-1 text-xs text-muted-foreground">Prioritize high-prerequisite-depth courses to avoid delays later.</p>
            </div>
          </div>
        ) : null}

        {selected ? (
          <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <h2 className="text-base font-semibold">{selected.code} — {selected.title}</h2>

              <div className="mt-3 text-xs text-muted-foreground">
                Progress: {progress.done}/{progress.total} required courses completed
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full border border-border bg-background">
                <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${progress.pct}%` }} />
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold">Required courses roadmap</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {requiredCodes.map((code) => {
                    const done = completed.has(code)
                    return (
                      <Link
                        key={code}
                        to={`/courses?course=${code}`}
                        className={`rounded-md border px-2.5 py-1 text-xs ${done ? "border-[hsl(var(--brand))/0.6] bg-[hsl(var(--brand))/0.18]" : "border-border bg-background"}`}
                      >
                        {code} {done ? "✓" : ""}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {selected.minimumAverageSRequired ? (
                <details className="mt-4 rounded-md border border-border bg-background p-2">
                  <summary className="cursor-pointer text-sm font-medium">Average requirements</summary>
                  <div
                    className="mt-2 text-xs leading-5 text-foreground [&_ul]:ml-4 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: selected.minimumAverageSRequired }}
                  />
                </details>
              ) : null}

              {selected.declarationRequirements ? (
                <details className="mt-2 rounded-md border border-border bg-background p-2">
                  <summary className="cursor-pointer text-sm font-medium">Declaration requirements</summary>
                  <div
                    className="mt-2 text-xs leading-5 text-foreground [&_ul]:ml-4 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: selected.declarationRequirements }}
                  />
                </details>
              ) : null}

              {selected.graduationRequirements ? (
                <details className="mt-2 rounded-md border border-border bg-background p-2">
                  <summary className="cursor-pointer text-sm font-medium">Graduation requirements</summary>
                  <div
                    className="mt-2 text-xs leading-5 text-foreground [&_ul]:ml-4 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: selected.graduationRequirements }}
                  />
                </details>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <h3 className="text-sm font-semibold">Potential bottlenecks</h3>
              <p className="mt-1 text-xs text-muted-foreground">Missing required courses with the highest prereq depth first.</p>
              <div className="mt-2 space-y-2">
                {bottlenecks.map((b) => (
                  <Link
                    key={b.code}
                    to={`/courses?course=${b.code}`}
                    className="block rounded-md border border-border bg-background px-2.5 py-2 text-xs hover:bg-accent"
                  >
                    <div className="font-semibold">{b.code}</div>
                    <div className="text-muted-foreground">Prereq depth: {b.prereqCount}</div>
                  </Link>
                ))}
                {bottlenecks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No bottlenecks found — great progress.</p>
                ) : null}
              </div>

              <div className="mt-4 pt-3 border-t border-border/70">
                <h3 className="text-sm font-semibold">Term-by-term preview</h3>
                <p className="mt-1 text-xs text-muted-foreground">Quick suggestion from your completed-course profile.</p>
                <div className="mt-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Next term candidates</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {termPlanPreview.nextTerm.length > 0 ? termPlanPreview.nextTerm.map((x) => (
                      <Link key={x.code} to={`/courses?course=${x.code}`} className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent">
                        {x.code}
                      </Link>
                    )) : <span className="text-xs text-muted-foreground">No obvious low-depth candidates.</span>}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Later (higher prereq depth)</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {termPlanPreview.later.length > 0 ? termPlanPreview.later.map((x) => (
                      <Link key={x.code} to={`/courses?course=${x.code}`} className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent">
                        {x.code}
                      </Link>
                    )) : <span className="text-xs text-muted-foreground">No deferred candidates.</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
