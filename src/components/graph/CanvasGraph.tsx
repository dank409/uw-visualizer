import { useRef, useEffect, useState, useCallback } from "react"
import { setCourseStatus, getAllCourseStatuses, getCourseStatus } from "@/lib/storage/courseStatusStore"
import { getSelectedProgram, isCourseAccessibleToProgram, getProgram } from "@/lib/storage/programStore"
import { buildPrerequisiteTree, type PrereqTreeNode, type PrerequisiteRule, type CourseRequirement } from "@/lib/prereq/prereqTree"
import { getCourse } from "@/lib/courseIndex"
import type { CourseCode, ProgramId } from "@/lib/types"

// Helper to get course list with titles from course codes
function getCourseListWithTitles(courseCodes: string[] | undefined): Array<{ code: string; title: string }> {
  if (!courseCodes || courseCodes.length === 0) return []

  return courseCodes.map(code => {
    const course = getCourse(code)
    return {
      code,
      title: course?.title || ""
    }
  })
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
  isCollapsedPlaceholder?: boolean // True if this is a collapsed placeholder for OR alternatives
  collapsedAlternatives?: string[] // Course codes that are collapsed in this placeholder
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
  collapsedAlternatives?: string[] // Alternative courses that are collapsed
  labelX?: number // X position for "one of:" label
  labelY?: number // Y position for "one of:" label
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
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [showRestrictionsPanel, setShowRestrictionsPanel] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedOrGroups, setExpandedOrGroups] = useState<Set<string>>(new Set()) // Track which OR groups are expanded
  const dragStartRef = useRef({ x: 0, y: 0 })
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)
  const lastPinchDistRef = useRef<number | null>(null)

  // Course status
  const completedCoursesRef = useRef<Set<string>>(new Set())
  const inProgressCoursesRef = useRef<Set<string>>(new Set())
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_statusVersion, setStatusVersion] = useState(0) // Force re-render on status change

  // Program filter
  const [selectedProgram, setSelectedProgramState] = useState<ProgramId | null>(null)

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

  const isSatisfied = useCallback((code: string) => {
    return (
      completedCoursesRef.current.has(code) ||
      inProgressCoursesRef.current.has(code)
    )
  }, [])

  const buildGraph = useCallback(
    (data: PrereqTreeNode, expandedGroups: Set<string>) => {
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
            r: isTarget ? 46 : 36,
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

        // Get all course requirements at this level for OR logic handling
        const courseReqs = reqs.filter(r => r.type === "course" && r.course_code) as CourseRequirement[]
        const ruleReqs = reqs.filter(r => r.type === "rule") as PrerequisiteRule[]

        let currentOrId = orGroupId
        if (isOr && courseReqs.length > 1) {
          currentOrId = "or-" + Math.random().toString(36).substr(2, 6)
          orGroups.push({
            id: currentOrId,
            parentCode,
            members: [],
            gradeMin: rule.grade_min,
          })
        }

        // For OR groups with multiple courses, check if any is satisfied
        if (isOr && courseReqs.length > 1 && currentOrId) {
          const satisfiedCourse = courseReqs.find(req =>
            completedCoursesRef.current.has(req.course_code) ||
            inProgressCoursesRef.current.has(req.course_code)
          )

          if (satisfiedCourse) {
            // Satisfied OR: show the satisfied course and a collapsed placeholder for alternatives
            const satisfiedCode = satisfiedCourse.course_code
            const info = tree[satisfiedCode] || ({} as PrereqTreeNode)
            const courseData = getCourse(satisfiedCode)
            const isAccessible = isCourseAccessibleToProgram(satisfiedCode, selectedProgram, courseData?.allowedPrograms)

            const node = addNode(satisfiedCode, info.title || "", level, false, parentCode, currentOrId)
            node.isNotForProgram = !isAccessible

            const group = orGroups.find((g) => g.id === currentOrId)
            if (group) {
              group.members.push(satisfiedCode)
              group.satisfiedBy = satisfiedCode
              
              // Collect alternative courses that aren't satisfied
              const alternativeCodes = courseReqs
                .filter(req => req.course_code !== satisfiedCode)
                .map(req => req.course_code)
              group.collapsedAlternatives = alternativeCodes
            }

            // Recurse into prerequisites of the satisfied course only
            if (info.prerequisites && isAccessible) {
              processPrereqs(info.prerequisites, info.prerequisite_tree || {}, satisfiedCode, level + 1, null)
            }

            // Check if this OR group is expanded
            const isExpanded = expandedGroups.has(currentOrId)
            
            if (isExpanded) {
              // Show all alternatives when expanded
              for (const req of courseReqs) {
                if (req.type === "course" && req.course_code && req.course_code !== satisfiedCode) {
                  const code = req.course_code
                  const altInfo = tree[code] || ({} as PrereqTreeNode)
                  const altCourseData = getCourse(code)
                  const altIsAccessible = isCourseAccessibleToProgram(code, selectedProgram, altCourseData?.allowedPrograms)

                  const altNode = addNode(code, altInfo.title || "", level, false, parentCode, currentOrId)
                  altNode.isNotForProgram = !altIsAccessible

                  if (group && !group.members.includes(code)) {
                    group.members.push(code)
                  }

                  // Recurse into prerequisites of alternative courses
                  if (altInfo.prerequisites && altIsAccessible) {
                    processPrereqs(altInfo.prerequisites, altInfo.prerequisite_tree || {}, code, level + 1, null)
                  }
                }
              }
            } else {
              // Store collapsed alternatives in the satisfied node itself
              // No separate placeholder node - we'll draw a small badge on the satisfied node
              const alternativeCodes = courseReqs
                .filter(req => req.course_code !== satisfiedCode)
                .map(req => req.course_code)
              
              if (alternativeCodes.length > 0 && node) {
                node.collapsedAlternatives = alternativeCodes
                node.orGroupId = currentOrId
              }
            }

            // Process nested rule requirements
            for (const ruleReq of ruleReqs) {
              processPrereqs(ruleReq, tree, parentCode, level, currentOrId)
            }

            return // Skip normal processing for this OR group
          }
        }

        // Normal processing (no collapse, or group is expanded)
        for (const req of reqs) {
          if (req.type === "course" && req.course_code) {
            const code = req.course_code
            const info = tree[code] || ({} as PrereqTreeNode)

            // Get full course data to access prereqText (HTML) for program restrictions
            const courseData = getCourse(code)

            // Check if course is accessible to the selected program using HTML restrictions
            const isAccessible = isCourseAccessibleToProgram(code, selectedProgram, courseData?.allowedPrograms)

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
      const levelH = 210
      const centerX = canvas.width / (2 * window.devicePixelRatio)
      const startY = 80

      // Layout algorithm: place nodes with special handling for OR groups
      for (const [level, lvlNodes] of arr) {
        // Group nodes by their OR group (if any) at this level
        const orGroupsAtLevel = new Map<string, CourseNode[]>()
        const standaloneNodes: CourseNode[] = []
        
        for (const node of lvlNodes) {
          if (node.orGroupId) {
            // Check if this is part of an OR group
            const group = orGroups.find(g => g.id === node.orGroupId)
            if (group && group.members.length > 1) {
              // This node is part of an OR group with multiple members
              if (!orGroupsAtLevel.has(node.orGroupId)) {
                orGroupsAtLevel.set(node.orGroupId, [])
              }
              if (!orGroupsAtLevel.get(node.orGroupId)!.includes(node)) {
                orGroupsAtLevel.get(node.orGroupId)!.push(node)
              }
            } else {
              // Single node or not in a group, treat as standalone
              standaloneNodes.push(node)
            }
          } else {
            // Not part of an OR group
            standaloneNodes.push(node)
          }
        }
        
        // Build list of items to position
        const items: Array<{type: 'standalone' | 'orgroup', nodes: CourseNode[], groupId?: string}> = []
        
        // Add OR groups (sorted by group ID for consistency)
        for (const [groupId, groupNodes] of orGroupsAtLevel) {
          if (groupNodes.length > 1) {
            items.push({ type: 'orgroup', nodes: groupNodes, groupId })
          } else {
            // Single node OR group, treat as standalone
            standaloneNodes.push(...groupNodes)
          }
        }
        
        // Add standalone nodes
        for (const node of standaloneNodes) {
          items.push({ type: 'standalone', nodes: [node] })
        }
        
        const nodeSpacing = 125
        const itemSpacing = 145 // spacing between items (groups or standalone nodes)
        const groupInternalSpacing = 115 // spacing within an OR group
        
        // Calculate total width needed
        let totalWidth = 0
        for (const item of items) {
          if (item.type === 'orgroup') {
            totalWidth += (item.nodes.length - 1) * groupInternalSpacing
          } else {
            // Standalone nodes take up nodeSpacing width
            totalWidth += nodeSpacing
          }
        }
        // Add spacing between items (but not after the last one)
        if (items.length > 1) {
          totalWidth += (items.length - 1) * itemSpacing
        }
        
        // Position all items
        let currentX = centerX - totalWidth / 2
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type === 'orgroup' && item.groupId) {
            // OR group: layout horizontally
            const group = orGroups.find(g => g.id === item.groupId)
            const groupWidth = (item.nodes.length - 1) * groupInternalSpacing
            const groupStartX = currentX
            
            item.nodes.forEach((node, j) => {
              node.x = groupStartX + j * groupInternalSpacing
              node.y = startY + level * levelH + 25 // offset down for label space
            })
            
            // Store label position for drawing (center of the group)
            if (group) {
              group.labelX = groupStartX + groupWidth / 2
              group.labelY = startY + level * levelH + 5
            }
            
            currentX += groupWidth
            // Add spacing after (except for last item)
            if (i < items.length - 1) {
              currentX += itemSpacing
            }
          } else {
            // Standalone node
            item.nodes[0].x = currentX
            item.nodes[0].y = startY + level * levelH
            currentX += nodeSpacing
            // Add spacing after (except for last item)
            if (i < items.length - 1) {
              currentX += itemSpacing
            }
          }
        }
      }

      return { nodes, edges, orGroups }
    },
    [isSatisfied, selectedProgram, expandedOrGroups]
  )

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

  const rebuildGraph = useCallback(
    (data: PrereqTreeNode) => {
      const { nodes, edges, orGroups } = buildGraph(data, expandedOrGroups)
      nodesRef.current = nodes
      edgesRef.current = edges
      orGroupsRef.current = orGroups
    },
    [buildGraph, expandedOrGroups]
  )

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

  useEffect(() => {
    if (!data) return
    rebuildGraph(data)
    setTimeout(fitToScreen, 50)
  }, [data, rebuildGraph, expandedOrGroups, fitToScreen])

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
  }, [data, rebuildGraph])

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
        targetFill: "#1a3a4a",
        targetStroke: "#38bdf8",
        prereqFill: "#1a3a4a",
        prereqStroke: "#38bdf8",
        requiredNotTakenFill: "#7f1d1d",
        requiredNotTakenStroke: "#ef4444",
        doneFill: "#065f46",
        doneStroke: "#10b981",
        progressFill: "#78350f",
        progressStroke: "#f59e0b",
        notNeededStroke: "#4b5563",
        textPrimary: "#ffffff",
        textDone: "#6ee7b7",
        textProgress: "#fcd34d",
        textRequiredNotTaken: "#fca5a5",
        textNotNeeded: "#6b7280",
        glowTarget: "#38bdf8",
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
        targetFill: "#e0f2fe",
        targetStroke: "#38bdf8",
        prereqFill: "#e0f2fe",
        prereqStroke: "#0284c7",
        requiredNotTakenFill: "#fee2e2",
        requiredNotTakenStroke: "#dc2626",
        doneFill: "#d1fae5",
        doneStroke: "#059669",
        progressFill: "#fef3c7",
        progressStroke: "#d97706",
        notNeededStroke: "#9ca3af",
        textPrimary: "#1f2937",
        textDone: "#065f46",
        textProgress: "#92400e",
        textRequiredNotTaken: "#991b1b",
        textNotNeeded: "#9ca3af",
        glowTarget: "#38bdf8",
      }
    }
  }, [isDark])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio
    const nodes = nodesRef.current || []
    const edges = edgesRef.current || []
    const orGroups = orGroupsRef.current || []
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

    // Draw OR group labels and connecting lines
    for (const group of orGroups) {
      if (group.labelX !== undefined && group.labelY !== undefined && group.members.length > 1) {
        const groupNodes = nodes.filter(n => n.orGroupId === group.id && !n.isCollapsedPlaceholder)
        if (groupNodes.length > 1) {
          // Only draw if we have at least 2 visible nodes at the same level
          const nodeYPositions = [...new Set(groupNodes.map(n => n.y))]
          if (nodeYPositions.length === 1) {
            // All nodes at the same Y position, draw the box
            const minX = Math.min(...groupNodes.map(n => n.x))
            const maxX = Math.max(...groupNodes.map(n => n.x))
            const minY = Math.min(...groupNodes.map(n => n.y - n.r))
            const maxY = Math.max(...groupNodes.map(n => n.y + n.r + 12)) // Include status text below nodes (12px)
            const padding = 15
            
            // Draw background rectangle for OR group - fully encompass all nodes including status text
            const rectX = minX - padding
            const rectY = minY - padding - 25 // Extra space for label above
            const rectWidth = maxX - minX + padding * 2
            const rectHeight = maxY - minY + padding * 2 + 25 // Include label space above
            
            ctx.beginPath()
            ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 8)
            ctx.fillStyle = isDark ? "rgba(30, 35, 45, 0.4)" : "rgba(240, 245, 250, 0.6)"
            ctx.fill()
            ctx.strokeStyle = isDark ? "rgba(156, 163, 175, 0.3)" : "rgba(200, 210, 220, 0.5)"
            ctx.lineWidth = 1
            ctx.stroke()
            
            // Draw "one of:" label with background
            const labelText = "one of:"
            ctx.font = `700 13px system-ui, sans-serif`
            const textMetrics = ctx.measureText(labelText)
            const labelPadding = 6
            const labelX = group.labelX
            const labelY = group.labelY
            const labelWidth = textMetrics.width + labelPadding * 2
            const labelHeight = 18
            
            // Background box for label
            ctx.beginPath()
            ctx.roundRect(labelX - labelWidth / 2, labelY - labelHeight, labelWidth, labelHeight, 4)
            ctx.fillStyle = isDark ? "rgba(50, 55, 65, 0.9)" : "rgba(255, 255, 255, 0.95)"
            ctx.fill()
            ctx.strokeStyle = isDark ? "rgba(156, 163, 175, 0.5)" : "rgba(200, 210, 220, 0.7)"
            ctx.lineWidth = 1
            ctx.stroke()
            
            // Label text
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillStyle = isDark ? "rgba(200, 200, 210, 1)" : "rgba(60, 65, 75, 1)"
            ctx.fillText(labelText, labelX, labelY - labelHeight / 2)
          }
        }
      }
    }

    // Edges - draw connections
    // In this graph, edges go FROM lower nodes (prerequisites) TO upper nodes (courses that need them)
    // OR groups are collections of alternative prerequisites, so the FROM node is in the OR group
    
    const drawnOrGroups = new Set<string>()
    const orGroupTargets = new Map<string, CourseNode[]>() // groupId -> array of target nodes (nodes above the OR group)
    
    // Collect all target nodes for each OR group
    for (const edge of edges) {
      const from = edge.from  // Lower node (in OR group)
      const to = edge.to      // Upper node (target)
      if (from.isCollapsedPlaceholder) continue
      
      // Check if the FROM node is part of an OR group
      const fromOrGroup = from.orGroupId ? orGroups.find(g => g.id === from.orGroupId) : null
      const isOrGroupMember = fromOrGroup && fromOrGroup.members.length > 1
      
      if (isOrGroupMember && fromOrGroup && fromOrGroup.labelX !== undefined) {
        const groupId = from.orGroupId!
        if (!orGroupTargets.has(groupId)) {
          orGroupTargets.set(groupId, [])
        }
        // Add target if not already in the list
        if (!orGroupTargets.get(groupId)!.some(t => t.code === to.code)) {
          orGroupTargets.get(groupId)!.push(to)
        }
      }
    }
    
    // Draw edges FROM OR groups TO their targets (one line from box top-center to targets above)
    for (const [groupId, targetNodes] of orGroupTargets) {
      const group = orGroups.find(g => g.id === groupId)
      if (!group || !group.labelX || targetNodes.length === 0) continue
      
      const groupNodes = nodes.filter(n => n.orGroupId === groupId && !n.isCollapsedPlaceholder)
      if (groupNodes.length === 0) continue
      
      const minX = Math.min(...groupNodes.map(n => n.x))
      const maxX = Math.max(...groupNodes.map(n => n.x))
      const minY = Math.min(...groupNodes.map(n => n.y - n.r))
      const padding = 15
      const centerX = (minX + maxX) / 2
      const boxTopY = minY - padding - 25 // Top of box (rectY) - matches box drawing calculation
      
      // Calculate center point of all targets (for branching)
      const targetCenterX = targetNodes.length > 0 
        ? targetNodes.reduce((sum, t) => sum + t.x, 0) / targetNodes.length
        : centerX
      const targetMaxY = Math.max(...targetNodes.map(t => t.y + t.r)) // Bottom of target nodes
      
      // Draw single line from OR group box top to targets above
      const branchY = (boxTopY + targetMaxY) / 2 // Midpoint for branching
      
      // Check if any target is dimmed
      const allDimmed = groupNodes.every(n => 
        (n.isNotNeeded || n.isNotForProgram) && !isSatisfied(n.code) && !n.isCollapsedPlaceholder
      )
      
      // Main vertical line from box top-center upward to branch point
      ctx.beginPath()
      ctx.moveTo(centerX, boxTopY)
      ctx.lineTo(centerX, branchY)
      
      ctx.strokeStyle = allDimmed ? colors.edgeInactive : colors.edgeActive
      ctx.lineWidth = allDimmed ? 1 : 2
      ctx.setLineDash(allDimmed ? [3, 3] : [])
      ctx.globalAlpha = allDimmed ? 0.15 : 1
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      
      // Branch to each target node
      if (targetNodes.length > 1) {
        // Horizontal line from center to target center
        ctx.beginPath()
        ctx.moveTo(centerX, branchY)
        ctx.lineTo(targetCenterX, branchY)
        ctx.strokeStyle = allDimmed ? colors.edgeInactive : colors.edgeActive
        ctx.lineWidth = allDimmed ? 1 : 2
        ctx.setLineDash(allDimmed ? [3, 3] : [])
        ctx.globalAlpha = allDimmed ? 0.15 : 1
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        
        // Branch to each target
        for (const target of targetNodes) {
          const targetDimmed = allDimmed
          const targetEndY = target.y + target.r // Bottom of target
          
          ctx.beginPath()
          ctx.moveTo(targetCenterX, branchY)
          const midY = (branchY + targetEndY) / 2
          ctx.bezierCurveTo(targetCenterX, midY, target.x, midY, target.x, targetEndY)
          
          ctx.strokeStyle = targetDimmed ? colors.edgeInactive : colors.edgeActive
          ctx.lineWidth = targetDimmed ? 1 : 2
          ctx.setLineDash(targetDimmed ? [3, 3] : [])
          ctx.globalAlpha = targetDimmed ? 0.15 : 1
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1
          
          // Arrow at target (pointing down into target)
          if (!targetDimmed) {
            ctx.fillStyle = colors.arrowColor
            ctx.beginPath()
            ctx.moveTo(target.x, targetEndY)
            ctx.lineTo(target.x - 5, targetEndY + 8)
            ctx.lineTo(target.x + 5, targetEndY + 8)
            ctx.fill()
          }
        }
      } else {
        // Single target - direct curved line
        const target = targetNodes[0]
        const targetDimmed = allDimmed
        const targetEndY = target.y + target.r
        
        ctx.beginPath()
        ctx.moveTo(centerX, branchY)
        const midY = (branchY + targetEndY) / 2
        ctx.bezierCurveTo(centerX, midY, target.x, midY, target.x, targetEndY)
        
        ctx.strokeStyle = targetDimmed ? colors.edgeInactive : colors.edgeActive
        ctx.lineWidth = targetDimmed ? 1 : 2
        ctx.setLineDash(targetDimmed ? [3, 3] : [])
        ctx.globalAlpha = targetDimmed ? 0.15 : 1
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        
        // Arrow at target
        if (!targetDimmed) {
          ctx.fillStyle = colors.arrowColor
          ctx.beginPath()
          ctx.moveTo(target.x, targetEndY)
          ctx.lineTo(target.x - 5, targetEndY + 8)
          ctx.lineTo(target.x + 5, targetEndY + 8)
          ctx.fill()
        }
      }
      
      drawnOrGroups.add(groupId)
    }
    
    // Now draw normal edges (skip edges FROM OR groups we've already drawn)
    for (const edge of edges) {
      const from = edge.from
      const to = edge.to
      // Skip edges from collapsed placeholder nodes
      if (from.isCollapsedPlaceholder) continue
      
      // Skip edges from OR groups we've already drawn (the FROM node is in an OR group)
      if (from.orGroupId && drawnOrGroups.has(from.orGroupId)) continue
      
      const fromDimmed = (from.isNotNeeded || from.isNotForProgram) && !isSatisfied(from.code) && !from.isCollapsedPlaceholder
      const opacity = fromDimmed ? 0.15 : (to.isCollapsedPlaceholder ? 0.5 : 1)
      
      let startY = from.y - from.r
      let endY = to.y + to.r
      
      // Normal edge (not part of OR group with visual grouping)
      {
        ctx.beginPath()
        ctx.moveTo(from.x, startY)
        const midY = (startY + endY) / 2
        ctx.bezierCurveTo(from.x, midY, to.x, midY, to.x, endY)

        // Special styling for edges to collapsed placeholders
        if (to.isCollapsedPlaceholder) {
          ctx.strokeStyle = isDark ? "rgba(156, 163, 175, 0.4)" : "rgba(107, 114, 128, 0.4)"
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])
        } else {
          ctx.strokeStyle = fromDimmed ? colors.edgeInactive : colors.edgeActive
          ctx.lineWidth = fromDimmed ? 1 : 2
          ctx.setLineDash(fromDimmed ? [3, 3] : [])
        }
        ctx.globalAlpha = opacity
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1

        if (!fromDimmed && !to.isCollapsedPlaceholder) {
          ctx.fillStyle = colors.arrowColor
          ctx.beginPath()
          ctx.moveTo(to.x, endY)
          ctx.lineTo(to.x - 5, endY + 8)
          ctx.lineTo(to.x + 5, endY + 8)
          ctx.fill()
        }
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
      const isCollapsed = node.isCollapsedPlaceholder

      const alpha = dimmed ? 0.3 : 1

      // Glow - enhanced for important nodes
      if ((hovered || selected) && !dimmed) {
        if (isCollapsed) {
          // Subtle glow for collapsed placeholders
          ctx.shadowColor = isDark ? "rgba(12, 242, 160, 0.4)" : "rgba(12, 200, 150, 0.3)"
          ctx.shadowBlur = 8
        } else {
          ctx.shadowColor = colors.glowTarget
          ctx.shadowBlur = 15
        }
      } else if (!dimmed && (node.isTarget || (!done && !prog && !node.isNotNeeded && !node.isNotForProgram))) {
        // Subtle glow for important nodes (target and required)
        ctx.shadowColor = node.isTarget 
          ? (isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(56, 189, 248, 0.2)")
          : (isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(220, 38, 38, 0.15)")
        ctx.shadowBlur = 8
      }

      // Draw node shape - small circular node for collapsed placeholders
      if (isCollapsed) {
        // Small, subtle circular node
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      } else {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      }

      // Fill - special styling for collapsed placeholder
      ctx.globalAlpha = alpha
      if (isCollapsed) {
        // Collapsed placeholder: very subtle, minimal design
        const hoveredCollapsed = hovered && isCollapsed
        ctx.fillStyle = isDark 
          ? (hoveredCollapsed ? "rgba(107, 114, 128, 0.15)" : "rgba(107, 114, 128, 0.08)")
          : (hoveredCollapsed ? "rgba(156, 163, 175, 0.12)" : "rgba(156, 163, 175, 0.06)")
      } else if (done) {
        ctx.fillStyle = colors.doneFill
      } else if (prog) {
        ctx.fillStyle = colors.progressFill
      } else if (node.isTarget) {
        ctx.fillStyle = colors.targetFill
      } else if (!dimmed && !node.isNotNeeded && !node.isNotForProgram) {
        // Required but not taken - show in red
        ctx.fillStyle = colors.requiredNotTakenFill
      } else {
        ctx.fillStyle = colors.prereqFill
      }
      ctx.fill()

      // Border - special styling for collapsed placeholder
      ctx.lineWidth = selected ? 2.5 : (isCollapsed ? 1 : 2)
      if (isCollapsed) {
        const hoveredCollapsed = hovered && isCollapsed
        ctx.strokeStyle = isDark 
          ? (hoveredCollapsed ? "rgba(156, 163, 175, 0.5)" : "rgba(107, 114, 128, 0.3)")
          : (hoveredCollapsed ? "rgba(107, 114, 128, 0.4)" : "rgba(156, 163, 175, 0.25)")
        ctx.setLineDash([3, 3]) // Subtle dashed border
      } else if (dimmed) {
        ctx.strokeStyle = colors.notNeededStroke
      } else if (done) {
        ctx.strokeStyle = colors.doneStroke
      } else if (prog) {
        ctx.strokeStyle = colors.progressStroke
      } else if (node.isTarget) {
        ctx.strokeStyle = colors.targetStroke
      } else if (!dimmed && !node.isNotNeeded && !node.isNotForProgram) {
        // Required but not taken - show in red
        ctx.strokeStyle = colors.requiredNotTakenStroke
      } else {
        ctx.strokeStyle = colors.prereqStroke
      }
      ctx.stroke()
      ctx.setLineDash([])

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // Text
      ctx.globalAlpha = alpha
      if (isCollapsed) {
        // This shouldn't happen anymore - collapsed nodes are attached to satisfied nodes
        // But keep this as fallback
      } else {
        // Text color - red for required but not taken
        if (!dimmed && !done && !prog && !node.isTarget && !node.isNotNeeded && !node.isNotForProgram) {
          ctx.fillStyle = colors.textRequiredNotTaken
        } else {
          ctx.fillStyle = colors.textPrimary
        }
        ctx.font = `600 ${node.isTarget ? 15 : 13}px system-ui, sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(node.code, node.x, node.y - 3)

        // Status
        ctx.font = "9px system-ui, sans-serif"
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
        } else if (!dimmed && !node.isTarget) {
          // Required but not taken
          ctx.fillStyle = colors.textRequiredNotTaken
          ctx.fillText("required", node.x, node.y + 10)
        }
        
        // Draw collapsed alternatives badge on satisfied nodes
        if (node.collapsedAlternatives && node.collapsedAlternatives.length > 0 && node.orGroupId) {
          const count = node.collapsedAlternatives.length
          const badgeX = node.x + node.r - 4
          const badgeY = node.y - node.r + 4
          const badgeSize = 16
          
          // Small circular badge
          ctx.beginPath()
          ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = isDark ? "rgba(12, 242, 160, 0.2)" : "rgba(12, 200, 150, 0.15)"
          ctx.fill()
          ctx.strokeStyle = isDark ? "rgba(12, 242, 160, 0.6)" : "rgba(12, 180, 140, 0.5)"
          ctx.lineWidth = 1
          ctx.stroke()
          
          // Text on badge
          ctx.fillStyle = isDark ? "rgba(12, 242, 160, 0.95)" : "rgba(5, 150, 105, 0.9)"
          ctx.font = `600 8px system-ui, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(`+${count}`, badgeX, badgeY)
        }
      }

      ctx.globalAlpha = 1
    }

    ctx.restore()
  }, [scale, offset, hoveredNode, selectedNode, isSatisfied, getColors, isDark])

  // Draw whenever display properties change
  useEffect(() => {
    draw()
  }, [draw])
  
  // Draw after rebuildGraph updates the refs
  useEffect(() => {
    if (data) {
      // Use setTimeout to ensure rebuildGraph has updated the refs
      const timer = setTimeout(() => {
        draw()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [data, draw, expandedOrGroups])

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
      // All nodes are circular now
      const dx = wx - node.x
      const dy = wy - node.y
      if (dx * dx + dy * dy < node.r * node.r) return node
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const node = findNodeAt(pos.x, pos.y)
    if (node) {
      // Check if click is on collapsed badge
      if (node.collapsedAlternatives && node.collapsedAlternatives.length > 0 && node.orGroupId) {
        const wx = (pos.x - offset.x) / scale
        const wy = (pos.y - offset.y) / scale
        const badgeX = node.x + node.r - 4
        const badgeY = node.y - node.r + 4
        const badgeSize = 16
        const dx = wx - badgeX
        const dy = wy - badgeY
        const distSq = dx * dx + dy * dy
        
        // If click is on badge, toggle expansion
        if (distSq < (badgeSize / 2) * (badgeSize / 2)) {
          setExpandedOrGroups(prev => {
            const newSet = new Set(prev)
            if (newSet.has(node.orGroupId!)) {
              newSet.delete(node.orGroupId!)
            } else {
              newSet.add(node.orGroupId!)
            }
            return newSet
          })
          return
        }
      }
      
      // Handle collapsed placeholder clicks - toggle expansion
      if (node.isCollapsedPlaceholder && node.orGroupId) {
        setExpandedOrGroups(prev => {
          const newSet = new Set(prev)
          if (newSet.has(node.orGroupId!)) {
            newSet.delete(node.orGroupId!)
          } else {
            newSet.add(node.orGroupId!)
          }
          return newSet
        })
      } else {
        setSelectedNode(node)
        setIsPanelOpen(true)
        onNodeClick?.(node.code)
      }
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
      setTooltipPos(null)
    } else {
      const node = findNodeAt(pos.x, pos.y)
      if (node !== hoveredNode) {
        setHoveredNode(node)
        if (node) {
          const rect = canvasRef.current?.getBoundingClientRect()
          if (rect) {
            setTooltipPos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
            })
          }
        } else {
          setTooltipPos(null)
        }
      } else if (node) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          setTooltipPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          })
        }
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setHoveredNode(null)
    setTooltipPos(null)
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
          // Check if touch is on collapsed badge
          if (node.collapsedAlternatives && node.collapsedAlternatives.length > 0 && node.orGroupId) {
            const wx = (canvasPos.x - offset.x) / scale
            const wy = (canvasPos.y - offset.y) / scale
            const badgeX = node.x + node.r - 4
            const badgeY = node.y - node.r + 4
            const badgeSize = 16
            const dx = wx - badgeX
            const dy = wy - badgeY
            const distSq = dx * dx + dy * dy
            
            // If touch is on badge, toggle expansion
            if (distSq < (badgeSize / 2) * (badgeSize / 2)) {
              setExpandedOrGroups(prev => {
                const newSet = new Set(prev)
                if (newSet.has(node.orGroupId!)) {
                  newSet.delete(node.orGroupId!)
                } else {
                  newSet.add(node.orGroupId!)
                }
                return newSet
              })
              return
            }
          }
          
          // Handle collapsed placeholder clicks - toggle expansion
          if (node.isCollapsedPlaceholder && node.orGroupId) {
            setExpandedOrGroups(prev => {
              const newSet = new Set(prev)
              if (newSet.has(node.orGroupId!)) {
                newSet.delete(node.orGroupId!)
              } else {
                newSet.add(node.orGroupId!)
              }
              return newSet
            })
          } else {
            setSelectedNode(node)
            setIsPanelOpen(true)
            onNodeClick?.(node.code)
          }
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
    if (node && !node.isTarget && !node.isCollapsedPlaceholder) {
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

    // Force re-render to update progress bar
    setStatusVersion(v => v + 1)

    if (data) {
      rebuildGraph(data)
    }
    window.dispatchEvent(new Event("courseStatusChanged"))
  }

  const getEligibilityInfo = () => {
    if (!data) return null

    // Check if target course has enrollment restrictions
    const targetCourse = getCourse(targetCode)
    const enrollmentRestrictions = targetCourse?.allowedPrograms || []
    const hasRestrictions = enrollmentRestrictions.length > 0
    
    // Check if target course is accessible to selected program
    const isAccessibleToProgram = isCourseAccessibleToProgram(targetCode, selectedProgram, targetCourse?.allowedPrograms)
    
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
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="touch-none select-none absolute inset-0"
        style={{
          cursor: hoveredNode 
            ? (hoveredNode.isCollapsedPlaceholder ? "pointer" : "pointer")
            : isDragging 
            ? "grabbing" 
            : "grab",
        }}
      />

      {/* Tooltip */}
      {tooltipPos && hoveredNode && (
        <div
          className="absolute pointer-events-none z-50 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-xl p-2 max-w-[280px]"
          style={{
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y - 10}px`,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-semibold text-sm text-foreground">{hoveredNode.code}</div>
          {hoveredNode.title && (
            <div className="text-xs text-muted-foreground mt-1">{hoveredNode.title}</div>
          )}
        </div>
      )}

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
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Target
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Required
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
  // Normalize the course code before lookup
  const normalizedCode = courseCode.replace(/\s+/g, "").toUpperCase()
  const course = getCourse(normalizedCode)
  const currentStatus = getCourseStatus(normalizedCode)

  if (!course) {
    console.warn(`Course not found: "${courseCode}" (normalized: "${normalizedCode}")`)
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

  // Get prerequisites and antirequisites with course titles
  const prereqCourses = getCourseListWithTitles(course.prereqCourses)
  const antireqCourses = getCourseListWithTitles(course.antireqCourses)
  const prereqDescription = course.prereqText || null
  const antireqDescription = course.antireqText || null

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
