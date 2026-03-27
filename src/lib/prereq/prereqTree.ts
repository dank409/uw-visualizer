/**
 * TypeScript port of the Python prerequisite parser
 * Builds complete prerequisite trees with AND/OR logic
 */

import { getCourse } from "../courseIndex"
import type { CourseCode } from "../types"

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
 * Parse prerequisites HTML into structured rules
 */
export function parsePrerequisitesHtml(html: string | null | undefined): PrerequisiteRule | null {
  if (!html) return null

  // Pattern to extract course codes from links
  const coursePattern = /<a[^>]*>([A-Z]{2,}\s*\d{3,})<\/a>/gi

  // Check for top-level logic (handles HTML comments)
  const hasOr = /Complete\s*(?:<!--\s*-->)?\s*1\s*(?:<!--\s*-->)?\s+of/i.test(html)
  const hasAll = /Complete\s*(?:<!--\s*-->)?\s+all\s+(?:<!--\s*-->)?\s+of/i.test(html)

  if (hasOr || hasAll) {
    const logic: "AND" | "OR" = hasOr ? "OR" : "AND"
    const topRule: PrerequisiteRule = {
      type: "rule",
      logic,
      requirements: [],
    }

    // Split by rule sections
    const sections = html.split(/<li[^>]*data-test="ruleView-[^"]*">/i)

    for (let i = 1; i < sections.length; i++) {
      const section = sections[i]
      if (!section.trim()) continue

      // Check for "Must have completed" (no grade)
      if (section.includes("Must have completed")) {
        const matches = [...section.matchAll(coursePattern)]
        for (const match of matches) {
          const code = match[1].replace(/\s/g, "").trim()
          if (code) {
            topRule.requirements.push({
              type: "course",
              course_code: code,
            })
          }
        }
        continue
      }

      // Check for grade requirement
      const gradeMatch = section.match(/grade\s+of\s+<span>(\d+)%<\/span>/i)
      if (gradeMatch) {
        const grade = parseInt(gradeMatch[1], 10)
        const isOr = /at\s+least\s+(\d+|<span>\d+<\/span>)/i.test(section)

        const matches = [...section.matchAll(coursePattern)]
        const coursesClean = matches
          .map(m => m[1].replace(/\s/g, "").trim())
          .filter(c => c)

        if (coursesClean.length === 1) {
          topRule.requirements.push({
            type: "course",
            course_code: coursesClean[0],
            grade_min: grade,
            grade_type: isOr ? "at least" : "each",
          })
        } else if (coursesClean.length > 1) {
          const subRule: PrerequisiteRule = {
            type: "rule",
            logic: isOr ? "OR" : "AND",
            grade_min: grade,
            grade_type: isOr ? "at least" : "each",
            requirements: coursesClean.map(code => ({
              type: "course" as const,
              course_code: code,
              grade_min: grade,
              grade_type: isOr ? "at least" : "each",
            })),
          }
          topRule.requirements.push(subRule)
        }
      }
    }

    return topRule.requirements.length > 0 ? topRule : null
  }

  // Fallback: just extract courses
  const matches = [...html.matchAll(coursePattern)]
  const coursesClean = matches
    .map(m => m[1].replace(/\s/g, "").trim())
    .filter(c => c)

  if (coursesClean.length === 1) {
    return {
      type: "rule",
      logic: "AND",
      requirements: [{ type: "course", course_code: coursesClean[0] }],
    }
  } else if (coursesClean.length > 1) {
    return {
      type: "rule",
      logic: "OR",
      requirements: coursesClean.map(code => ({
        type: "course" as const,
        course_code: code,
      })),
    }
  }

  return null
}

/**
 * Parse antirequisites HTML to get course codes
 */
export function parseAntirequisitesHtml(html: string | null | undefined): string[] {
  if (!html) return []

  const pattern = /<a[^>]*>([A-Z]{2,}\s*\d{3,})<\/a>/gi
  const matches = [...html.matchAll(pattern)]
  const courses = new Set(
    matches.map(m => m[1].replace(/\s/g, "").trim()).filter(c => c)
  )
  return Array.from(courses)
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
    antirequisites: parseAntirequisitesHtml(course.antireqText),
    prerequisites: null,
    prerequisite_tree: null,
  }

  const prereqHtml = course.prereqText
  if (prereqHtml) {
    const prereqRule = parsePrerequisitesHtml(prereqHtml)
    result.prerequisites = prereqRule

    if (prereqRule) {
      const allCodes = getAllCoursesFromRule(prereqRule)
      result.prerequisite_tree = {}

      for (const prereqCode of allCodes) {
        const visitedCopy = new Set(visited)
        const subtree = buildPrerequisiteTree(prereqCode, visitedCopy)
        result.prerequisite_tree[prereqCode] = subtree
      }
    }
  }

  visited.delete(code)
  return result
}

