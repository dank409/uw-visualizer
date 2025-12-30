import React, { useCallback, useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"
import { CourseNode } from "./CourseNode"
import { GraphControls } from "./GraphControls"
import { computeHighlight } from "@/lib/graph/highlight"
import { cn } from "@/lib/utils"

const nodeTypes = {
  courseNode: CourseNode,
}

interface GraphCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodeClick?: (nodeId: string) => void
  className?: string
}

function GraphCanvasInner({
  nodes,
  edges,
  onNodeClick,
  className,
}: GraphCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [nodesState, setNodesState] = useState<Node[]>(nodes)
  const [edgesState, setEdgesState] = useState<Edge[]>(edges)

  // Update nodes/edges when props change
  React.useEffect(() => {
    setNodesState(nodes)
    setEdgesState(edges)
  }, [nodes, edges])

  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodesState((nds) => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdgesState((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  // Compute highlight state
  const highlightState = useMemo(() => {
    if (!hoveredNodeId) {
      return { nodeIds: new Set<string>(), edgeIds: new Set<string>() }
    }
    return computeHighlight(hoveredNodeId, nodesState, edgesState)
  }, [hoveredNodeId, nodesState, edgesState])

  // Apply highlight styles to nodes
  const highlightedNodes = useMemo(() => {
    return nodesState.map((node) => {
      const isHighlighted = highlightState.nodeIds.has(node.id)
      const isFaded = hoveredNodeId && !isHighlighted && node.id !== hoveredNodeId

      return {
        ...node,
        style: {
          ...node.style,
          opacity: isFaded ? 0.3 : 1,
          transition: "opacity 0.2s",
        },
        selected: isHighlighted,
      }
    })
  }, [nodesState, highlightState, hoveredNodeId])

  // Apply highlight styles to edges
  const highlightedEdges = useMemo(() => {
    return edgesState.map((edge) => {
      const isHighlighted = highlightState.edgeIds.has(edge.id)
      const isFaded = hoveredNodeId && !isHighlighted

      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isHighlighted ? "#60a5fa" : "#4b5563",
          strokeWidth: isHighlighted ? 2.5 : 1.5,
          opacity: isFaded ? 0.15 : isHighlighted ? 1 : 0.6,
        },
        animated: isHighlighted,
        className: "transition-all duration-300",
      }
    })
  }, [edgesState, highlightState, hoveredNodeId])

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id)
    },
    [onNodeClick]
  )

  const handleNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id)
  }, [])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null)
  }, [])

  const handleZoomIn = useCallback(() => {
    zoomIn()
  }, [zoomIn])

  const handleZoomOut = useCallback(() => {
    zoomOut()
  }, [zoomOut])

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 })
  }, [fitView])

  const handleReset = useCallback(() => {
    fitView({ padding: 0.2 })
    setHoveredNodeId(null)
  }, [fitView])

  return (
    <div className={cn("h-full w-full", className)}>
      <ReactFlow
        nodes={highlightedNodes}
        edges={highlightedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background 
          variant="dots" 
          gap={20} 
          size={1}
          className="opacity-20"
        />
        <Controls 
          className="[&>button]:glass [&>button]:border-border [&>button]:text-foreground [&>button]:transition-all [&>button]:duration-200 [&>button]:hover:bg-accent/50"
          style={{ '--tw-border-opacity': '0.5' } as React.CSSProperties}
        />
        <MiniMap 
          className="glass border-border"
          style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
          nodeColor={(node) => {
            if (node.data?.isTarget) return '#3b82f6'
            return '#6b7280'
          }}
        />
      </ReactFlow>
      <GraphControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onReset={handleReset}
      />
    </div>
  )
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

