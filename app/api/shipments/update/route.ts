import { type NextRequest, NextResponse } from "next/server"
import { addShipmentHistory } from "@/lib/db"
import { sendScanKeluarToBranch, sendScanTTDToBranch, extractCourierName } from "@/lib/branch-sync"

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
    }
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

    // Branch sync - send status to branch system for BE resi only (async, don't block main operation)
    if (awb_number.startsWith('BE')) {
      Promise.resolve().then(async () => {
        try {
          const courierName = extractCourierName(notes, location);
          
          if (status === "out_for_delivery") {
            // Send scan keluar to branch
            await sendScanKeluarToBranch({
              no_resi: awb_number,
              nama_kurir: courierName,
              armada: "motor", // Default vehicle type
              plat_armada: "BCEJKT", // Default plate number
              pemindai: location || "System"
            });
          } else if (status === "delivered" && photo_url) {
            // Send scan TTD to branch
            await sendScanTTDToBranch({
              no_resi: awb_number,
              nama_kurir: courierName,
              armada: "motor", // Default vehicle type
              plat_armada: "BCEJKT", // Default plate number
              gambar: photo_url,
              pemindai: location || "System"
            });
          }
        } catch (branchSyncError) {
          // Log but don't fail the main operation
          console.error('Branch sync error:', branchSyncError);
        }
      }).catch(() => {
        // Ignore async errors
      });
    }

    // WhatsApp notify jika delivered - handle secara terpisah agar tidak mempengaruhi response utama
    if (status === "delivered") {
      try {
        // Pastikan env WAHA_API_URL dan WA_GROUP_ID terisi
        const WAHA_API_URL = process.env.WAHA_API_URL;
        const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
        const WA_GROUP_ID = process.env.WA_GROUP_ID;
        
        if (!WAHA_API_URL || !WA_GROUP_ID) {
          // WhatsApp environment variables not configured for shipment update
          // Continue without WhatsApp notification
        } else {
          // Delay random 15-35 detik
          const delay = Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;
          await new Promise(res => setTimeout(res, delay));
          
          const GROUP_ID = WA_GROUP_ID.endsWith('@g.us') ? WA_GROUP_ID : WA_GROUP_ID + '@g.us';
          const text = `Paket Terkirim!\nAWB: ${awb_number}\nStatus: ${status}\nKurir: ${location}\nNote: ${notes || ''}`;
          
          const whatsappResponse = await fetch(WAHA_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session: WAHA_SESSION,
              chatId: GROUP_ID,
              text
            })
          });
          
          if (!whatsappResponse.ok) {
            // WhatsApp notification failed - continuing with main operation
          }
        }
      } catch (whatsappError) {
        // WhatsApp notification error - don't fail the main operation
        // Don't fail the main operation due to WhatsApp error
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    // Shipment update error - handled by error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
