interface NominatimAddress {
  house_number?: string
  road?: string
  neighbourhood?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  region?: string
  postcode?: string
  country?: string
}

interface NominatimResponse {
  address?: NominatimAddress
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const lat = Number(q.lat)
  const lng = Number(q.lng)

  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < -90 || lat > 90 || lng < -180 || lng > 180
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid coordinates' })
  }

  // --- Provider: Nominatim (swap this block for Google if needed, see note below) ---
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?format=jsonv2&addressdetails=1&zoom=18&accept-language=en` +
    `&lat=${lat}&lon=${lng}`

  let res: NominatimResponse
  try {
    res = await $fetch<NominatimResponse>(url, {
      // Nominatim usage policy requires a real, identifying User-Agent.
      headers: { 'User-Agent': 'BuyPets.om/1.0 (orix.blackhorse@gmail.com)' },
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Reverse geocoding failed' })
  }

  const a = res.address ?? {}

  const line1 = [a.house_number, a.road].filter(Boolean).join(' ').trim()
  const fallbackLine1 = a.neighbourhood || a.suburb || ''
  const city = a.city || a.town || a.village || a.municipality || a.county || ''
  const line2 = a.suburb && line1 ? a.suburb : (line1 ? a.neighbourhood || '' : '')

  return {
    address_line_1: line1 || fallbackLine1,
    address_line_2: line2 || '',
    city,
    state: a.state || a.region || '',
    postal_code: a.postcode || '',
    country: a.country || 'Oman',
    latitude: lat,
    longitude: lng,
  }
})
