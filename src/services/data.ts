/* ============================================================
   星途数据访问层
   - 页面/组件只通过本层获取数据，不直接依赖 mock JSON 结构
   - 全部查询接口为异步签名：未来替换为真实后端 API 时只改本层
   - 派生指标（帖子数/攻略数/社区热度/封面图）统一在此计算，
     单一事实来源，不在页面里重复统计
   ============================================================ */
import type {
  Celebrity,
  CelebritySummary,
  City,
  CitySearchResult,
  LocationEntity,
  LocationRef,
  LocationStats,
  LocationView,
  Post,
  PostType,
  PostView,
  RouteEntity,
  RouteStopView,
  RouteView,
  SearchResults,
  User,
  UserState,
} from '@/types'
import type { AuthorView } from '@/types'
import { LOCATION_TYPE_LABELS } from '@/utils/format'
import { useLocalPostsStore } from '@/store/localPostsStore'
import type { LocalPost } from '@/store/localPostsStore'
import citiesData from '../../mock/cities.json'
import celebritiesData from '../../mock/celebrities.json'
import usersData from '../../mock/users.json'
import locationsData from '../../mock/locations.json'
import routesData from '../../mock/routes.json'
import postsData from '../../mock/posts.json'

// —— 原始数据（类型经 unknown 收敛，与 Stage 3 结构一致）——
const cities = citiesData as unknown as City[]
const celebrities = celebritiesData as unknown as Celebrity[]
const users = usersData as unknown as User[]
const locations = locationsData as unknown as LocationEntity[]
const routes = routesData as unknown as RouteEntity[]
const posts = postsData as unknown as Post[]

// —— 索引 ——
const cityMap = new Map(cities.map((c) => [c.id, c]))
const celebMap = new Map(celebrities.map((c) => [c.id, c]))
const userMap = new Map(users.map((u) => [u.id, u]))
const locMap = new Map(locations.map((l) => [l.id, l]))
const routeMap = new Map(routes.map((r) => [r.id, r]))

/** 模拟网络延迟：让骨架屏/加载态真实可见，接入真实 API 后移除 */
const LATENCY = 180
const delay = <T,>(v: T): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(v), LATENCY))
const clone = <T,>(v: T): T => structuredClone(v)

// ============ 同步种子（仅用于 Store 初始化与轻量渲染，不走延迟） ============

const currentUser = users.find((u) => u.isCurrent)

export const currentUserProfile = {
  id: currentUser?.id ?? 'user_001',
  nickname: currentUser?.nickname ?? '星野',
  avatar: currentUser?.avatar ?? '',
}

const EMPTY_STATE: UserState = {
  wantedLocationIds: [],
  collectedLocationIds: [],
  checkedInLocationIds: [],
  collectedPostIds: [],
  likedPostIds: [],
  followingIds: [],
  collectedRouteIds: [],
}

export const currentUserStateSeed: UserState = currentUser?.state ?? EMPTY_STATE

/** 用户公开信息（评论渲染等轻量场景） */
export function getUserPublic(id: string): { id: string; nickname: string; avatar: string } | null {
  const u = userMap.get(id)
  return u ? { id: u.id, nickname: u.nickname, avatar: u.avatar } : null
}

export function getLocationRefSync(id: string): LocationRef | null {
  const l = locMap.get(id)
  return l ? buildLocationRef(l) : null
}

export function getCelebritySync(id: string): { id: string; name: string; avatar: string } | null {
  const c = celebMap.get(id)
  return c ? { id: c.id, name: c.name, avatar: c.avatar } : null
}

export function getCitySync(id: string): { id: string; name: string } | null {
  const c = cityMap.get(id)
  return c ? { id: c.id, name: c.name } : null
}

/* ============ Agent 引擎同步数据访问（services/agent 专用） ============
   引擎工具为纯同步函数，直接读取本层聚合的原始实体；
   返回引用不拷贝（引擎只读），未来接真实 API 时替换为本层异步实现 */

export function getAgentCitiesSync(): City[] {
  return cities
}

export function getAgentCelebritiesSync(): Celebrity[] {
  return celebrities
}

