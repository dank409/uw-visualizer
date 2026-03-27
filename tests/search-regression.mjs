#!/usr/bin/env node
import fs from "node:fs/promises";

const coursePagePath = new URL("../src/pages/CoursesPage.tsx", import.meta.url)
const navbarPath = new URL("../src/app/layout/Navbar.tsx", import.meta.url)

const failures = []

const [coursePage, navbar] = await Promise.all([
  fs.readFile(coursePagePath, "utf8"),
  fs.readFile(navbarPath, "utf8"),
])

// Regression guard: course page should not implement its own autocomplete search input.
if (/Search course \(e\.g\.,/i.test(coursePage) || /setQuery\(/.test(coursePage)) {
  failures.push("CoursesPage contains route-specific search implementation; expected global navbar-only search.")
}

// Navbar should include catalog-backed search and dropdown behavior.
if (!/searchCatalogCourses\(/.test(navbar)) {
  failures.push("Navbar search does not call searchCatalogCourses.")
}
if (!/onKeyDown=\{handleKeyDown\}/.test(navbar)) {
  failures.push("Navbar search input missing keyboard handler onKeyDown={handleKeyDown}.")
}
if (!/z-\[1200\]/.test(navbar)) {
  failures.push("Navbar dropdown z-index guard missing (z-[1200]).")
}

if (failures.length) {
  console.error("search-regression: FAIL")
  for (const f of failures) console.error(`- ${f}`)
  process.exit(1)
}

console.log("search-regression: PASS")
