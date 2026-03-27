import { useEffect, useMemo, useState, useCallback, memo } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  Handle,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "reactflow"
import dagre from "dagre"
import "reactflow/dist/style.css"
import type { CourseNodeData } from "@/lib/uwCatalog"
import { cn } from "@/lib/utils"

const NODE_W = 200
const NODE_H = 62

function getLayouted(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 70, marginx: 24, marginy: 24 })

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

type CourseNodeType = {
  code: string
  title: string
  isTarget: boolean
  isCompleted: boolean
  isAssumed: boolean
  status?: "completed" | "in_progress" | "planned"
}

const CourseNode = memo(({ data }: NodeProps<CourseNodeType>) => {
  const { code, title, isTarget, isCompleted, isAssumed, status } = data

  return (
    <div
      className={cn(
        "relative rounded-xl px-3.5 py-2.5 text-left transition-shadow cursor-pointer select-none",
        "border backdrop-blur-sm",
        isTarget
          ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] brand-glow"
          : isCompleted
            ? "border-[hsl(var(--brand)/0.5)] bg-[hsl(var(--brand-muted)/0.6)]"
            : isAssumed
              ? "border-[hsl(var(--brand)/0.3)] bg-[hsl(var(--brand-muted)/0.3)]"
              : "border-border/60 bg-card/90 hover:border-border hover:shadow-sm"
      )}
      style={{ width: isTarget ? NODE_W * 1.3 : NODE_W }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-border !border-0 !-top-1" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={cn(
            "text-[12px] font-semibold leading-tight",
            isTarget ? "text-[hsl(var(--brand-dark))]" : "text-foreground"
          )}>
            {code}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
            {title}
          </div>
        </div>
        {status === "completed" && (
          <span className="shrink-0 w-4 h-4 rounded-full bg-[hsl(var(--brand))] flex items-center justify-center text-[8px] text-white font-bold mt-0.5">
            ✓
          </span>
        )}
        {status === "in_progress" && (
          <span className="shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold mt-0.5">
            ⏳
          </span>
        )}
        {isAssumed && !status && (
          <span className="shrink-0 text-[9px] text-[hsl(var(--brand-dark))] font-medium mt-0.5 opacity-70">
            inferred
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-border !border-0 !-bottom-1" />
    </div>
  )
})
CourseNode.displayName = "CourseNode"

const nodeTypes = { course: CourseNode }

