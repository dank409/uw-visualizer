import type { CourseCode } from "../types";

/**
 * Normalizes a course code string to a canonical format.
 * Handles variations like "CS 115", "CS115", "cs115", etc.
 */
export function normalizeCourseCode(input: string): CourseCode {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\s+/g, ""); // Remove all spaces for consistency
}

