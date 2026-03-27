import type { Prereq } from "../types";
import { normalizeCourseCode } from "./normalize";

/**
 * Parses prerequisites HTML to extract structured AND/OR logic.
 * This is a simplified parser that handles common patterns in the UW course data.
 */
export function parsePrerequisitesHtml(html: string | null | undefined, prereqCourses: string[] = []): Prereq {
  if (!html || !prereqCourses || prereqCourses.length === 0) {
    return null;
  }

  // For MVP, we'll use a simple heuristic:
  // If the HTML contains "at least 1" or "1 of the following", treat as OR
  // If it contains "all of the following", treat as AND
  // Otherwise, default to OR for multiple courses

  const htmlLower = html.toLowerCase();
  const hasOrPattern = htmlLower.includes("at least 1") || 
                       htmlLower.includes("1 of the following") ||
                       htmlLower.includes("at least one");
  const hasAndPattern = htmlLower.includes("all of the following") ||
                        htmlLower.includes("each of the following");

  const normalizedCourses = prereqCourses
    .map(normalizeCourseCode)
    .filter(code => code.length > 0);

  if (normalizedCourses.length === 0) {
    return null;
  }

  if (normalizedCourses.length === 1) {
    return { type: "COURSE", code: normalizedCourses[0] };
  }

  // Multiple courses: determine AND vs OR
  if (hasAndPattern && !hasOrPattern) {
    // All courses required (AND)
    return {
      type: "AND",
      items: normalizedCourses.map(code => ({ type: "COURSE" as const, code }))
    };
  } else {
    // At least one required (OR) - default for multiple courses
    return {
      type: "OR",
      items: normalizedCourses.map(code => ({ type: "COURSE" as const, code }))
    };
  }
}

/**
 * Parses corequisites HTML (similar to prerequisites)
 */
export function parseCorequisitesHtml(html: string | null | undefined, coreqCourses: string[] = []): Prereq {
  if (!html || !coreqCourses || coreqCourses.length === 0) {
    return null;
  }

  const normalizedCourses = coreqCourses
    .map(normalizeCourseCode)
    .filter(code => code.length > 0);

  if (normalizedCourses.length === 0) {
    return null;
  }

  if (normalizedCourses.length === 1) {
    return { type: "COURSE", code: normalizedCourses[0] };
  }

  // Corequisites are typically OR (any one can be taken concurrently)
  return {
    type: "OR",
    items: normalizedCourses.map(code => ({ type: "COURSE" as const, code }))
  };
}

