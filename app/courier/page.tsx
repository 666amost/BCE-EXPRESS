import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CourierPortal } from "@/components/courier-portal"

export default function CourierPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <CourierPortal />
      </main>
      <Footer />
    </div>
  )
}
