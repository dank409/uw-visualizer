import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { CourseSidebar } from "@/components/course/CourseSidebar"
import { GraphCanvas } from "@/components/graph/GraphCanvas"
import { CourseDetailsDrawer } from "@/components/course/CourseDetailsDrawer"
import { loadCourseIndex, getCourse } from "@/lib/courseIndex"
import { buildGraph } from "@/lib/graph/buildGraph"
import { layoutGraph } from "@/lib/graph/layoutDagre"
import type { Course, CourseCode } from "@/lib/types"

export function CoursesPage() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showGraph, setShowGraph] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerCourseCode, setDrawerCourseCode] = useState<CourseCode | null>(null)

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

  const handleNodeClick = (nodeId: string) => {
    // Only open drawer for course nodes, not requirement nodes
    const course = getCourse(nodeId)
    if (course) {
      setDrawerCourseCode(course.code)
      setDrawerOpen(true)
    }
  }

  const graphData = useMemo(() => {
    if (!selectedCourse || !showGraph) {
      return { nodes: [], edges: [] }
    }

    const courseGraph = buildGraph(selectedCourse.code)
    return layoutGraph(courseGraph)
  }, [selectedCourse, showGraph])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
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
    <div className="flex h-screen bg-background">
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
          <GraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={handleNodeClick}
          />
        </motion.div>
        ) : (
          <div className="flex h-full items-center justify-center">
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
                className="mb-2 text-lg font-semibold"
              >
                No course selected
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-sm text-muted-foreground"
              >
                Search for a course to visualize its prerequisites
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>

      <CourseDetailsDrawer
        courseCode={drawerCourseCode}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}

