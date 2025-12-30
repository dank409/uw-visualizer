import type { CourseCode } from "../types";
import { collectAncestors } from "../prereq/ancestors";
import { getCourse } from "../courseIndex";

export type GraphNode = {
  id: string;
  code: CourseCode;
  label: string;
  isTarget: boolean;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type CourseGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/**
 * Builds a graph from a target course code.
 * Includes the target course and all its prerequisite ancestors.
 */
export function buildGraph(targetCode: CourseCode): CourseGraph {
  const targetCourse = getCourse(targetCode);
  if (!targetCourse) {
    return { nodes: [], edges: [] };
  }

  const { courses, edges: rawEdges } = collectAncestors(targetCode);

  // Build nodes
  const nodes: GraphNode[] = [];
  for (const code of courses) {
    const course = getCourse(code);
    if (course) {
      nodes.push({
        id: code,
        code,
        label: course.title,
        isTarget: code === targetCode,
      });
    }
  }

  // Build edges (from prereq to dependent)
  const graphEdges: GraphEdge[] = rawEdges.map((edge, index) => ({
    id: `e-${edge.from}-${edge.to}-${index}`,
    source: edge.from,
    target: edge.to,
  }));

  return { nodes, edges: graphEdges };
}

