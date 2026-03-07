import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: Theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme | null
      if (stored === "dark" || stored === "light") {
        return stored
      }
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      return prefersDark ? "dark" : "light"
    }
    return "light"
  })
  const [mounted, setMounted] = useState(false)

  // Apply theme immediately on mount to prevent flash
  useEffect(() => {
    const root = document.documentElement
    const stored = localStorage.getItem("theme") as Theme | null
    const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    const initialTheme = (stored === "dark" || stored === "light") ? stored : (systemPrefersDark ? "dark" : "light")
    
    if (initialTheme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("theme", theme)
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const resolvedTheme = theme

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

