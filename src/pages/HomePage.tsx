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
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 space-y-4">
      <section className="rounded-xl border border-border bg-card p-6 md:p-8 text-center">
        <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
          Visualize Course <span className="text-[hsl(var(--brand))]">Prerequisites</span>
        </h1>
        <p className="mt-4 text-base md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Plan your academic journey at the University of Waterloo. Explore course prerequisites,
          visualize dependencies, and build your perfect schedule.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/courses" className="rounded-md bg-[hsl(var(--brand))] px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90">
            Get Started
          </Link>
          <Link to="/about" className="rounded-md border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
            Learn More
          </Link>
        </div>
      </section>

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
    </div>
  )
}
