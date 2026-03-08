import InteractiveHero from "@/components/ui/hero-section-nexus"
import { Link } from "react-router-dom"

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
      <InteractiveHero showHeader={false} />

      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-3 space-y-3">
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
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><strong>1.</strong> Search for a course (e.g. MATH237) or click a popular one.</li>
            <li><strong>2.</strong> Explore the interactive prerequisite graph and click nodes for details.</li>
            <li><strong>3.</strong> Mark courses as Completed / In Progress in My Courses or tracker.</li>
            <li><strong>4.</strong> Watch paths highlight and alternatives hide as requirements get satisfied.</li>
          </ol>
        </section>
      </main>
    </div>
  )
}
