import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { searchLocation } from "../lib/api"

interface SearchBoxProps {
  onLocationFound: (longitude: number, latitude: number) => void
}

export default function SearchBox({ onLocationFound }: SearchBoxProps) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)
    try {
      const result = await searchLocation(query)
      if (result) {
        onLocationFound(result.longitude, result.latitude)
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

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-sm">
      <Input
        type="text"
        placeholder="Search location..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pr-10"
      />
      <Button type="submit" variant="ghost" size="icon" disabled={isSearching} className="absolute right-0 top-0">
        <Search className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </Button>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </form>
  )
}

