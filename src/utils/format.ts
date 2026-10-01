import type { LocationType, OpeningHours, PostType } from '@/types'

/** 数字格式化：>=1万 显示 x.x万 */
export const formatCount = (n: number): string =>
  n >= 10000 ? `${+(n / 10000).toFixed(1)}万` : `${n}`

/** 分钟数 → 时长文案 */
export const formatDuration = (totalMin: number): string => {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} 分钟`
  if (m === 0) return `${h} 小时`
  return `${h} 小时 ${m} 分`
}

/** 分钟数 → 紧凑时长（路线卡用） */
export const formatDurationShort = (totalMin: number): string =>
  totalMin % 60 === 0 ? `${totalMin / 60} 小时` : `${+(totalMin / 60).toFixed(1)} 小时`

const WEEKDAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 营业时间 + 店休日 */
export const formatOpeningHours = (oh: OpeningHours): string => {
  const base = `${oh.start} – ${oh.end}`
  return oh.restDays.length
    ? `${base} · ${oh.restDays.map((d) => WEEKDAY_LABELS[d]).join('、')}店休`
    : base
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** ISO → 「9月12日」 */
export const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** ISO → 「9月12日 10:30」 */
export const formatDateTime = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 相对时间 */
export const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return '刚刚'
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days} 天前`
  return formatDate(iso)
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  concert: '演唱会地标',
  filming: 'MV取景',
  food: '同款美食',
  brand: '品牌主题店',
  fan: '粉丝活动地标',
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  checkin: '打卡',
  guide: '攻略',
  route: '路线',
}
