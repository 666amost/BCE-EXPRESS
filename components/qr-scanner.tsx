"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode, Html5QrcodeResult } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera } from "lucide-react"
import browserBeep from "browser-beep"
import { toast } from "sonner"
import { supabaseClient } from "@/lib/auth"

interface QRScannerProps {
  onScan: (result: string) => void
  onClose: () => void
  hideCloseButton?: boolean
  disableAutoUpdate?: boolean
}

export function QRScanner({ onScan, onClose, hideCloseButton = false, disableAutoUpdate = false }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScannedRef = useRef<string>("")
  const beepTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [isTorchAvailable, setIsTorchAvailable] = useState(false)
  const [isTorchOn, setIsTorchOn] = useState(false)
  const torchFeatureRef = useRef<unknown | null>(null)

  useEffect(() => {
    // Get current user
    async function getCurrentUser() {
      const { data } = await supabaseClient.auth.getSession()
      if (data.session) {
        const { data: userData } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", data.session.user.id)
          .single()

        if (userData) {
          setCurrentUser(userData.name || userData.email?.split("@")[0])
        } else {
          setCurrentUser(data.session.user.email?.split("@")[0] || "courier")
        }
      }
    }
    getCurrentUser()
  }, [])

  const updateShipmentStatus = async (awbNumber: string) => {
    // Type-safe, robust update/insert logic for shipment and shipment_history
    const currentDate: string = new Date().toISOString();
    const status = "out_for_delivery";
    const location = "Sorting Center";
    // Get current user session
    const { data: session } = await supabaseClient.auth.getSession();
    const userId: string | undefined = session?.session?.user?.id;
    const userName: string = currentUser || session?.session?.user?.email?.split("@") [0] || "courier";
    if (!userId) return false;

    // Check if shipment exists
    const { data: existing, error: existingError } = await supabaseClient
      .from("shipments")
      .select("awb_number,current_status,courier_id")
      .eq("awb_number", awbNumber)
      .maybeSingle();
    if (existingError) return false;

    let shipmentSuccess = false;
    if (!existing) {
      // Insert new shipment
      const { error: insertError } = await supabaseClient.from("shipments").insert([
        {
          awb_number: awbNumber,
          sender_name: "Auto Generated",
          sender_address: "Auto Generated",
          sender_phone: "Auto Generated",
          receiver_name: "Auto Generated",
          receiver_address: "Auto Generated",
          receiver_phone: "Auto Generated",
          weight: 1,
          dimensions: "10x10x10",
          service_type: "Standard",
          current_status: status,
          created_at: currentDate,
          updated_at: currentDate,
          courier_id: userId,
        },
      ]);
      if (insertError) return false;
      shipmentSuccess = true;
    } else if (existing.current_status && existing.current_status.toLowerCase() === "out_for_delivery") {
      // Transfer shipment to new courier
      const { data: updateResult, error: updateError } = await supabaseClient
        .from("shipments")
        .update({
          current_status: status,
          updated_at: currentDate,
          courier_id: userId,
        })
        .eq("awb_number", awbNumber)
        .select("awb_number, courier_id");
      if (updateError || !updateResult || updateResult.length === 0) return false;
      if (updateResult[0].courier_id === userId) {
        shipmentSuccess = true;
      } else {
        return false;
      }
    } else {
      // Update shipment status only
      const { error: updateError } = await supabaseClient
        .from("shipments")
        .update({
          current_status: status,
          updated_at: currentDate,
        })
        .eq("awb_number", awbNumber);
      if (updateError) return false;
      shipmentSuccess = true;
    }

    // Add shipment_history if not exists
    if (shipmentSuccess) {
      const { data: existingHistory } = await supabaseClient
        .from("shipment_history")
        .select("id")
        .eq("awb_number", awbNumber)
        .eq("status", status)
        .maybeSingle();
      if (!existingHistory) {
        const { error: historyError } = await supabaseClient.from("shipment_history").insert([
          {
            awb_number: awbNumber,
            status,
            location,
            notes: `Bulk update - Out for Delivery by ${userName}`,
            created_at: currentDate,
          },
        ]);
        if (historyError) return false;
      }
      return true;
    }
    return false;
  }

  const startScanning = async () => {
    try {
      const devices = await Html5Qrcode.getCameras()
      const backCamera = devices.find(device => device.label.toLowerCase().includes('back'))
      const deviceId = backCamera ? backCamera.id : devices[0].id

      scannerRef.current = new Html5Qrcode("qr-reader")
      
      await scannerRef.current.start(
        deviceId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string, result: Html5QrcodeResult) => {
          // Prevent duplicate scans of the same code
          if (decodedText === lastScannedRef.current) {
            return
          }
          
          lastScannedRef.current = decodedText
          
          if (!disableAutoUpdate) {
            // Update shipment status
            const success = await updateShipmentStatus(decodedText)
            
            if (success) {
              // Show success notification
              toast.success("AWB berhasil di-scan!", {
                description: `${decodedText} telah diupdate ke Out for Delivery`,
                duration: 2000,
              })
              
              // Handle the scanned code
              onScan(decodedText)
            } else {
              toast.error("Gagal mengupdate status AWB", {
                description: "Silakan coba lagi",
                duration: 2000,
              })
            }
          } else {
            // Just handle the scanned code without updating
            onScan(decodedText)
          }
          
          // Reset last scanned after a short delay to allow rescanning the same code
          setTimeout(() => {
            lastScannedRef.current = ""
          }, 2000)
        },
        (errorMessage: string) => {
          // Ignore errors - they're usually just "No QR code found" messages
        }
      )
      
      setIsScanning(true)

      // Check for torch capability and turn on after scanner starts
      try {
        if (scannerRef.current) {
          const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
          const torchFeature = capabilities?.torchFeature?.();
          if (torchFeature) {
            setIsTorchAvailable(true);
            torchFeatureRef.current = torchFeature;
            // Turn torch on automatically
            await torchFeature.apply(true);
            setIsTorchOn(true);
          } else {
            setIsTorchAvailable(false);
            setIsTorchOn(false);
            torchFeatureRef.current = null;
          }
        } else {
          setIsTorchAvailable(false);
          setIsTorchOn(false);
          torchFeatureRef.current = null;
        }
      } catch (err) {
        // Silently handle torch errors
        setIsTorchAvailable(false);
        setIsTorchOn(false);
        torchFeatureRef.current = null;
      }

    } catch (err) {
      // Silently handle scanner start errors
      toast.error("Gagal memulai kamera. Silakan coba lagi.")
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      // Turn torch off before stopping scanner
      if (isTorchOn && torchFeatureRef.current) {
        try {
          await (torchFeatureRef.current as { apply: (value: boolean) => Promise<void> }).apply(false);
          setIsTorchOn(false);
        } catch (err) {
          // Silently handle torch turn off errors
        }
      }

      await scannerRef.current.stop()
      setIsScanning(false)
    }
  }

  useEffect(() => {
    // Auto-start scanning when component mounts
    startScanning()

    return () => {
      // Cleanup function to stop scanning when component unmounts
      const cleanup = async () => {
        try {
          if (scannerRef.current?.isScanning) {
            // Turn torch off before stopping scanner
            if (isTorchOn && torchFeatureRef.current) {
              try {
                await (torchFeatureRef.current as { apply: (value: boolean) => Promise<void> }).apply(false);
              } catch (err) {
                // Silently handle torch turn off errors
              }
            }
            await scannerRef.current.stop()
          }
        } catch (err) {
          // Silently handle cleanup errors
        }
      }
      cleanup()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div id="qr-reader" className="w-full max-w-sm mx-auto" />
        {/* Scanning status */}
        {isScanning && (
          <div className="flex items-center gap-2 justify-center text-white text-base font-medium pb-2">
            {/* Minimalist search icon */}
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/><path d="M15 15L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <span>Scanning... Arahkan ke QR Code atau Barcode</span>
          </div>
        )}
        <div className="flex justify-center space-x-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Start Camera
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="destructive">
              Stop Camera
            </Button>
          )}
          {!hideCloseButton && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}