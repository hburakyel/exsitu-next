interface MapBounds {
  north: number
  east: number
  south: number
  west: number
}

export async function fetchMuseumObjects(bounds: MapBounds, page = 1, pageSize = 50) {
  const params = new URLSearchParams({
    [`filters[latitude][$gte]`]: bounds.south.toString(),
    [`filters[latitude][$lte]`]: bounds.north.toString(),
    [`filters[longitude][$gte]`]: bounds.west.toString(),
    [`filters[longitude][$lte]`]: bounds.east.toString(),
    "pagination[pageSize]": pageSize.toString(),
    "pagination[page]": page.toString(),
    populate: "*",
  })

  try {
    const url = `https://www.exsitu.site/api/museum-objects?${params}`
    console.log("Fetching from URL:", url) // Log the URL being fetched

    const response = await fetch(url)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }
    const data = await response.json()
    console.log("Received data:", data) // Log the received data
    return data
  } catch (error) {
    console.error("Error fetching museum objects:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch museum objects: ${error.message}`)
    } else {
      throw new Error("An unknown error occurred while fetching museum objects")
    }
  }
}

interface SearchResult {
  name: string
  longitude: number
  latitude: number
}

export async function searchLocation(query: string): Promise<SearchResult | null> {
  const params = new URLSearchParams({
    access_token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
    limit: "1",
    types: "place",
    query,
  })

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].center
      return {
        name: data.features[0].place_name,
        longitude: lng,
        latitude: lat,
      }
    }

    return null
  } catch (error) {
    console.error("Error searching location:", error)
    throw error
  }
}

