import { useEffect, useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow"
import dagre from "dagre"
import "reactflow/dist/style.css"
import type { CourseNodeData } from "@/lib/uwCatalog"

const NODE_W = 260
const NODE_H = 84

function getLayouted(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 90, marginx: 24, marginy: 24 })

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
  completedCodes,
  directCompletedCodes,
  hiddenCodes,
  onSelectCode,
}: {
  targetCode: string
  courseMap: Map<string, CourseNodeData>
  completedCodes?: Set<string>
  directCompletedCodes?: Set<string>
  hiddenCodes?: Set<string>
  onSelectCode?: (code: string) => void
}) {
  const [rf, setRf] = useState<ReactFlowInstance | null>(null)
  const [focusedMode, setFocusedMode] = useState(true)

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")

  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = []
    const edgeList: Edge[] = []

    const dist = new Map<string, number>()
    const queue: Array<{ code: string; d: number }> = [{ code: targetCode, d: 0 }]
    while (queue.length) {
      const { code, d } = queue.shift()!
      if (dist.has(code) && (dist.get(code) as number) <= d) continue
      dist.set(code, d)
      const node = courseMap.get(code)
      if (!node) continue
      for (const p of node.prerequisiteCodes) queue.push({ code: p, d: d + 1 })
    }

    const focusVisible = new Set<string>()
    for (const [code, d] of dist.entries()) {
      if (d <= 2) focusVisible.add(code)
    }
    focusVisible.add(targetCode)
    completedCodes?.forEach((c) => focusVisible.add(c))
    directCompletedCodes?.forEach((c) => focusVisible.add(c))

    for (const course of courseMap.values()) {
      const isTarget = course.code === targetCode
      const isDirect = Boolean(directCompletedCodes?.has(course.code))
      const isAssumed = Boolean(completedCodes?.has(course.code) && !isDirect)
      const isCompleted = isDirect
      const focusHidden = focusedMode && !focusVisible.has(course.code)
      nodeList.push({
        id: course.code,
        data: { label: `${course.code}\n${course.title}${isAssumed ? "\n(assumed prereq)" : ""}` },
        ariaLabel: isAssumed ? `Required for completed course (assumed satisfied): ${course.code}` : course.code,
        type: "default",
        hidden: (hiddenCodes?.has(course.code) || focusHidden) || false,
        position: { x: 0, y: 0 },
        style: {
          width: isTarget ? Math.round(NODE_W * 1.5) : NODE_W,
          borderRadius: 14,
          border: isTarget
            ? "3px solid hsl(var(--brand))"
            : isCompleted
              ? "2px solid hsl(42 90% 44%)"
              : isAssumed
                ? "1.5px solid hsl(42 70% 55%)"
                : "1px solid hsl(var(--border))",
          background: isAssumed
            ? "hsl(45 100% 95% / 0.88)"
            : isCompleted
              ? "hsl(42 100% 91% / 0.95)"
              : "hsl(var(--card) / 0.98)",
          color: (isCompleted || isAssumed) ? "#151515" : "hsl(var(--foreground))",
          opacity: hiddenCodes?.has(course.code) ? 0 : 1,
          boxShadow: isTarget
            ? "0 0 0 4px hsl(var(--brand) / 0.28), 0 10px 24px hsl(42 100% 45% / 0.26)"
            : isCompleted
              ? "0 0 0 2px hsl(42 85% 48% / 0.24), 0 6px 14px hsl(42 85% 40% / 0.2)"
              : isAssumed
                ? "0 0 0 1px hsl(42 80% 60% / 0.2)"
                : "0 2px 8px hsl(220 20% 20% / 0.08)",
          fontSize: 12,
          lineHeight: 1.25,
          whiteSpace: "pre-wrap",
        },
      })

      for (const prereq of course.prerequisiteCodes) {
        if (!courseMap.has(prereq)) continue
        const pathSatisfied = Boolean(completedCodes?.has(prereq) || completedCodes?.has(course.code))
        const edgeFocusHidden = focusedMode && (!focusVisible.has(prereq) || !focusVisible.has(course.code))
        edgeList.push({
          id: `${prereq}->${course.code}`,
          source: prereq,
          target: course.code,
          hidden: (hiddenCodes?.has(prereq) || hiddenCodes?.has(course.code) || edgeFocusHidden) || false,
          animated: false,
          style: {
            stroke: pathSatisfied ? "hsl(42 90% 46%)" : "hsl(42 55% 42%)",
            strokeWidth: pathSatisfied ? 2.5 : 1.9,
            opacity: hiddenCodes?.has(prereq) || hiddenCodes?.has(course.code) ? 0 : 1,
          },
        })
      }
    }

    return { nodes: getLayouted(nodeList, edgeList), edges: edgeList }
  }, [courseMap, targetCode, isDark, completedCodes, directCompletedCodes, hiddenCodes, focusedMode])

  const comfortableZoom = nodes.length > 20 ? 0.78 : nodes.length > 12 ? 0.86 : 0.96

  useEffect(() => {
    if (!rf || nodes.length === 0) return
    rf.fitView({ padding: 0.3, duration: 280 })
    const targetNode = nodes.find((n) => n.id === targetCode)
    if (!targetNode) return
    setTimeout(() => {
      rf.setCenter(targetNode.position.x + NODE_W / 2, targetNode.position.y + NODE_H / 2, {
        zoom: comfortableZoom,
        duration: 260,
      })
    }, 290)
  }, [rf, nodes, targetCode, comfortableZoom])

  const centerTarget = () => {
    if (!rf) return
    const targetNode = nodes.find((n) => n.id === targetCode)
    if (!targetNode) return
    rf.setCenter(targetNode.position.x + NODE_W / 2, targetNode.position.y + NODE_H / 2, {
      zoom: comfortableZoom,
      duration: 320,
    })
  }

  return (
    <div className="relative h-[460px] md:h-[620px] w-full rounded-xl border border-border bg-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.24 }}
        minZoom={0.2}
        maxZoom={1.8}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        onInit={setRf}
        onNodeClick={(_, n) => onSelectCode?.(n.id)}
      >
        <MiniMap pannable zoomable nodeStrokeWidth={3} className="!bg-card !border-border" />
        <Controls showInteractive={false} />
        <Background gap={20} size={1} color={isDark ? "#2b3345" : "#d9dee8"} />
      </ReactFlow>

      <div className="absolute right-3 top-3 z-20 flex gap-2">
        <button
          onClick={() => setFocusedMode((v) => !v)}
          className="rounded-md border border-border bg-card/90 px-2 py-1 text-xs hover:bg-accent"
        >
          {focusedMode ? "Focused" : "Full"}
        </button>
        <button
          onClick={() => rf?.fitView({ padding: 0.24, duration: 300 })}
          className="rounded-md border border-border bg-card/90 px-2 py-1 text-xs hover:bg-accent"
        >
          Fit view
        </button>
        <button
          onClick={centerTarget}
          className="rounded-md border border-border bg-card/90 px-2 py-1 text-xs hover:bg-accent"
        >
          Center target
        </button>
      </div>
    </div>
  )
}
