import InteractiveHero from "@/components/ui/hero-section-nexus"
import { Link } from "react-router-dom"
import { Footer } from "@/app/layout/Footer"

const advancedCourses = ["MATH237", "MATH239", "CS341", "STAT230", "AMATH231", "CS350", "MATH245", "PHYS122"]

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <InteractiveHero />

      <main className="mx-auto w-full max-w-6xl px-4 pb-12 -mt-8 md:-mt-12">
        <section className="rounded-xl border border-border bg-card p-5">
          <ul className="grid gap-1.5 text-sm text-muted-foreground md:grid-cols-2">
            <li>• Visualize full prerequisite pathways</li>
            <li>• Track your personal progress</li>
            <li>• See what courses unlock next</li>
            <li>• Official UW calendar data only</li>
          </ul>

          <div className="mt-4 flex flex-wrap gap-3">
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
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card p-4">
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
        </section>
      </main>

      <Footer />
    </div>
  )
}
