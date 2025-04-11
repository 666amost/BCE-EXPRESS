"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Image from "next/image"

export function Hero() {
  const [awbNumber, setAwbNumber] = useState("")
  const router = useRouter()

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault()
    if (awbNumber.trim()) {
      router.push(`/track/${awbNumber}`)
    }
  }

  return (
    <div className="bg-white text-black py-16">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/bce-logo.png"
            alt="BCE EXPRESS - Better Cargo Experience"
            width={400}
            height={120}
            className="h-auto"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Your Reliable Logistics Partner</h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-700">
          Track your shipments in real-time with BCE EXPRESS&apos;s advanced tracking system
        </p>
        <Card className="max-w-md mx-auto shadow-xl border-0">
          <CardHeader className="bg-primary text-white p-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">Track Your Shipment</h2>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleTrack} className="flex">
              <Input
                type="text"
                placeholder="Enter AWB Number"
                value={awbNumber}
                onChange={(e) => setAwbNumber(e.target.value)}
                className="flex-grow rounded-r-none focus:ring-primary"
              />
              <Button type="submit" className="rounded-l-none">
                <Search className="h-4 w-4 mr-2" /> Track
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
