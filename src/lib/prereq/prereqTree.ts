/**
 * Prerequisite tree builder
 * Builds complete prerequisite trees with AND/OR logic from structured course data
 */

import { getCourse } from "../courseIndex"
import type { CourseCode, Prereq } from "../types"

// Types
export interface CourseRequirement {
  type: "course"
  course_code: string
  grade_min?: number
  grade_type?: string
}

export interface PrerequisiteRule {
  type: "rule"
  logic: "AND" | "OR"
  grade_min?: number
  grade_type?: string
  requirements: (CourseRequirement | PrerequisiteRule)[]
}

export interface PrereqTreeNode {
  course_code: string
  title: string
  units: number
  antirequisites: string[]
  prerequisites: PrerequisiteRule | null
  prerequisite_tree: Record<string, PrereqTreeNode> | null
  circular?: boolean
  error?: string
}

/**
 * Get all course codes from a prerequisite rule
 */
export function getAllCoursesFromRule(
  rule: PrerequisiteRule | CourseRequirement | null
): Set<string> {
  const courses = new Set<string>()

  if (!rule) return courses

  if (rule.type === "course") {
    courses.add(rule.course_code)
  } else if (rule.type === "rule") {
    for (const req of rule.requirements) {
      const subCourses = getAllCoursesFromRule(req)
      subCourses.forEach(c => courses.add(c))
    }
  }

  return courses
}

/**
 * Convert the parsed Prereq type (from parse.ts) to PrerequisiteRule format
 * This ensures we use the properly nested AND/OR structure
 */
function convertPrereqToRule(prereq: Prereq): PrerequisiteRule | null {
  if (!prereq) return null

  if (prereq.type === "COURSE") {
    return {
      type: "rule",
      logic: "AND",
      requirements: [{ type: "course", course_code: prereq.code }]
    }
  }

  if (prereq.type === "AND" || prereq.type === "OR") {
    const requirements: (CourseRequirement | PrerequisiteRule)[] = []

    for (const item of prereq.items) {
      if (!item) continue

      if (item.type === "COURSE") {
        requirements.push({ type: "course", course_code: item.code })
      } else {
        const subRule = convertPrereqToRule(item)
        if (subRule) {
          requirements.push(subRule)
        }
      }
    }

    if (requirements.length === 0) return null

    return {
      type: "rule",
      logic: prereq.type,
      requirements
    }
  }

  return null
}

/**
 * Build complete prerequisite tree for a course
 */
export function buildPrerequisiteTree(
  targetCode: CourseCode,
  visited: Set<string> = new Set()
): PrereqTreeNode {
  const course = getCourse(targetCode)
  if (!course) {
    return {
      course_code: targetCode,
      title: "",
      units: 0,
      antirequisites: [],
      prerequisites: null,
      prerequisite_tree: null,
      error: `Course ${targetCode} not found`,
    }
  }

  const code = targetCode.replace(/\s/g, "").toUpperCase()
  if (visited.has(code)) {
    return {
      course_code: code,
      title: course.title,
      units: course.units || 0,
      antirequisites: [],
      prerequisites: null,
      prerequisite_tree: null,
      circular: true,
    }
  }

  visited.add(code)

  const result: PrereqTreeNode = {
    course_code: course.code,
    title: course.title,
    units: course.units || 0,
    antirequisites: course.antireqCourses || [],
    prerequisites: null,
    prerequisite_tree: null,
  }

  // Use the properly parsed prereq structure (handles nested AND/OR correctly)
  const prereqRule = course.prereq ? convertPrereqToRule(course.prereq) : null

  if (prereqRule) {
    result.prerequisites = prereqRule
    const allCodes = getAllCoursesFromRule(prereqRule)
    result.prerequisite_tree = {}

    for (const prereqCode of allCodes) {
      const visitedCopy = new Set(visited)
      const subtree = buildPrerequisiteTree(prereqCode, visitedCopy)
      result.prerequisite_tree[prereqCode] = subtree
    }
  }

  visited.delete(code)
  return result
}

