export type RequirementOption = {
  id: string
  label: string
  kind: "course" | "program"
  code?: string
  gradeMin?: number
}

export type RequirementGroup = {
  id: string
  title: string
  mode: "any" | "all"
  options: RequirementOption[]
}

const normalize = (code: string) => code.replace(/\s+/g, "").toUpperCase()
const isCourseCode = (text: string) => /^[A-Z]{2,}\d{2,4}[A-Z]?$/.test(normalize(text))

export function parseTrackerGroups(html?: string): RequirementGroup[] {
  if (!html) return []

  const doc = new DOMParser().parseFromString(html, "text/html")
  const rows = Array.from(doc.querySelectorAll('[data-test$="-result"]')).map((row, idx) => {
    const text = (row.textContent || "").replace(/\s+/g, " ").trim()
    const anchors = Array.from(row.querySelectorAll("a")).map((a) => (a.textContent || "").trim())

    const courseFromAnchors = anchors.map(normalize).filter((a) => isCourseCode(a))
    const programFromAnchors = anchors.filter((a) => !isCourseCode(a))

    // Fallback regex extraction to handle rows where links are missing or malformed
    const regexCourses = Array.from(text.matchAll(/\b([A-Z]{2,}\s*\d{2,4}[A-Z]?)\b/g)).map((m) => normalize(m[1]))
    const courses = [...new Set([...courseFromAnchors, ...regexCourses])]
    const programs = programFromAnchors

    const gradeMatch = text.match(/minimum grade of\s*(\d+)%|>=\s*(\d+)%/i)
    const gradeMin = gradeMatch ? Number(gradeMatch[1] || gradeMatch[2]) : undefined

    const mode: "any" | "all" = /at least\s*1|complete\s*1\s*of|one\s*of\s*the\s*following|\bor\b/i.test(text)
      ? "any"
      : "all"

    return { idx, text, courses, programs, gradeMin, mode }
  })

  const relevant = rows.filter((r) => !/not completed nor concurrently enrolled/i.test(r.text))
  const groups: RequirementGroup[] = []

  const titleFromSubjects = (courses: string[], mode: "any" | "all", text: string) => {
    const counts = new Map<string, number>()
    for (const c of courses) {
      const m = c.match(/^([A-Z]+)/)
      const subj = m ? m[1] : "COURSE"
      counts.set(subj, (counts.get(subj) || 0) + 1)
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
    const subjSet = new Set(ranked.map(([s]) => s))

    const lower = text.toLowerCase()
    if (/linear algebra/.test(lower)) {
      return mode === "any" ? "Linear Algebra options (choose 1)" : "Linear Algebra requirements"
    }
    if (subjSet.has("PHYS")) {
      return mode === "any" ? "Physics Core options (choose 1)" : "Physics Core requirements"
    }
    if (subjSet.has("ACTSC") || subjSet.has("STAT")) {
      return mode === "any" ? "Statistics & Actuarial options (choose 1)" : "Actuarial Science foundations"
    }
    if (subjSet.has("CS")) {
      return mode === "any" ? "Computer Science options (choose 1)" : "Computer Science requirements"
    }

    if (ranked.length === 0) return mode === "any" ? "Course options (choose 1)" : "Course requirements"
    if (ranked.length === 1) return `${ranked[0][0]} ${mode === "any" ? "options (choose 1)" : "requirements"}`
    return `${ranked[0][0]}/${ranked[1][0]} ${mode === "any" ? "options (choose 1)" : "requirements"}`
  }

  for (const row of relevant) {
    const options: RequirementOption[] = []

    for (const c of row.courses) {
      options.push({ id: `course:${c}`, label: c, kind: "course", code: c, gradeMin: row.gradeMin })
    }

    for (const p of row.programs) {
      options.push({ id: `program:${p.toLowerCase()}`, label: p, kind: "program" })
    }

    if (options.length === 0) continue

    const dedup = [...new Map(options.map((o) => [o.id, o])).values()]

    let title = "Requirements"
    if (/enrolled in/i.test(row.text) || (row.programs.length > 0 && row.courses.length === 0)) {
      title = `Program enrollment ${row.mode === "any" ? "(choose 1)" : "requirements"}`
    } else {
      title = titleFromSubjects(row.courses, row.mode, row.text)
    }

    groups.push({ id: `group-${row.idx}`, title, mode: row.mode, options: dedup })
  }

  const merged = new Map<string, RequirementGroup>()
  for (const g of groups) {
    const key = `${g.title}|${g.mode}`
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, { ...g })
      continue
    }
    const opts = [...existing.options, ...g.options]
    existing.options = [...new Map(opts.map((o) => [o.id, o])).values()]
  }

  return [...merged.values()]
}
