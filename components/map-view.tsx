"use client"

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle, useMemo } from "react"
import mapboxgl from "mapbox-gl"
import { MapboxOverlay } from "@deck.gl/mapbox"
import type { MuseumObject, MapBounds } from "../types"
import debounce from "lodash/debounce"
// Import the arc utilities
import type { ClusteredArc } from "../lib/arc-utils"
// Update the imports to include Search but remove Globe from here since we'll use it in the map controls
import { AlertTriangle, RefreshCcw, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
// Import the countUniqueArcs function at the top of the file
import { countUniqueArcs } from "../lib/arc-utils"
import { ArcLayer } from "@deck.gl/layers"
import { toast } from "@/components/ui/use-toast"
import { Spinner } from "@/components/ui/spinner"
// Add SearchBox import
import SearchBox from "./search-box"
// Add StatsPanel import
import StatsPanel from "./stats-panel"

// At the beginning of the file, define the style constants
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE
const FALLBACK_MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11" // Default Mapbox style as fallback

interface ViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch?: number
  bearing?: number
  name?: string
}

interface MapViewProps {
  initialViewState: ViewState
  onBoundsChange: (bounds: MapBounds) => void
  objects: MuseumObject[]
  allObjects: MuseumObject[] // All objects for arcs
  onError?: (error: string) => void
  totalCount: number
  onToggleView: () => void
  onExpandView: () => void
  viewMode: "grid" | "list"
  containerSize: "default" | "expanded" | "minimal"
  locationName?: string
  setShowSearchBox: (show: boolean) => void
}

