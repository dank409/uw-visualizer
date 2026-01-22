import type { Course, RawStructuredCourseData, StructuredRequirement, Prereq } from "./types";
import { normalizeCourseCode } from "./prereq/normalize";
import courseDataRaw from "@/data/courses_structured.json";

let courseIndex: Map<string, Course> | null = null;

/**
 * Converts structured prerequisite format to Prereq type.
 * Only extracts course-based requirements (ignores LEVEL, PROGRAM, NOTE, etc.)
 */
function convertToPrereq(req: StructuredRequirement | null): Prereq {
  if (!req) return null;

  switch (req.type) {
    case "AND": {
      const items = req.children
        .map(convertToPrereq)
        .filter((p): p is NonNullable<Prereq> => p !== null);
      if (items.length === 0) return null;
      if (items.length === 1) return items[0];
      return { type: "AND", items };
    }
    case "OR": {
      const items = req.children
        .map(convertToPrereq)
        .filter((p): p is NonNullable<Prereq> => p !== null);
      if (items.length === 0) return null;
      if (items.length === 1) return items[0];
      return { type: "OR", items };
    }
    case "COURSE": {
      return {
        type: "COURSE",
        code: normalizeCourseCode(req.code),
      };
    }
    case "GRADE": {
      // Grade requirements are on specific courses
      const items = req.children
        .map(convertToPrereq)
        .filter((p): p is NonNullable<Prereq> => p !== null);
      if (items.length === 0) return null;
      if (items.length === 1) return items[0];
      return { type: "OR", items };
    }
    case "NOT": {
      // NOT type has a child requirement
      return convertToPrereq(req.child);
    }
    // These types don't represent course prerequisites
    case "LEVEL":
    case "PROGRAM":
    case "NOT_PROGRAM":
    case "NOTE":
    case "COREQUISITE_REF":
      return null;
    default:
      return null;
  }
}

/**
 * Generates a human-readable prerequisite text from structured data.
 */
function generatePrereqText(req: StructuredRequirement | null, indent: number = 0): string {
  if (!req) return "";
  const prefix = "  ".repeat(indent);

  switch (req.type) {
    case "AND": {
      const parts = req.children.map(r => generatePrereqText(r, indent + 1)).filter(Boolean);
      return parts.length > 0 ? `${prefix}All of:\n${parts.join("\n")}` : "";
    }
    case "OR": {
      const parts = req.children.map(r => generatePrereqText(r, indent + 1)).filter(Boolean);
      const minText = req.min && req.min > 1 ? ` (at least ${req.min})` : "";
      return parts.length > 0 ? `${prefix}One of${minText}:\n${parts.join("\n")}` : "";
    }
    case "COURSE":
      return `${prefix}${req.code}`;
    case "GRADE": {
      const parts = req.children.map(r => generatePrereqText(r, indent + 1)).filter(Boolean);
      return parts.length > 0 ? `${prefix}Grade of ${req.minGrade}% in:\n${parts.join("\n")}` : "";
    }
    case "LEVEL":
      return `${prefix}Level ${req.minLevel} or above`;
    case "PROGRAM":
      return `${prefix}Enrolled in: ${req.code}`;
    case "NOT_PROGRAM":
      return `${prefix}Not enrolled in: ${req.code}`;
    case "NOTE":
      return `${prefix}Note: ${req.text}`;
    case "NOT": {
      const childText = generatePrereqText(req.child, indent + 1);
      return childText ? `${prefix}Not completed:\n${childText}` : "";
    }
    case "COREQUISITE_REF":
      return `${prefix}See corequisites`;
    default:
      return "";
  }
}

/**
 * Extracts allowed programs from structured prerequisites.
 */
function extractAllowedPrograms(req: StructuredRequirement | null): string[] {
  if (!req) return [];

  if (req.type === "PROGRAM") {
    return [req.code];
  }

  if (req.type === "AND" || req.type === "OR") {
    const programs: string[] = [];
    for (const r of req.children) {
      programs.push(...extractAllowedPrograms(r));
    }
    return programs;
  }

  if (req.type === "NOT") {
    return extractAllowedPrograms(req.child);
  }

  if (req.type === "GRADE") {
    const programs: string[] = [];
    for (const r of req.children) {
      programs.push(...extractAllowedPrograms(r));
    }
    return programs;
  }

  return [];
}