export function getAgentLocationsSync(): LocationEntity[] {
  return locations
}

export function getAgentPostsSync(): Post[] {
  return posts
}

export function getAgentRoutesSync(): RouteEntity[] {
  return routes
}

export function getLocationEntitySync(id: string): LocationEntity | null {
  return locMap.get(id) ?? null
}

export function getPostEntitySync(id: string): Post | null {
  return posts.find((p) => p.id === id) ?? null
}

export function getRouteEntitySync(id: string): RouteEntity | null {
  return routeMap.get(id) ?? null
}

export function getUserNicknameSync(id: string): string | null {
  return userMap.get(id)?.nickname ?? null
}

// ============ 本地发布内容合并（社区回流） ============

/** 帖子全集：mock 数据 + 用户本地发布的打卡内容（数据层统一出口） */
type AnyPost = Post | LocalPost

function isLocalPost(p: AnyPost): p is LocalPost {
  return 'author' in p
}

function allPosts(): AnyPost[] {
  const local = useLocalPostsStore.getState().publishedPosts
  return [...local, ...posts]
}

// ============ 视图构建 ============

function buildLocationRef(l: LocationEntity): LocationRef {
  return {
    id: l.id,
    name: l.name,
    type: l.type,
    celebrityId: l.celebrityId,
    celebrityName: celebMap.get(l.celebrityId)?.name ?? '',
    cityId: l.cityId,
    cityName: cityMap.get(l.cityId)?.name ?? '',
  }
}

function buildAuthorView(u: User): AuthorView {
  return {
    id: u.id,
    nickname: u.nickname,
    avatar: u.avatar,
    bio: u.bio,
    followers: u.followers,
    likesReceived: u.likesReceived,
  }
}

/** 地点的帖子集合（内部用，含本地发布内容） */
function postsOfLocation(locationId: string): AnyPost[] {
  return allPosts().filter((p) => p.locationIds.includes(locationId))
}

/** 派生统计：帖子数 / 攻略数 / 照片数 / 社区热度 / 热词 / 封面图 */
function buildLocationStats(locationId: string): LocationStats {
  const list = postsOfLocation(locationId)
  const postCount = list.length
  const guideCount = list.filter((p) => p.type === 'guide').length
  const checkinPhotoCount = list.filter((p) => p.type === 'checkin').length
  const avgLikes = postCount ? list.reduce((s, p) => s + p.likes, 0) / postCount : 0

  const latest = list.reduce((max, p) => Math.max(max, new Date(p.postedAt).getTime()), 0)
  const daysSinceLatest = Math.max(0, (Date.now() - latest) / 86400000)
  const freshness = Math.max(0, 1 - daysSinceLatest / 60)

  const communityScore = Math.min(
    100,
    Math.round(
      18 * Math.log10(1 + postCount) + 30 * Math.log10(1 + avgLikes / 50) + 15 * freshness,
    ),
  )

  const tagCount = new Map<string, number>()
  list.forEach((p) => p.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1)))
  const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)

  const topPost = [...list].sort((a, b) => b.likes - a.likes)[0]
  const coverImage = topPost?.images[0] ?? ''

  return { postCount, guideCount, checkinPhotoCount, avgLikes: Math.round(avgLikes), communityScore, topTags, coverImage }
}

function buildLocationView(l: LocationEntity): LocationView {
  const celeb = celebMap.get(l.celebrityId)
  return {
    ...clone(l),
    celebrity: { id: l.celebrityId, name: celeb?.name ?? '', avatar: celeb?.avatar ?? '' },
    cityName: cityMap.get(l.cityId)?.name ?? '',
    stats: buildLocationStats(l.id),
  }
}

