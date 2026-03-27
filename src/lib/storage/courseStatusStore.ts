import type { CourseCode, CourseStatus } from "../types";

const STORAGE_KEY = "uw-visualizer-course-status";

type StatusMap = Record<CourseCode, CourseStatus>;

/**
 * Gets the status of a course from localStorage.
 */
export function getCourseStatus(code: CourseCode): CourseStatus {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return "not_taken";
    
    const statusMap: StatusMap = JSON.parse(stored);
    return statusMap[code] || "not_taken";
  } catch {
    return "not_taken";
  }
}

/**
 * Sets the status of a course in localStorage.
 */
export function setCourseStatus(code: CourseCode, status: CourseStatus): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const statusMap: StatusMap = stored ? JSON.parse(stored) : {};
    statusMap[code] = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statusMap));
  } catch (error) {
    console.error("Failed to save course status:", error);
  }
}

/**
 * Gets all course statuses.
 */
export function getAllCourseStatuses(): StatusMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

