import { motion, type Variants } from "framer-motion"
import { CourseSearchCommand } from "./CourseSearchCommand"
import type { Course } from "@/lib/types"

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

      {/* Search Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        transition={{ delay: 0.1 }}
        className="flex-1 p-5"
      >
        <motion.h2
          initial="hidden"
          animate="visible"
          variants={itemVariants}
          transition={{ delay: 0.2 }}
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

