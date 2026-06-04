import { fetch } from 'bun'
import { env } from '../../config/env'

const API_KEY = env.GOOGLE_MAPS_API_KEY

export type TravelMode = 'DRIVE' | 'TRANSIT'

export interface ComputeRouteParams {
  origin: {
    lat: number
    lng: number
  }
  destination: {
    lat: number
    lng: number
  }
  travelMode: TravelMode
  departureTime?: string
  arrivalTime?: string
}

export interface ComputeRouteResponse {
  routes: Array<{
    distanceMeters: number
    duration: string
    polyline: {
      encodedPolyline: string
    }
  }>
}

export async function computeRoute(params: ComputeRouteParams) {
  const { origin, destination, travelMode, departureTime, arrivalTime } = params

  if (departureTime && arrivalTime) {
    throw new Error('Use departureTime or arrivalTime, not both')
  }

  const url = new URL(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
  )

  const body = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      },
    },
    travelMode,
    ...(travelMode === 'DRIVE'
      ? { routingPreference: 'TRAFFIC_AWARE_OPTIMAL' }
      : {}),
    ...(departureTime ? { departureTime } : {}),
    ...(arrivalTime ? { arrivalTime } : {}),
  }

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to compute route')
  }

  const data = (await response.json()) as ComputeRouteResponse

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No routes found')
  }

  return data
}
