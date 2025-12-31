import type { CourseCode } from "../types";
import { collectAncestors, collectCourseCodes } from "../prereq/ancestors";
import { getCourse } from "../courseIndex";
import { parseStructuredPrereq, type RequirementGroup } from "../prereq/parseStructured";

export type GraphNode = {
  id: string;
  code?: CourseCode; // Only for course nodes
  label: string;
  isTarget: boolean;
  nodeType: "course";
  gradeRequirement?: string; // For displaying on course nodes
  hasOrPrerequisites?: boolean; // Indicates "Requires: Any one of the following"
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string; // For "Complete any ONE" annotation
};

export type CourseGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/**
 * Builds a graph from a target course code.
 * Includes the target course and all its prerequisite ancestors.
 * Now supports requirement nodes for OR groups and grade requirements.
 */
export function buildGraph(targetCode: CourseCode): CourseGraph {
  const targetCourse = getCourse(targetCode);
  if (!targetCourse) {
    return { nodes: [], edges: [] };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Parse structured prerequisites if available (for grade requirements and OR detection)
  const structuredPrereq = targetCourse.prereqText
    ? parseStructuredPrereq(targetCourse.prereqText)
    : null;
  
  // Check if target has OR prerequisites
  const hasOrPrerequisites = structuredPrereq && 
                              structuredPrereq.topLevelType === "OR" && 
                              structuredPrereq.groups.length > 1;

  // Add target course node
  nodes.push({
    id: targetCode,
    code: targetCode,
    label: targetCourse.title,
    isTarget: true,
    nodeType: "course",
    hasOrPrerequisites,
  });

  // Extract grade requirements for all courses from structured prerequisites
  const courseGradeMap = new Map<CourseCode, string>(); // course -> grade requirement
  
  if (structuredPrereq) {
    // Store grade requirements for each course (works for OR, AND, and SINGLE)
    structuredPrereq.groups.forEach((group) => {
      group.courses.forEach((code) => {
        if (group.gradeRequirement && !courseGradeMap.has(code)) {
          courseGradeMap.set(code, group.gradeRequirement);
        }
      });
    });
  }

  // Use the standard ancestor collection approach
  const { courses, edges: rawEdges } = collectAncestors(targetCode);

  // Build nodes with grade requirements
  for (const code of courses) {
    if (code !== targetCode) {
      const course = getCourse(code);
      if (course) {
        nodes.push({
          id: code,
          code,
          label: course.title,
          isTarget: false,
          nodeType: "course",
          gradeRequirement: courseGradeMap.get(code),
        });
      }
    }
  }

  // Build edges (no labels - requirement is shown on target node)
  rawEdges.forEach((edge, index) => {
    edges.push({
      id: `e-${edge.from}-${edge.to}-${index}`,
      source: edge.from,
      target: edge.to,
    });
  });

  return { nodes, edges };
}