function buildRouteView(r: RouteEntity): RouteView {
  const stops: RouteStopView[] = r.stops.map((s) => {
    const loc = locMap.get(s.locationId)
    return {
      location: loc ? buildLocationRef(loc) : { id: s.locationId, name: '未知地点', type: 'fan', celebrityId: '', celebrityName: '', cityId: '', cityName: '' },
      arriveAt: s.arriveAt,
      leaveAt: s.leaveAt,
      stayMin: s.stayMin,
      travelMode: s.travelMode,
      travelMin: s.travelMin,
      distanceFromPrevKm: s.distanceFromPrevKm,
      note: s.note,
    }
  })
  const author = r.authorId ? (userMap.get(r.authorId) ?? null) : null
  return {
    id: r.id,
    name: r.name,
    theme: r.theme,
    celebrityId: r.celebrityId,
    celebrityName: celebMap.get(r.celebrityId)?.name ?? '',
    cityId: r.cityId,
    cityName: cityMap.get(r.cityId)?.name ?? '',
    author: author ? buildAuthorView(author) : null,
    isAiGenerated: r.isAiGenerated,
    stops,
    totalMin: r.totalMin,
    totalKm: r.totalKm,
    walkingKm: r.walkingKm,
    desc: r.desc,
    likes: r.likes,
    collected: r.collected,
    postedAt: r.postedAt,
  }
}

function buildPostView(p: AnyPost): PostView {
  const fallbackAuthor = (): AuthorView => ({
    id: p.authorId,
    nickname: '未知用户',
    avatar: '',
    bio: '',
    followers: 0,
    likesReceived: 0,
  })
  const author = isLocalPost(p)
    ? { id: p.authorId, nickname: p.author.nickname, avatar: p.author.avatar, bio: '', followers: 0, likesReceived: 0 }
    : userMap.get(p.authorId)
      ? buildAuthorView(userMap.get(p.authorId)!)
      : fallbackAuthor()
  const routeId = p.routeId ?? null
  return {
    id: p.id,
    type: p.type,
    author,
    locationIds: [...p.locationIds],
    locations: p.locationIds.map((id) => {
      const l = locMap.get(id)
      return l ? buildLocationRef(l) : { id, name: '未知地点', type: 'fan', celebrityId: '', celebrityName: '', cityId: '', cityName: '' }
    }),
    routeId,
    route: routeId ? (routeMap.get(routeId) ? buildRouteView(routeMap.get(routeId)!) : null) : null,
    title: p.title,
    content: p.content,
    images: [...p.images],
    tags: [...p.tags],
    photoTips: isLocalPost(p) ? null : p.photoTips,
    highlights: isLocalPost(p) ? [] : (p.highlights ?? []),
    likes: p.likes,
    collected: p.collected,
    comments: clone(p.comments),
    postedAt: p.postedAt,
  }
}

function buildCelebritySummary(c: Celebrity): CelebritySummary {
  const cityStats = c.cities.map((cityId) => {
    const locs = locations.filter((l) => l.celebrityId === c.id && l.cityId === cityId)
    const locIds = new Set(locs.map((l) => l.id))
    const relatedPosts = posts.filter((p) => p.locationIds.some((id) => locIds.has(id)))
    return {
      cityId,
      cityName: cityMap.get(cityId)?.name ?? '',
      locationCount: locs.length,
      postCount: relatedPosts.length,
      totalCheckins: locs.reduce((s, l) => s + l.checkinCount, 0),
    }
  })
  return {
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    tagline: c.tagline,
    category: c.category,
    fansCount: c.fansCount,
    cardImage: c.cardImage,
    cityStats,
    totalLocationCount: cityStats.reduce((s, x) => s + x.locationCount, 0),
    totalPostCount: cityStats.reduce((s, x) => s + x.postCount, 0),
  }
}

const sortPostsByTime = (list: AnyPost[]): AnyPost[] => [...list].sort((a, b) => b.postedAt.localeCompare(a.postedAt))

// ============ 异步查询接口 ============

export async function getCities(): Promise<City[]> {
  return delay(clone(cities))
}

export async function getCelebrities(): Promise<CelebritySummary[]> {
  const list = celebrities.map(buildCelebritySummary).sort((a, b) => b.fansCount - a.fansCount)
  return delay(list)
}

export async function getCelebrityView(celebrityId: string): Promise<CelebritySummary> {
  const c = celebMap.get(celebrityId)
  return delay(buildCelebritySummary(c ?? celebrities[0]))
}

