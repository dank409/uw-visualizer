import type { Node, Edge } from "reactflow";
import { getCourse } from "../courseIndex";
import { collectCourseCodes } from "../prereq/ancestors";

/**
 * Computes which nodes and edges should be highlighted when hovering over a course.
 * Returns sets of node IDs and edge IDs to highlight.
 */
export function computeHighlight(
  hoveredNodeId: string,
  allNodes: Node[],
  allEdges: Edge[]
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  // Always highlight the hovered node
  nodeIds.add(hoveredNodeId);

  // Get the course and its prerequisites
  const course = getCourse(hoveredNodeId);
  if (!course || !course.prereq) {
    return { nodeIds, edgeIds };
  }

  // Collect all prerequisite course codes
  const prereqCodes = collectCourseCodes(course.prereq);

  // Find all prerequisite nodes
  for (const node of allNodes) {
    if (prereqCodes.has(node.data.code)) {
      nodeIds.add(node.id);
    }
  }

  // Find all edges connecting prerequisites to the hovered course
  for (const edge of allEdges) {
    if (edge.target === hoveredNodeId && nodeIds.has(edge.source)) {
      edgeIds.add(edge.id);
    }
    // Also highlight edges from prerequisites to their prerequisites
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      edgeIds.add(edge.id);
    }
  }

  return { nodeIds, edgeIds };
}

