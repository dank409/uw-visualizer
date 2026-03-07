import { Link } from "react-router-dom"
import { Footer } from "@/app/layout/Footer"

const advancedCourses = ["MATH237", "MATH239", "CS341", "STAT230", "AMATH231", "CS350", "MATH245", "PHYS122"]

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:py-14">
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">UWVisualizer</h1>
            <p className="mt-2 text-sm md:text-base text-muted-foreground">
              Visualize Waterloo course pathways with official calendar data, track your own progress, and see what courses unlock next.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/courses"
                className="rounded-lg border border-[hsl(var(--brand))/0.55] bg-[hsl(var(--brand))/0.18] px-4 py-2 text-sm font-medium text-[hsl(var(--brand-dark))] hover:bg-[hsl(var(--brand))/0.24]"
              >
                Get Started
              </Link>
              <Link
                to="/about"
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Learn More
              </Link>
            </div>

            <ul className="mt-5 grid gap-1.5 text-sm text-muted-foreground md:grid-cols-2">
              <li>• Visualize full prerequisite pathways</li>
              <li>• Track your personal progress</li>
              <li>• See what courses unlock next</li>
              <li>• Official UW calendar data only</li>
            </ul>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-muted/25 p-4">
            <h2 className="text-sm font-semibold">Try a course with interesting prerequisites</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {advancedCourses.map((code) => (
                <Link
                  key={code}
                  to={`/courses?course=${code}`}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {code}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
