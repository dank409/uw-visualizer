import { useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { parseTranscriptFile, type FoundCourse } from "@/lib/transcriptParser"

type SavedCourse = { code: string; status: "completed" | "in_progress" | "planned" }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedCourses: SavedCourse[]
  onImport: (codes: string[]) => void
}

type Phase = "idle" | "parsing" | "preview" | "error"

// ── Component ─────────────────────────────────────────────────────────────────

export function TranscriptImportModal({ open, onOpenChange, savedCourses, onImport }: Props) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [foundCourses, setFoundCourses] = useState<FoundCourse[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [errorMsg, setErrorMsg] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const savedSet = new Set(savedCourses.map((c) => c.code))

  function reset() {
    setPhase("idle")
    setFoundCourses([])
    setSelected(new Set())
    setErrorMsg("")
    setIsDragOver(false)
  }

  function handleOpenChange(val: boolean) {
    if (phase === "parsing") return // block close during parsing
    if (!val) reset()
    onOpenChange(val)
  }

  async function parsePdf(file: File) {
    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      setErrorMsg("Please upload a PDF file.")
      setPhase("error")
      return
    }
    setPhase("parsing")
    try {
      const courses = await parseTranscriptFile(file)
      if (courses.length === 0) {
        setErrorMsg(
          "No UW courses found in this PDF. Make sure this is an unofficial transcript downloaded from Quest."
        )
        setPhase("error")
        return
      }
      setFoundCourses(courses)
      // Pre-select all courses not already saved
      setSelected(new Set(courses.map((c) => c.code).filter((c) => !savedSet.has(c))))
      setPhase("preview")
    } catch (e) {
      console.error(e)
      setErrorMsg(
        "Could not read this PDF. Try downloading a fresh copy from Quest, or make sure it isn't password-protected."
      )
      setPhase("error")
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parsePdf(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parsePdf(file)
  }

  function toggleCourse(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(foundCourses.map((c) => c.code).filter((c) => !savedSet.has(c))))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  function handleImport() {
    onImport([...selected])
    reset()
  }

  // Group courses by term for display
  const grouped = foundCourses.reduce<Record<string, FoundCourse[]>>((acc, c) => {
    const key = c.term ?? "Unknown term"
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const newCount = [...selected].filter((c) => !savedSet.has(c)).length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Transcript</DialogTitle>
        </DialogHeader>

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <div className="space-y-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`
                flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
                cursor-pointer p-8 text-center transition-colors
                ${isDragOver
                  ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))]"
                  : "border-border/50 hover:border-border hover:bg-card/40"
                }
              `}
            >
              <div className="text-2xl">📄</div>
              <div className="text-sm font-medium text-foreground">Drop your transcript PDF here</div>
              <div className="text-xs text-muted-foreground">or click to choose a file</div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Unofficial transcript from Quest &mdash; processed entirely in your browser. Nothing is uploaded.
            </p>
          </div>
        )}

        {/* ── PARSING ── */}
        {phase === "parsing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--brand))] border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Extracting courses from PDF&hellip;</p>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {phase === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Found <span className="font-medium text-foreground">{foundCourses.length}</span> courses
                &nbsp;&middot;&nbsp;
                <span className="font-medium text-foreground">{newCount}</span> new
              </span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="hover:text-foreground transition-colors">Select all</button>
                <span>/</span>
                <button onClick={deselectAll} className="hover:text-foreground transition-colors">None</button>
              </div>
            </div>

            <div className="max-h-64 overflow-auto space-y-3 pr-1">
              {Object.entries(grouped).map(([term, courses]) => (
                <div key={term}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5 px-0.5">
                    {term}
                  </div>
                  <div className="space-y-1">
                    {courses.map((c) => {
                      const alreadySaved = savedSet.has(c.code)
                      const isChecked = selected.has(c.code)
                      return (
                        <label
                          key={c.code}
                          className={`
                            flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition-colors
                            ${alreadySaved
                              ? "border-border/20 bg-card/20 opacity-50 cursor-default"
                              : isChecked
                                ? "border-[hsl(var(--brand)/0.4)] bg-[hsl(var(--brand-subtle))]"
                                : "border-border/40 bg-card/30 hover:border-border/60"
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={alreadySaved}
                            onChange={() => !alreadySaved && toggleCourse(c.code)}
                            className="accent-[hsl(var(--brand))]"
                          />
                          <span className="font-medium text-foreground">{c.code}</span>
                          {alreadySaved && (
                            <span className="ml-auto text-[10px] text-muted-foreground">already saved</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === "error" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive">
              {errorMsg}
            </div>
            <button
              onClick={reset}
              className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-xs hover:bg-card/50 transition-colors"
            >
              Try another file
            </button>
          </div>
        )}

        {/* ── FOOTER ── */}
        {phase === "preview" && (
          <DialogFooter className="gap-2">
            <button
              onClick={() => handleOpenChange(false)}
              className="rounded-lg border border-border/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="rounded-lg bg-[hsl(var(--brand))] px-3 py-1.5 text-xs font-medium text-black hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {selected.size > 0 ? `${selected.size} courses` : ""}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
