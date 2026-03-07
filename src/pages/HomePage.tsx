import { Link } from "react-router-dom"
import InteractiveHero from "@/components/ui/hero-section-nexus"
import { Footer } from "@/app/layout/Footer"

const examples = ["MATH135", "CS135", "MATH237", "STAT230", "CS136", "ECE140"]

export function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <InteractiveHero />

      <section className="mx-auto w-full max-w-6xl px-4 pb-12">
        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
          <h2 className="text-base font-semibold">Try a popular course</h2>
          <p className="mt-1 text-sm text-muted-foreground">Jump straight into a pathway visualization.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {examples.map((code) => (
              <Link
                key={code}
                to={`/courses?course=${code}`}
                className="rounded-md border border-border bg-background px-3 py-2 text-center text-sm font-medium hover:bg-accent"
              >
                {code}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
