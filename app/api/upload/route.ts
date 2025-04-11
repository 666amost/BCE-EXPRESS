import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const awbNumber = formData.get("awbNumber") as string

    if (!file || !awbNumber) {
      return NextResponse.json({ error: "File and AWB number are required" }, { status: 400 })
    }

    const fileExt = file.name.split(".").pop()
    const fileName = `${awbNumber}-${Date.now()}.${fileExt}`
    const filePath = `proof-of-delivery/${fileName}`

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { error } = await supabase.storage.from("shipment-photos").upload(filePath, buffer, {
      contentType: file.type,
    })

    if (error) {
      console.error("Supabase storage error:", error)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Get public URL
    const { data } = supabase.storage.from("shipment-photos").getPublicUrl(filePath)

    return NextResponse.json({ url: data.publicUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
