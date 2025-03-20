"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Search, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

// Types for our statistics data based on the actual API schema
interface ApiItem {
  country_en: string | null
  city_en: string | null
  institution_name: string
  total_objects: string
}

interface CountryStats {
  country_en: string
  total_objects: number
}

interface CityStats {
  city_en: string
  total_objects: number
}

interface InstitutionStats {
  institution_name: string
  total_objects: number
}

interface StatsData {
  total_count: number
  countries: CountryStats[]
  cities: CityStats[]
  institutions: InstitutionStats[]
}

// Update the interface to include the embedded prop
interface StatsPanelProps {
  embedded?: boolean
  defaultExpanded?: boolean
}

// Update the component definition to accept the embedded prop
export default function StatsPanel(props: StatsPanelProps) {
  const { embedded = false, defaultExpanded } = props
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(props.defaultExpanded ? "all" : null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Add search state

  // Focus search input when component mounts

  // Process API data to group by country, city, and institution
  const processApiData = (data: ApiItem[]): StatsData => {
    // Calculate total count
    const totalCount = data.reduce((sum, item) => sum + Number.parseInt(item.total_objects || "0"), 0)

    // Group by country
    const countryMap = new Map<string, number>()
    data.forEach((item) => {
      if (item.country_en) {
        const country = item.country_en
        const count = Number.parseInt(item.total_objects || "0")
        countryMap.set(country, (countryMap.get(country) || 0) + count)
      }
    })

    // Group by city
    const cityMap = new Map<string, number>()
    data.forEach((item) => {
      if (item.city_en) {
        const city = item.city_en
        const count = Number.parseInt(item.total_objects || "0")
        cityMap.set(city, (cityMap.get(city) || 0) + count)
      }
    })

    // Group by institution
    const institutionMap = new Map<string, number>()
    data.forEach((item) => {
      const institution = item.institution_name
      const count = Number.parseInt(item.total_objects || "0")
      institutionMap.set(institution, (institutionMap.get(institution) || 0) + count)
    })

    // Convert maps to arrays and sort by total_objects descending
    const countries = Array.from(countryMap.entries())
      .map(([country_en, total_objects]) => ({ country_en, total_objects }))
      .sort((a, b) => b.total_objects - a.total_objects)

    const cities = Array.from(cityMap.entries())
      .map(([city_en, total_objects]) => ({ city_en, total_objects }))
      .sort((a, b) => b.total_objects - a.total_objects)

    const institutions = Array.from(institutionMap.entries())
      .map(([institution_name, total_objects]) => ({ institution_name, total_objects }))
      .sort((a, b) => b.total_objects - a.total_objects)

    return {
      total_count: totalCount,
      countries,
      cities,
      institutions,
    }
  }

  const fetchStats = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    setError(null)

    try {
      const apiUrl = "https://www.exsitu.site/api/stats"
      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data: ApiItem[] = await response.json()

      // Process the API data to match our expected structure
      const processedData = processApiData(data)
      setStats(processedData)
    } catch (err) {
      console.error("Error fetching stats:", err)
      setError(err instanceof Error ? err.message : "Failed to load statistics")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // Set up periodic refresh every 5 minutes
    const refreshInterval = setInterval(
      () => {
        fetchStats(false)
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(refreshInterval)
  }, [])

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null)
    } else {
      setExpandedSection(section)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Spinner className="h-4 w-4 mr-2" />
        <span className="text-xs text-gray-500">Loading statistics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-2 text-red-500 text-xs">
        Error: {error}
        <Button variant="ghost" size="sm" onClick={() => fetchStats()} className="ml-2 h-6 w-6 p-0">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  // Filter data based on search term
  const countries = stats.countries
  const cities = stats.cities
  const institutions = stats.institutions

  // If search term is not empty, expand all sections
  const effectiveExpandedSection = expandedSection

  return (
    <div className={`text-xs space-y-2 z-50 ${embedded ? "" : "mt-2 w-[220px] max-w-[220px]"}`}>
      {/* Add search input */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Search className="h-3 w-3 mr-1" />
            <span>Statistics</span>
            {isRefreshing && <Spinner className="h-3 w-3 ml-2" />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchStats(false)}
            className="h-6 w-6 p-0"
            disabled={isRefreshing}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="text-xs space-y-1">
        <div>
          <span>Total links: {stats.total_count.toLocaleString()}</span>
        </div>
        <div>
          <span>Total countries: {stats.countries.length.toLocaleString()}</span>
        </div>
        <div>
          <span>Total arcs: {stats.cities.length.toLocaleString()}</span>
        </div>
        <div>
          <span>Total collections: {stats.institutions.length.toLocaleString()}</span>
        </div>
        {isRefreshing && embedded && <Spinner className="h-3 w-3 ml-2 inline" />}
        {embedded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchStats(false)}
            className="h-6 w-6 p-0 ml-2 inline-flex"
            disabled={isRefreshing}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="border-t border-gray-700 my-2"></div>

      {/* Countries */}
      <div className="w-full">
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-gray-700 p-1 rounded w-full"
          onClick={() => toggleSection("countries")}
        >
          <span className="text-xs">Countries ({countries.length})</span>
          {effectiveExpandedSection === "countries" || effectiveExpandedSection === "all" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </div>

        {(effectiveExpandedSection === "countries" || effectiveExpandedSection === "all") && (
          <div className={`pl-2 mt-1 space-y-1 max-h-48 overflow-auto pr-1 w-full ${embedded ? "max-h-36" : ""}`}>
            {countries.length > 0 ? (
              countries.map((country, index) => (
                <div key={index} className="flex justify-between">
                  <span className="truncate max-w-[70%]">{country.country_en}</span>
                  <span className="ml-2 flex-shrink-0">{country.total_objects.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No matching countries</div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 my-2"></div>

      {/* Cities */}
      <div className="w-full">
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-gray-700 p-1 rounded w-full"
          onClick={() => toggleSection("cities")}
        >
          <span>Cities ({cities.length})</span>
          {effectiveExpandedSection === "cities" || effectiveExpandedSection === "all" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </div>

        {(effectiveExpandedSection === "cities" || effectiveExpandedSection === "all") && (
          <div className={`pl-2 mt-1 space-y-1 max-h-48 overflow-auto pr-1 w-full ${embedded ? "max-h-36" : ""}`}>
            {cities.length > 0 ? (
              cities.map((city, index) => (
                <div key={index} className="flex justify-between">
                  <span className="truncate max-w-[70%]">{city.city_en}</span>
                  <span className="ml-2 flex-shrink-0">{city.total_objects.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No matching cities</div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 my-2"></div>

      {/* Institutions */}
      <div className="w-full">
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-gray-700 p-1 rounded w-full"
          onClick={() => toggleSection("institutions")}
        >
          <span>Collections ({institutions.length})</span>
          {effectiveExpandedSection === "institutions" || effectiveExpandedSection === "all" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </div>

        {(effectiveExpandedSection === "institutions" || effectiveExpandedSection === "all") && (
          <div className={`pl-2 mt-1 space-y-1 max-h-48 overflow-auto pr-1 w-full ${embedded ? "max-h-36" : ""}`}>
            {institutions.length > 0 ? (
              institutions.map((institution, index) => (
                <div key={index} className="flex justify-between">
                  <span className="truncate max-w-[70%]">{institution.institution_name}</span>
                  <span className="ml-2 flex-shrink-0">{institution.total_objects.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No matching collections</div>
            )}
          </div>
        )}
      </div>

      <div className="text-right text-gray-500 text-[10px]">Updated: {new Date().toLocaleTimeString()}</div>
    </div>
  )
}

