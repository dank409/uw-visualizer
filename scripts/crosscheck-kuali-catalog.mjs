#!/usr/bin/env node
import fs from "node:fs/promises";

const CATALOG_ID = "663290e835aff7001cc62323";
const REMOTE_URL = `https://uwaterloocm.kuali.co/api/v1/catalog/courses/${CATALOG_ID}?q=`;
const LOCAL_PATH = new URL("../src/data/courses.clean.json", import.meta.url);

const normalizeCode = (code = "") => code.replace(/\s+/g, "").toUpperCase();
const normalizeText = (s = "") => s.trim().replace(/\s+/g, " ").toLowerCase();

const referenceFields = ["prereqCourses", "coreqCourses", "antireqCourses", "crossListed"];

function parseCodeParts(code) {
  const match = code.match(/^([A-Z]+)(\d+[A-Z]?)$/);
  if (!match) return { subject: code, number: "" };
  return { subject: match[1], number: match[2] };
}

async function main() {
  const [localRaw, remoteRes] = await Promise.all([
    fs.readFile(LOCAL_PATH, "utf8"),
    fetch(REMOTE_URL),
  ]);

  if (!remoteRes.ok) {
    throw new Error(`Remote fetch failed: ${remoteRes.status} ${remoteRes.statusText}`);
  }

  const local = JSON.parse(localRaw);
  const remote = await remoteRes.json();

  const localByCode = new Map(local.map((c) => [normalizeCode(c.code), c]));
  const remoteByCode = new Map(remote.map((c) => [normalizeCode(c.__catalogCourseId), c]));

  const missingInLocal = [...remoteByCode.keys()].filter((code) => !localByCode.has(code)).sort();
  const missingInRemote = [...localByCode.keys()].filter((code) => !remoteByCode.has(code)).sort();

  const titleMismatches = [];
  const pidMismatches = [];

  for (const code of localByCode.keys()) {
    const localCourse = localByCode.get(code);
    const remoteCourse = remoteByCode.get(code);
    if (!remoteCourse) continue;

    if (normalizeText(localCourse.title) !== normalizeText(remoteCourse.title)) {
      titleMismatches.push({
        code,
        local: localCourse.title,
        remote: remoteCourse.title,
      });
    }

    if ((localCourse.pid || null) !== (remoteCourse.pid || null)) {
      pidMismatches.push({
        code,
        local: localCourse.pid || null,
        remote: remoteCourse.pid || null,
      });
    }
  }

  // Referential integrity: all prereq/coreq/antireq/cross-listed codes should exist in the known catalog set.
  const missingReferenceCounts = new Map();
  for (const course of local) {
    for (const field of referenceFields) {
      for (const rawRef of course[field] || []) {
        const ref = normalizeCode(rawRef);
        if (!ref) continue;
        if (!localByCode.has(ref) && !remoteByCode.has(ref)) {
          missingReferenceCounts.set(ref, (missingReferenceCounts.get(ref) || 0) + 1);
        }
      }
    }
  }

  const missingReferences = [...missingReferenceCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, references]) => ({ code, references }));

  const missingReferenceSubjects = [...missingReferences.reduce((acc, row) => {
    const { subject } = parseCodeParts(row.code);
    acc.set(subject, (acc.get(subject) || 0) + row.references);
    return acc;
  }, new Map()).entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([subject, references]) => ({ subject, references }));

  const report = {
    catalogId: CATALOG_ID,
    checkedAtUtc: new Date().toISOString(),
    counts: {
      local: localByCode.size,
      remote: remoteByCode.size,
      missingInLocal: missingInLocal.length,
      missingInRemote: missingInRemote.length,
      titleMismatches: titleMismatches.length,
      pidMismatches: pidMismatches.length,
      missingReferenceCodes: missingReferences.length,
    },
    missingInLocal,
    missingInRemote,
    titleMismatches,
    pidMismatches,
    missingReferences,
    missingReferenceSubjects,
  };

  const outPath = new URL("../reports/catalog-crosscheck.json", import.meta.url);
  await fs.mkdir(new URL("../reports", import.meta.url), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log("Catalog crosscheck complete");
  console.log(JSON.stringify(report.counts, null, 2));
  if (missingInLocal.length) {
    console.log("Missing in local:", missingInLocal.join(", "));
  }
  if (missingReferences.length) {
    console.log("Top missing referenced codes:");
    for (const row of missingReferences.slice(0, 20)) {
      console.log(`- ${row.code}: ${row.references}`);
    }
    console.log("Top missing-reference subjects:");
    for (const row of missingReferenceSubjects.slice(0, 15)) {
      console.log(`- ${row.subject}: ${row.references}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
