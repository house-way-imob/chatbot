import { fetch } from 'bun'
import { env } from '../../config/env'

const API_KEY = env.GOOGLE_MAPS_API_KEY

export interface GeocodeResponse {
  status: string
  error_message?: string
  results: Array<{
    formatted_address: string
    place_id: string
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
  }>
}

export async function geocodeAddress(address: string) {
  if (!address) {
    throw new Error('Address is required')
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', API_KEY)
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('region', 'br')

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to geocode address: HTTP ${response.status}`)
  }

  const data = (await response.json()) as GeocodeResponse

  if (data.status === 'ZERO_RESULTS') {
    return null
  }

  if (data.status !== 'OK') {
    throw new Error(
      data.error_message ?? `Failed to geocode address: ${data.status}`,
    )
  }

  if (!data.results || data.results.length === 0) {
    return null
  }

  const result = data.results[0]

  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
  }
}
