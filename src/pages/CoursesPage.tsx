import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { CourseSidebar } from "@/components/course/CourseSidebar"
import { CanvasGraph } from "@/components/graph/CanvasGraph"
import { loadCourseIndex, getCourse } from "@/lib/courseIndex"
import type { Course, CourseCode } from "@/lib/types"

export function CoursesPage() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showGraph, setShowGraph] = useState(false)

  useEffect(() => {
    loadCourseIndex().then(() => {
      setLoading(false)
    })
  }, [])

  // Handle course selection from URL parameter
  useEffect(() => {
    if (!loading) {
      const courseCode = searchParams.get("course")
      if (courseCode) {
        const course = getCourse(courseCode)
        if (course) {
          setSelectedCourse(course)
          setShowGraph(true)
        }
      }
    }
  }, [searchParams, loading])

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course)
    setShowGraph(true)
  }

  const handleNodeClick = (courseCode: CourseCode) => {
    // Could navigate to that course or do something else
    console.log("Clicked on:", courseCode)
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-150px)] items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-foreground"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 text-lg"
          >
            Loading course data...
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm text-muted-foreground"
          >
            This may take a moment
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-150px)] bg-background">
      <CourseSidebar
        selectedCourse={selectedCourse}
        onSelectCourse={handleSelectCourse}
      />

      <div className="flex-1 overflow-hidden">
        {showGraph && selectedCourse ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full"
          >
            <CanvasGraph
              targetCode={selectedCourse.code}
              onNodeClick={handleNodeClick}
            />
          </motion.div>
        ) : (
          <div className="flex h-full items-center justify-center bg-[#0a0a0f]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="mb-2 text-lg font-semibold text-gray-300"
              >
                No course selected
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-sm text-gray-500"
              >
                Search for a course to visualize its prerequisites
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