export function CatalogPathwayGraph({
  targetCode,
  courseMap,
  completedCodes,
  directCompletedCodes,
  hiddenCodes,
  statusByCode,
  onSetStatus,
  onRemoveStatus,
  onViewCourse,
}: {
  targetCode: string
  courseMap: Map<string, CourseNodeData>
  completedCodes?: Set<string>
  directCompletedCodes?: Set<string>
  hiddenCodes?: Set<string>
  statusByCode: Map<string, "completed" | "in_progress" | "planned">
  onSetStatus: (code: string, status: "completed" | "planned") => void
  onRemoveStatus: (code: string) => void
  onViewCourse: (code: string) => void
}) {
  const [rf, setRf] = useState<ReactFlowInstance | null>(null)
  const [activeNode, setActiveNode] = useState<string | null>(null)

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")

  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = []
    const edgeList: Edge[] = []

    for (const course of courseMap.values()) {
      const isTarget = course.code === targetCode
      const isDirect = Boolean(directCompletedCodes?.has(course.code))
      const isAssumed = Boolean(completedCodes?.has(course.code) && !isDirect)
      const isCompleted = isDirect
      const status = statusByCode.get(course.code)

      nodeList.push({
        id: course.code,
        type: "course",
        data: {
          code: course.code,
          title: course.title,
          isTarget,
          isCompleted,
          isAssumed,
          status,
        } as CourseNodeType,
        hidden: hiddenCodes?.has(course.code) || false,
        position: { x: 0, y: 0 },
      })

      for (const prereq of course.prerequisiteCodes) {
        if (!courseMap.has(prereq)) continue
        const pathSatisfied = Boolean(completedCodes?.has(prereq))
        edgeList.push({
          id: `${prereq}->${course.code}`,
          source: prereq,
          target: course.code,
          hidden: (hiddenCodes?.has(prereq) || hiddenCodes?.has(course.code)) || false,
          animated: false,
          style: {
            stroke: pathSatisfied
              ? "hsl(45 93% 47%)"
              : isDark
                ? "hsl(220 10% 32%)"
                : "hsl(220 13% 80%)",
            strokeWidth: pathSatisfied ? 2 : 1.5,
            opacity: hiddenCodes?.has(prereq) || hiddenCodes?.has(course.code) ? 0 : 0.8,
          },
        })
      }
    }

    return { nodes: getLayouted(nodeList, edgeList), edges: edgeList }
  }, [courseMap, targetCode, isDark, completedCodes, directCompletedCodes, hiddenCodes, statusByCode])

  const visibleNodeCount = nodes.filter((n) => !n.hidden).length
  const hasNoPrereqs = visibleNodeCount <= 1

  useEffect(() => {
    if (!rf || nodes.length === 0) return
    rf.fitView({ padding: 0.25, duration: 300 })
  }, [rf, nodes, targetCode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveNode(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setActiveNode((prev) => (prev === node.id ? null : node.id))
  }, [])

  if (hasNoPrereqs) {
    return (
      <div className="w-full rounded-2xl glass-panel p-5">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs">✓</span>
          No prerequisites — you're good to go!
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-2xl glass-panel overflow-hidden" style={{ height: "min(620px, 70vh)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        onInit={setRf}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setActiveNode(null)}
      >
        {nodes.length <= 24 && (
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={2}
            maskColor={isDark ? "rgba(10,12,18,0.7)" : "rgba(240,242,248,0.7)"}
          />
        )}
        <Controls showInteractive={false} />
        <Background gap={24} size={1} color={isDark ? "hsl(225 12% 14%)" : "hsl(220 14% 94%)"} />
      </ReactFlow>

      {/* Node detail popover */}
      {activeNode && courseMap.get(activeNode) && (
        <div className="absolute left-3 bottom-3 z-20 w-64 glass-elevated rounded-xl p-3.5 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="text-sm font-semibold text-foreground">{activeNode}</div>
          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {courseMap.get(activeNode)?.title}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {statusByCode.get(activeNode) ? (
              <>
                <span className="text-[11px] text-muted-foreground py-1">
                  Status: {statusByCode.get(activeNode)}
                </span>
                <button
                  className="rounded-lg border border-border bg-card/80 px-2.5 py-1 text-[11px] font-medium hover:bg-accent transition-colors"
                  onClick={() => onRemoveStatus(activeNode)}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <button
                  className="rounded-lg border border-[hsl(var(--brand)/0.4)] bg-[hsl(var(--brand-subtle))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--brand-dark))] hover:bg-[hsl(var(--brand-muted))] transition-colors"
                  onClick={() => onSetStatus(activeNode, "completed")}
                >
                  Mark completed
                </button>
                <button
                  className="rounded-lg border border-border bg-card/80 px-2.5 py-1 text-[11px] font-medium hover:bg-accent transition-colors"
                  onClick={() => onSetStatus(activeNode, "planned")}
                >
                  Mark planned
                </button>
              </>
            )}
          </div>
          <button
            className="mt-2.5 text-[11px] font-medium text-[hsl(var(--brand-dark))] hover:underline underline-offset-2"
            onClick={() => {
              onViewCourse(activeNode)
              setActiveNode(null)
            }}
          >
            View course details
          </button>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute right-3 top-3 z-20 flex gap-1.5">
        <button
          onClick={() => rf?.fitView({ padding: 0.2, duration: 300 })}
          className="rounded-lg glass-soft px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent/60 transition-colors"
        >
          Fit
        </button>
        <button
          onClick={() => {
            if (!rf) return
            const tn = nodes.find((n) => n.id === targetCode)
            if (!tn) return
            rf.setCenter(tn.position.x + NODE_W / 2, tn.position.y + NODE_H / 2, {
              zoom: nodes.length > 12 ? 0.9 : 1,
              duration: 300,
            })
          }}
          className="rounded-lg glass-soft px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent/60 transition-colors"
        >
          Center
        </button>
      </div>
    </div>
  )
}
