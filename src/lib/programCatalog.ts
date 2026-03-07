const CATALOG_ID = "663290e835aff7001cc62323"
const API_BASE = "https://uwaterloocm.kuali.co/api/v1/catalog"

type ProgramSearchItem = {
  id: string
  code: string
  title: string
}

type ProgramDetail = {
  id: string
  code: string
  title: string
  courseRequirementsNoUnits?: string
  declarationRequirements?: string
  minimumAverageSRequired?: string
  graduationRequirements?: string
}

export async function searchPrograms(query: string): Promise<ProgramSearchItem[]> {
  const q = query.trim()
  if (!q) return []
  const res = await fetch(`${API_BASE}/programs/${CATALOG_ID}?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(`Program search failed (${res.status})`)
  const data = await res.json()
  return (data || []).map((p: any) => ({ id: p.id, code: p.code, title: p.title }))
}

export async function getProgramById(id: string): Promise<ProgramDetail> {
  const res = await fetch(`${API_BASE}/program/byId/${CATALOG_ID}/${id}`)
  if (!res.ok) throw new Error(`Program detail failed (${res.status})`)
  const p = await res.json()
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    courseRequirementsNoUnits: p.courseRequirementsNoUnits || "",
    declarationRequirements: p.declarationRequirements || "",
    minimumAverageSRequired: p.minimumAverageSRequired || "",
    graduationRequirements: p.graduationRequirements || "",
  }
}

export function extractProgramCourseCodes(html?: string): string[] {
  if (!html) return []
  const doc = new DOMParser().parseFromString(html, "text/html")
  const anchors = Array.from(doc.querySelectorAll("a"))
  const out = new Set<string>()
  for (const a of anchors) {
    const t = (a.textContent || "").trim().replace(/\s+/g, "").toUpperCase()
    if (/^[A-Z]{2,}\d{2,4}[A-Z]?$/.test(t)) out.add(t)
  }
  return [...out]
}
