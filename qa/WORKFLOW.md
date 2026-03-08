# UWVisualizer Semi-Manual Grok QA Loop

## Goal
Fast iterative UI/UX + correctness feedback without API billing.

## One-cycle process

1. **Build + run preview**
   - `npm run build`
   - `npx serve -s dist -l 4175`
   - expose via tunnel (localhost.run or loca.lt)

2. **Capture screenshots (manual quick set)**
   Required pages/states:
   - Home (desktop)
   - Home (mobile)
   - Course page loaded (`/courses?course=MATH237`) desktop
   - Course page mobile
   - Tracker expanded with some checks (MATH237)
   - Search dropdown open while typing `math` on course page
   - Non-math target sample (`ACTSC431`) with tracker groups visible

3. **Send to Grok using prompt template**
   - Use `qa/GROK_PROMPT_TEMPLATE.md`
   - Attach screenshots + link

4. **Paste Grok feedback back into assistant**
   - Include top priorities + any blockers

5. **Implement + retest**
   - Fix highest priority items
   - Rebuild + rerun one-cycle process

---

## Suggested cadence
- 1st pass: correctness + major UX defects
- 2nd pass: visual polish + consistency
- 3rd pass: final acceptance/regression sweep
