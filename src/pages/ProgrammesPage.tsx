import { motion, type Variants } from "framer-motion"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants: Variants = {
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

export function ProgrammesPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex min-h-screen items-center justify-center p-8"
    >
      <div className="max-w-2xl text-center text-foreground">
        <motion.h1 variants={itemVariants} className="mb-4 text-3xl font-bold">Programmes</motion.h1>
        <motion.div variants={itemVariants} className="mb-6 text-lg text-muted-foreground">
          Programme-level visualizations (majors, degrees, options) are planned for a future update.
        </motion.div>
        <motion.div variants={itemVariants} className="mt-8 text-left">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Planned Features</h2>
          <p className="mb-4 text-muted-foreground">
            The programmes view will allow you to visualize full degree and major structures,
            including required courses, electives, and progression paths.
          </p>
          <div className="mt-6">
            <h3 className="mb-2 font-semibold text-foreground">Example Programmes (coming soon):</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Combinatorics & Optimization</li>
              <li>Statistics</li>
              <li>Computer Science</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

