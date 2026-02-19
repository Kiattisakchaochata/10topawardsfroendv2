// src/seo/jsonld.ts
type StoreCategory =
  | 'restaurant'
  | 'cafe'
  | 'laundromat'
  | 'hair-salon'
  | 'car-wash'

export type StoreForSeo = {
  id: string
  name: string
  slug?: string
  description?: string
  address?: string
  phone?: string | null
  email?: string | null
  website?: string | null
  latitude?: number | null
  longitude?: number | null
  cover_image?: string | null

  // ✅ category_slug ทำให้เป็น optional ได้
  category_slug?: StoreCategory
  // ✅ เพิ่มเพื่อให้เดาจากชื่อ/slug ได้
  category_name?: string | null
  category_raw_slug?: string | null

  social_links?: Record<string, string> | null // { facebook, line, instagram, tiktok }
  avg_rating?: number
  review_count?: number
}

type JsonLdObject = Record<string, unknown>

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function typeFromCategory(
  cat: StoreCategory
):
  | 'Restaurant'
  | 'CafeOrCoffeeShop'
  | 'Laundromat'
  | 'HairSalon'
  | 'AutoWash'
  | 'LocalBusiness' {
  switch (cat) {
    case 'restaurant':
      return 'Restaurant'
    case 'cafe':
      return 'CafeOrCoffeeShop'
    case 'laundromat':
      return 'Laundromat'
    case 'hair-salon':
      return 'HairSalon'
    case 'car-wash':
      return 'AutoWash'
    default:
      return 'LocalBusiness'
  }
}

function normalizeCategorySlug(slug?: string): StoreCategory {
  const s = (slug || '').toLowerCase()
  // ✅ ถ้ามีทั้ง "ร้านอาหาร" และ "คาเฟ่" ให้เลือก cafe ก่อน
  if (
    (s.includes('ร้านอาหาร') || s.includes('อาหาร')) &&
    (s.includes('คาเฟ่') || s.includes('กาแฟ') || s.includes('cafe') || s.includes('coffee'))
  ) {
    return 'cafe'
  }
  // cafe
  if (
    s.includes('คาเฟ่') ||
    s.includes('กาแฟ') ||
    s.includes('cafe') ||
    s.includes('coffee')
  ) {
    return 'cafe'
  }

  // restaurant
  if (
    s.includes('ร้านอาหาร') ||
    s.includes('อาหาร') ||
    s.includes('ภัตตาคาร') ||
    s.includes('บุฟเฟ่') ||
    s.includes('buffet') ||
    s.includes('ปิ้งย่าง') ||
    s.includes('ชาบู') ||
    s.includes('แจ่วฮ้อน')
  ) {
    return 'restaurant'
  }

  // hair salon
  if (s.includes('เสริมสวย') || s.includes('ซาลอน') || s.includes('salon')) {
    return 'hair-salon'
  }

  // car wash
  if (
    s.includes('คาร์แคร์') ||
    s.includes('ล้างรถ') ||
    s.includes('car') ||
    s.includes('wash')
  ) {
    return 'car-wash'
  }

  // laundromat
  if (s.includes('ซัก') || s.includes('laundry') || s.includes('laundromat')) {
    return 'laundromat'
  }

  // ✅ default: ถ้าเดาไม่ออกให้เป็น restaurant (ปลอดภัย + SEO ใกล้เคียง)
  return 'restaurant'
}

/** สร้าง JSON-LD สำหรับร้าน (LocalBusiness subtype) */
export function buildStoreJsonLd(store: StoreForSeo): JsonLdObject {
  const url = `${siteUrl}/store/${store.slug || store.id}`

  const sameAs: string[] = []
  if (store.social_links) {
    for (const v of Object.values(store.social_links)) {
      if (v) sameAs.push(v)
    }
  }

  const hasGeo =
    store.latitude !== null &&
    store.latitude !== undefined &&
    store.longitude !== null &&
    store.longitude !== undefined

  const hasRatings =
    typeof store.review_count === 'number' &&
    store.review_count > 0 &&
    typeof store.avg_rating === 'number'

  // ✅ เลือกหมวดจริง: ถ้ามี category_slug ใช้เลย ไม่งั้นเดาจาก raw_slug/name
  const cat: StoreCategory = store.category_slug
    ? store.category_slug
    : normalizeCategorySlug(store.category_raw_slug || store.category_name || '')

  const data: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': typeFromCategory(cat),
    '@id': `${url}#store`,
    url,
    name: store.name,
    description: store.description || undefined,
    image: store.cover_image || undefined,
    telephone: store.phone || undefined,
    email: store.email || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    aggregateRating: hasRatings
      ? {
          '@type': 'AggregateRating',
          ratingValue: store.avg_rating as number,
          reviewCount: store.review_count as number,
        }
      : undefined,
    address: store.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: store.address, // แบบง่าย; ถ้าต้องละเอียดค่อยแตกฟิลด์เพิ่ม
          addressCountry: 'TH',
        }
      : undefined,
    geo: hasGeo
      ? {
          '@type': 'GeoCoordinates',
          latitude: store.latitude as number,
          longitude: store.longitude as number,
        }
      : undefined,
  }

  return data
}