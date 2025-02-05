"use client"

import { useState, useEffect } from "react"
import MapView from "../components/map-view"
import SearchBox from "../components/search-box"
import ObjectGrid from "../components/object-grid"
import { fetchMuseumObjects } from "../lib/api"
import type { MuseumObject, MapBounds } from "../types"

export default function Home() {
  const [objects, setObjects] = useState<MuseumObject[]>([])
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.5,
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      setError("Mapbox token is missing. Please set the NEXT_PUBLIC_MAPBOX_TOKEN environment variable.")
    }
  }, [])

  const handleBoundsChange = async (bounds: MapBounds) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchMuseumObjects(bounds)
      console.log("Received data in handleBoundsChange:", data) // Log the received data
      if (data && Array.isArray(data.data)) {
        setObjects(data.data)
      } else {
        throw new Error("Invalid data structure received from API")
      }
    } catch (error) {
      console.error("Failed to fetch objects:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      setObjects([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationFound = (longitude: number, latitude: number) => {
    setViewState({
      longitude,
      latitude,
      zoom: 8,
    })
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="fixed top-4 left-4 z-10 w-full max-w-sm">
        <SearchBox onLocationFound={handleLocationFound} />
      </div>

      <div className="fixed inset-0">
        <MapView initialViewState={viewState} onBoundsChange={handleBoundsChange} objects={objects} />
      </div>

      <div className="fixed right-4 top-4 bottom-4 w-full max-w-md bg-white/95 dark:bg-gray-900/95 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 h-full overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Museum Objects</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <ObjectGrid objects={objects} />
          )}
        </div>
      </div>
    </main>
  )
}

