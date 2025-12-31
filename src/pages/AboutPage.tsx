import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

export function AboutPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="container mx-auto max-w-3xl p-8 text-foreground"
    >
      <motion.h1 variants={itemVariants} className="mb-8 text-3xl font-bold">About UW Visualizer</motion.h1>
      
      <motion.div variants={itemVariants} className="space-y-8">
        <motion.section variants={itemVariants}>
          <h2 className="mb-3 text-xl font-semibold text-foreground">What is UW Visualizer?</h2>
          <p className="text-muted-foreground mb-2">
            UW Visualizer is a modern web application built for University of Waterloo students who are tired of deciphering long, recursive prerequisite descriptions in the academic calendar.
          </p>
          <p className="text-muted-foreground">
            Instead of reading dense prerequisite text, UW Visualizer shows exactly what courses you need, which ones you've already satisfied, and how close you are to becoming eligible for a target course.
          </p>
        </motion.section>

        <motion.div variants={itemVariants} className="border-t" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}></motion.div>

        <motion.section variants={itemVariants}>
          <h2 className="mb-3 text-xl font-semibold text-foreground">Key Features</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Visual prerequisite graphs (full prerequisite chain for any target course)</li>
            <li>Clickable course nodes with course details</li>
            <li>Mark courses as Completed or In Progress to track eligibility</li>
          </ul>
        </motion.section>

        <motion.div variants={itemVariants} className="border-t" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}></motion.div>

        <motion.section variants={itemVariants}>
          <h2 className="mb-3 text-xl font-semibold text-foreground">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Go to the Courses page</li>
            <li>Search for the course you want to take</li>
            <li>View the prerequisite graph showing all required courses and pathways</li>
            <li>Click any course node to see details</li>
            <li>Mark courses as completed / in progress to see what you've unlocked</li>
          </ol>
        </motion.section>

        <motion.div variants={itemVariants} className="border-t" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}></motion.div>

        <motion.section variants={itemVariants}>
          <h2 className="mb-3 text-xl font-semibold text-foreground">Data & Disclaimer</h2>
          <p className="text-muted-foreground mb-2">
            All course information is sourced from the University of Waterloo Undergraduate Academic Calendar:
          </p>
          <p className="text-muted-foreground mb-2">
            <a 
              href="https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/home" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[hsl(var(--brand))] hover:underline"
            >
              https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/home
            </a>
          </p>
          <p className="text-muted-foreground">
            UW Visualizer is an unofficial planning tool. Always confirm requirements using the official calendar and your academic advisor when needed.
          </p>
        </motion.section>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Student-built at the University of Waterloo
        </p>
      </motion.div>
    </motion.div>
  )
}
