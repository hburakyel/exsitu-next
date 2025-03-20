"use client"

import { useState, useRef, useEffect } from "react"
import { Maximize2, Minimize2, X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import ObjectGrid from "./object-grid"
import ObjectList from "./object-list"
import type { MuseumObject } from "../types"
import ImageGallery from "./image-gallery"
import StatsPanel from "./stats-panel"
import SearchBox from "./search-box"
import ArcInfoPanel from "./arc-info-panel"

export type ContainerSize = "default" | "expanded" | "minimal"

interface ResizableObjectContainerProps {
  objects: MuseumObject[]
  onLoadMore: () => void
  hasMore: boolean
  totalCount: number
  arcCount?: number
  isLoading: boolean
  onObjectClick: (longitude: number, latitude: number) => void
  onLocationFound: (longitude: number, latitude: string, name: string) => void
  locationName: string
  onClose: () => void
  isMobile?: boolean
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
  containerSize: ContainerSize
  setContainerSize: (size: ContainerSize) => void
  showSearchBox: boolean
  setShowSearchBox: (show: boolean) => void
}

export default function ResizableObjectContainer({
  objects,
  onLoadMore,
  hasMore,
  totalCount,
  arcCount = 0,
  isLoading,
  onObjectClick,
  onLocationFound,
  locationName,
  onClose,
  isMobile = false,
  viewMode,
  setViewMode,
  containerSize,
  setContainerSize,
  showSearchBox,
  setShowSearchBox,
}: ResizableObjectContainerProps) {
  const [searchVisible, setSearchVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showDataStatus, setShowDataStatus] = useState(false)

  // Close panels when changing container size
  useEffect(() => {
    setShowDataStatus(false)
  }, [containerSize])

  // Add this useEffect to clean up any stray panels when component unmounts
  useEffect(() => {
    return () => {
      setShowDataStatus(false)
    }
  }, [])

  // Update the getContainerStyle function to improve mobile layout
  const getContainerStyle = () => {
    if (isMobile) {
      switch (containerSize) {
        case "expanded":
          return {
            width: "100%",
            height: "100%",
            inset: 0,
            borderRadius: 0, // Remove border radius on mobile full screen
          }
        case "minimal":
          return {
            width: "auto", // Auto width to fit content
            height: "auto", // Auto height to fit content
            top: "4rem", // Position at the top with some margin
            right: "1rem", // Reduced right margin for mobile
            padding: "2px", // No padding
            opacity: 1, // Always visible
            pointerEvents: "auto", // Always interactive
            visibility: "visible" as const,
            overflow: "hidden",
          }
        case "default":
        default:
          return {
            width: "100%",
            height: "50%", // Increased from 40% to 50% for better visibility
            bottom: 0,
            left: 0,
            right: 0,
            top: "auto", // Position at bottom
            borderTopLeftRadius: "12px", // Rounded corners only at top
            borderTopRightRadius: "12px",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }
      }
    } else {
      // Desktop dimensions
      switch (containerSize) {
        case "expanded":
          return {
            width: "calc(100% - 2rem)",
            height: "calc(100vh - 2rem)",
          }
        case "minimal":
          return {
            width: "auto", // Auto width to fit content
            height: "40px", // Fixed height just for the button
            right: "1rem", // Match the right position of other modes
            top: "1rem", // Match the top position of other modes
            padding: "0", // No padding
            opacity: 1, // Always visible
            pointerEvents: "auto", // Always interactive
            visibility: "visible" as const,
            overflow: "hidden",
          }
        case "default":
        default:
          return {
            width: "40%",
            height: "auto", // Changed from calc(100vh - 2rem) to auto
          }
      }
    }
  }

  // Toggle between sizes
  const toggleSize = () => {
    setContainerSize(containerSize === "default" ? "expanded" : containerSize === "expanded" ? "minimal" : "default")
  }

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(viewMode === "grid" ? "list" : "grid")
  }

  // Handle object click to open gallery
  const handleObjectClick = (longitude: number, latitude: number, index: number) => {
    onObjectClick(longitude, latitude)
    setSelectedIndex(index)

    // Only open gallery if we have objects with images
    if (objects && objects.length > 0) {
      setGalleryOpen(true)
    }
  }

  // Toggle data status panel
  const toggleDataStatus = () => {
    setShowDataStatus(!showDataStatus)
  }

  // Function to download objects as CSV
  const downloadObjectsAsCSV = () => {
    // Create CSV header
    const headers = [
      "ID",
      "Title",
      "Inventory Number",
      "From Place",
      "From City",
      "From Country",
      "To Institution",
      "To Place",
      "To City",
      "To Country",
      "Longitude",
      "Latitude",
      "Institution Longitude",
      "Institution Latitude",
    ].join(",")

    // Convert objects to CSV rows
    const csvRows = objects.map((obj) => {
      const attrs = obj.attributes
      return [
        obj.id,
        `"${(attrs.title || "").replace(/"/g, '""')}"`,
        `"${(attrs.inventory_number || "").replace(/"/g, '""')}"`,
        `"${(attrs.place_name || "").replace(/"/g, '""')}"`,
        `"${(attrs.city_en || "").replace(/"/g, '""')}"`,
        `"${(attrs.country_en || "").replace(/"/g, '""')}"`,
        `"${(attrs.institution_name || "").replace(/"/g, '""')}"`,
        `"${(attrs.institution_place || "").replace(/"/g, '""')}"`,
        `"${(attrs.institution_city_en || "").replace(/"/g, '""')}"`,
        `"${(attrs.institution_country_en || "").replace(/"/g, '""')}"`,
        attrs.longitude || "",
        attrs.latitude || "",
        attrs.institution_longitude || "",
        attrs.institution_latitude || "",
      ].join(",")
    })

    // Combine header and rows
    const csvContent = [headers, ...csvRows].join("\n")

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `ex-situ-objects-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const containerStyle = getContainerStyle()

  // Update the main container className to improve mobile styling
  return (
    <div
      ref={containerRef}
      className={`fixed ${
        isMobile
          ? containerSize === "default"
            ? "bottom-0 left-0 right-0 shadow-lg"
            : containerSize === "expanded"
              ? "inset-0"
              : "top-4 right-4"
          : "top-4 right-4 bottom-4"
      } bg-black/80 text-white rounded-lg shadow-lg backdrop-blur-md border border-gray-700 z-20 overflow-hidden`}
      style={containerStyle}
    >
      <div className={`${containerSize === "minimal" ? "flex flex-col" : "h-full flex flex-col"}`}>
        {/* Fixed header with expand button - make it more touch-friendly on mobile */}
        {containerSize !== "minimal" && (
          <div className="sticky top-0 z-30 p-3 border-b border-gray-700 flex items-center justify-between bg-black/80 text-white backdrop-blur-md">
            <div className="text-sm truncate">
              <span className="text-gray-400">
                {totalCount} item{totalCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Download button - show on both mobile and desktop */}
              <Button
                variant="ghost"
                size="icon"
                className={isMobile ? "h-8 w-8" : "h-6 w-6"}
                onClick={downloadObjectsAsCSV}
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Expand/minimize button */}
              <Button variant="ghost" size="icon" className={isMobile ? "h-8 w-8" : "h-6 w-6"} onClick={toggleSize}>
                {containerSize === "expanded" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Arc Info Panel - Only show when not in minimal mode */}
        {containerSize !== "minimal" && (
          <ArcInfoPanel objects={objects} viewMode={viewMode} onToggleViewMode={toggleViewMode} />
        )}

        {/* Search Box Panel - Show when search box is visible and NOT in minimal mode */}
        {showSearchBox && containerSize !== "minimal" && (
          <div className="p-3 border-b border-gray-700 bg-black/80 text-white backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Search Location</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSearchBox(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <SearchBox onLocationFound={onLocationFound} onClose={() => setShowSearchBox(false)} />

            {/* Include Stats Panel directly in search box */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium mb-2">Data Status</h3>
              <StatsPanel embedded={true} defaultExpanded={true} />
            </div>
          </div>
        )}

        {containerSize === "minimal" ? (
          <div className="p-2 flex items-center justify-end gap-2">
            {/* Download button - same styling as other modes */}
            <Button
              variant="ghost"
              size="icon"
              className={isMobile ? "h-8 w-8" : "h-6 w-6"}
              onClick={downloadObjectsAsCSV}
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Expand button - same styling as other modes */}
            <Button
              variant="ghost"
              size="icon"
              className={isMobile ? "h-8 w-8" : "h-6 w-6"}
              onClick={() => setContainerSize("default")}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-black/80 backdrop-blur-md">
            {viewMode === "grid" ? (
              <ObjectGrid
                objects={objects}
                onLoadMore={onLoadMore}
                hasMore={hasMore}
                totalCount={totalCount}
                isLoading={isLoading}
                onObjectClick={(longitude, latitude, index) => handleObjectClick(longitude, latitude, index)}
                isFullscreen={containerSize === "expanded"}
                panelSize={containerSize === "expanded" ? 100 : 40}
                mobileColumns={3}
              />
            ) : (
              <ObjectList
                objects={objects}
                onLoadMore={onLoadMore}
                hasMore={hasMore}
                totalCount={totalCount}
                isLoading={isLoading}
                onObjectClick={(longitude, latitude, index) => handleObjectClick(longitude, latitude, index)}
              />
            )}
          </div>
        )}
      </div>

      {/* Image Gallery - positioned and sized based on device and container size */}
      {galleryOpen && (
        <ImageGallery
          objects={objects}
          initialIndex={selectedIndex}
          onClose={() => setGalleryOpen(false)}
          isFullscreen={containerSize === "expanded"}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}

