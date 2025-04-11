import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TrackingResults } from "@/components/tracking-results"
import { TrackingResultsSkeleton } from "@/components/tracking-results-skeleton"

export default function TrackPage({ params }: { params: { awb: string } }) {
  const { awb } = params

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Suspense fallback={<TrackingResultsSkeleton />}>
          <TrackingResults awbNumber={awb} />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
