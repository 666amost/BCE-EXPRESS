import { getShipmentByAwb, getShipmentHistory, type ShipmentStatus } from "@/lib/db"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, CheckCircle, AlertTriangle, Truck, TruckIcon as TruckLoading, Box } from "lucide-react"
import Image from "next/image"

export async function TrackingResults({ awbNumber }: { awbNumber: string }) {
  const shipment = await getShipmentByAwb(awbNumber)
  const history = await getShipmentHistory(awbNumber)

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">Shipment Not Found</h2>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find any shipment with the AWB number: <span className="font-mono">{awbNumber}</span>
        </p>
        <p className="text-muted-foreground">
          Please check the AWB number and try again, or contact our customer service for assistance.
        </p>
      </div>
    )
  }

  // Calculate progress percentage based on status
  const getProgressPercentage = (status: ShipmentStatus) => {
    switch (status) {
      case "processed":
        return 0
      case "shipped":
        return 25
      case "in_transit":
        return 50
      case "out_for_delivery":
        return 75
      case "delivered":
        return 100
      case "exception":
        return 50
      default:
        return 0
    }
  }

  const progressPercentage = getProgressPercentage(shipment.current_status)

  // Get status icon
  const getStatusIcon = (status: ShipmentStatus) => {
    switch (status) {
      case "processed":
        return <Box className="h-5 w-5" />
      case "shipped":
        return <TruckLoading className="h-5 w-5" />
      case "in_transit":
        return <Truck className="h-5 w-5" />
      case "out_for_delivery":
        return <Truck className="h-5 w-5" />
      case "delivered":
        return <CheckCircle className="h-5 w-5" />
      case "exception":
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <Package className="h-5 w-5" />
    }
  }

  // Format status text
  const formatStatus = (status: ShipmentStatus) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <Card className="shadow-lg border border-border/40">
      <CardHeader className="bg-primary text-primary-foreground">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Shipment Details</h2>
          <Badge variant="secondary" className="bg-primary-foreground text-primary font-mono">
            AWB: {awbNumber}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-muted-foreground font-semibold mb-2">Sender</h3>
            <p className="font-medium">
              {shipment.sender_name}
              <br />
              {shipment.sender_address}
              <br />
              {shipment.sender_phone}
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-muted-foreground font-semibold mb-2">Receiver</h3>
            <p className="font-medium">
              {shipment.receiver_name}
              <br />
              {shipment.receiver_address}
              <br />
              {shipment.receiver_phone}
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-muted-foreground font-semibold mb-2">Shipment Details</h3>
            <p className="font-medium">
              Weight: {shipment.weight} kg
              <br />
              Dimensions: {shipment.dimensions}
              <br />
              Service: {shipment.service_type}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Current Status: <span className="text-primary">{formatStatus(shipment.current_status)}</span>
          </h3>

          <div className="tracking-progress">
            <div className="tracking-progress-bar" style={{ width: `${progressPercentage}%` }}></div>
            <div
              className={`status-dot ${progressPercentage >= 0 ? "active" : "inactive"}`}
              style={{ left: "0%" }}
            ></div>
            <div
              className={`status-dot ${progressPercentage >= 25 ? "active" : "inactive"}`}
              style={{ left: "25%" }}
            ></div>
            <div
              className={`status-dot ${progressPercentage >= 50 ? "active" : "inactive"}`}
              style={{ left: "50%" }}
            ></div>
            <div
              className={`status-dot ${progressPercentage >= 75 ? "active" : "inactive"}`}
              style={{ left: "75%" }}
            ></div>
            <div
              className={`status-dot ${progressPercentage >= 100 ? "active" : "inactive"}`}
              style={{ left: "100%" }}
            ></div>
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
          <h3 className="text-lg font-semibold mb-4">Tracking History</h3>
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="flex">
                <div className="mr-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      item.status === "delivered"
                        ? "text-green-500 bg-green-100 dark:bg-green-900/30"
                        : item.status === "exception"
                          ? "text-red-500 bg-red-100 dark:bg-red-900/30"
                          : "text-primary bg-primary/10"
                    }`}
                  >
                    {getStatusIcon(item.status as ShipmentStatus)}
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold capitalize">{formatStatus(item.status as ShipmentStatus)}</h4>
                    <span className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-foreground/80">{item.location}</p>
                  {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}

                  {item.photo_url && (
                    <div className="mt-2">
                      <Image
                        src={item.photo_url || "/placeholder.svg"}
                        alt="Proof of delivery"
                        width={200}
                        height={150}
                        className="rounded-md object-cover photo-preview"
                      />
                    </div>
                  )}

                  {item.latitude && item.longitude && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      GPS: {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {history.length === 0 && <p className="text-muted-foreground italic">No tracking history available yet.</p>}
          </div>
        </div>

        {shipment.current_status === "delivered" && history.some((item) => item.photo_url) && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Proof of Delivery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history
                .filter((item) => item.photo_url)
                .map((item) => (
                  <div key={`pod-${item.id}`} className="border rounded-lg p-2">
                    <Image
                      src={item.photo_url! || "/placeholder.svg"}
                      alt="Proof of delivery"
                      width={400}
                      height={300}
                      className="rounded-md object-cover w-full h-auto photo-preview"
                    />
                    <p className="text-sm text-muted-foreground mt-2">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
