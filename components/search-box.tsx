"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { searchLocation } from "../lib/api"

interface SearchBoxProps {
  onLocationFound: (longitude: number, latitude: number, name: string) => void
  onClose?: () => void
}

export default function SearchBox({ onLocationFound, onClose }: SearchBoxProps) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }

    // Load recent searches from localStorage
    try {
      const saved = localStorage.getItem("recentSearches")
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    } catch (e) {
      console.error("Failed to load recent searches", e)
    }
  }, [])

  const saveRecentSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return

    try {
      const updatedSearches = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 5)

      setRecentSearches(updatedSearches)
      localStorage.setItem("recentSearches", JSON.stringify(updatedSearches))
    } catch (e) {
      console.error("Failed to save recent search", e)
    }
  }

  // Update the handleSearch function to properly handle search results:

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    // Prevent duplicate searches
    if (isSearching) return

    setIsSearching(true)
    setError(null)
    try {
      const result = await searchLocation(query)
      if (result) {
        console.log("Search result:", result)
        saveRecentSearch(query)
        onLocationFound(result.longitude, result.latitude, result.name)
        setQuery("") // Clear the input after successful search
        if (onClose) onClose() // Always close the search box after successful search
      } else {
        setError("Location not found. Please try a different search.")
      }
    } catch (error) {
      console.error("Error searching location:", error)
      setError("An error occurred while searching. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  // Also update the handleRecentSearchClick function:

  const handleRecentSearchClick = async (searchTerm: string) => {
    if (isSearching) return

    setIsSearching(true)
    setError(null)
    setQuery(searchTerm)

    try {
      const result = await searchLocation(searchTerm)
      if (result) {
        console.log("Recent search result:", result)
        saveRecentSearch(searchTerm)
        onLocationFound(result.longitude, result.latitude, result.name)
        setQuery("") // Clear the input after successful search
        if (onClose) onClose() // Always close the search box after successful search
      } else {
        setError("Location not found. Please try a different search.")
      }
    } catch (error) {
      console.error("Error searching location:", error)
      setError("An error occurred while searching. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setQuery("")
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="space-y-2 bg-white">
      <form id="search-form" onSubmit={handleSearch} className="relative w-full">
        <Input
          ref={inputRef}
          type="text"
          placeholder=""
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(null)
          }}
          className="pr-16 text-sm"
        />
        {query && (
          <Button type="button" variant="ghost" size="icon" className="absolute right-8 top-0" onClick={clearSearch}>
            <X className="h-4 w-4" />
            <span className="sr-only">Clear</span>
          </Button>
        )}
        <Button type="submit" variant="ghost" size="icon" disabled={isSearching} className="absolute right-0 top-0">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="sr-only">Search</span>
        </Button>
      </form>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {recentSearches.length > 0 && !query && (
        <div className="mt-2 bg-white">
          <h4 className="text-xs text-gray-500 mb-1">Recent Searches</h4>
          <div className="flex flex-wrap gap-1">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleRecentSearchClick(search)}
                className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded px-2 py-1 truncate max-w-full"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
