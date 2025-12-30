import type { Course, RawCourseData } from "./types";
import { parsePrerequisitesHtml, parseCorequisitesHtml } from "./prereq/parse";
import { normalizeCourseCode } from "./prereq/normalize";
import courseDataRaw from "@/data/courses.clean.json";

let courseIndex: Map<string, Course> | null = null;

/**
 * Loads and indexes course data from the JSON file.
 * Should be called once at app startup.
 */
export async function loadCourseIndex(): Promise<Map<string, Course>> {
  if (courseIndex) {
    return courseIndex;
  }

  try {
    const rawData = courseDataRaw as RawCourseData[];

    const index = new Map<string, Course>();

    for (const raw of rawData) {
      try {
        const normalizedCode = normalizeCourseCode(raw.code);
        
        const course: Course = {
          code: normalizedCode,
          title: raw.title || "Untitled Course",
          description: raw.description,
          prereq: parsePrerequisitesHtml(raw.prerequisitesHtml, raw.prereqCourses),
          prereqText: raw.prerequisitesHtml || undefined,
          coreq: parseCorequisitesHtml(raw.corequisitesHtml, raw.coreqCourses),
          antireqText: raw.antirequisitesHtml || undefined,
          department: extractDepartment(normalizedCode),
          units: raw.units,
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

