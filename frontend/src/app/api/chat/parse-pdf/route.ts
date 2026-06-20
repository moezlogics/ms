import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const pdf = require("pdf-parse")
    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await pdf(buffer)

    return NextResponse.json({
      text: data.text || "",
      info: data.info || {},
      numpages: data.numpages || 1,
    })
  } catch (err: any) {
    console.error("[Parse PDF API] Error:", err)
    return NextResponse.json({ error: err.message || "Failed to parse PDF" }, { status: 500 })
  }
}
