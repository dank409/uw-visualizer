import { RouterProvider } from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"
import { router } from "./routes"
import { ThemeProvider } from "@/lib/theme-provider"

export function App() {
  const isProd = Boolean((import.meta as any)?.env?.PROD)

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      {isProd ? <Analytics /> : null}
    </ThemeProvider>
  )
}

