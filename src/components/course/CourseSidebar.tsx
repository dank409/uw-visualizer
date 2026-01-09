import { useState, useEffect, useMemo, useRef } from "react"
import { motion, type Variants } from "framer-motion"
import { ChevronDown, GraduationCap, Search, X } from "lucide-react"
import { CourseSearchCommand } from "./CourseSearchCommand"
import type { Course, ProgramId } from "@/lib/types"
import { 
  PROGRAMS_BY_FACULTY,
  PROGRAMS,
  getSelectedProgram, 
  setSelectedProgram,
  getProgram 
} from "@/lib/storage/programStore"

interface CourseSidebarProps {
  selectedCourse: Course | null
  onSelectCourse: (course: Course) => void
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

export function CourseSidebar({
  selectedCourse,
  onSelectCourse,
}: CourseSidebarProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<ProgramId | null>(null)
  const [isProgramOpen, setIsProgramOpen] = useState(false)
  const [programSearch, setProgramSearch] = useState("")
  const programSearchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load saved program on mount
  useEffect(() => {
    const saved = getSelectedProgram()
    if (saved) {
      setSelectedProgramId(saved)
    }
  }, [])

  // Focus search when dropdown opens
  useEffect(() => {
    if (isProgramOpen && programSearchRef.current) {
      programSearchRef.current.focus()
    }
    if (!isProgramOpen) {
      setProgramSearch("")
    }
  }, [isProgramOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProgramOpen(false)
      }
    }
    if (isProgramOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isProgramOpen])

  const handleProgramSelect = (programId: ProgramId | null) => {
    setSelectedProgramId(programId)
    setSelectedProgram(programId)
    setIsProgramOpen(false)
    setProgramSearch("")
  }

  const selectedProgram = selectedProgramId ? getProgram(selectedProgramId) : null

  // Filter programs by search
  const filteredPrograms = useMemo(() => {
    if (!programSearch.trim()) return null // Return null to show grouped view
    
    const query = programSearch.toLowerCase()
    return PROGRAMS.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.shortName && p.shortName.toLowerCase().includes(query)) ||
      p.faculty.toLowerCase().includes(query)
    )
  }, [programSearch])

  return (
    <div className="flex h-full w-80 flex-col border-r bg-background/95 backdrop-blur-sm" style={{ borderColor: 'hsl(var(--sidebar-border) / 0.5)' }}>
      {/* Header */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="border-b p-5"
        style={{ borderColor: 'hsl(var(--sidebar-border) / 0.5)' }}
      >
        <h1 className="text-xl font-bold tracking-tight text-foreground">Course Graph</h1>
      </motion.div>

      {/* Program Selector */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        transition={{ delay: 0.1 }}
        className="border-b p-4"
        style={{ borderColor: 'hsl(var(--sidebar-border) / 0.5)' }}
      >
        <motion.h2
          initial="hidden"
          animate="visible"
          variants={itemVariants}
          transition={{ delay: 0.15 }}
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5"
        >
          <GraduationCap className="w-3 h-3" />
          Your Program
        </motion.h2>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProgramOpen(!isProgramOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors text-sm"
          >
            <span className={selectedProgram ? "text-foreground" : "text-muted-foreground"}>
              {selectedProgram ? selectedProgram.name : "All Programs (no filter)"}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isProgramOpen ? "rotate-180" : ""}`} />
          </button>
          
          {isProgramOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-xl overflow-hidden">
              {/* Search input */}
              <div className="p-2 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={programSearchRef}
                    type="text"
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    placeholder="Search programs..."
                    className="w-full pl-8 pr-8 py-2 text-sm bg-muted/50 rounded-md border border-border/50 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                  {programSearch && (
                    <button
                      onClick={() => setProgramSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="max-h-[280px] overflow-y-auto">
                {/* Clear selection option - only show when not searching */}
                {!programSearch && (
                  <>
                    <button
                      onClick={() => handleProgramSelect(null)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                        !selectedProgramId ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                      }`}
                    >
                      All Programs (no filter)
                    </button>
                    <div className="border-t border-border/50" />
                  </>
                )}
                
                {/* Filtered results */}
                {filteredPrograms ? (
                  filteredPrograms.length > 0 ? (
                    filteredPrograms.map((program) => (
                      <button
                        key={program.id}
                        onClick={() => handleProgramSelect(program.id)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                          selectedProgramId === program.id ? "bg-accent text-accent-foreground" : "text-foreground"
                        }`}
                      >
                        {program.name}
                        <span className="ml-2 text-xs text-muted-foreground">({program.shortName})</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No programs found
                    </div>
                  )
                ) : (
                  /* Programs grouped by faculty */
                  Object.entries(PROGRAMS_BY_FACULTY).map(([faculty, programs]) => (
                    <div key={faculty}>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 sticky top-0">
                        {faculty}
                      </div>
                      {programs.map((program) => (
                        <button
                          key={program.id}
                          onClick={() => handleProgramSelect(program.id)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                            selectedProgramId === program.id ? "bg-accent text-accent-foreground" : "text-foreground"
                          }`}
                        >
                          {program.name}
                          {program.shortName && (
                            <span className="ml-2 text-xs text-muted-foreground">({program.shortName})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        {selectedProgram && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing courses relevant to {selectedProgram.shortName || selectedProgram.name} students
          </p>
        )}
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        transition={{ delay: 0.2 }}
        className="flex-1 p-5 overflow-hidden"
      >
        <motion.h2
          initial="hidden"
          animate="visible"
          variants={itemVariants}
          transition={{ delay: 0.25 }}
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
        >
          Search Courses
        </motion.h2>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={itemVariants}
          transition={{ delay: 0.3 }}
        >
          <CourseSearchCommand
            selectedCourse={selectedCourse}
            onSelectCourse={onSelectCourse}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

