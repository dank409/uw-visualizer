export interface FoundCourse {
  code: string
  term?: string
}

interface PdfTextItem {
  str: string
  transform: number[]
}

interface PdfTextContentLike {
  items: unknown[]
}

interface PdfPageLike {
  getTextContent(): Promise<PdfTextContentLike>
}

interface PdfDocumentLike {
  numPages: number
  getPage(pageNumber: number): Promise<PdfPageLike>
}

interface PdfLoadTaskLike {
  promise: Promise<PdfDocumentLike>
}

interface PdfJsLike {
  getDocument(options: ReturnType<typeof buildTranscriptPdfOptions>): PdfLoadTaskLike
}

async function loadPdfJs(): Promise<PdfJsLike> {
  const pdfjsLib = await import("pdfjs-dist")
  return pdfjsLib as unknown as PdfJsLike
}

const IGNORE_SUBJECTS = new Set([
  "ON", "AT", "IN", "BY", "OF", "TO", "OR", "GPA", "CAP", "AN", "AS", "IS",
  "NO", "IF", "DO", "BE", "GO", "UP", "US", "IT", "HE", "WE", "ME",
])

export function buildTranscriptPdfOptions(data: Uint8Array) {
  return {
    data,
    disableWorker: true as const,
  }
}

export function extractCoursesFromTranscriptText(text: string): FoundCourse[] {
  const lines = text.split("\n")
  const result: FoundCourse[] = []
  const seen = new Set<string>()
  let currentTerm: string | undefined
  let inSkipSection = false

  const SKIP_RE = /Transfer Credit|Test Credit|Advanced Standing|Exchange Credit|Scholarships and Awards|Milestones/i
  const TERM_RE = /\b(Fall|Winter|Spring|Summer)\s+(\d{4})\b/i
  const COURSE_RE = /\b([A-Z]{2,6})\s{1,6}(\d{1,3}[A-Z]?)\b/g

  for (const line of lines) {
    const termMatch = line.match(TERM_RE)
    if (termMatch) {
      currentTerm = `${termMatch[1]} ${termMatch[2]}`
      inSkipSection = false
      continue
    }
    if (SKIP_RE.test(line)) {
      inSkipSection = true
      continue
    }
    if (inSkipSection) continue

    COURSE_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = COURSE_RE.exec(line)) !== null) {
      const subject = match[1]
      const number = match[2]
      if (IGNORE_SUBJECTS.has(subject)) continue
      if (/X/.test(number)) continue

      const code = `${subject}${number}`
      if (seen.has(code)) continue
      seen.add(code)
      result.push({ code, term: currentTerm })
    }
  }

  return result
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return typeof item === "object"
    && item !== null
    && "str" in item
    && "transform" in item
    && Array.isArray((item as PdfTextItem).transform)
    && typeof (item as PdfTextItem).str === "string"
}

export function reconstructTranscriptText(content: PdfTextContentLike): string {
  const items = content.items.filter((item): item is PdfTextItem => isPdfTextItem(item) && item.str.trim() !== "")
  if (items.length === 0) return ""

  const lineMap = new Map<number, { x: number; str: string }[]>()
  for (const item of items) {
    const y = Math.round(item.transform[5] ?? 0)
    const x = item.transform[4] ?? 0
    if (!lineMap.has(y)) lineMap.set(y, [])
    lineMap.get(y)!.push({ x, str: item.str })
  }

  const lines: string[] = []
  const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)
  for (const y of sortedYs) {
    const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x)
    lines.push(lineItems.map((item) => item.str).join("  "))
  }

  return lines.join("\n")
}

export async function parseTranscriptPdfData(
  data: Uint8Array,
  pdfjs?: PdfJsLike
): Promise<FoundCourse[]> {
  const pdfRuntime = pdfjs ?? await loadPdfJs()
  const pdf = await pdfRuntime.getDocument(buildTranscriptPdfOptions(data)).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = reconstructTranscriptText(content)
    if (pageText) pages.push(pageText)
  }

  return extractCoursesFromTranscriptText(pages.join("\n"))
}

export async function parseTranscriptFile(file: File): Promise<FoundCourse[]> {
  const arrayBuffer = await file.arrayBuffer()
  return parseTranscriptPdfData(new Uint8Array(arrayBuffer))
}
