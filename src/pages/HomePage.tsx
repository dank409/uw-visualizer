import InteractiveHero from "@/components/ui/hero-section-nexus"
import { Link } from "react-router-dom"
import { Footer } from "@/app/layout/Footer"

const quickStartCourses = [
  { code: "MATH237", title: "Calculus 3 for Honours Math" },
  { code: "MATH239", title: "Introduction to Combinatorics" },
  { code: "CS341", title: "Algorithms" },
  { code: "STAT230", title: "Probability" },
  { code: "AMATH231", title: "Applied Linear Algebra" },
  { code: "CS350", title: "Operating Systems" },
  { code: "MATH245", title: "Linear Algebra 2" },
  { code: "PHYS122", title: "Physics 2" },
]

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mb-3 md:mb-4">
        <InteractiveHero />
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-0 space-y-3">
        <section className="rounded-xl border border-border bg-card p-4 md:p-5">
          <h2 className="text-base md:text-lg font-semibold">Try a course with interesting prerequisites</h2>
          <p className="mt-1 text-sm text-muted-foreground">Jump straight in — these courses have rich prerequisite graphs.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickStartCourses.map((course) => (
              <Link
                key={course.code}
                to={`/courses?course=${course.code}`}
                className="rounded-lg border border-border bg-background px-3 py-2 hover:bg-accent transition-colors"
              >
                <div className="text-sm font-semibold">{course.code}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{course.title}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 md:p-5">
          <h2 className="text-sm font-semibold">How to use UWVisualizer</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li><strong>1.</strong> Search for a course (e.g. MATH237) or click a popular one.</li>
              <li><strong>2.</strong> Explore the interactive prerequisite graph and click nodes for details.</li>
              <li><strong>3.</strong> Mark courses as Completed / In Progress in My Courses or tracker.</li>
              <li><strong>4.</strong> Watch paths highlight and alternatives hide as requirements get satisfied.</li>
            </ol>

            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Demo (pruned pathway view)</div>
              <svg viewBox="0 0 340 140" className="mt-2 w-full h-28" aria-label="Sample prerequisite pathway demo">
                <rect x="124" y="10" width="92" height="28" rx="6" fill="hsl(var(--brand) / 0.2)" stroke="hsl(var(--brand))" />
                <text x="170" y="28" textAnchor="middle" fontSize="10" fill="currentColor">MATH237</text>
                <rect x="54" y="70" width="92" height="28" rx="6" fill="hsl(var(--brand) / 0.16)" stroke="hsl(var(--brand))" />
                <text x="100" y="88" textAnchor="middle" fontSize="10" fill="currentColor">MATH136 ✓</text>
                <rect x="194" y="70" width="92" height="28" rx="6" fill="hsl(var(--brand) / 0.16)" stroke="hsl(var(--brand))" />
                <text x="240" y="88" textAnchor="middle" fontSize="10" fill="currentColor">MATH138 ✓</text>
                <path d="M146 70 L158 38" stroke="hsl(var(--brand))" strokeWidth="2" />
                <path d="M194 70 L182 38" stroke="hsl(var(--brand))" strokeWidth="2" />
                <rect x="8" y="108" width="68" height="20" rx="5" fill="hsl(var(--muted))" opacity="0.45" />
                <text x="42" y="122" textAnchor="middle" fontSize="9" fill="currentColor">hidden alt</text>
                <rect x="264" y="108" width="68" height="20" rx="5" fill="hsl(var(--muted))" opacity="0.45" />
                <text x="298" y="122" textAnchor="middle" fontSize="9" fill="currentColor">hidden alt</text>
              </svg>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
