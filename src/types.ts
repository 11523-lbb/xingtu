/* ============================================================
   星途实体类型（与 Stage 3 mock 数据结构一一对应）
   ============================================================ */

// —— 基础实体（对应 mock/*.json 原文结构）——

export interface Meta {
  name: string
  version: string
  scope: { primaryCity: string; primaryCelebrity: string }
  disclaimer: string
  generatedAt: string
}

export interface City {
  id: string
  name: string
  nameEn: string
  pinyin: string
  center: { lng: number; lat: number }
  heroImage: string
}

export type CelebrityCategory = 'singer' | 'actor' | 'band'

export interface Celebrity {
  id: string
  name: string
  nameEn: string
  avatar: string
  tagline: string
  bio: string
  category: CelebrityCategory
  fansCount: number
  cities: string[]
  cardImage: string
}

export type LocationType = 'concert' | 'filming' | 'food' | 'brand' | 'fan'

export interface OpeningHours {
  start: string
  end: string
  restDays: number[] // ISO 星期：1=周一 … 7=周日；[]=每日开放
}

export type SourceType = 'public' | 'demo'

export interface LocationEntity {
  id: string
  celebrityId: string
  cityId: string
  name: string
  type: LocationType
  tags: string[]
  story: string
  event: string
  address: string
  lng: number
  lat: number
  openingHours: OpeningHours
  suggestedStayMin: number
  scores: { relevance: number; photo: number }
  checkinCount: number
  sourceType: SourceType
  sourceNote: string
}

export type PostType = 'checkin' | 'guide' | 'route'

export interface CommentEntity {
  id: string
  authorId: string
  content: string
  likes: number
  postedAt: string
}

export interface Post {
  id: string
  type: PostType
  authorId: string
  locationIds: string[]
  routeId: string | null
  title: string
  content: string
  images: string[]
  tags: string[]
  photoTips: string | null
  highlights: string[] | null
  likes: number
  collected: number
  comments: CommentEntity[]
  postedAt: string
}

export type TravelMode = 'walk' | 'metro' | null

export interface RouteStop {
  locationId: string
  arriveAt: string
  leaveAt: string
  stayMin: number
  travelMode: TravelMode
  travelMin: number
  distanceFromPrevKm: number
  note: string
}

export interface RouteEntity {
  id: string
  name: string
  theme: string
  celebrityId: string
  cityId: string
  authorId: string | null
  isAiGenerated: boolean
  stops: RouteStop[]
  totalMin: number
  totalKm: number
  walkingKm: number
  desc: string
  likes: number
  collected: number
  postedAt: string
  planSnapshot: unknown
  adjustments: unknown
}

export interface UserStats {
  wanted: number
  collected: number
  checkedIn: number
  routes: number
  posts: number
}

export interface UserState {
  wantedLocationIds: string[]
  collectedLocationIds: string[]
  checkedInLocationIds: string[]
  collectedPostIds: string[]
  likedPostIds: string[]
  followingIds: string[]
  collectedRouteIds: string[]
}

export interface User {
  id: string
  isCurrent: boolean
  nickname: string
  avatar: string
  bio: string
  cityId: string
  followers: number
  following: number
  likesReceived: number
  stats: UserStats
  state: UserState | null
}

// —— 查询层视图（数据层 join 后的输出，页面只消费视图）——

export interface AuthorView {
  id: string
  nickname: string
  avatar: string
  bio: string
  followers: number
  likesReceived: number
}

export interface LocationRef {
  id: string
  name: string
  type: LocationType
  celebrityId: string
  celebrityName: string
  cityId: string
  cityName: string
}

export interface LocationStats {
  postCount: number
  guideCount: number
  checkinPhotoCount: number
  avgLikes: number
  communityScore: number
  topTags: string[]
  coverImage: string
}

export interface LocationView extends LocationEntity {
  celebrity: { id: string; name: string; avatar: string }
  cityName: string
  stats: LocationStats
}

export interface RouteStopView {
  location: LocationRef
  arriveAt: string
  leaveAt: string
  stayMin: number
  travelMode: TravelMode
  travelMin: number
  distanceFromPrevKm: number
  note: string
}

export interface RouteView {
  id: string
  name: string
  theme: string
  celebrityId: string
  celebrityName: string
  cityId: string
  cityName: string
  author: AuthorView | null
  isAiGenerated: boolean
  stops: RouteStopView[]
  totalMin: number
  totalKm: number
  walkingKm: number
  desc: string
  likes: number
  collected: number
  postedAt: string
}

export interface PostView {
  id: string
  type: PostType
  author: AuthorView
  locationIds: string[]
  locations: LocationRef[]
  routeId: string | null
  route: RouteView | null
  title: string
  content: string
  images: string[]
  tags: string[]
  photoTips: string | null
  highlights: string[]
  likes: number
  collected: number
  comments: CommentEntity[]
  postedAt: string
}

export interface CelebrityCityStats {
  cityId: string
  cityName: string
  locationCount: number
  postCount: number
  totalCheckins: number
}

export interface CelebritySummary {
  id: string
  name: string
  avatar: string
  tagline: string
  category: CelebrityCategory
  fansCount: number
  cardImage: string
  cityStats: CelebrityCityStats[]
  totalLocationCount: number
  totalPostCount: number
}

export interface CitySearchResult {
  id: string
  name: string
  locationCount: number
}

export interface SearchResults {
  celebrities: CelebritySummary[]
  cities: CitySearchResult[]
  locations: LocationView[]
  posts: PostView[]
}
