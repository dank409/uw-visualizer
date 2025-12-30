import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { MobileBlocker } from "@/components/MobileBlocker"

export function AppLayout() {
  return (
    <>
      <MobileBlocker />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </>
  )
}

