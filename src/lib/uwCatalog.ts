const CATALOG_ID = "663290e835aff7001cc62323"
const API_BASE = "https://uwaterloocm.kuali.co/api/v1/catalog"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type CatalogCourseSearchItem = {
  id: string
  pid: string
  __catalogCourseId: string
  title: string
  description?: string
  subjectCode?: { name?: string; description?: string }
  credits?: number
}

export type CatalogCourseDetail = {
  id: string
  pid: string
  __catalogCourseId: string
  title: string
  description?: string
  prerequisites?: string | null
  antirequisites?: string | null
  credits?: number
}

export type CourseNodeData = {
  code: string
  title: string
  id: string
  catalogUrl: string
  prerequisitesHtml: string
  antirequisitesHtml: string
  prerequisiteCodes: string[]
  antirequisiteCodes: string[]
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > CACHE_TTL_MS) return null
    return parsed.data as T
  } catch {
    return null
  }
}

function cacheSet<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }))
  } catch {
    // ignore storage issues
  }
}

function normalizeCode(code: string) {
  return code.replace(/\s+/g, "").toUpperCase()
}

function extractCourseCodesFromHtml(html?: string | null): string[] {
  if (!html) return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const anchors = Array.from(doc.querySelectorAll("a"))
  const out = new Set<string>()

  for (const a of anchors) {
    const text = (a.textContent || "").trim()
    if (/^[A-Z]{2,}\s*\d{2,4}[A-Z]?$/.test(text)) {
      out.add(normalizeCode(text))
    }
  }

  // fallback regex for plain text codes
  const regex = /\b([A-Z]{2,}\s*\d{2,4}[A-Z]?)\b/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    out.add(normalizeCode(m[1]))
  }

  return [...out]
}

export async function searchCatalogCourses(query: string): Promise<CatalogCourseSearchItem[]> {
  const q = query.trim()
  if (!q) return []
  const cacheKey = `uw-search:${q.toUpperCase()}`
  const cached = cacheGet<CatalogCourseSearchItem[]>(cacheKey)
  if (cached) return cached

  const url = `${API_BASE}/courses/${CATALOG_ID}?q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Catalog search failed (${res.status})`)

  const data = (await res.json()) as CatalogCourseSearchItem[]
  cacheSet(cacheKey, data)
  return data
}

export async function getCatalogCourseById(id: string): Promise<CatalogCourseDetail> {
  const cacheKey = `uw-course:${id}`
  const cached = cacheGet<CatalogCourseDetail>(cacheKey)
  if (cached) return cached

  const url = `${API_BASE}/course/byId/${CATALOG_ID}/${id}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Catalog course fetch failed (${res.status})`)

  const data = (await res.json()) as CatalogCourseDetail
  cacheSet(cacheKey, data)
  return data
}

export async function resolveCourseByCode(code: string): Promise<CatalogCourseSearchItem | null> {
  const normalized = normalizeCode(code)
  const results = await searchCatalogCourses(normalized)
  const exact = results.find((r) => normalizeCode(r.__catalogCourseId) === normalized)
  return exact || null
}

export function clearCatalogCache() {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith("uw-search:") || key.startsWith("uw-course:"))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

export async function buildCourseTreeFromCatalog(targetCode: string, maxDepth = 4): Promise<Map<string, CourseNodeData>> {
  const visited = new Set<string>()
  const nodes = new Map<string, CourseNodeData>()

  async function dfs(code: string, depth: number): Promise<void> {
    const normalized = normalizeCode(code)
    if (visited.has(normalized) || depth > maxDepth) return
    visited.add(normalized)

    const resolved = await resolveCourseByCode(normalized)
    if (!resolved) {
      nodes.set(normalized, {
        code: normalized,
        title: "Course not found in official catalog",
        id: "",
        catalogUrl: "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/courses",
        prerequisitesHtml: "",
        antirequisitesHtml: "",
        prerequisiteCodes: [],
        antirequisiteCodes: [],
      })
      return
    }

    const detail = await getCatalogCourseById(resolved.id)
    const prereqHtml = detail.prerequisites || ""
    const antireqHtml = detail.antirequisites || ""
    const prerequisiteCodes = extractCourseCodesFromHtml(prereqHtml)
      .filter((c) => c !== normalized)
    const antirequisiteCodes = extractCourseCodesFromHtml(antireqHtml)
      .filter((c) => c !== normalized)

    nodes.set(normalized, {
      code: normalized,
      title: detail.title || resolved.title || normalized,
      id: detail.id,
      catalogUrl: `https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/courses/view/${detail.id}`,
      prerequisitesHtml: prereqHtml,
      antirequisitesHtml: antireqHtml,
      prerequisiteCodes,
      antirequisiteCodes,
    })

    await Promise.all(prerequisiteCodes.map((p) => dfs(p, depth + 1)))
  }

  await dfs(targetCode, 0)
  return nodes
}
