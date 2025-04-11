import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // In a real app, you would use proper authentication
    // This is a simplified example
    const { data, error } = await supabase.from("users").select("*").eq("email", email).single()

    if (error || !data) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check if user is a courier
    if (data.role !== "courier") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Generate a simple token (in a real app, use JWT)
    const token = Buffer.from(`${data.id}:${Date.now()}`).toString("base64")

    return NextResponse.json({
      token,
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      },
    })
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
