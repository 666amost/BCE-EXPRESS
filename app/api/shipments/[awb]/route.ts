import { type NextRequest, NextResponse } from "next/server"
import { getShipmentByAwb, getShipmentHistory } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { awb: string } }) {
  try {
    const awbNumber = params.awb

    // Get shipment details
    const shipment = await getShipmentByAwb(awbNumber)

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    // Get shipment history
    const history = await getShipmentHistory(awbNumber)

    return NextResponse.json({ shipment, history })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
