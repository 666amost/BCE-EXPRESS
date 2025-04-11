import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

export type ShipmentStatus = "processed" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "exception"

export interface ShipmentHistory {
  id: string
  awb_number: string
  status: ShipmentStatus
  location: string
  notes?: string
  photo_url?: string
  created_at: string
  latitude?: number
  longitude?: number
}

export interface Shipment {
  awb_number: string
  sender_name: string
  sender_address: string
  sender_phone: string
  receiver_name: string
  receiver_address: string
  receiver_phone: string
  weight: number
  dimensions: string
  service_type: string
  current_status: ShipmentStatus
  created_at: string
  updated_at: string
}

// Fetch shipment by AWB number
export async function getShipmentByAwb(awbNumber: string): Promise<Shipment | null> {
  const { data, error } = await supabase.from("shipments").select("*").eq("awb_number", awbNumber).single()

  if (error || !data) {
    console.error("Error fetching shipment:", error)
    return null
  }

  return data as Shipment
}

// Fetch shipment history by AWB number
export async function getShipmentHistory(awbNumber: string): Promise<ShipmentHistory[]> {
  const { data, error } = await supabase
    .from("shipment_history")
    .select("*")
    .eq("awb_number", awbNumber)
    .order("created_at", { ascending: false })

  if (error || !data) {
    console.error("Error fetching shipment history:", error)
    return []
  }

  return data as ShipmentHistory[]
}

// Add new shipment history entry
export async function addShipmentHistory(
  historyEntry: Omit<ShipmentHistory, "id" | "created_at">,
): Promise<ShipmentHistory | null> {
  // Update the current status in the shipments table
  const { error: updateError } = await supabase
    .from("shipments")
    .update({
      current_status: historyEntry.status,
      updated_at: new Date().toISOString(),
    })
    .eq("awb_number", historyEntry.awb_number)

  if (updateError) {
    console.error("Error updating shipment status:", updateError)
    return null
  }

  // Add the history entry
  const { data, error } = await supabase.from("shipment_history").insert([historyEntry]).select().single()

  if (error || !data) {
    console.error("Error adding shipment history:", error)
    return null
  }

  return data as ShipmentHistory
}

// Upload proof of delivery image
export async function uploadImage(file: File, awbNumber: string): Promise<string | null> {
  const fileExt = file.name.split(".").pop()
  const fileName = `${awbNumber}-${Date.now()}.${fileExt}`
  const filePath = `proof-of-delivery/${fileName}`

  const { error } = await supabase.storage.from("shipment-photos").upload(filePath, file)

  if (error) {
    console.error("Error uploading image:", error)
    return null
  }

  const { data } = supabase.storage.from("shipment-photos").getPublicUrl(filePath)

  return data.publicUrl
}
