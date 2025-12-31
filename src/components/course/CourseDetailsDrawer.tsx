import { type ReactNode } from "react"
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

          {/* Show prereqText as primary when available, otherwise show simplified prereq */}
          {course.prereqText ? (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Prerequisites</h3>
              <FormattedPrereqText html={course.prereqText} />
            </div>
          ) : course.prereq ? (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Prerequisites</h3>
              <PrereqDisplay prereq={course.prereq} />
            </div>
          ) : null}

          {course.coreq && (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Corequisites</h3>
              <PrereqDisplay prereq={course.coreq} />
            </div>
          )}

          {course.antireqText && (
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Antirequisites</h3>
              <FormattedPrereqText html={course.antireqText} />
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

/**
 * Formats prerequisite/antirequisite HTML text for better readability
 */
function FormattedPrereqText({ html }: { html: string }) {
  const formatted = formatPrereqHtml(html)
  
  return (
    <div className="text-sm text-muted-foreground space-y-3">
      {formatted.map((item, index) => (
        <div key={index} className="space-y-1">
          {item}
        </div>
      ))}
    </div>
  )
}


/**
 * Parses and formats prerequisite HTML into readable structured text
 */
function formatPrereqHtml(html: string): ReactNode[] {
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  
  const result: ReactNode[] = []
  
  // Check for top-level "Complete X of the following" pattern
  const topLevelText = tmp.textContent || ""
  const completePattern = topLevelText.match(/Complete\s+(\d+)\s+of\s+the\s+following/i)
  
  // Find ALL rule view results (A, B, C, etc.)
  const allRuleResults = Array.from(tmp.querySelectorAll('[data-test^="ruleView-"]'))
  
  // If we have a "Complete X of the following" pattern, show it first
  if (completePattern && allRuleResults.length > 1) {
    result.push(
      <div key="complete-header" className="font-semibold text-foreground mb-2">
        Complete {completePattern[1]} of the following:
      </div>
    )
  }
  
  // Parse each rule result into a group with header and courses
  const processedRules = new Set<Element>()
  
  allRuleResults.forEach((rule, ruleIndex) => {
    // Skip if already processed (avoid duplicates)
    if (processedRules.has(rule)) return
    processedRules.add(rule)
    
    // Extract the header text (text before the <ul>)
    const clone = rule.cloneNode(true) as Element
    // Remove nested rule views
    clone.querySelectorAll('[data-test^="ruleView-"]').forEach(nested => nested.remove())
    // Remove all lists to get just the requirement statement
    clone.querySelectorAll("ul").forEach(ul => ul.remove())
    const headerText = clone.textContent?.trim() || ""
    const cleanHeader = headerText
      .replace(/\s+/g, " ")
      .replace(/:\s*$/, "")
      .trim()
    
    if (!cleanHeader) return
    
    // Extract courses from lists in this rule
    const courses: Array<{ code: string; name: string }> = []
    rule.querySelectorAll("ul li").forEach((li) => {
      // Skip list items that contain rule views (those are separate requirements)
      if (!li.querySelector('[data-test^="ruleView-"]')) {
        const liText = li.textContent?.trim() || ""
        if (liText) {
          // Extract course code and name
          const courseMatch = liText.match(
            /\b([A-Z]{2,})\s*(\d{2,3}[A-Z]?)\b\s*-\s*(.+?)(?:\s*\([\d.]+\))?\s*$/
          )
          if (courseMatch) {
            const [, subj, num, name] = courseMatch
            const code = `${subj}${num}`
            courses.push({ code, name: name.trim() })
          } else {
            // Try to just extract code if no name format
            const codeMatch = liText.match(/\b([A-Z]{2,})\s*(\d{2,3}[A-Z]?)\b/)
            if (codeMatch) {
              const code = `${codeMatch[1]}${codeMatch[2]}`
              courses.push({ code, name: "" })
            }
          }
        }
      }
    })
    
    // Render this requirement group
    result.push(
      <div key={`req-group-${ruleIndex}`} className="mb-3">
        <div className="font-medium text-foreground mb-1">
          {cleanHeader}
        </div>
        {courses.length > 0 && (
          <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
            {courses.map(({ code, name }, courseIndex) => (
              <li key={`course-${ruleIndex}-${courseIndex}`} className="ml-4">
                <span className="font-mono">{code}</span>
                {name && <span className="ml-2 text-muted-foreground">- {name}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  })
  
  if (allRuleResults.length === 0) {
    // Fallback: process all rule results directly if no top-level list structure
    allRuleResults.forEach((ruleResult, ruleIndex) => {
      const clone = ruleResult.cloneNode(true) as Element
      clone.querySelectorAll('[data-test="ruleView-A-result"]').forEach(nested => nested.remove())
      clone.querySelectorAll("ul").forEach(ul => ul.remove())
      const mainText = clone.textContent?.trim() || ""
      const cleanText = mainText.replace(/\s+/g, " ").replace(/:\s*$/, "").trim()
      
      if (cleanText) {
        result.push(
          <div key={`rule-${ruleIndex}`} className="font-medium text-foreground mb-1">
            {cleanText}
          </div>
        )
      }
      
      ruleResult.querySelectorAll("ul").forEach((ul) => {
        const listItems: ReactNode[] = []
        ul.querySelectorAll("li").forEach((li) => {
          const liText = li.textContent?.trim() || ""
          if (liText && !li.querySelector('[data-test="ruleView-A-result"]')) {
            const courseMatch = liText.match(/([A-Z]+\d+[A-Z]*)\s*-\s*(.+?)(?:\s*\([\d.]+\))?\s*$/)
            if (courseMatch) {
              const [, code, name] = courseMatch
              listItems.push(
                <li key={`course-${ruleIndex}-${listItems.length}`} className="ml-4">
                  <span className="font-mono">{code}</span>
                  {name.trim() && <span className="ml-2 text-muted-foreground">- {name.trim()}</span>}
                </li>
              )
            } else {
              listItems.push(
                <li key={`text-${ruleIndex}-${listItems.length}`} className="ml-4">
                  {liText}
                </li>
              )
            }
          }
        })
        
        if (listItems.length > 0) {
          result.push(
            <ul key={`courses-${ruleIndex}`} className="list-disc list-inside ml-2 mt-1 mb-2 space-y-1">
              {listItems}
            </ul>
          )
        }
      })
    })
  }
  
  // If we found results, return them
  if (result.length > 0) {
    return result
  }
  
  // Fallback: try to find top-level structure
  // Look for "Complete 1 of the following" or similar patterns
  const fallbackText = tmp.textContent?.trim() || ""
  if (fallbackText) {
    // Try to split by common patterns that indicate separate requirements
    // Look for patterns like "Must have completed", "Earned a minimum grade", etc.
    const requirementPatterns = [
      /(Must have completed[^:]+:)/i,
      /(Earned a minimum grade[^:]+:)/i,
      /(Complete \d+ of the following)/i,
    ]
    
    let lastIndex = 0
    const sections: string[] = []
    
    for (const pattern of requirementPatterns) {
      const match = fallbackText.substring(lastIndex).match(pattern)
      if (match) {
        if (match.index! > 0) {
          sections.push(fallbackText.substring(lastIndex, lastIndex + match.index!).trim())
        }
        lastIndex += match.index! + match[0].length
      }
    }
    
    if (lastIndex < fallbackText.length) {
      sections.push(fallbackText.substring(lastIndex).trim())
    }
    
    if (sections.length > 1) {
      return sections.map((section, index) => (
        <div key={`section-${index}`} className="mb-2">
          {section}
        </div>
      ))
    }
    
    // Final fallback: return cleaned text
    const cleaned = fallbackText.replace(/\s+/g, " ").trim()
    return [<div key="fallback">{cleaned}</div>]
  }
  
  return [<div key="empty">No prerequisites information available.</div>]
}

