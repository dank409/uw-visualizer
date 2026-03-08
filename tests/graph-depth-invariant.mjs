import fs from 'node:fs'

const normalize = (code = '') => String(code).replace(/\s+/g, '').toUpperCase()

const courses = JSON.parse(fs.readFileSync(new URL('../src/data/courses.clean.json', import.meta.url), 'utf8'))

const prereqMap = new Map()
for (const c of courses) {
  const code = normalize(c.code)
  if (!code) continue
  const prereqs = new Set((c.prereqCourses || []).map(normalize).filter(Boolean).filter((p) => p !== code))
  prereqMap.set(code, prereqs)
}

function nodesUpToDepth(targetCode, maxDepth) {
  const start = normalize(targetCode)
  const seen = new Set([start])
  let frontier = new Set([start])

  for (let d = 0; d < maxDepth; d++) {
    const next = new Set()
    for (const code of frontier) {
      const prereqs = prereqMap.get(code) || new Set()
      for (const p of prereqs) {
        if (!seen.has(p)) {
          seen.add(p)
          next.add(p)
        }
      }
    }
    frontier = next
    if (frontier.size === 0) break
  }

  return seen
}

function fullTree(targetCode) {
  const start = normalize(targetCode)
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const code = queue.shift()
    const prereqs = prereqMap.get(code) || new Set()
    for (const p of prereqs) {
      if (!seen.has(p)) {
        seen.add(p)
        queue.push(p)
      }
    }
  }
  return seen
}

const violations = []
for (const code of prereqMap.keys()) {
  const d1 = nodesUpToDepth(code, 1)
  const d2 = nodesUpToDepth(code, 2)
  const d3 = nodesUpToDepth(code, 3)
  const d4 = nodesUpToDepth(code, 4)
  const full = fullTree(code)

  const subset = (a, b) => [...a].every((x) => b.has(x))
  if (!subset(d1, d2) || !subset(d2, d3) || !subset(d3, d4) || !subset(d4, full)) {
    violations.push({ code, sizes: [d1.size, d2.size, d3.size, d4.size, full.size] })
    if (violations.length > 20) break
  }
}

if (violations.length) {
  console.error('Depth invariant violations found:', violations)
  process.exit(1)
}

console.log(`Depth invariant OK for ${prereqMap.size} courses`)
