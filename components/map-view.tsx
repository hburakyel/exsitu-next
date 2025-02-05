"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import type { MuseumObject, MapBounds } from "../types"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface ViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

interface MapViewProps {
  initialViewState?: Partial<ViewState>
  onBoundsChange: (bounds: MapBounds) => void
  objects: MuseumObject[]
}

export default function MapView({ initialViewState, onBoundsChange, objects }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: 0,
    latitude: 20,
    zoom: 1.5,
    pitch: 45,
    bearing: 0,
    ...initialViewState,
  })

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (!MAPBOX_TOKEN) {
      setMapError("Mapbox token is missing. Please set the NEXT_PUBLIC_MAPBOX_TOKEN environment variable.")
      return
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: process.env.NEXT_PUBLIC_MAPBOX_STYLE || "mapbox://styles/mapbox/light-v11",
        ...viewState,
      })

      map.current.addControl(new mapboxgl.NavigationControl())

      map.current.on("load", () => {
        if (!map.current) return

        try {
          map.current.addSource("arcs", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          })

          map.current.addLayer({
            id: "arc-layer",
            type: "line",
            source: "arcs",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#FF007F",
              "line-width": 1,
              "line-opacity": 0.6,
            },
          })
        } catch (error) {
          console.error("Error setting up map layers:", error)
          setMapError("Failed to initialize map layers")
        }
      })

      map.current.on("moveend", () => {
        if (!map.current) return

        const bounds = map.current.getBounds()
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        })
      })

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e)
        setMapError("Failed to load map")
      })
    } catch (error) {
      console.error("Error initializing map:", error)
      setMapError("Failed to initialize map")
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [onBoundsChange, viewState])

  useEffect(() => {
    if (!map.current) return

    try {
      const features = objects.map((obj) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [obj.institution.longitude, obj.institution.latitude],
            [obj.longitude, obj.latitude],
          ],
        },
        properties: {
          title: obj.title,
          institution: obj.institution.name,
        },
      }))

      const source = map.current.getSource("arcs")
      if (source && "setData" in source) {
        source.setData({
          type: "FeatureCollection",
          features,
        })
      }
    } catch (error) {
      console.error("Error updating arcs:", error)
      setMapError("Failed to update map data")
    }
  }, [objects])

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500">
        <p>{mapError}</p>
      </div>
    )
  }

  return <div ref={mapContainer} className="w-full h-full" />
}