/**
 * Extracts all course codes from structured requirements.
 */
function extractCourseCodes(req: StructuredRequirement | null): string[] {
  if (!req) return [];

  const codes: string[] = [];

  switch (req.type) {
    case "AND":
    case "OR":
    case "GRADE":
      for (const r of req.children) {
        codes.push(...extractCourseCodes(r));
      }
      break;
    case "COURSE":
      codes.push(normalizeCourseCode(req.code));
      break;
    case "NOT":
      codes.push(...extractCourseCodes(req.child));
      break;
    // LEVEL, PROGRAM, NOT_PROGRAM, NOTE, COREQUISITE_REF don't have course codes
  }

  // Remove duplicates
  return [...new Set(codes)];
}

/**
 * Loads and indexes course data from the JSON file.
 * Should be called once at app startup.
 */
export async function loadCourseIndex(): Promise<Map<string, Course>> {
  if (courseIndex) {
    return courseIndex;
  }

  try {
    const rawData = courseDataRaw as RawStructuredCourseData[];

    const index = new Map<string, Course>();

    for (const raw of rawData) {
      try {
        const normalizedCode = normalizeCourseCode(raw.code);

        const allowedPrograms = extractAllowedPrograms(raw.prerequisites);

        // Extract course codes from structured requirements
        const prereqCodes = extractCourseCodes(raw.prerequisites);
        const coreqCodes = extractCourseCodes(raw.corequisites);
        const antireqCodes = extractCourseCodes(raw.antirequisites);

        const course: Course = {
          code: normalizedCode,
          title: raw.title || "Untitled Course",
          description: raw.description,
          prereq: convertToPrereq(raw.prerequisites),
          prereqText: generatePrereqText(raw.prerequisites),
          coreq: convertToPrereq(raw.corequisites),
          antireqText: generatePrereqText(raw.antirequisites),
          department: extractDepartment(normalizedCode),
          units: raw.units,
          prereqCourses: prereqCodes.length > 0 ? prereqCodes : undefined,
          coreqCourses: coreqCodes.length > 0 ? coreqCodes : undefined,
          antireqCourses: antireqCodes.length > 0 ? antireqCodes : undefined,
          crossListed: raw.crossListed?.map(normalizeCourseCode),
          allowedPrograms: allowedPrograms.length > 0 ? allowedPrograms : undefined,
        };

        index.set(normalizedCode, course);
      } catch (error) {
        // Gracefully handle malformed course data
        console.warn(`Failed to process course ${raw.code}:`, error);
      }
    }

    courseIndex = index;
    return index;
  } catch (error) {
    console.error("Failed to load course data:", error);
    return new Map();
  }
}

/**
 * Gets the course index. Returns empty map if not loaded yet.
 */
export function getCourseIndex(): Map<string, Course> {
  return courseIndex || new Map();
}

/**
 * Gets a course by code (normalized).
 */
export function getCourse(code: string): Course | undefined {
  const normalized = normalizeCourseCode(code);
  return getCourseIndex().get(normalized);
}

/**
 * Searches for courses by code or title.
 */
export function searchCourses(query: string): Course[] {
  const index = getCourseIndex();
  if (!query.trim()) {
    return [];
  }

  const normalizedQuery = query.trim().toUpperCase();
  const results: Course[] = [];

  for (const course of index.values()) {
    if (
      course.code.includes(normalizedQuery) ||
      course.title.toUpperCase().includes(normalizedQuery)
    ) {
      results.push(course);
    }
  }

  // Sort by code
  return results.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Extracts department from course code (e.g., "CS115" -> "CS")
 */
function extractDepartment(code: string): string {
  const match = code.match(/^([A-Z]+)/);
  return match ? match[1] : "";
}

