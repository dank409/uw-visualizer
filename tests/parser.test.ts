import { JSDOM } from "jsdom"
import fs from "node:fs"
import path from "node:path"
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
  const fixture = (name: string) =>
    fs.readFileSync(path.join(process.cwd(), "tests", "fixtures", `${name}.prereq.html`), "utf8")
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

  // CS-like nested/equivalent + grade sample
  const csHtml = `
  <div>
    <div data-test="ruleView-A-result">Prereq: (CS 241 or ECE 251) and MATH 239.</div>
    <div data-test="ruleView-B-result">MATH 135 or equivalent, with >=75%.</div>
  </div>`

  const csGroups = parseTrackerGroups(csHtml)
  assert(hasTitleLike(csGroups, "computer science") || hasTitleLike(csGroups, "cs"), "CS: expected CS-oriented title")
  assert(csGroups.some((g) => g.options.some((o) => o.kind === "course" && o.code === "CS241")), "CS: expected CS241 extracted")
  assert(csGroups.some((g) => g.options.some((o) => o.kind === "course" && o.code === "ECE251")), "CS: expected ECE251 extracted")
  assert(csGroups.some((g) => g.options.some((o) => o.kind === "course" && o.code === "MATH135" && o.gradeMin === 75)), "CS: expected >=75% grade parsing")

  // MATH linear algebra explicit sample
  const mathHtml = `
  <div>
    <div data-test="ruleView-A-result">Linear Algebra requirement: Complete at least 1 of the following: <a>MATH 136</a>, <a>MATH 146</a></div>
    <div data-test="ruleView-B-result">Must have completed the following: <a>MATH 237</a></div>
  </div>`

  const mathGroups = parseTrackerGroups(mathHtml)
  assert(hasTitleLike(mathGroups, "linear algebra"), "MATH: expected linear algebra title when explicitly present")

  // Real captured fixture checks
  const actscReal = parseTrackerGroups(fixture("ACTSC431"))
  assert(actscReal.length > 0, "ACTSC431 fixture: expected groups")
  assert(hasTitleLike(actscReal, "actuarial") || hasTitleLike(actscReal, "statistics"), "ACTSC431 fixture: expected actuarial/statistics-oriented naming")

  const physReal = parseTrackerGroups(fixture("PHYS335"))
  assert(physReal.length > 0, "PHYS335 fixture: expected groups")
  assert(hasTitleLike(physReal, "physics"), "PHYS335 fixture: expected physics-oriented naming")
  assert(!hasTitleLike(physReal, "linear algebra"), "PHYS335 fixture: should not label as linear algebra")

  const csReal = parseTrackerGroups(fixture("CS341"))
  assert(csReal.length > 0, "CS341 fixture: expected groups")
  assert(hasTitleLike(csReal, "computer science") || hasTitleLike(csReal, "cs"), "CS341 fixture: expected CS-oriented naming")

  console.log("parser.test.ts: all assertions passed")
}

run()
