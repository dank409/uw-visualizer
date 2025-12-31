import { RouterProvider } from "react-router-dom"
import { router } from "./routes"
import { ThemeProvider } from "@/lib/theme-provider"

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

