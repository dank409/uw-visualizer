import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { StatusToggle } from "./StatusToggle"
import { getCourseStatus, setCourseStatus } from "@/lib/storage/courseStatusStore"
import { getCourse } from "@/lib/courseIndex"
import type { CourseCode, CourseStatus } from "@/lib/types"

interface CourseDetailsDrawerProps {
  courseCode: CourseCode | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CourseDetailsDrawer({
  courseCode,
  open,
  onOpenChange,
}: CourseDetailsDrawerProps) {
  const course = courseCode ? getCourse(courseCode) : null
  const status = courseCode ? getCourseStatus(courseCode) : "not_taken"

  const handleStatusChange = (newStatus: CourseStatus) => {
    if (courseCode) {
      setCourseStatus(courseCode, newStatus)
      // Force re-render by triggering a state update
      window.dispatchEvent(new Event("courseStatusChanged"))
    }
  }

  if (!course) {
    return null
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{course.code}</DrawerTitle>
          <DrawerDescription>{course.title}</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {course.description && (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {course.description}
              </p>
            </div>
          )}

          {course.units && (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Units</h3>
              <p className="text-sm text-muted-foreground">{course.units}</p>
            </div>
          )}

          {course.prereq && (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Prerequisites</h3>
              <PrereqDisplay prereq={course.prereq} />
            </div>
          )}

          {course.prereqText && (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Prerequisite Text</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {stripHtml(course.prereqText)}
              </div>
            </div>
          )}

          {course.coreq && (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Corequisites</h3>
              <PrereqDisplay prereq={course.coreq} />
            </div>
          )}

          {course.antireqText && (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Antirequisites</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {stripHtml(course.antireqText)}
              </div>
            </div>
          )}
        </div>

        <DrawerFooter>
          <div>
            <h3 className="mb-2 font-semibold">Course Status</h3>
            <StatusToggle status={status} onStatusChange={handleStatusChange} />
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-4">
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function PrereqDisplay({ prereq }: { prereq: any }) {
  if (!prereq) return <p className="text-sm text-muted-foreground">None</p>

  if (prereq.type === "COURSE") {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="font-mono">{prereq.code}</span>
      </p>
    )
  }

  if (prereq.type === "AND") {
    return (
      <div className="text-sm text-muted-foreground">
        <div className="mb-1">All of:</div>
        <ul className="list-disc list-inside ml-2">
          {prereq.items.map((item: any, index: number) => (
            <li key={index}>
              <PrereqDisplay prereq={item} />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (prereq.type === "OR") {
    return (
      <div className="text-sm text-muted-foreground">
        <div className="mb-1">At least one of:</div>
        <ul className="list-disc list-inside ml-2">
          {prereq.items.map((item: any, index: number) => (
            <li key={index}>
              <PrereqDisplay prereq={item} />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return null
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ""
}

