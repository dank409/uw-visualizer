import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import type { CourseGraph } from "./buildGraph";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const NODE_GAP_X = 50;
const NODE_GAP_Y = 100;

/**
 * Lays out a course graph using dagre with top-to-bottom layout.
 * Nodes are positioned deterministically with stable ordering.
 */
export function layoutGraph(graph: CourseGraph): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "TB",
    nodesep: NODE_GAP_X,
    ranksep: NODE_GAP_Y,
    align: "UL",
  });

  // Simple sorting: alphabetical by course code
  const sortedNodes = [...graph.nodes].sort((a, b) => {
    if (a.code && b.code) {
      return a.code.localeCompare(b.code);
    }
    return a.id.localeCompare(b.id);
  });

  // Add nodes to dagre graph
  for (const node of sortedNodes) {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add edges to dagre graph
  for (const edge of graph.edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  // Compute layout
  dagre.layout(dagreGraph);

  // Convert to ReactFlow format
  const reactFlowNodes: Node[] = sortedNodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    return {
      id: node.id,
      type: "courseNode",
      position: { x: dagreNode.x - NODE_WIDTH / 2, y: dagreNode.y - NODE_HEIGHT / 2 },
      data: {
        code: node.code!,
        label: node.label,
        isTarget: node.isTarget,
        gradeRequirement: node.gradeRequirement,
        hasOrPrerequisites: node.hasOrPrerequisites,
      },
    };
  });

  // Convert edges to ReactFlow format
  const reactFlowEdges: Edge[] = graph.edges.map((edge) => {
    const hasLabel = !!edge.label;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: false,
      label: edge.label,
      labelStyle: hasLabel
        ? {
            fill: "#6b7280",
            fontWeight: 500,
            fontSize: "11px",
            background: "rgba(255, 255, 255, 0.9)",
            padding: "3px 8px",
            borderRadius: "4px",
          }
        : undefined,
      labelBgStyle: hasLabel
        ? {
            fill: "rgba(255, 255, 255, 0.9)",
            fillOpacity: 0.9,
          }
        : undefined,
      style: {
        stroke: "#4b5563",
        strokeWidth: 1.5,
        opacity: 0.6,
      },
    };
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

