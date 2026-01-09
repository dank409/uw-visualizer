import { useRef, useEffect, useState, useCallback } from "react"
import { setCourseStatus, getAllCourseStatuses, getCourseStatus } from "@/lib/storage/courseStatusStore"
import { getSelectedProgram, isCourseAccessibleToProgram, getProgram } from "@/lib/storage/programStore"
import { buildPrerequisiteTree, type PrereqTreeNode, type PrerequisiteRule } from "@/lib/prereq/prereqTree"
import { getCourse } from "@/lib/courseIndex"
import type { CourseCode, ProgramId } from "@/lib/types"

// Helper to parse HTML and extract course links with titles
function parseHtmlToCourseList(html: string | null | undefined): Array<{ code: string; title: string }> {
  if (!html) return []
  
  const results: Array<{ code: string; title: string }> = []
  // Pattern to match course code and title from the HTML structure
  const pattern = /<a[^>]*>([A-Z]{2,}\s*\d{3,}[A-Z]?)<\/a>\s*<!--\s*-->\s*-\s*<!--\s*-->\s*([^<]+)/gi
  
  let match
  while ((match = pattern.exec(html)) !== null) {
    const code = match[1].replace(/\s/g, "")
    const title = match[2].trim()
    if (code && !results.find(r => r.code === code)) {
      results.push({ code, title })
    }
  }
  
  return results
}

// Helper to extract prereq text description from HTML
function parsePrereqDescription(html: string | null | undefined): string | null {
  if (!html) return null
  
  // Check for "Must have completed at least X of the following"
  const atLeastMatch = html.match(/Must have completed at least\s*(?:<span>)?(\d+)(?:<\/span>)?\s*of the following/i)
  if (atLeastMatch) {
    return `Must have completed at least ${atLeastMatch[1]} of the following`
  }
  
  // Check for "Complete all of the following"
  if (/Complete\s*<!--\s*-->?\s*all\s*<!--\s*-->?\s*of the following/i.test(html)) {
    return "Must have completed all of the following"
  }
  
  // Check for "Complete 1 of the following"
  if (/Complete\s*<!--\s*-->?\s*1\s*<!--\s*-->?\s*of the following/i.test(html)) {
    return "Must have completed at least 1 of the following"
  }
  
  return null
}

// Helper to extract antireq description
function parseAntireqDescription(html: string | null | undefined): string | null {
  if (!html) return null
  
  if (/Not completed nor concurrently enrolled in/i.test(html)) {
    return "Not completed nor concurrently enrolled in"
  }
  
  return null
}

// Helper to extract enrollment restriction programs from HTML
function parseEnrollmentRestriction(html: string | null | undefined): string[] {
  if (!html) return []
  
  // Find "Enrolled in" section
  const enrolledMatch = html.match(/Enrolled in\s*<span>(.*?)<\/span>/is)
  if (!enrolledMatch) return []
  
  const restrictionText = enrolledMatch[1]
  const programs: string[] = []
  
  // Extract program names from anchor tags
  const programPattern = />([^<]+)<\/a>/g
  let match
  
  while ((match = programPattern.exec(restrictionText)) !== null) {
    const programName = match[1].trim()
    if (programName && !programs.includes(programName)) {
      programs.push(programName)
    }
  }
  
  return programs
}

// Types
interface CourseNode {
  code: string
  title: string
  level: number
  x: number
  y: number
  r: number
  isTarget: boolean
  isNotNeeded?: boolean
  isNotForProgram?: boolean // Course is not typically taken by the selected program
  orGroupId?: string
}

interface Edge {
  from: CourseNode
  to: CourseNode
  orGroupId?: string
}

interface OrGroup {
  id: string
  parentCode: string
  members: string[]
  gradeMin?: number
  satisfiedBy?: string
}

interface CanvasGraphProps {
  targetCode: CourseCode
  onNodeClick?: (courseCode: CourseCode) => void
}

