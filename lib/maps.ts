/**
 * Google Maps Integration
 * 
 * Provides geocoding, distance calculation, and location services
 */

import { Client } from '@googlemaps/google-maps-services-js'

const client = new Client({})

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('GOOGLE_MAPS_API_KEY not configured. Maps features will be limited.')
}

/**
 * Geocode an address to latitude/longitude
 */
export async function geocodeAddress(address: string): Promise<{
  latitude: number | null
  longitude: number | null
  formattedAddress: string | null
  placeId?: string
}> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
        language: 'en',
      },
      timeout: 5000,
    })

    if (response.data.status === 'ZERO_RESULTS') {
      return {
        latitude: null,
        longitude: null,
        formattedAddress: null,
      }
    }

    const result = response.data.results[0]
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    throw new Error('Failed to geocode address')
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: GOOGLE_MAPS_API_KEY,
        language: 'en',
      },
      timeout: 5000,
    })

    if (response.data.status === 'ZERO_RESULTS') {
      return null
    }

    return response.data.results[0]?.formatted_address || null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Calculate distance and duration between two points
 */
export async function calculateDistance(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): Promise<{
  distanceMeters: number
  distanceText: string
  durationSeconds: number
  durationText: string
} | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  try {
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.latitude},${origin.longitude}`],
        destinations: [`${destination.latitude},${destination.longitude}`],
        key: GOOGLE_MAPS_API_KEY,
        mode,
        units: 'metric',
      },
      timeout: 5000,
    })

    if (response.data.status !== 'OK' || response.data.rows[0]?.elements[0]?.status !== 'OK') {
      return null
    }

    const element = response.data.rows[0].elements[0]
    return {
      distanceMeters: element.distance.value,
      distanceText: element.distance.text,
      durationSeconds: element.duration.value,
      durationText: element.duration.text,
    }
  } catch (error) {
    console.error('Distance calculation error:', error)
    return null
  }
}

/**
 * Find nearby places (sports facilities, parks, etc.)
 */
export async function findNearbyPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  type: string = 'park'
): Promise<
  Array<{
    name: string
    address: string
    latitude: number
    longitude: number
    placeId: string
    rating?: number
  }>
> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  try {
    const response = await client.placesNearby({
      params: {
        location: { lat: latitude, lng: longitude },
        radius,
        type: type as any,
        key: GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    })

    if (response.data.status !== 'OK') {
      return []
    }

    return response.data.results.map((place) => ({
      name: place.name,
      address: place.vicinity,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      placeId: place.place_id,
      rating: place.rating,
    }))
  } catch (error) {
    console.error('Places search error:', error)
    return []
  }
}

/**
 * Get static map image URL
 */
export function getStaticMapUrl(
  latitude: number,
  longitude: number,
  zoom: number = 15,
  size: string = '400x300'
): string {
  if (!GOOGLE_MAPS_API_KEY) {
    return ''
  }

  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: zoom.toString(),
    size,
    key: GOOGLE_MAPS_API_KEY,
    markers: `color:red|${latitude},${longitude}`,
    scale: '2',
  })

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * (Fallback when API is not available)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  findNearbyPlaces,
  getStaticMapUrl,
  calculateHaversineDistance,
}
