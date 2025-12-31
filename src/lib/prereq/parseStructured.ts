import { normalizeCourseCode } from "./normalize";

export type RequirementGroup = {
  type: "OR" | "AND";
  label: string;
  gradeRequirement?: string; // e.g., "≥70%", "≥60%"
  courses: string[];
  nestedGroups?: RequirementGroup[];
};

export type StructuredPrereq = {
  topLevelType: "OR" | "AND" | "SINGLE";
  groups: RequirementGroup[];
};

/**
 * Parses prerequisite HTML to extract structured requirement groups with grade requirements.
 * Handles "Complete 1 of the following" patterns and nested OR/AND logic.
 */
export function parseStructuredPrereq(html: string | null | undefined): StructuredPrereq | null {
  if (!html || typeof document === "undefined") return null;

  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // Check for top-level "Complete X of the following" pattern
  const topLevelText = tmp.textContent || "";
  const completePattern = topLevelText.match(/Complete\s+(\d+)\s+of\s+the\s+following/i);
  const topLevelType = completePattern ? "OR" : "AND";

  // Find ALL rule view results (A, B, C, etc.)
  const allRuleResults = Array.from(tmp.querySelectorAll('[data-test^="ruleView-"]'));

  if (allRuleResults.length === 0) {
    return null;
  }

  const groups: RequirementGroup[] = [];
  const processedRules = new Set<Element>();

  allRuleResults.forEach((rule) => {
    if (processedRules.has(rule)) return;
    processedRules.add(rule);

    // Extract the requirement text (header)
    const clone = rule.cloneNode(true) as Element;
    clone.querySelectorAll('[data-test^="ruleView-"]').forEach((nested) => nested.remove());
    clone.querySelectorAll("ul").forEach((ul) => ul.remove());
    const headerText = clone.textContent?.trim() || "";
    const cleanHeader = headerText.replace(/\s+/g, " ").replace(/:\s*$/, "").trim();

    if (!cleanHeader) return;

    // Extract grade requirement from header
    const gradeMatch = cleanHeader.match(/(?:minimum\s+grade\s+of\s+)?(\d+)%/i);
    const gradeRequirement = gradeMatch ? `≥${gradeMatch[1]}%` : undefined;

    // Extract courses from lists in this rule
    const courses: string[] = [];
    rule.querySelectorAll("ul li").forEach((li) => {
      // Skip list items that contain rule views (those are separate requirements)
      if (!li.querySelector('[data-test^="ruleView-"]')) {
        const liText = li.textContent?.trim() || "";
        if (liText) {
          // Extract course code (handles spaced codes like "MATH 137")
          const courseMatch = liText.match(/\b([A-Z]{2,})\s*(\d{2,3}[A-Z]?)\b/);
          if (courseMatch) {
            const code = normalizeCourseCode(`${courseMatch[1]}${courseMatch[2]}`);
            if (code) courses.push(code);
          }
        }
      }
    });

    // Determine if this is an OR group (multiple courses) or single course
    const groupType = courses.length > 1 ? "OR" : "AND";

    if (cleanHeader && courses.length > 0) {
      groups.push({
        type: groupType,
        label: cleanHeader,
        gradeRequirement,
        courses,
      });
    }
  });

  if (groups.length === 0) {
    return null;
  }

  // If we have multiple groups and a "Complete 1 of" pattern, it's a top-level OR
  const finalTopLevelType =
    groups.length > 1 && topLevelType === "OR" ? "OR" : groups.length === 1 ? "SINGLE" : "AND";

  return {
    topLevelType: finalTopLevelType,
    groups,
  };
}