export function CanvasGraph({ targetCode, onNodeClick }: CanvasGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<PrereqTreeNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  // Graph state
  const nodesRef = useRef<CourseNode[]>([])
  const edgesRef = useRef<Edge[]>([])
  const orGroupsRef = useRef<OrGroup[]>([])

  // Interaction state
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<CourseNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<CourseNode | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [showRestrictionsPanel, setShowRestrictionsPanel] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)
  const lastPinchDistRef = useRef<number | null>(null)

  // Course status
  const completedCoursesRef = useRef<Set<string>>(new Set())
  const inProgressCoursesRef = useRef<Set<string>>(new Set())
  
  // Program filter
  const [selectedProgram, setSelectedProgramState] = useState<ProgramId | null>(null)

  // Load selected program on mount and listen for changes
  useEffect(() => {
    const loadProgram = () => {
      const program = getSelectedProgram()
      setSelectedProgramState(program)
    }
    
    loadProgram()
    
    const handleProgramChange = () => {
      loadProgram()
      if (data) {
        rebuildGraph(data)
      }
    }
    
    window.addEventListener("programChanged", handleProgramChange)
    return () => window.removeEventListener("programChanged", handleProgramChange)
  }, [data])

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }
    checkTheme()
    
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  // Load statuses from storage
  useEffect(() => {
    const loadStatuses = () => {
      const statuses = getAllCourseStatuses()
      completedCoursesRef.current = new Set(
        Object.entries(statuses)
          .filter(([, s]) => s === "completed")
          .map(([c]) => c)
      )
      inProgressCoursesRef.current = new Set(
        Object.entries(statuses)
          .filter(([, s]) => s === "in_progress")
          .map(([c]) => c)
      )
    }
    
    loadStatuses()
    
    const handleStatusChange = () => {
      loadStatuses()
      if (data) {
        rebuildGraph(data)
      }
    }
    
    window.addEventListener("courseStatusChanged", handleStatusChange)
    return () => window.removeEventListener("courseStatusChanged", handleStatusChange)
  }, [data])

  const isSatisfied = useCallback((code: string) => {
    return (
      completedCoursesRef.current.has(code) ||
      inProgressCoursesRef.current.has(code)
    )
  }, [])

  useEffect(() => {
    if (!targetCode) return

    setLoading(true)
    setError(null)

    try {
      const tree = buildPrerequisiteTree(targetCode)
      if (tree.error) {
        setError(tree.error)
      } else {
        setData(tree)
      }
    } catch {
      setError("Failed to build prerequisite tree")
    } finally {
      setLoading(false)
    }
  }, [targetCode])

  const buildGraph = useCallback(
    (data: PrereqTreeNode) => {
      const nodes: CourseNode[] = []
      const edges: Edge[] = []
      const orGroups: OrGroup[] = []
      const nodeMap = new Map<string, CourseNode>()
      const levels = new Map<number, CourseNode[]>()

      const addNode = (
        code: string,
        title: string,
        level: number,
        isTarget: boolean,
        parentCode: string | null,
        orGroupId: string | null
      ): CourseNode => {
        if (!nodeMap.has(code)) {
          const node: CourseNode = {
            code,
            title: title || "",
            level,
            x: 0,
            y: 0,
            r: isTarget ? 42 : 32,
            isTarget,
          }
          nodes.push(node)
          nodeMap.set(code, node)
          if (!levels.has(level)) levels.set(level, [])
          levels.get(level)!.push(node)
        }

        if (parentCode && nodeMap.has(parentCode)) {
          const from = nodeMap.get(code)!
          const to = nodeMap.get(parentCode)!
          if (!edges.find((e) => e.from.code === code && e.to.code === parentCode)) {
            edges.push({ from, to, orGroupId: orGroupId || undefined })
          }
        }

        return nodeMap.get(code)!
      }

      const targetCodeClean = data.course_code.replace(" ", "")
      addNode(targetCodeClean, data.title, 0, true, null, null)

      const processPrereqs = (
        rule: PrerequisiteRule | null,
        tree: Record<string, PrereqTreeNode>,
        parentCode: string,
        level: number,
        orGroupId: string | null
      ) => {
        if (!rule) return

        const reqs = rule.requirements || []
        const isOr = rule.logic === "OR"

        let currentOrId = orGroupId
        if (isOr && reqs.length > 1) {
          currentOrId = "or-" + Math.random().toString(36).substr(2, 6)
          orGroups.push({
            id: currentOrId,
            parentCode,
            members: [],
            gradeMin: rule.grade_min,
          })
        }

        for (const req of reqs) {
          if (req.type === "course" && req.course_code) {
            const code = req.course_code
            const info = tree[code] || ({} as PrereqTreeNode)
            
            // Get full course data to access prereqText (HTML) for program restrictions
            const courseData = getCourse(code)
            
            // Check if course is accessible to the selected program using HTML restrictions
            const isAccessible = isCourseAccessibleToProgram(code, selectedProgram, courseData?.prereqText)
            
            const node = addNode(code, info.title || "", level, false, parentCode, currentOrId)
            node.isNotForProgram = !isAccessible

            if (currentOrId) {
              const group = orGroups.find((g) => g.id === currentOrId)
              if (group && !group.members.includes(code)) {
                group.members.push(code)
              }
            }

            // Only recurse into prerequisites if course is accessible to program
            // This prevents showing deeply nested courses from other faculties
            if (info.prerequisites && isAccessible) {
              processPrereqs(info.prerequisites, info.prerequisite_tree || {}, code, level + 1, null)
            }
          } else if (req.type === "rule") {
            processPrereqs(req, tree, parentCode, level, currentOrId)
          }
        }
      }

      if (data.prerequisites) {
        processPrereqs(data.prerequisites, data.prerequisite_tree || {}, targetCodeClean, 1, null)
      }

      // Process OR groups - determine satisfaction and program accessibility
      for (const group of orGroups) {
        let satisfiedBy: string | undefined
        let hasAccessibleOption = false

        // First pass: check which options are accessible and satisfied
        for (const code of group.members) {
          const node = nodes.find((n) => n.code === code)
          const isAccessible = !node?.isNotForProgram
          
          if (isAccessible) {
            hasAccessibleOption = true
          }
          
          if (isSatisfied(code)) {
            satisfiedBy = code
            break
          }
        }

        group.satisfiedBy = satisfiedBy

        // Second pass: update node states
        for (const code of group.members) {
          const node = nodes.find((n) => n.code === code)
          if (node) {
            // Mark as not needed if another option is satisfied
            node.isNotNeeded = satisfiedBy !== undefined && code !== satisfiedBy
            node.orGroupId = group.id
            
            // If there are accessible options and this one isn't, mark it as not for program
            // But if NO options are accessible, show all (don't hide everything)
            if (hasAccessibleOption && node.isNotForProgram) {
              node.isNotNeeded = true // Treat as not needed so it's dimmed
            }
          }
        }
      }

      const canvas = canvasRef.current
      if (!canvas) return { nodes, edges, orGroups }

      const arr = Array.from(levels.entries()).sort((a, b) => a[0] - b[0])
      const levelH = 130
      const centerX = canvas.width / (2 * window.devicePixelRatio)
      const startY = 70

      for (const [level, lvlNodes] of arr) {
        const spacing = Math.min(140, (canvas.width / window.devicePixelRatio - 80) / Math.max(1, lvlNodes.length))
        const totalW = (lvlNodes.length - 1) * spacing
        const startX = centerX - totalW / 2
        lvlNodes.forEach((node, i) => {
          node.x = startX + i * spacing
          node.y = startY + level * levelH
        })
      }

      return { nodes, edges, orGroups }
    },
    [isSatisfied, selectedProgram]
  )

  const rebuildGraph = useCallback(
    (data: PrereqTreeNode) => {
      const { nodes, edges, orGroups } = buildGraph(data)
      nodesRef.current = nodes
      edgesRef.current = edges
      orGroupsRef.current = orGroups
      draw()
    },
    [buildGraph]
  )

  useEffect(() => {
    if (!data) return
    rebuildGraph(data)
    setTimeout(fitToScreen, 50)
  }, [data, rebuildGraph])

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const dpr = window.devicePixelRatio
      canvas.width = container.clientWidth * dpr
      canvas.height = container.clientHeight * dpr
      canvas.style.width = container.clientWidth + "px"
      canvas.style.height = container.clientHeight + "px"
      draw()
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])

  // Theme-aware colors
  const getColors = useCallback(() => {
    if (isDark) {
      return {
        bg: "#111111",
        gridLine: "rgba(255,255,255,0.03)",
        orGroupSatisfied: "rgba(16, 185, 129, 0.3)",
        orGroupPending: "rgba(12, 242, 160, 0.15)",
        orLabelSatisfied: "rgba(16, 185, 129, 0.8)",
        orLabelPending: "rgba(12, 242, 160, 0.7)",
        edgeActive: "rgba(12, 242, 160, 0.5)",
        edgeInactive: "rgba(107, 114, 128, 0.2)",
        arrowColor: "rgba(12, 242, 160, 0.6)",
        targetFill: "#0d5c4a",
        targetStroke: "#0CF2A0",
        prereqFill: "#1a3a4a",
        prereqStroke: "#38bdf8",
        doneFill: "#065f46",
        doneStroke: "#10b981",
        progressFill: "#78350f",
        progressStroke: "#f59e0b",
        notNeededStroke: "#4b5563",
        textPrimary: "#ffffff",
        textDone: "#6ee7b7",
        textProgress: "#fcd34d",
        textNotNeeded: "#6b7280",
        glowTarget: "#0CF2A0",
      }
    } else {
      return {
        bg: "#f8fafc",
        gridLine: "rgba(0,0,0,0.04)",
        orGroupSatisfied: "rgba(16, 185, 129, 0.2)",
        orGroupPending: "rgba(12, 200, 150, 0.12)",
        orLabelSatisfied: "rgba(16, 185, 129, 0.9)",
        orLabelPending: "rgba(12, 180, 140, 0.8)",
        edgeActive: "rgba(12, 200, 150, 0.6)",
        edgeInactive: "rgba(107, 114, 128, 0.25)",
        arrowColor: "rgba(12, 180, 140, 0.7)",
        targetFill: "#d1fae5",
        targetStroke: "#059669",
        prereqFill: "#e0f2fe",
        prereqStroke: "#0284c7",
        doneFill: "#d1fae5",
        doneStroke: "#059669",
        progressFill: "#fef3c7",
        progressStroke: "#d97706",
        notNeededStroke: "#9ca3af",
        textPrimary: "#1f2937",
        textDone: "#065f46",
        textProgress: "#92400e",
        textNotNeeded: "#9ca3af",
        glowTarget: "#059669",
      }
    }
  }, [isDark])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const orGroups = orGroupsRef.current
    const colors = getColors()

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Background
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = colors.gridLine
    ctx.lineWidth = 1
    const grid = 40 * scale
    for (let x = offset.x % grid; x < canvas.width / dpr; x += grid) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = offset.y % grid; y < canvas.height / dpr; y += grid) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    // OR group boxes
    for (const group of orGroups) {
      const memberNodes = nodes.filter((n) => group.members.includes(n.code))
      if (memberNodes.length < 2) continue

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const n of memberNodes) {
        minX = Math.min(minX, n.x - n.r - 8)
        maxX = Math.max(maxX, n.x + n.r + 8)
        minY = Math.min(minY, n.y - n.r - 8)
        maxY = Math.max(maxY, n.y + n.r + 8)
      }

      ctx.strokeStyle = group.satisfiedBy ? colors.orGroupSatisfied : colors.orGroupPending
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      roundRect(ctx, minX, minY, maxX - minX, maxY - minY, 10)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = group.satisfiedBy ? colors.orLabelSatisfied : colors.orLabelPending
      ctx.font = "9px system-ui, sans-serif"
      ctx.textAlign = "center"
      const label = group.satisfiedBy
        ? "✓ satisfied"
        : `pick 1${group.gradeMin ? ` (≥${group.gradeMin}%)` : ""}`
      ctx.fillText(label, (minX + maxX) / 2, minY - 4)
    }

    // Edges
    for (const edge of edges) {
      const from = edge.from
      const to = edge.to
      const fromDimmed = (from.isNotNeeded || from.isNotForProgram) && !isSatisfied(from.code)
      const opacity = fromDimmed ? 0.15 : 1

      ctx.beginPath()
      ctx.moveTo(from.x, from.y - from.r)
      const midY = (from.y - from.r + to.y + to.r) / 2
      ctx.bezierCurveTo(from.x, midY, to.x, midY, to.x, to.y + to.r)

      ctx.strokeStyle = fromDimmed ? colors.edgeInactive : colors.edgeActive
      ctx.lineWidth = fromDimmed ? 1 : 1.5
      ctx.setLineDash(fromDimmed ? [3, 3] : [])
      ctx.globalAlpha = opacity
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1

      if (!fromDimmed) {
        ctx.fillStyle = colors.arrowColor
        ctx.beginPath()
        ctx.moveTo(to.x, to.y + to.r)
        ctx.lineTo(to.x - 5, to.y + to.r + 8)
        ctx.lineTo(to.x + 5, to.y + to.r + 8)
        ctx.fill()
      }
    }

    // Nodes
    for (const node of nodes) {
      const done = completedCoursesRef.current.has(node.code)
      const prog = inProgressCoursesRef.current.has(node.code)
      const notNeeded = node.isNotNeeded && !done && !prog
      const notForProgram = node.isNotForProgram && !done && !prog && !notNeeded
      const dimmed = notNeeded || notForProgram
      const hovered = hoveredNode?.code === node.code
      const selected = selectedNode?.code === node.code

      const alpha = dimmed ? 0.3 : 1

      // Glow
      if ((hovered || selected) && !dimmed) {
        ctx.shadowColor = colors.glowTarget
        ctx.shadowBlur = 15
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)

      // Fill
      ctx.globalAlpha = alpha
      if (done) ctx.fillStyle = colors.doneFill
      else if (prog) ctx.fillStyle = colors.progressFill
      else if (node.isTarget) ctx.fillStyle = colors.targetFill
      else ctx.fillStyle = colors.prereqFill
      ctx.fill()

      // Border
      ctx.lineWidth = selected ? 2.5 : 2
      if (dimmed) ctx.strokeStyle = colors.notNeededStroke
      else if (done) ctx.strokeStyle = colors.doneStroke
      else if (prog) ctx.strokeStyle = colors.progressStroke
      else if (node.isTarget) ctx.strokeStyle = colors.targetStroke
      else ctx.strokeStyle = colors.prereqStroke
      ctx.stroke()

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // Text
      ctx.globalAlpha = alpha
      ctx.fillStyle = colors.textPrimary
      ctx.font = `600 ${node.isTarget ? 13 : 11}px system-ui, sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(node.code, node.x, node.y - 3)

      // Status
      ctx.font = "8px system-ui, sans-serif"
      if (done) {
        ctx.fillStyle = colors.textDone
        ctx.fillText("✓ Done", node.x, node.y + 10)
      } else if (prog) {
        ctx.fillStyle = colors.textProgress
        ctx.fillText("In Progress", node.x, node.y + 10)
      } else if (notNeeded) {
        ctx.fillStyle = colors.textNotNeeded
        ctx.fillText("not needed", node.x, node.y + 10)
      } else if (notForProgram) {
        ctx.fillStyle = colors.textNotNeeded
        ctx.fillText("other program", node.x, node.y + 10)
      }

      ctx.globalAlpha = 1
    }

    ctx.restore()
  }, [scale, offset, hoveredNode, selectedNode, isSatisfied, getColors])

  useEffect(() => {
    draw()
  }, [draw, data, isDark])

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
  }

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const findNodeAt = (x: number, y: number): CourseNode | null => {
    const wx = (x - offset.x) / scale
    const wy = (y - offset.y) / scale
    for (const node of nodesRef.current) {
      const dx = wx - node.x
      const dy = wy - node.y
      if (dx * dx + dy * dy < node.r * node.r) return node
    }
    return null
  }

  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || nodesRef.current.length === 0) return

    const nodes = nodesRef.current
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.r)
      maxX = Math.max(maxX, n.x + n.r)
      minY = Math.min(minY, n.y - n.r)
      maxY = Math.max(maxY, n.y + n.r)
    }

    const pad = 80
    const gw = maxX - minX + pad * 2
    const gh = maxY - minY + pad * 2
    const cw = canvas.width / window.devicePixelRatio
    const ch = canvas.height / window.devicePixelRatio
    const newScale = Math.min(cw / gw, ch / gh, 1.5)

    setScale(newScale)
    setOffset({
      x: cw / 2 - ((minX + maxX) / 2) * newScale,
      y: ch / 2 - ((minY + maxY) / 2) * newScale,
    })
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const node = findNodeAt(pos.x, pos.y)
    if (node) {
      setSelectedNode(node)
      setIsPanelOpen(true)
      onNodeClick?.(node.code)
    } else {
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      })
    } else {
      const node = findNodeAt(pos.x, pos.y)
      if (node !== hoveredNode) {
        setHoveredNode(node)
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Store offset in ref for wheel handler to avoid stale closure
  const offsetRef = useRef(offset)
  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  const scaleRef = useRef(scale)
  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  // Native wheel event listener to properly prevent scrolling
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Smoother zoom factor
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      
      const prevScale = scaleRef.current
      const prevOffset = offsetRef.current
      const newScale = Math.max(0.3, Math.min(2.5, prevScale * delta))
      const wx = (x - prevOffset.x) / prevScale
      const wy = (y - prevOffset.y) / prevScale
      
      setScale(newScale)
      setOffset({
        x: x - wx * newScale,
        y: y - wy * newScale,
      })
    }

    // Only prevent wheel scrolling on the canvas itself
    canvas.addEventListener("wheel", handleWheel, { passive: false })
    
    return () => {
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [])

  // Touch handlers for mobile and trackpad
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const pos = { x: touch.clientX, y: touch.clientY }
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const canvasPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
        const node = findNodeAt(canvasPos.x, canvasPos.y)
        if (node) {
          setSelectedNode(node)
          setIsPanelOpen(true)
          onNodeClick?.(node.code)
        } else {
          setIsDragging(true)
          dragStartRef.current = { x: pos.x - offset.x, y: pos.y - offset.y }
        }
      }
      lastTouchRef.current = pos
    } else if (e.touches.length === 2) {
      // Pinch zoom start
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    
    if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
      const touch = e.touches[0]
      setOffset({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      })
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY }
    } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const delta = dist / lastPinchDistRef.current
      
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const rect = canvasRef.current?.getBoundingClientRect()
      
      if (rect) {
        const x = centerX - rect.left
        const y = centerY - rect.top
        const wx = (x - offset.x) / scale
        const wy = (y - offset.y) / scale
        const newScale = Math.max(0.3, Math.min(2.5, scale * delta))
        setScale(newScale)
        setOffset({
          x: x - wx * newScale,
          y: y - wy * newScale,
        })
      }
      
      lastPinchDistRef.current = dist
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    lastTouchRef.current = null
    lastPinchDistRef.current = null
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const node = findNodeAt(pos.x, pos.y)
    if (node && !node.isTarget) {
      onNodeClick?.(node.code)
    }
  }

  const markCourse = (code: string, status: "done" | "progress" | "clear") => {
    completedCoursesRef.current.delete(code)
    inProgressCoursesRef.current.delete(code)

    if (status === "done") {
      completedCoursesRef.current.add(code)
      setCourseStatus(code, "completed")
    } else if (status === "progress") {
      inProgressCoursesRef.current.add(code)
      setCourseStatus(code, "in_progress")
    } else {
      setCourseStatus(code, "not_taken")
    }

    if (data) {
      rebuildGraph(data)
    }
    window.dispatchEvent(new Event("courseStatusChanged"))
  }

  const getEligibilityInfo = () => {
    if (!data) return null

    // Check if target course has enrollment restrictions
    const targetCourse = getCourse(targetCode)
    const enrollmentRestrictions = parseEnrollmentRestriction(targetCourse?.prereqText)
    const hasRestrictions = enrollmentRestrictions.length > 0
    
    // Check if target course is accessible to selected program
    const isAccessibleToProgram = isCourseAccessibleToProgram(targetCode, selectedProgram, targetCourse?.prereqText)
    
    if (!isAccessibleToProgram && selectedProgram) {
      const program = getProgram(selectedProgram)
      return { 
        eligible: false, 
        message: `Not available for ${program?.shortName || program?.name || 'your program'}`,
        programRestricted: true,
        enrollmentRestrictions
      }
    }

    const rule = data.prerequisites
    if (!rule) {
      return { 
        eligible: true, 
        message: "No prerequisites required",
        hasRestrictions,
        enrollmentRestrictions
      }
    }

    if (rule.logic === "OR") {
      for (const req of rule.requirements || []) {
        if (req.type === "course" && req.course_code && isSatisfied(req.course_code)) {
          return { 
            eligible: true, 
            message: `Satisfied by ${req.course_code}`,
            hasRestrictions,
            enrollmentRestrictions
          }
        }
      }
      const total = (rule.requirements || []).filter((r) => r.type === "course").length
      return { 
        eligible: false, 
        message: `Complete 1 of ${total} options`,
        hasRestrictions,
        enrollmentRestrictions
      }
    }

    return { 
      eligible: false, 
      message: "Complete all requirements",
      hasRestrictions,
      enrollmentRestrictions
    }
  }

  const eligibility = getEligibilityInfo()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-8">
        <div className="text-destructive mb-4">{error}</div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="relative h-full w-full bg-background overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="touch-none select-none absolute inset-0"
        style={{
          cursor: hoveredNode ? "pointer" : isDragging ? "grabbing" : "grab",
        }}
      />

      {/* Info Badge - Prerequisites */}
      {data && eligibility && !eligibility.programRestricted && (
        <div
          className={`absolute top-4 left-4 bg-card/95 backdrop-blur-lg p-3 px-4 rounded-xl border shadow-lg max-w-[280px] ${
            eligibility.eligible 
              ? "border-[hsl(var(--brand))]/40" 
              : "border-border"
          }`}
        >
          <h4
            className={`text-sm font-medium flex items-center gap-1.5 ${
              eligibility.eligible 
                ? "text-[hsl(var(--brand))]" 
                : "text-foreground"
            }`}
          >
            {eligibility.eligible ? "✅" : "📋"} 
            {eligibility.eligible ? "Eligible" : "Prerequisites"}
          </h4>
          <p className="text-xs mt-1 text-muted-foreground">
            {eligibility.message}
          </p>
        </div>
      )}
      
      {/* Program Restricted Badge - Clickable */}
      {data && eligibility?.programRestricted && !showRestrictionsPanel && (
        <button
          onClick={() => setShowRestrictionsPanel(true)}
          className="absolute top-4 left-4 bg-red-500/10 hover:bg-red-500/20 backdrop-blur-lg p-3 px-4 rounded-xl border border-red-500/50 shadow-lg max-w-[280px] text-left transition-colors cursor-pointer"
        >
          <h4 className="text-sm font-medium flex items-center gap-1.5 text-red-500">
            ⚠️ Program Restricted
          </h4>
          <p className="text-xs mt-1 text-red-400">
            {eligibility.message}
          </p>
          <p className="text-xs mt-1 text-red-400/70">
            Click to see allowed programs →
          </p>
        </button>
      )}
      
      {/* Separate Restriction Badge */}
      {data && eligibility?.hasRestrictions && eligibility.enrollmentRestrictions && eligibility.enrollmentRestrictions.length > 0 && !showRestrictionsPanel && (
        <button
          onClick={() => setShowRestrictionsPanel(true)}
          className="absolute top-[88px] left-4 bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-lg p-3 px-4 rounded-xl border border-amber-500/50 shadow-lg max-w-[280px] text-left transition-colors cursor-pointer"
        >
          <h4 className="text-sm font-medium flex items-center gap-1.5 text-amber-500">
            🔒 Restricted to specific programs
          </h4>
          <p className="text-xs mt-1 text-amber-500/70">
            Click for details →
          </p>
        </button>
      )}
      
      {/* Restrictions Panel */}
      {showRestrictionsPanel && eligibility?.enrollmentRestrictions && (
        <div className="absolute top-4 left-4 w-[320px] bg-card/98 backdrop-blur-xl rounded-xl border border-amber-500/50 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-amber-500/30 bg-amber-500/10">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                🔒 Enrollment Restrictions
              </h3>
              <button 
                onClick={() => setShowRestrictionsPanel(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none p-1"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.course_code} - {data?.title}
            </p>
          </div>
          
          <div className="p-4 max-h-[400px] overflow-y-auto">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
              <p className="text-sm text-amber-500">
                ⚠️ Only students in the following programs can enroll in this course:
              </p>
            </div>
            
            <ul className="space-y-2">
              {eligibility.enrollmentRestrictions.map((program, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="text-foreground">{program.replace(/&amp;/g, '&')}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="p-3 border-t border-border bg-muted/30">
            <button
              onClick={() => setShowRestrictionsPanel(false)}
              className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-lg p-3 rounded-xl border border-border shadow-lg text-xs">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--brand))]" /> Target
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Prerequisite
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Done
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" /> Not needed
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 bg-card/95 backdrop-blur-lg p-1 rounded-lg border border-border shadow-lg">
        <button
          onClick={() => setScale((s) => Math.min(2.5, s * 1.2))}
          className="w-8 h-8 bg-accent/50 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.3, s * 0.8))}
          className="w-8 h-8 bg-accent/50 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          −
        </button>
        <button
          onClick={fitToScreen}
          className="px-3 h-8 bg-accent/50 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          Fit
        </button>
      </div>

      {/* Progress Bar */}
      <div
        className={`absolute bottom-4 ${
          isPanelOpen ? "right-[316px]" : "right-4"
        } bg-card/95 backdrop-blur-lg p-2.5 px-3.5 rounded-xl border border-border shadow-lg max-w-[300px] transition-all`}
      >
        <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Your Progress</div>
        <div className="flex flex-wrap gap-1.5">
          {completedCoursesRef.current.size === 0 && inProgressCoursesRef.current.size === 0 ? (
            <span className="text-muted-foreground text-xs italic">None yet</span>
          ) : (
            <>
              {Array.from(completedCoursesRef.current).map((code) => (
                <span
                  key={code}
                  className="px-2.5 py-1 rounded-full text-xs bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 flex items-center gap-1.5"
                >
                  {code}
                  <button
                    onClick={() => markCourse(code, "clear")}
                    className="w-3.5 h-3.5 rounded-full bg-green-500/20 text-[10px] flex items-center justify-center hover:bg-green-500/40"
                  >
                    ×
                  </button>
                </span>
              ))}
              {Array.from(inProgressCoursesRef.current).map((code) => (
                <span
                  key={code}
                  className="px-2.5 py-1 rounded-full text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5"
                >
                  {code}
                  <button
                    onClick={() => markCourse(code, "clear")}
                    className="w-3.5 h-3.5 rounded-full bg-amber-500/20 text-[10px] flex items-center justify-center hover:bg-amber-500/40"
                  >
                    ×
                  </button>
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Side Panel */}
      <div
        className={`absolute top-0 right-0 w-[380px] h-full bg-card/98 backdrop-blur-xl border-l border-border overflow-y-auto transition-transform shadow-xl overscroll-contain ${
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ touchAction: "pan-y" }}
      >
        {selectedNode ? (
          <CourseDetailsPanel
            courseCode={selectedNode.code}
            isNotNeeded={selectedNode.isNotNeeded && !isSatisfied(selectedNode.code)}
            isNotForProgram={selectedNode.isNotForProgram && !isSatisfied(selectedNode.code)}
            onClose={() => setIsPanelOpen(false)}
            onStatusChange={(status) => markCourse(selectedNode.code, status)}
          />
        ) : (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Course Details</span>
              <button onClick={() => setIsPanelOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">
                ×
              </button>
            </div>
            <p className="text-muted-foreground text-sm">Click a node to see details</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Course Details Panel Component
function CourseDetailsPanel({
  courseCode,
  isNotNeeded,
  isNotForProgram,
  onClose,
  onStatusChange,
}: {
  courseCode: string
  isNotNeeded?: boolean
  isNotForProgram?: boolean
  onClose: () => void
  onStatusChange: (status: "done" | "progress" | "clear") => void
}) {
  const course = getCourse(courseCode)
  const currentStatus = getCourseStatus(courseCode)
  
  if (!course) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">{courseCode}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>
        <p className="text-muted-foreground text-sm">Course not found</p>
      </div>
    )
  }

  // Parse prerequisites and antirequisites from HTML
  const prereqCourses = parseHtmlToCourseList(course.prereqText)
  const antireqCourses = parseHtmlToCourseList(course.antireqText)
  const prereqDescription = parsePrereqDescription(course.prereqText)
  const antireqDescription = parseAntireqDescription(course.antireqText)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-xl font-bold text-foreground">{course.code}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none p-1">×</button>
        </div>
        <p className="text-sm text-muted-foreground">{course.title}</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Status Badges */}
        {isNotNeeded && (
          <div className="p-2.5 rounded-lg bg-muted text-muted-foreground text-sm">
            Not needed — another option is satisfied
          </div>
        )}
        {isNotForProgram && !isNotNeeded && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm border border-amber-500/20">
            ⚠️ This course is typically for students in a different program
          </div>
        )}

        {/* Description */}
        {course.description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
          </div>
        )}

        {/* Units */}
        {course.units !== undefined && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Units</h3>
            <p className="text-sm text-muted-foreground">{course.units}</p>
          </div>
        )}

        {/* Prerequisites */}
        {prereqCourses.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Prerequisites</h3>
            {prereqDescription && (
              <p className="text-sm text-muted-foreground mb-2">{prereqDescription}</p>
            )}
            <ul className="space-y-1.5">
              {prereqCourses.map((prereq) => (
                <li key={prereq.code} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    <span className="font-medium text-[hsl(var(--brand))]">{prereq.code}</span>
                    {prereq.title && <span className="text-muted-foreground"> - {prereq.title}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Antirequisites */}
        {antireqCourses.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Antirequisites</h3>
            {antireqDescription && (
              <p className="text-sm text-muted-foreground mb-2">{antireqDescription}</p>
            )}
            <ul className="space-y-1.5">
              {antireqCourses.map((antireq) => (
                <li key={antireq.code} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    <span className="font-medium text-destructive">{antireq.code}</span>
                    {antireq.title && <span className="text-muted-foreground"> - {antireq.title}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Course Status */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Course Status</h3>
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange("done")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                currentStatus === "completed"
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => onStatusChange("progress")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                currentStatus === "in_progress"
                  ? "bg-amber-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => onStatusChange("clear")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                currentStatus === "not_taken"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              Not Taken
            </button>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <div className="p-4 pt-2 border-t border-border">
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
