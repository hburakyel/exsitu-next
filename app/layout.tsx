import "./globals.css"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Metadata } from "next"
import type React from "react" // Import React

export const metadata: Metadata = {
  title: "Ex Situ - Museum Objects Map",
  description: "Interactive visualization of museum objects and their relationships",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

