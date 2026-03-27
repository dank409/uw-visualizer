import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { Search, ChevronRight } from "lucide-react"
import { getCourse, loadCourseIndex } from "@/lib/courseIndex"
import { extractProgramCourseCodes, getProgramById, searchPrograms } from "@/lib/programCatalog"
import type { Prereq } from "@/lib/types"
import { cn } from "@/lib/utils"

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

function normalize(code: string) { return code.replace(/\s+/g, "").toUpperCase() }

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
      ...x, code: normalize(x.code),
    }))
  } catch { return [] }
}

export function ProgrammesPage() {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<ProgramItem[]>([])
  const [selected, setSelected] = useState<ProgramDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<SavedCourse[]>([])

  useEffect(() => { loadCourseIndex(); setSaved(loadSaved()) }, [])

  useEffect(() => {
    const query = q.trim()
    if (!query) { setResults([]); return }
    const t = setTimeout(() => {
      searchPrograms(query).then((r) => setResults(r.slice(0, 12))).catch(() => setResults([]))
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
    } finally { setLoading(false) }
  }

  const requiredCodes = useMemo(() => extractProgramCourseCodes(selected?.courseRequirementsNoUnits), [selected])
  const completed = useMemo(() => new Set(saved.filter((s) => s.status === "completed").map((s) => s.code)), [saved])

  const progress = useMemo(() => {
    const total = requiredCodes.length
    const done = requiredCodes.filter((c) => completed.has(c)).length
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [requiredCodes, completed])

  const bottlenecks = useMemo(() => {
    const missing = requiredCodes.filter((c) => !completed.has(c))
    return missing
      .map((code) => ({ code, prereqCount: prereqComplexity(getCourse(code)?.prereq) }))
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6"
    >
      <div className="glass-panel rounded-2xl p-5 md:p-6">
        <h1 className="text-lg font-semibold text-foreground">Program Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search a UW program and see your progress toward completing its requirements.
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search programs (e.g. Computer Science, Actuarial Science)"
            className="w-full rounded-xl glass-input py-2.5 pl-9 pr-4 text-sm"
          />
          {results.length > 0 && (
            <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl glass-elevated">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProgram(p.id)}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-accent/60 first:rounded-t-xl last:rounded-b-xl transition-colors"
                >
                  <div className="text-sm font-semibold text-foreground">{p.code}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{p.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-3 h-3 rounded-full border-2 border-[hsl(var(--brand))] border-t-transparent animate-spin" />
            Loading program...
          </div>
        )}

        {/* Empty state cards */}
        {!selected && !loading && (
          <div className="mt-6 grid gap-2.5 md:grid-cols-3">
            {[
              { step: "1", title: "Pick a program", desc: "Search by name or code." },
              { step: "2", title: "Compare progress", desc: "Completed courses auto-count." },
              { step: "3", title: "Plan ahead", desc: "Prioritize high-depth courses." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-border/40 bg-card/30 p-3.5">
                <div className="w-6 h-6 rounded-lg bg-[hsl(var(--brand-subtle))] flex items-center justify-center text-xs font-semibold text-[hsl(var(--brand-dark))] mb-2">
                  {s.step}
                </div>
                <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Selected program */}
        {selected && (
          <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            {/* Left: requirements */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                <h2 className="text-base font-semibold text-foreground">{selected.code}</h2>
                <p className="text-sm text-muted-foreground">{selected.title}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{progress.done}/{progress.total} courses completed</span>
                    <span className="font-medium text-foreground">{progress.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-light))] transition-all duration-300"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-foreground mb-2">Required courses</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredCodes.map((code) => {
                      const done = completed.has(code)
                      return (
                        <Link
                          key={code}
                          to={`/courses?course=${code}`}
                          className={cn(
                            "rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                            done
                              ? "border-[hsl(var(--brand)/0.4)] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand-dark))]"
                              : "border-border/40 bg-card/30 text-foreground hover:bg-accent/50"
                          )}
                        >
                          {code} {done && "✓"}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Expandable details */}
              {[
                { label: "Average requirements", html: selected.minimumAverageSRequired },
                { label: "Declaration requirements", html: selected.declarationRequirements },
                { label: "Graduation requirements", html: selected.graduationRequirements },
              ].filter((d) => d.html).map((d) => (
                <details key={d.label} className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
                  <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/30 transition-colors flex items-center justify-between">
                    {d.label}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform [[open]>&]:rotate-90" />
                  </summary>
                  <div
                    className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground [&_ul]:ml-4 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: d.html! }}
                  />
                </details>
              ))}
            </div>

            {/* Right: bottlenecks + term plan */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                <h3 className="text-sm font-semibold text-foreground">Potential bottlenecks</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Missing courses with deepest prerequisite chains.</p>
                <div className="mt-3 space-y-1.5">
                  {bottlenecks.length > 0 ? bottlenecks.map((b) => (
                    <Link
                      key={b.code}
                      to={`/courses?course=${b.code}`}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-card/20 px-3 py-2 text-xs hover:bg-accent/50 transition-colors"
                    >
                      <span className="font-semibold text-foreground">{b.code}</span>
                      <span className="text-muted-foreground">depth {b.prereqCount}</span>
                    </Link>
                  )) : (
                    <p className="text-xs text-muted-foreground">No bottlenecks — great progress.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                <h3 className="text-sm font-semibold text-foreground">Term planning</h3>

                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">Next term candidates</div>
                  <div className="flex flex-wrap gap-1.5">
                    {termPlanPreview.nextTerm.length > 0 ? termPlanPreview.nextTerm.map((x) => (
                      <Link key={x.code} to={`/courses?course=${x.code}`} className="rounded-lg border border-border/40 bg-card/20 px-2 py-1 text-xs hover:bg-accent/50 transition-colors">
                        {x.code}
                      </Link>
                    )) : <span className="text-xs text-muted-foreground">No low-depth candidates.</span>}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/30">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">Later terms</div>
                  <div className="flex flex-wrap gap-1.5">
                    {termPlanPreview.later.length > 0 ? termPlanPreview.later.map((x) => (
                      <Link key={x.code} to={`/courses?course=${x.code}`} className="rounded-lg border border-border/40 bg-card/20 px-2 py-1 text-xs hover:bg-accent/50 transition-colors">
                        {x.code}
                      </Link>
                    )) : <span className="text-xs text-muted-foreground">No deferred candidates.</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
