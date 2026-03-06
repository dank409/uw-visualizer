import { motion, type Variants } from "framer-motion"
import { Link } from "react-router-dom"
import { ArrowRight, GraduationCap, LayoutGrid, Route, Sparkles } from "lucide-react"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

const roadmap = [
  {
    title: "Program requirement map",
    desc: "Visualize required courses, constraints, and progression blocks for each program.",
    icon: LayoutGrid,
    status: "In design",
  },
  {
    title: "Term-by-term planner",
    desc: "Build a practical sequence and detect bottlenecks before enrollment windows.",
    icon: Route,
    status: "Planned",
  },
  {
    title: "Personalized pathways",
    desc: "Suggest efficient paths based on completed and in-progress courses.",
    icon: Sparkles,
    status: "Planned",
  },
]

const starterPrograms = [
  "Computer Science",
  "Mathematics",
  "Statistics",
  "Combinatorics and Optimization",
  "Software Engineering",
  "Data Science",
]

export function ProgrammesPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[calc(100vh-4rem)] bg-background px-6 py-12"
    >
      <div className="mx-auto w-full max-w-5xl">
        <motion.div variants={itemVariants} className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            Program-level planner (beta roadmap)
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Programmes</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            This section is being upgraded into a full program planner. For now, use the <strong>Courses</strong> page
            to explore prerequisites with program-aware filtering.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--brand))]/15 px-4 py-2 text-sm font-medium text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/20 transition-colors"
            >
              Open course graph
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Learn how data is sourced
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
          {roadmap.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="rounded-2xl liquid-glass p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon className="h-4 w-4 text-[hsl(var(--brand))]" />
                    <h2 className="text-sm font-semibold">{item.title}</h2>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            )
          })}
        </motion.div>

        <motion.div variants={itemVariants} className="mt-8 rounded-2xl liquid-glass p-5">
          <h3 className="text-sm font-semibold text-foreground">Initial programme coverage</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            These are the first program tracks being prioritized for full roadmap support.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {starterPrograms.map((program) => (
              <span
                key={program}
                className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground"
              >
                {program}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
