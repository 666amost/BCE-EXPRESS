import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function TrackingResultsSkeleton() {
  return (
    <Card className="shadow-lg border border-border/40">
      <CardHeader className="bg-primary text-primary-foreground">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Shipment Details</h2>
          <Skeleton className="h-6 w-32 bg-primary-foreground/50" />
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted/50 p-4 rounded-lg">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>

        <div className="mb-8">
          <Skeleton className="h-6 w-64 mb-4" />

          <div className="tracking-progress">
            <Skeleton className="h-full w-1/2 rounded-md" />
            {[0, 25, 50, 75, 100].map((pos) => (
              <div key={pos} className="status-dot inactive" style={{ left: `${pos}%` }}></div>
            ))}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Processed</span>
            <span>Shipped</span>
            <span>In Transit</span>
            <span>Out for Delivery</span>
            <span>Delivered</span>
          </div>
        </div>

        <div className="mb-8">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex">
                <div className="mr-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
