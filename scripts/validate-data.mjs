/**
 * 星途 Mock 数据校验脚本
 * 用法：node scripts/validate-data.mjs
 * 覆盖：ID 唯一性 / 外键完整性 / 营业时间格式与范围 / 坐标有效性 /
 *       路线时间升序 / route 帖 routeId / 当前用户 stats 与 state 一致 /
 *       日期合法且不晚于 generatedAt / 停留时长一致性 / 评论时间顺序 等
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = join(__dirname, '..', 'mock');
const read = (f) => JSON.parse(readFileSync(join(MOCK_DIR, f), 'utf8'));

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const meta = read('meta.json');
const cities = read('cities.json');
const celebrities = read('celebrities.json');
const users = read('users.json');
const locations = read('locations.json');
const routes = read('routes.json');
const posts = read('posts.json');

const GENERATED_AT = new Date(meta.generatedAt);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const SH_BBOX = { lngMin: 120.80, lngMax: 122.00, latMin: 30.60, latMax: 31.90 };
const BJ_BBOX = { lngMin: 115.40, lngMax: 117.60, latMin: 39.40, latMax: 41.10 };

// ---------- 1. ID 唯一性（全局 + 各文件内部） ----------
const ids = new Map();
const register = (id, where) => {
  if (ids.has(id)) err(`[ID重复] ${id}（${where} 与 ${ids.get(id)} 冲突）`);
  else ids.set(id, where);
};
cities.forEach((c) => register(c.id, 'cities'));
celebrities.forEach((c) => register(c.id, 'celebrities'));
users.forEach((u) => register(u.id, 'users'));
locations.forEach((l) => register(l.id, 'locations'));
routes.forEach((r) => register(r.id, 'routes'));
posts.forEach((p) => register(p.id, 'posts'));
posts.forEach((p) => (p.comments ?? []).forEach((c) => register(c.id, `post ${p.id} comments`)));

const cityIds = new Set(cities.map((c) => c.id));
const celebIds = new Set(celebrities.map((c) => c.id));
const userIds = new Set(users.map((u) => u.id));
const locIds = new Set(locations.map((l) => l.id));
const routeIds = new Set(routes.map((r) => r.id));
const postIds = new Set(posts.map((p) => p.id));

// ---------- 2. 城市 ----------
for (const c of cities) {
  if (c.id === 'city_shanghai') {
    const b = SH_BBOX;
    if (!(c.center.lng >= b.lngMin && c.center.lng <= b.lngMax && c.center.lat >= b.latMin && c.center.lat <= b.latMax)) {
      err(`[坐标] ${c.id} 中心坐标不在上海市范围内`);
    }
  } else if (c.id === 'city_beijing') {
    const b = BJ_BBOX;
    if (!(c.center.lng >= b.lngMin && c.center.lng <= b.lngMax && c.center.lat >= b.latMin && c.center.lat <= b.latMax)) {
      err(`[坐标] ${c.id} 中心坐标不在北京市范围内`);
    }
  } else {
    err(`[城市] 未知城市 ID: ${c.id}`);
  }
}

// ---------- 3. 明星 ----------
for (const c of celebrities) {
  if (!['singer', 'actor', 'band'].includes(c.category)) err(`[枚举] ${c.id} category 非法: ${c.category}`);
  if (!(c.fansCount >= 0)) err(`[数值] ${c.id} fansCount 非法`);
  for (const cityId of c.cities ?? []) if (!cityIds.has(cityId)) err(`[外键] ${c.id}.cities 引用不存在的 ${cityId}`);
}

// ---------- 4. 用户 ----------
const currentUsers = users.filter((u) => u.isCurrent);
if (currentUsers.length !== 1) err(`[用户] 应恰好存在 1 个当前用户（isCurrent=true），实际 ${currentUsers.length} 个`);
const me = currentUsers[0];
for (const u of users) {
  if (!cityIds.has(u.cityId)) err(`[外键] ${u.id}.cityId 不存在: ${u.cityId}`);
  for (const k of ['followers', 'following', 'likesReceived']) if (!(u[k] >= 0)) err(`[数值] ${u.id}.${k} 非法`);
}
if (me) {
  const s = me.state ?? {};
  const st = me.stats ?? {};
  const pairs = [
    ['wanted', 'wantedLocationIds'], ['collected', 'collectedLocationIds'],
    ['checkedIn', 'checkedInLocationIds'], ['routes', 'collectedRouteIds'],
  ];
  for (const [statKey, stateKey] of pairs) {
    if (st[statKey] !== (s[stateKey] ?? []).length) {
      err(`[一致性] 当前用户 stats.${statKey}=${st[statKey]} 与 state.${stateKey}.length=${(s[stateKey] ?? []).length} 不一致`);
    }
  }
  const myPostCount = posts.filter((p) => p.authorId === me.id).length;
  if (st.posts !== myPostCount) err(`[一致性] 当前用户 stats.posts=${st.posts} 与实际发布帖子数 ${myPostCount} 不一致`);
  if (me.following !== (s.followingIds ?? []).length) err(`[一致性] 当前用户 following=${me.following} 与 state.followingIds.length 不一致`);
  for (const id of [...(s.wantedLocationIds ?? []), ...(s.collectedLocationIds ?? []), ...(s.checkedInLocationIds ?? [])]) {
    if (!locIds.has(id)) err(`[外键] 当前用户 state 引用的地点不存在: ${id}`);
  }
  for (const id of s.likedPostIds ?? []) if (!postIds.has(id)) err(`[外键] 当前用户 likedPostIds 不存在: ${id}`);
  for (const id of s.collectedPostIds ?? []) if (!postIds.has(id)) err(`[外键] 当前用户 collectedPostIds 不存在: ${id}`);
  for (const id of s.followingIds ?? []) if (!userIds.has(id)) err(`[外键] 当前用户 followingIds 不存在: ${id}`);
  for (const id of s.collectedRouteIds ?? []) if (!routeIds.has(id)) err(`[外键] 当前用户 collectedRouteIds 不存在: ${id}`);
}

// ---------- 5. 地点 ----------
const LOC_TYPES = ['concert', 'filming', 'food', 'brand', 'fan'];
for (const l of locations) {
  if (!celebIds.has(l.celebrityId)) err(`[外键] ${l.id}.celebrityId 不存在: ${l.celebrityId}`);
  if (!cityIds.has(l.cityId)) err(`[外键] ${l.id}.cityId 不存在: ${l.cityId}`);
  if (!LOC_TYPES.includes(l.type)) err(`[枚举] ${l.id}.type 非法: ${l.type}`);
  const { start, end, restDays } = l.openingHours ?? {};
  if (!TIME_RE.test(start ?? '')) err(`[时间格式] ${l.id} openingHours.start 非法: ${start}`);
  if (!TIME_RE.test(end ?? '')) err(`[时间格式] ${l.id} openingHours.end 非法: ${end}`);
  if (TIME_RE.test(start ?? '') && TIME_RE.test(end ?? '') && !(end > start)) {
    err(`[时间范围] ${l.id} openingHours end(${end}) 必须大于 start(${start})`);
  }
  if (!Array.isArray(restDays)) err(`[字段] ${l.id} restDays 必须是数组`);
  else {
    for (const d of restDays) if (!Number.isInteger(d) || d < 1 || d > 7) err(`[时间范围] ${l.id} restDays 非法值: ${d}（应为 1-7，1=周一）`);
    if (new Set(restDays).size !== restDays.length) err(`[时间范围] ${l.id} restDays 存在重复值`);
  }
  if (typeof l.lng !== 'number' || typeof l.lat !== 'number') err(`[坐标] ${l.id} 缺少坐标`);
  else if (!(l.lng >= SH_BBOX.lngMin && l.lng <= SH_BBOX.lngMax && l.lat >= SH_BBOX.latMin && l.lat <= SH_BBOX.latMax)) {
    err(`[坐标] ${l.id} 坐标 (${l.lng}, ${l.lat}) 不在上海市范围内`);
  }
  if (!(l.suggestedStayMin > 0)) err(`[数值] ${l.id}.suggestedStayMin 必须大于 0`);
  for (const k of ['relevance', 'photo']) {
    const v = l.scores?.[k];
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) err(`[数值] ${l.id}.scores.${k} 应为 0-100 整数: ${v}`);
  }
  if (!(l.checkinCount >= 0)) err(`[数值] ${l.id}.checkinCount 非法`);
  if (!Array.isArray(l.tags) || l.tags.length === 0) err(`[字段] ${l.id}.tags 不能为空`);
  if (!['public', 'demo'].includes(l.sourceType)) err(`[枚举] ${l.id}.sourceType 非法: ${l.sourceType}`);
  if (!l.sourceNote || !l.sourceNote.trim()) err(`[字段] ${l.id}.sourceNote 不能为空`);
  if (l.sourceType === 'demo') {
    const text = `${l.story ?? ''}${l.sourceNote ?? ''}${l.event ?? ''}`;
    if (!/演示|虚构|假设/.test(text)) warn(`[口径] ${l.id} 为 demo 数据但文案未出现「演示/虚构/假设」口径字样，请检查`);
  }
}

// ---------- 6. 路线 ----------
for (const r of routes) {
  if (!celebIds.has(r.celebrityId)) err(`[外键] ${r.id}.celebrityId 不存在: ${r.celebrityId}`);
  if (!cityIds.has(r.cityId)) err(`[外键] ${r.id}.cityId 不存在: ${r.cityId}`);
  if (r.authorId !== null && !userIds.has(r.authorId)) err(`[外键] ${r.id}.authorId 不存在: ${r.authorId}`);
  if (r.isAiGenerated === true && r.authorId !== null) err(`[一致性] ${r.id} AI 路线 authorId 应为 null`);
  if (r.isAiGenerated === false && r.authorId === null) err(`[一致性] ${r.id} 用户路线 authorId 不能为 null`);
  if (!Array.isArray(r.stops) || r.stops.length === 0) err(`[字段] ${r.id}.stops 不能为空`);
  else {
    let prevLeave = null;
    r.stops.forEach((s, i) => {
      if (!locIds.has(s.locationId)) err(`[外键] ${r.id} stop[${i}] 地点不存在: ${s.locationId}`);
      if (!TIME_RE.test(s.arriveAt ?? '') || !TIME_RE.test(s.leaveAt ?? '')) err(`[时间格式] ${r.id} stop[${i}] 时间非法`);
      else {
        const a = toMin(s.arriveAt), l = toMin(s.leaveAt);
        if (!(l > a)) err(`[时间范围] ${r.id} stop[${i}] leaveAt(${s.leaveAt}) 必须大于 arriveAt(${s.arriveAt})`);
        if (s.stayMin !== l - a) err(`[一致性] ${r.id} stop[${i}] stayMin=${s.stayMin} 与到达离开时间差 ${l - a} 不一致`);
        if (prevLeave !== null && a < prevLeave) err(`[时间顺序] ${r.id} stop[${i}] arriveAt(${s.arriveAt}) 早于上一站 leaveAt(${prevLeave})`);
        prevLeave = l;
      }
      if (i === 0) {
        if (s.travelMode !== null || s.travelMin !== 0 || s.distanceFromPrevKm !== 0) err(`[一致性] ${r.id} 首站 travelMode 应为 null、travelMin 与距离应为 0`);
      } else if (!['walk', 'metro'].includes(s.travelMode)) {
        err(`[枚举] ${r.id} stop[${i}] travelMode 非法: ${s.travelMode}`);
      }
      if (!(s.travelMin >= 0) || !(s.distanceFromPrevKm >= 0)) err(`[数值] ${r.id} stop[${i}] 交通时间/距离非法`);
    });
    const span = toMin(r.stops.at(-1).leaveAt) - toMin(r.stops[0].arriveAt);
    if (r.totalMin < span) err(`[一致性] ${r.id}.totalMin=${r.totalMin} 小于首尾时间跨度 ${span}`);
  }
  if (!(r.totalKm > 0) || !(r.walkingKm >= 0)) err(`[数值] ${r.id} totalKm/walkingKm 非法`);
  const d = new Date(r.postedAt);
  if (Number.isNaN(d.getTime())) err(`[日期] ${r.id}.postedAt 无法解析: ${r.postedAt}`);
  else if (d > GENERATED_AT) err(`[日期] ${r.id}.postedAt 晚于 generatedAt`);
}

// ---------- 7. 帖子与评论 ----------
const POST_TYPES = ['checkin', 'guide', 'route'];
let commentCount = 0;
const perLocationPostCount = new Map();
for (const p of posts) {
  if (!POST_TYPES.includes(p.type)) err(`[枚举] ${p.id}.type 非法: ${p.type}`);
  if (!userIds.has(p.authorId)) err(`[外键] ${p.id}.authorId 不存在: ${p.authorId}`);
  if (!Array.isArray(p.locationIds) || p.locationIds.length === 0) err(`[字段] ${p.id}.locationIds 不能为空`);
  for (const id of p.locationIds) {
    if (!locIds.has(id)) err(`[外键] ${p.id} 地点不存在: ${id}`);
    perLocationPostCount.set(id, (perLocationPostCount.get(id) ?? 0) + 1);
  }
  if (p.type === 'route') {
    if (!p.routeId || !routeIds.has(p.routeId)) err(`[外键] ${p.id} 为 route 类型但 routeId 缺失或不存在: ${p.routeId}`);
  } else if (p.routeId != null) {
    err(`[一致性] ${p.id} 非 route 类型但携带 routeId`);
  }
  if (!Array.isArray(p.images) || p.images.length === 0) err(`[字段] ${p.id}.images 不能为空`);
  if (!(p.likes >= 0) || !(p.collected >= 0) || p.collected > p.likes) err(`[数值] ${p.id} likes/collected 非法`);
  if (!p.title?.trim() || !p.content?.trim()) err(`[字段] ${p.id} title/content 不能为空`);
  const d = new Date(p.postedAt);
  if (Number.isNaN(d.getTime())) err(`[日期] ${p.id}.postedAt 无法解析: ${p.postedAt}`);
  else if (d > GENERATED_AT) err(`[日期] ${p.id}.postedAt 晚于 generatedAt`);

  for (const c of p.comments ?? []) {
    commentCount += 1;
    if (!userIds.has(c.authorId)) err(`[外键] ${p.id} 评论作者不存在: ${c.authorId}`);
    if (!(c.likes >= 0)) err(`[数值] ${p.id} 评论点赞数非法`);
    const cd = new Date(c.postedAt);
    if (Number.isNaN(cd.getTime())) err(`[日期] ${p.id} 评论 postedAt 无法解析`);
    else {
      if (cd > GENERATED_AT) err(`[日期] ${p.id} 评论晚于 generatedAt`);
      if (!Number.isNaN(d.getTime()) && cd < d) err(`[日期] ${p.id} 评论时间早于帖子发布时间`);
    }
  }
}
for (const [locId, count] of perLocationPostCount) {
  if (count < 2) warn(`[覆盖] 地点 ${locId} 仅 ${count} 条帖子，建议 ≥2 条`);
}

// ---------- 汇总 ----------
const byType = { checkin: 0, guide: 0, route: 0 };
posts.forEach((p) => { byType[p.type] += 1; });

console.log('========== 星途数据校验报告 ==========');
console.log(`meta        : 1`);
console.log(`cities      : ${cities.length}（${cities.map((c) => c.id).join(', ')}）`);
console.log(`celebrities : ${celebrities.length}`);
console.log(`users       : ${users.length}（当前用户: ${me?.id ?? '无'}）`);
console.log(`locations   : ${locations.length}（demo: ${locations.filter((l) => l.sourceType === 'demo').length}, public: ${locations.filter((l) => l.sourceType === 'public').length}）`);
console.log(`routes      : ${routes.length}`);
console.log(`posts       : ${posts.length}（checkin ${byType.checkin} / guide ${byType.guide} / route ${byType.route}）`);
console.log(`comments    : ${commentCount}`);
console.log(`实体 ID     : ${ids.size} 个（全部唯一）`);
console.log(`覆盖检查    : 有帖子覆盖的地点 ${perLocationPostCount.size}/${locations.length}`);
console.log('--------------------------------------');
if (errors.length === 0) {
  console.log(`结果        : ✓ 校验通过（警告 ${warnings.length} 条）`);
  warnings.forEach((w) => console.log(`  [警告] ${w}`));
  process.exit(0);
} else {
  console.log(`结果        : ✗ 发现 ${errors.length} 个错误`);
  errors.forEach((e) => console.log(`  [错误] ${e}`));
  warnings.forEach((w) => console.log(`  [警告] ${w}`));
  process.exit(1);
}