export async function getLocationsByCelebrity(celebrityId: string): Promise<LocationView[]> {
  const list = locations
    .filter((l) => l.celebrityId === celebrityId)
    .sort((a, b) => b.checkinCount - a.checkinCount)
    .map(buildLocationView)
  return delay(list)
}

export async function getHotLocations(limit = 6): Promise<LocationView[]> {
  const list = [...locations].sort((a, b) => b.checkinCount - a.checkinCount).slice(0, limit).map(buildLocationView)
  return delay(list)
}

export async function getLocation(locationId: string): Promise<LocationView> {
  const l = locMap.get(locationId)
  return delay(buildLocationView(l ?? locations[0]))
}

export async function getFeed(filter: PostType | 'all' = 'all'): Promise<PostView[]> {
  const source = allPosts()
  const filtered = filter === 'all' ? source : source.filter((p) => p.type === filter)
  return delay(sortPostsByTime(filtered).map(buildPostView))
}

export async function getPost(postId: string): Promise<PostView> {
  const p = allPosts().find((x) => x.id === postId)
  return delay(buildPostView(p ?? posts[0]))
}

export async function getPostsByLocation(locationId: string): Promise<PostView[]> {
  return delay(sortPostsByTime(postsOfLocation(locationId)).map(buildPostView))
}

export async function getPostsByCelebrity(celebrityId: string): Promise<PostView[]> {
  const locIds = new Set(locations.filter((l) => l.celebrityId === celebrityId).map((l) => l.id))
  const list = allPosts().filter((p) => p.locationIds.some((id) => locIds.has(id)))
  return delay(sortPostsByTime(list).map(buildPostView))
}

export async function getPostsByRoute(routeId: string): Promise<PostView[]> {
  const list = posts.filter((p) => p.type === 'route' && p.routeId === routeId)
  return delay(sortPostsByTime(list).map(buildPostView))
}

export async function getRelatedPosts(postId: string): Promise<PostView[]> {
  const target = allPosts().find((p) => p.id === postId)
  if (!target) return delay([])
  const related = allPosts()
    .filter((p) => p.id !== postId && p.locationIds.some((id) => target.locationIds.includes(id)))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3)
  return delay(related.map(buildPostView))
}

export async function getRoutes(): Promise<RouteView[]> {
  const list = [...routes].sort((a, b) => b.likes - a.likes).map(buildRouteView)
  return delay(list)
}

export async function getRoutesByCelebrity(celebrityId: string): Promise<RouteView[]> {
  const list = routes.filter((r) => r.celebrityId === celebrityId).map(buildRouteView)
  return delay(list)
}

export async function getRoutesByLocation(locationId: string): Promise<RouteView[]> {
  const list = routes.filter((r) => r.stops.some((s) => s.locationId === locationId)).map(buildRouteView)
  return delay(list)
}

export async function getRouteView(routeId: string): Promise<RouteView> {
  const r = routeMap.get(routeId)
  return delay(buildRouteView(r ?? routes[0]))
}

// ============ 搜索 ============

export async function searchAll(q: string): Promise<SearchResults> {
  const query = q.trim().toLowerCase()
  if (!query) {
    return { celebrities: [], cities: [], locations: [], posts: [] }
  }
  const match = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(query))

  const celebResults = celebrities
    .filter((c) => match(c.name, c.nameEn, c.tagline))
    .map(buildCelebritySummary)
    .slice(0, 5)

  const cityResults: CitySearchResult[] = cities
    .filter((c) => match(c.name, c.nameEn, c.pinyin))
    .map((c) => ({ id: c.id, name: c.name, locationCount: locations.filter((l) => l.cityId === c.id).length }))
    .slice(0, 3)

  const locResults = locations
    .filter((l) => match(l.name, l.address, l.tags.join(' '), LOCATION_TYPE_LABELS[l.type] ?? ''))
    .slice(0, 5)
    .map(buildLocationView)

  const postResults = sortPostsByTime(
    posts.filter((p) => match(p.title, p.content, p.tags.join(' '))),
  )
    .slice(0, 6)
    .map(buildPostView)

  return delay({ celebrities: celebResults, cities: cityResults, locations: locResults, posts: postResults })
}
