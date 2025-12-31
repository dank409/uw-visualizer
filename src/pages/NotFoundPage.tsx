import { Link } from "react-router-dom"
import { motion, type Variants } from "framer-motion"
import { Button } from "@/components/ui/button"

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

export function NotFoundPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground"
    >
      <motion.h1 variants={itemVariants} className="mb-4 text-4xl font-bold">404</motion.h1>
      <motion.p variants={itemVariants} className="mb-8 text-muted-foreground">Page not found</motion.p>
      <motion.div variants={itemVariants}>
        <Link to="/">
          <Button className="bg-[hsl(var(--brand))] text-primary-foreground hover:bg-[hsl(var(--brand))]/90">Go Home</Button>
        </Link>
      </motion.div>
    </motion.div>
  )
}

