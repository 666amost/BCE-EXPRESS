"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, MapPin, Upload, X } from "lucide-react"
import { type ShipmentStatus, addShipmentHistory, uploadImage } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"

export function CourierPortal() {
  const [awbNumber, setAwbNumber] = useState("")
  const [status, setStatus] = useState<ShipmentStatus | "">("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhoto(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLocation("Getting location...")

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          setGpsCoords({ lat, lng })
          setLocation("Current GPS Location")

          toast({
            title: "Location detected",
            description: `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`,
          })
        },
        (error) => {
          setLocation("")
          toast({
            title: "Location error",
            description: `Unable to retrieve location: ${error.message}`,
            variant: "destructive",
          })
        },
      )
    } else {
      toast({
        title: "Geolocation not supported",
        description: "Your browser does not support geolocation",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!awbNumber) {
      toast({
        title: "Missing AWB number",
        description: "Please enter an AWB number",
        variant: "destructive",
      })
      return
    }

    if (!status) {
      toast({
        title: "Missing status",
        description: "Please select a status",
        variant: "destructive",
      })
      return
    }

    if (!location) {
      toast({
        title: "Missing location",
        description: "Please enter a location",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      let photoUrl = null

      // Upload photo if available
      if (photo) {
        photoUrl = await uploadImage(photo, awbNumber)

        if (!photoUrl) {
          toast({
            title: "Upload failed",
            description: "Failed to upload the photo. Please try again.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }

      // Add shipment history
      const result = await addShipmentHistory({
        awb_number: awbNumber,
        status,
        location,
        notes: notes || null,
        photo_url: photoUrl,
        latitude: gpsCoords?.lat || null,
        longitude: gpsCoords?.lng || null,
      })

      if (result) {
        toast({
          title: "Status updated",
          description: `Successfully updated status for AWB: ${awbNumber}`,
        })

        // Reset form
        setAwbNumber("")
        setStatus("")
        setLocation("")
        setNotes("")
        removePhoto()
        setGpsCoords(null)

        // Redirect to tracking page
        router.push(`/track/${awbNumber}`)
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update shipment status. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-lg border border-border/40">
      <CardHeader className="bg-blue-600 dark:bg-blue-800 text-white">
        <h2 className="text-2xl font-bold">Courier Portal</h2>
        <p className="text-blue-100">Update shipment status and upload proof of delivery</p>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label htmlFor="courier-awb">AWB Number</Label>
              <Input
                id="courier-awb"
                placeholder="Enter AWB Number"
                value={awbNumber}
                onChange={(e) => setAwbNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="shipment-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ShipmentStatus)}>
                <SelectTrigger id="shipment-status">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="exception">Exception</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Current Location</Label>
              <div className="flex">
                <Input
                  id="location"
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="rounded-r-none"
                  required
                />
                <Button
                  type="button"
                  onClick={getCurrentLocation}
                  className="rounded-l-none bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  <MapPin className="h-4 w-4 mr-2" /> GPS
                </Button>
              </div>
              {gpsCoords && (
                <p className="text-xs text-muted-foreground mt-1">
                  Lat: {gpsCoords.lat.toFixed(6)}, Lng: {gpsCoords.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <Label>Proof of Delivery</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="delivery-photo"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                />

                {photoPreview ? (
                  <div className="mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview || "/placeholder.svg"}
                      alt="Preview"
                      className="mx-auto photo-preview max-h-40 rounded-lg shadow"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removePhoto}
                      className="mt-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <X className="h-4 w-4 mr-1" /> Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground mb-2">Upload photo proof of delivery</p>
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    >
                      <Upload className="h-4 w-4 mr-2" /> Select Photo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Add any additional notes about this update"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 font-bold py-3"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
