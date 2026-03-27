import { motion } from "framer-motion"
import { GitBranch, Database, CheckCircle2, ExternalLink } from "lucide-react"

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
}

export function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <motion.h1
        initial="hidden"
        animate="visible"
        custom={0}
        variants={fadeUp}
        className="text-2xl font-bold tracking-tight text-foreground"
      >
        About UW Visualizer
      </motion.h1>

      <motion.p
        initial="hidden"
        animate="visible"
        custom={1}
        variants={fadeUp}
        className="mt-3 text-sm text-muted-foreground leading-relaxed"
      >
        A tool for University of Waterloo students to visualize prerequisite chains
        instead of parsing dense calendar text. See what you need, what you've done,
        and how close you are to eligibility.
      </motion.p>

      <motion.div
        initial="hidden"
        animate="visible"
        custom={2}
        variants={fadeUp}
        className="mt-8 grid gap-3 sm:grid-cols-3"
      >
        {[
          { icon: GitBranch, title: "Interactive graphs", desc: "Full prerequisite chains as navigable node graphs." },
          { icon: CheckCircle2, title: "Progress tracking", desc: "Mark courses complete to see paths resolve." },
          { icon: Database, title: "Official data", desc: "Sourced from the UW academic calendar API." },
        ].map((f) => (
          <div key={f.title} className="glass-panel rounded-2xl p-4">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--brand-subtle))] flex items-center justify-center mb-3">
              <f.icon className="w-4 h-4 text-[hsl(var(--brand-dark))]" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        custom={3}
        variants={fadeUp}
        className="mt-8 glass-panel rounded-2xl p-5"
      >
        <h2 className="text-sm font-semibold text-foreground">How to use</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-md bg-[hsl(var(--brand-subtle))] flex items-center justify-center text-[11px] font-semibold text-[hsl(var(--brand-dark))]">1</span>
            Search for the course you want to take.
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-md bg-[hsl(var(--brand-subtle))] flex items-center justify-center text-[11px] font-semibold text-[hsl(var(--brand-dark))]">2</span>
            Explore the prerequisite graph — click nodes for details.
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-md bg-[hsl(var(--brand-subtle))] flex items-center justify-center text-[11px] font-semibold text-[hsl(var(--brand-dark))]">3</span>
            Mark courses complete and watch requirements resolve.
          </li>
        </ol>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        custom={4}
        variants={fadeUp}
        className="mt-6 rounded-xl border border-border/40 bg-card/30 p-4 text-xs text-muted-foreground space-y-2"
      >
        <p>
          Data sourced from the{" "}
          <a
            href="https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/home"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[hsl(var(--brand-dark))] hover:underline underline-offset-2 inline-flex items-center gap-1"
          >
            UW Undergraduate Academic Calendar
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
        <p>
          UW Visualizer is an unofficial planning tool. Always confirm requirements
          with the official calendar and your academic advisor.
        </p>
      </motion.div>

      <motion.p
        initial="hidden"
        animate="visible"
        custom={5}
        variants={fadeUp}
        className="mt-8 text-center text-xs text-muted-foreground"
      >
        Student-built at the University of Waterloo
      </motion.p>
    </div>
  )
}
