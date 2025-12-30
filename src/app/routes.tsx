import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "./layout/AppLayout"
import { CoursesPage } from "@/pages/CoursesPage"
import { ProgrammesPage } from "@/pages/ProgrammesPage"
import { AboutPage } from "@/pages/AboutPage"
import { NotFoundPage } from "@/pages/NotFoundPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <CoursesPage />,
      },
      {
        path: "programmes",
        element: <ProgrammesPage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
])

