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

  // Sort nodes alphabetically for stable ordering
  const sortedNodes = [...graph.nodes].sort((a, b) => a.code.localeCompare(b.code));

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
        code: node.code,
        label: node.label,
        isTarget: node.isTarget,
      },
    };
  });

  const reactFlowEdges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: false,
    style: {
      stroke: "#4b5563",
      strokeWidth: 1.5,
      opacity: 0.6,
    },
  }));

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

