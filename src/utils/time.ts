/* 时间工具（Agent 引擎共用）：HH:mm 分钟换算 / ISO 星期（1=周一…7=周日）/ 日期校验 */

export const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export const fmtMin = (min: number): string => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const isValidTime = (t: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)

/** 日期 → ISO 星期（1=周一 … 7=周日）；无日期/非法日期返回 null */
export function getIsoWeekday(date?: string): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [y, m, d] = date.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  if (Number.isNaN(t)) return null
  const jsDay = new Date(t).getUTCDay() // 0=周日
  return (jsDay + 6) % 7 + 1
}

/** 日期合法（YYYY-MM-DD 且真实存在）；不传视为合法（Agent 允许不指定日期） */
export function isValidDate(date?: string): boolean {
  if (!date) return true
  return getIsoWeekday(date) !== null
}

export const WEEKDAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
