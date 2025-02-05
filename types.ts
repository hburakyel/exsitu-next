export interface MuseumObject {
  id: string
  title: string
  img_url: string
  longitude: number
  latitude: number
  inventory_number: string
  institution: {
    name: string
    longitude: number
    latitude: number
  }
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface SearchResult {
  name: string
  longitude: number
  latitude: number
}

