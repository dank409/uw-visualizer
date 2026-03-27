import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, GitBranch, BookOpen, CheckCircle2, BarChart3 } from "lucide-react"

const quickStartCourses = [
  { code: "MATH237", title: "Calculus 3 for Honours Math" },
  { code: "MATH239", title: "Intro to Combinatorics" },
  { code: "CS341", title: "Algorithms" },
  { code: "STAT230", title: "Probability" },
  { code: "AMATH231", title: "Calculus 4" },
  { code: "CS350", title: "Operating Systems" },
  { code: "MATH245", title: "Linear Algebra 2" },
  { code: "PHYS122", title: "Physics 2" },
]

const features = [
  {
    icon: GitBranch,
    title: "Prerequisite graphs",
    desc: "See every path to your target course as an interactive node graph.",
  },
  {
    icon: CheckCircle2,
    title: "Track progress",
    desc: "Mark courses complete and watch requirements auto-resolve.",
  },
  {
    icon: BookOpen,
    title: "Official data",
    desc: "Pulled directly from the UWaterloo academic calendar API.",
  },
  {
    icon: BarChart3,
    title: "Program roadmaps",
    desc: "Load a program and see how far along you are.",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
}

export function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
      {/* Hero */}
      <section className="pt-16 pb-12 md:pt-24 md:pb-16 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand))]" />
            University of Waterloo
          </div>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          custom={1}
          variants={fadeUp}
          className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.1]"
        >
          Visualize your path
          <br />
          <span className="text-[hsl(var(--brand))]">through Waterloo</span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
          className="mt-4 text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed"
        >
          Interactive prerequisite graphs built from the official academic calendar.
          Plan your courses with clarity.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={3}
          variants={fadeUp}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--brand))] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[hsl(var(--brand-dark))] transition-colors"
          >
            Explore courses
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/programmes"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/80 px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            View programs
          </Link>
        </motion.div>
      </section>

      {/* Quick start */}
      <motion.section
        initial="hidden"
        animate="visible"
        custom={4}
        variants={fadeUp}
        className="pb-10"
      >
        <div className="glass-panel rounded-2xl p-5 md:p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Popular courses</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Courses with rich prerequisite trees</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickStartCourses.map((course) => (
              <Link
                key={course.code}
                to={`/courses?course=${course.code}`}
                className="group rounded-xl border border-border/50 bg-card/40 px-3.5 py-2.5 hover:bg-accent/60 hover:border-border transition-all"
              >
                <div className="text-sm font-semibold text-foreground group-hover:text-[hsl(var(--brand-dark))] transition-colors">
                  {course.code}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{course.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial="hidden"
        animate="visible"
        custom={5}
        variants={fadeUp}
        className="pb-16"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/40 bg-card/30 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--brand-subtle))] mb-3">
                <f.icon className="w-4 h-4 text-[hsl(var(--brand-dark))]" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}
