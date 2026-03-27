import { Github, Linkedin, Mail } from "lucide-react"

const socialLinks = [
  { href: "https://www.linkedin.com/in/daniyal-kahloon/", icon: Linkedin, label: "LinkedIn" },
  { href: "https://github.com/dank409/uw-visualizer", icon: Github, label: "GitHub" },
  { href: "mailto:dkahloon@uwaterloo.ca", icon: Mail, label: "Contact" },
]

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 md:px-6">
        <span className="text-xs text-muted-foreground">
          {new Date().getFullYear()} UW Visualizer
        </span>
        <div className="flex items-center gap-3">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={link.label}
            >
              <link.icon className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
