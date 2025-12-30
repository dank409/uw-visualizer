import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "./layout/AppLayout"
<<<<<<< HEAD
import { HomePage } from "@/pages/HomePage"
=======
>>>>>>> origin/main
import { CoursesPage } from "@/pages/CoursesPage"
import { ProgrammesPage } from "@/pages/ProgrammesPage"
import { AboutPage } from "@/pages/AboutPage"
import { NotFoundPage } from "@/pages/NotFoundPage"

export const router = createBrowserRouter([
  {
    path: "/",
<<<<<<< HEAD
    element: <HomePage />,
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: "courses",
=======
    element: <AppLayout />,
    children: [
      {
        index: true,
>>>>>>> origin/main
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

