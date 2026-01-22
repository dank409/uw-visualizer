import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Github, Linkedin, Mail } from "lucide-react"
import { useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

const footerNavItems = [
  { path: "/", label: "Home" },
  { path: "/courses", label: "Courses" },
  { path: "/programmes", label: "Programmes" },
  { path: "/about", label: "About" },
]

export function Footer() {
  const location = useLocation()

  return (
    <footer className="border-t bg-background" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 lg:px-16 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {footerNavItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "text-sm text-muted-foreground hover:text-[hsl(var(--brand))] transition-colors duration-200",
                    isActive && "text-[hsl(var(--brand))]"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-6">
            <motion.a
              href="https://www.linkedin.com/in/daniyal-kahloon/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[hsl(var(--brand))] transition-colors duration-200"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Linkedin className="w-4 h-4" />
              <span className="hidden sm:inline">LinkedIn</span>
            </motion.a>

            <motion.a
              href="https://github.com/dank409/uw-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[hsl(var(--brand))] transition-colors duration-200"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </motion.a>

            <motion.a
              href="mailto:dkahloon@uwaterloo.ca"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[hsl(var(--brand))] transition-colors duration-200"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </motion.a>
          </div>
        </div>
      </div>
    </footer>
  )
}

