import React, { useState, useEffect, useMemo } from "react"
import { CourseSidebar } from "@/components/course/CourseSidebar"
import { GraphCanvas } from "@/components/graph/GraphCanvas"
import { CourseDetailsDrawer } from "@/components/course/CourseDetailsDrawer"
import { loadCourseIndex, getCourse } from "@/lib/courseIndex"
import { buildGraph } from "@/lib/graph/buildGraph"
import { layoutGraph } from "@/lib/graph/layoutDagre"
import type { Course, CourseCode } from "@/lib/types"

export function CoursesPage() {
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

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course)
    setShowGraph(true)
  }

  const handleRemoveCourse = () => {
    setSelectedCourse(null)
    setShowGraph(false)
  }

  const handleNodeClick = (nodeId: string) => {
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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading course data...</div>
          <div className="text-sm text-muted-foreground">This may take a moment</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <CourseSidebar
        selectedCourse={selectedCourse}
        onSelectCourse={handleSelectCourse}
      />

      <div className="flex-1 overflow-hidden">
        {showGraph && selectedCourse ? (
          <GraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold">No course selected</div>
              <div className="text-sm text-muted-foreground">
                Search for a course to visualize its prerequisites
              </div>
            </div>
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

