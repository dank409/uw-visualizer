import type { Prereq, CourseCode } from "../types";
import { getCourse } from "../courseIndex";

/**
 * Recursively collects all course codes referenced in a prerequisite tree.
 */
export function collectCourseCodes(prereq: Prereq): Set<CourseCode> {
  const codes = new Set<CourseCode>();

  if (!prereq) {
    return codes;
  }

  if (prereq.type === "COURSE") {
    codes.add(prereq.code);
  } else if (prereq.type === "AND" || prereq.type === "OR") {
    for (const item of prereq.items) {
      const subCodes = collectCourseCodes(item);
      subCodes.forEach(code => codes.add(code));
    }
  }

  return codes;
}

/**
 * Recursively traverses prerequisite tree and collects all ancestor courses
 * along with edges (prereq -> dependent).
 */
export function collectAncestors(
  targetCode: CourseCode,
  visited: Set<CourseCode> = new Set()
): { courses: Set<CourseCode>; edges: Array<{ from: CourseCode; to: CourseCode }> } {
  const courses = new Set<CourseCode>();
  const edges: Array<{ from: CourseCode; to: CourseCode }> = [];

  if (visited.has(targetCode)) {
    return { courses, edges };
  }

  visited.add(targetCode);
  courses.add(targetCode);

  const course = getCourse(targetCode);
  if (!course || !course.prereq) {
    return { courses, edges };
  }

  const prereqCodes = collectCourseCodes(course.prereq);

  for (const prereqCode of prereqCodes) {
    // Only traverse if the course exists in our index
    if (getCourse(prereqCode)) {
      edges.push({ from: prereqCode, to: targetCode });
      
      const subResult = collectAncestors(prereqCode, visited);
      subResult.courses.forEach(c => courses.add(c));
      edges.push(...subResult.edges);
    }
  }

  return { courses, edges };
}

