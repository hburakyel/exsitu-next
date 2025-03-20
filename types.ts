export interface ObjectLink {
  id?: number
  link_text: string
  url: string
}

export interface MuseumObject {
  id: string
  attributes: {
    title: string
    img_url?: string
    longitude: number
    latitude: number
    inventory_number: string
    institution_name: string
    institution_longitude: number
    institution_latitude: number
    place_name?: string
    institution_place?: string
    country?: string
    country_en?: string
    country_native?: string
    city_en?: string
    city_native?: string
    institution_city_en?: string
    institution_city_native?: string
    institution_country_en?: string
    object_links?: ObjectLink[]
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

export interface CountryAggregation {
  country: string
  count: number
  latitude: number
  longitude: number
}

export interface CityAggregation {
  city: string
  country: string
  count: number
  latitude: number
  longitude: number
}

