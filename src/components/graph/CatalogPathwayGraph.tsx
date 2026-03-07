import { useMemo } from "react"
import ReactFlow, { Background, Controls, MiniMap, Position, type Edge, type Node } from "reactflow"
import dagre from "dagre"
import "reactflow/dist/style.css"
import type { CourseNodeData } from "@/lib/uwCatalog"

const NODE_W = 230
const NODE_H = 72

function getLayouted(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 })

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map((n) => {
    const pos = g.node(n.id)
    return {
      ...n,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    }
  })
}

export function CatalogPathwayGraph({
  targetCode,
  courseMap,
  onSelectCode,
}: {
  targetCode: string
  courseMap: Map<string, CourseNodeData>
  onSelectCode?: (code: string) => void
}) {
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = []
    const edgeList: Edge[] = []

    for (const course of courseMap.values()) {
      nodeList.push({
        id: course.code,
        data: { label: `${course.code}\n${course.title}` },
        type: "default",
        position: { x: 0, y: 0 },
        style: {
          width: NODE_W,
          borderRadius: 12,
          border: course.code === targetCode ? "2px solid hsl(172 88% 50%)" : "1px solid hsl(214 32% 84%)",
          background: "hsl(0 0% 100% / 0.96)",
          fontSize: 12,
          lineHeight: 1.25,
          whiteSpace: "pre-wrap",
        },
      })

      for (const prereq of course.prerequisiteCodes) {
        if (!courseMap.has(prereq)) continue
        edgeList.push({
          id: `${prereq}->${course.code}`,
          source: prereq,
          target: course.code,
          animated: false,
          style: { stroke: "hsl(140 45% 45%)", strokeWidth: 1.8 },
        })
      }
    }

    return { nodes: getLayouted(nodeList, edgeList), edges: edgeList }
  }, [courseMap, targetCode])

  return (
    <div className="h-[460px] md:h-[620px] w-full rounded-xl border border-border bg-white overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => onSelectCode?.(n.id)}
      >
        <MiniMap pannable zoomable nodeStrokeWidth={3} />
        <Controls />
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}
