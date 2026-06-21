export interface GeocodedAddress {
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  postal_code: string
  country: string
  latitude: number
  longitude: number
}

export function useCurrentLocation() {
  const loading = ref(false)

  const getPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!import.meta.client || !('geolocation' in navigator)) {
        reject(new Error('Location is not supported on this device.'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })

  const messageForError = (err: unknown): string => {
    if (typeof err === 'object' && err && 'code' in err) {
      const code = (err as GeolocationPositionError).code
      if (code === 1) return 'Location permission denied. Enter the address manually.'
      if (code === 2) return 'Could not determine your location. Try again.'
      if (code === 3) return 'Location request timed out. Try again.'
    }
    return err instanceof Error ? err.message : 'Could not get your location.'
  }

  const fetchAddress = async (): Promise<GeocodedAddress> => {
    loading.value = true
    try {
      const pos = await getPosition()
      const { latitude, longitude } = pos.coords
      return await $fetch<GeocodedAddress>('/api/geocode/reverse', {
        query: { lat: latitude, lng: longitude },
      })
    } catch (err) {
      throw new Error(messageForError(err))
    } finally {
      loading.value = false
    }
  }

  return { loading, fetchAddress }
}