// Update the MapView component to include zoom-based arc rendering
const MapView = forwardRef<{ map: mapboxgl.Map | null }, MapViewProps>(
  (
    {
      initialViewState,
      onBoundsChange,
      objects = [],
      allObjects = [],
      onError,
      totalCount,
      onToggleView,
      viewMode,
      containerSize,
      locationName,
      setShowSearchBox,
      onExpandView,
    },
    ref,
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const lastBounds = useRef<MapBounds | null>(null)
    const deckOverlay = useRef<MapboxOverlay | null>(null)
    const [mapError, setMapError] = useState<string | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const resizeTimeout = useRef<NodeJS.Timeout | null>(null)
    const [currentZoom, setCurrentZoom] = useState(initialViewState.zoom || 2)
    const [isMapReady, setIsMapReady] = useState(false) // Initialize with false
    const initialBoundsSet = useRef(false)
    const prevViewStateRef = useRef(initialViewState)

    const [showLayerControls, setShowLayerControls] = useState(false)
    const [showDataStatus, setShowDataStatus] = useState(false)
    const [renderQuality, setRenderQuality] = useState<"low" | "medium" | "high">("medium")
    const [useDynamicLoading, setUseDynamicLoading] = useState(true)
    const [showGlobalView, setShowGlobalView] = useState(true)
    const [isLoadingObjects, setIsLoadingObjects] = useState(false)
    const [dataStatus, setDataStatus] = useState({
      total: 0,
      fetchedPages: [] as number[],
      pageCount: 0,
      percentComplete: 0,
    })

    // New state for storing arcs at different zoom levels
    const [countryArcs, setCountryArcs] = useState<ClusteredArc[]>([])
    const [cityArcs, setCityArcs] = useState<ClusteredArc[]>([])
    const [detailedArcs, setDetailedArcs] = useState<ClusteredArc[]>([])
    const [currentArcs, setCurrentArcs] = useState<ClusteredArc[]>([])
    const [isTransitioning, setIsTransitioning] = useState(false)

    // New state for tracking arc loading
    const [arcsLoading, setArcsLoading] = useState(false)

    // Expose map instance to parent component
    useImperativeHandle(ref, () => ({
      map: map.current,
    }))

    // Use a more aggressive debounce to reduce the frequency of bounds changes
    const debouncedBoundsChange = useCallback(
      debounce((bounds) => {
        if (
          !lastBounds.current ||
          Math.abs(lastBounds.current.north - bounds.north) > 0.1 ||
          Math.abs(lastBounds.current.south - bounds.south) > 0.1 ||
          Math.abs(lastBounds.current.east - bounds.east) > 0.1 ||
          Math.abs(lastBounds.current.west - bounds.west) > 0.1
        ) {
          lastBounds.current = bounds
          onBoundsChange(bounds)
        }
      }, 500), // Reduced debounce time for more responsive updates
      [onBoundsChange],
    )

    // Improved resize handler with debounce
    const handleResize = useCallback(() => {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current)
      }

      // Use requestAnimationFrame for smoother resizing
      requestAnimationFrame(() => {
        if (map.current) {
          map.current.resize()
        }
      })
    }, [])

    const handleResetView = useCallback(() => {
      setShowGlobalView(true)
      if (map.current) {
        map.current.flyTo({
          center: [0, 20],
          zoom: 2,
          essential: true,
          duration: 1500,
        })
      }
    }, [])

    // Initialize map
    useEffect(() => {
      if (!mapContainer.current || map.current) return

      // Instead of checking for MAPBOX_TOKEN here, we'll fetch it from the server
      const initializeMap = async () => {
        try {
          // Fetch the map token from a server endpoint
          const tokenResponse = await fetch("/api/mapbox-token")

          if (!tokenResponse.ok) {
            throw new Error("Failed to fetch Mapbox token")
          }

          const { token } = await tokenResponse.json()

          if (!token) {
            setMapError("Mapbox token is missing from server response")
            return
          }

          mapboxgl.accessToken = token

          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: MAPBOX_STYLE || FALLBACK_MAPBOX_STYLE,
            ...initialViewState,
            projection: "mercator",
            attributionControl: false,
          })

          // Rest of the map initialization code remains the same
          map.current.on("load", () => {
            console.log("Map loaded successfully")
            setIsMapReady(true)

            if (map.current) {
              const bounds = map.current.getBounds()
              onBoundsChange({
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
              })
            }
          })

          // The rest of this function remains unchanged
          map.current.on("error", (e) => {
            console.error("Map error:", e)
            if (onError) onError("Map error occurred")
          })

          map.current.on("moveend", () => {
            if (!map.current) return

            // Set arcs loading state when map moves
            setArcsLoading(true)

            const bounds = map.current.getBounds()
            debouncedBoundsChange({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
            })
          })

          map.current.on("zoom", () => {
            if (map.current) {
              setCurrentZoom(map.current.getZoom())
            }
          })

          // Add standard navigation control with zoom buttons
          const nav = new mapboxgl.NavigationControl({
            showCompass: false,
            visualizePitch: false,
          })
          map.current.addControl(nav, "bottom-left")

          // Add a custom control for the world view button
          class WorldViewControl {
            _map: mapboxgl.Map | null = null
            _container: HTMLDivElement | null = null

            onAdd(map: mapboxgl.Map) {
              this._map = map
              this._container = document.createElement("div")
              this._container.className = "mapboxgl-ctrl mapboxgl-ctrl-group world-view-control"

              // Global view button
              const globalViewButton = document.createElement("button")
              globalViewButton.className = "mapboxgl-ctrl-globe"
              globalViewButton.setAttribute("aria-label", "Global View")
              globalViewButton.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
              globalViewButton.addEventListener("click", () => {
                if (this._map) {
                  this._map.flyTo({
                    center: [0, 20],
                    zoom: 2,
                    essential: true,
                    duration: 1500,
                  })
                }
              })

              this._container.appendChild(globalViewButton)
              return this._container
            }

            onRemove() {
              if (this._container && this._container.parentNode) {
                this._container.parentNode.removeChild(this._container)
              }
              this._map = null
            }
          }

          // Add the world view control
          map.current.addControl(new WorldViewControl(), "bottom-left")

          // Initialize deck.gl overlay
          deckOverlay.current = new MapboxOverlay({
            layers: [],
          })
          map.current.addControl(deckOverlay.current)

          // Add window resize listener
          window.addEventListener("resize", handleResize)

          return () => {
            window.removeEventListener("resize", handleResize)
            if (map.current) {
              map.current.remove()
              map.current = null
            }
          }
        } catch (error) {
          console.error("Error initializing map:", error)
          setMapError("Failed to initialize map")
          if (onError) onError("Failed to initialize map")
        }
      }

      initializeMap()

      return () => {
        window.removeEventListener("resize", handleResize)
        if (map.current) {
          map.current.remove()
          map.current = null
        }
      }
    }, []) // Empty dependency array to initialize map only once

    // Update the MapView component to properly handle viewState changes
    // Only fly to new location when coordinates actually change
    useEffect(() => {
      if (
        map.current &&
        isMapReady &&
        (prevViewStateRef.current.longitude !== initialViewState.longitude ||
          prevViewStateRef.current.latitude !== initialViewState.latitude ||
          prevViewStateRef.current.zoom !== initialViewState.zoom)
      ) {
        // When initialViewState changes, fly to the new location
        map.current.flyTo({
          center: [initialViewState.longitude, initialViewState.latitude],
          zoom: initialViewState.zoom || 2,
          pitch: initialViewState.pitch || 0,
          bearing: initialViewState.bearing || 0,
          essential: true,
          duration: 1500,
        })

        // Update the ref to the current view state
        prevViewStateRef.current = initialViewState
      }
    }, [initialViewState, isMapReady])

    // Add a new state for the hovered arc tooltip
    const [hoveredArc, setHoveredArc] = useState(null)
    const [showSearchBox, setShowSearchBoxState] = useState(false)
    // Replace the existing onLocationFound function with this updated version:
    const onLocationFound = (longitude: number, latitude: number, name: string) => {
      if (map.current) {
        map.current.flyTo({
          center: [longitude, latitude],
          zoom: 12,
          essential: true,
          duration: 1500,
        })

        // Close the search box after finding a location
        setShowSearchBoxState(false)

        // Show a toast notification for better feedback
        toast({
          title: "Location Found",
          description: `Viewing ${name}`,
          className: "bg-black/80 text-white border border-gray-700 backdrop-blur-md",
          position: "top-right",
        })
      }
    }

    // Disable the deck.gl ArcLayer to prevent duplication with SimpleArcLayer
    const arcLayer = useMemo(() => {
      if (!isMapReady || objects.length === 0) {
        setArcsLoading(false)
        return null
      }

      // Set loading state to true when starting to create arcs
      setArcsLoading(true)

      // Filter objects with valid coordinates
      const validObjects = objects.filter(
        (obj) =>
          obj.attributes?.longitude != null &&
          obj.attributes?.latitude != null &&
          obj.attributes?.institution_longitude != null &&
          obj.attributes?.institution_latitude != null &&
          !isNaN(obj.attributes.longitude) &&
          !isNaN(obj.attributes.latitude) &&
          !isNaN(obj.attributes.institution_longitude) &&
          !isNaN(obj.attributes.institution_latitude),
      )

      console.log(`Creating arc layer with ${validObjects.length} valid objects out of ${objects.length} total`)

      if (validObjects.length === 0) {
        console.warn("No valid objects found for creating arcs")
        return null
      }

      // Group objects by origin-destination pairs to count them
      const arcGroups = new Map()

      validObjects.forEach((obj) => {
        const fromLng = obj.attributes.longitude
        const fromLat = obj.attributes.latitude
        const toLng = obj.attributes.institution_longitude
        const toLat = obj.attributes.institution_latitude

        // Skip if source and target are very close (no significant movement)
        if (Math.abs(fromLng - toLng) < 0.001 && Math.abs(fromLat - toLat) < 0.001) {
          return
        }

        // Create a key for this origin-destination pair
        const key = `${fromLng.toFixed(4)},${fromLat.toFixed(4)}-${toLng.toFixed(4)},${toLat.toFixed(4)}`

        if (!arcGroups.has(key)) {
          arcGroups.set(key, {
            sourcePosition: [fromLng, fromLat],
            targetPosition: [toLng, toLat],
            fromName: obj.attributes.place_name || "Unknown Origin",
            toName: obj.attributes.institution_name || "Unknown Destination",
            count: 0,
            objects: [],
          })
        }

        const group = arcGroups.get(key)
        group.count++
        group.objects.push(obj)
      })

      // Convert to array for deck.gl
      const arcData = Array.from(arcGroups.values())

      return new ArcLayer({
        id: "arc-layer",
        data: arcData,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: [234, 88, 12], // RGB green
        getTargetColor: [234, 88, 12], // RGB green
        getWidth: (d) => Math.max(2, Math.min(10, 2 + d.count / 2)), // Width based on count
        pickable: true,
        autoHighlight: true,
        highlightColor: [59, 130, 246],
        // Add tooltip and click handlers
        onHover: (info) => {
          if (info.object) {
            // Create tooltip content
            const { fromName, toName, count } = info.object
            setHoveredArc({
              fromName,
              toName,
              count,
              x: info.x,
              y: info.y,
            })
          } else {
            setHoveredArc(null)
          }
        },
        onClick: (info) => {
          if (info.object && map.current) {
            const { sourcePosition, fromName, toName } = info.object

            // Fly to the origin location
            map.current.flyTo({
              center: sourcePosition,
              zoom: 10,
              essential: true,
              duration: 1500,
            })

            // Show a toast notification with styling matching the artifact selected toast
            toast({
              title: "Viewing Origin Location",
              description: `From: ${fromName} → To: ${toName}`,
              className: "bg-black/80 text-white border border-gray-700 backdrop-blur-md",
              position: "top-right",
            })
          }
        },
      })
    }, [objects, isMapReady, setHoveredArc])

    // Update arc layer when data changes
    useEffect(() => {
      if (!map.current || !deckOverlay.current || !isMapReady) return

      try {
        // Set loading state to true when starting to update arcs
        setArcsLoading(true)

        // Create a default empty layer if arcLayer is null
        const layers = arcLayer ? [arcLayer] : []

        deckOverlay.current.setProps({
          layers: layers,
        })

        console.log(`Updated deck overlay with ${layers.length} layers`)

        // Set loading state to false after updating arcs
        setTimeout(() => setArcsLoading(false), 300) // Small delay to ensure rendering completes
      } catch (error) {
        console.error("Error updating arcs:", error)
        setArcsLoading(false) // Make sure to turn off loading state even if there's an error
      }
    }, [arcLayer, isMapReady])

    // Calculate unique arcs count
    const uniqueArcsCount = useMemo(() => countUniqueArcs(objects), [objects])

    if (mapError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500">
          <div className="text-center p-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <p className="text-sm font-normal mb-4">{mapError}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mx-auto">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </div>
      )
    }

    // Update the MapView component to include a search box
    return (
      <div className="relative w-full h-full">
        <div
          ref={mapContainer}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
          }}
        />

        {hoveredArc && (
          <div
            className="absolute bg-black/80 text-white p-2 rounded-md text-xs z-50 pointer-events-none border border-gray-700 backdrop-blur-md"
            style={{
              left: hoveredArc.x + 10,
              top: hoveredArc.y + 10,
              maxWidth: "300px",
            }}
          >
            <div className="mb-1">
              <span className="text-gray-400 mr-2">From:</span>
              <span>{hoveredArc.fromName}</span>
            </div>
            <div className="mb-1">
              <span className="text-gray-400 mr-2">To:</span>
              <span>{hoveredArc.toName}</span>
            </div>
            <div>
              <span className="text-gray-400 mr-2">Count:</span>
              <span>
                {hoveredArc.count} link{hoveredArc.count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
        {/* Arc loading indicator */}
        {arcsLoading && (
          <div className="absolute bottom-16 right-4 bg-black/80 text-white p-2 rounded-md text-xs z-50 flex items-center gap-2 border border-gray-700 backdrop-blur-md">
            <Spinner className="h-4 w-4" />
            <span>Loading arcs...</span>
          </div>
        )}
        {/* Header in top left corner */}
        <div className="absolute top-4 left-4 bg-black/80 text-white rounded-lg shadow-lg backdrop-blur-md border border-gray-700 z-20 flex items-center gap-2 p-2">
          <div className="text-sm">
            <span className="font-semibold">Ex Situ</span>
            {locationName && <span className="ml-2">{locationName}</span>}
            <span className="ml-2 text-gray-400">
              {uniqueArcsCount} arc{uniqueArcsCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSearchBoxState(true)}>
              <Search className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Add search box overlay with stats panel */}
        {showSearchBox && (
          <div
            className={`absolute top-16 left-4 z-50 w-80 transition-all duration-300 ${showSearchBox ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <div className="bg-black/80 text-white p-4 rounded-lg shadow-lg border border-gray-700 backdrop-blur-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Search Location</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSearchBoxState(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <SearchBox onLocationFound={onLocationFound} onClose={() => setShowSearchBoxState(false)} />

              {/* Add Stats Panel */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium mb-2">Data Status</h3>
                <StatsPanel embedded={true} defaultExpanded={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
)

MapView.displayName = "MapView"

export default MapView

