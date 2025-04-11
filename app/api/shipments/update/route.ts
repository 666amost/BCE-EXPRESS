import { type NextRequest, NextResponse } from "next/server"
import { addShipmentHistory } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { awb_number, status, location, notes, photo_url, latitude, longitude } = body

    if (!awb_number || !status || !location) {
      return NextResponse.json({ error: "AWB number, status, and location are required" }, { status: 400 })
    }

    // Add shipment history
    const result = await addShipmentHistory({
      awb_number,
      status,
      location,
      notes: notes || null,
      photo_url: photo_url || null,
      latitude: latitude || null,
      longitude: longitude || null,
    })

    if (!result) {
      return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
