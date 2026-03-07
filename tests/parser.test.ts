import { JSDOM } from "jsdom"
import { parseTrackerGroups } from "../src/lib/prereqGroups"

const { window } = new JSDOM("<!doctype html><html><body></body></html>")
;(globalThis as any).DOMParser = window.DOMParser

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function hasTitleLike(groups: ReturnType<typeof parseTrackerGroups>, fragment: string) {
  return groups.some((g) => g.title.toLowerCase().includes(fragment.toLowerCase()))
}

function run() {
  // ACTSC-like sample
  const actscHtml = `
  <div>
    <div data-test="ruleView-A-result">Complete at least 1 of the following: <a>STAT 330</a>, <a>STAT 331</a></div>
    <div data-test="ruleView-B-result">Must have completed the following: <a>ACTSC 231</a></div>
    <div data-test="ruleView-C-result">Enrolled in <span><a>JH-Actuarial Science</a>, <a>H-Actuarial Science</a></span></div>
  </div>`

  const actscGroups = parseTrackerGroups(actscHtml)
  assert(hasTitleLike(actscGroups, "actuarial") || hasTitleLike(actscGroups, "statistics"), "ACTSC: expected actuarial/statistics group title")
  assert(actscGroups.some((g) => g.options.some((o) => o.kind === "course" && o.code === "ACTSC231")), "ACTSC: expected ACTSC231 option")
  assert(actscGroups.some((g) => g.options.some((o) => o.kind === "program")), "ACTSC: expected program group")

  // PHYS-like sample
  const physHtml = `
  <div>
    <div data-test="ruleView-A-result">Must have completed the following: <a>PHYS 234</a>, <a>PHYS 364</a></div>
    <div data-test="ruleView-B-result">Complete 1 of the following: <a>CHEM 356</a>, <a>PHYS 358</a></div>
  </div>`

  const physGroups = parseTrackerGroups(physHtml)
  assert(hasTitleLike(physGroups, "physics"), "PHYS: expected physics-oriented title")
  assert(!hasTitleLike(physGroups, "linear algebra"), "PHYS: should not default to linear algebra")

  // MATH linear algebra explicit sample
  const mathHtml = `
  <div>
    <div data-test="ruleView-A-result">Linear Algebra requirement: Complete at least 1 of the following: <a>MATH 136</a>, <a>MATH 146</a></div>
    <div data-test="ruleView-B-result">Must have completed the following: <a>MATH 237</a></div>
  </div>`

  const mathGroups = parseTrackerGroups(mathHtml)
  assert(hasTitleLike(mathGroups, "linear algebra"), "MATH: expected linear algebra title when explicitly present")

  console.log("parser.test.ts: all assertions passed")
}

run()
