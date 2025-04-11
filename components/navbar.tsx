"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-background border-b shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center">
            <Image src="/images/bce-logo.png" alt="BCE EXPRESS" width={120} height={40} className="h-8 w-auto" />
          </Link>
        </div>
        <div className="hidden md:flex space-x-6">
          <Link href="/" className="hover:text-primary transition-colors">
            Track Shipment
          </Link>
          <Link href="#services" className="hover:text-primary transition-colors">
            Services
          </Link>
          <Link href="#about" className="hover:text-primary transition-colors">
            About Us
          </Link>
          <Link href="#contact" className="hover:text-primary transition-colors">
            Contact
          </Link>
          <Link href="/courier" className="hover:text-primary transition-colors">
            Courier Login
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="flex justify-center mb-6 mt-4">
                <Image src="/images/bce-logo.png" alt="BCE EXPRESS" width={180} height={60} className="h-auto" />
              </div>
              <div className="flex flex-col space-y-4 mt-8">
                <Link href="/" onClick={() => setIsOpen(false)}>
                  Track Shipment
                </Link>
                <Link href="#services" onClick={() => setIsOpen(false)}>
                  Services
                </Link>
                <Link href="#about" onClick={() => setIsOpen(false)}>
                  About Us
                </Link>
                <Link href="#contact" onClick={() => setIsOpen(false)}>
                  Contact
                </Link>
                <Link href="/courier" onClick={() => setIsOpen(false)}>
                  Courier Login
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
