/* Agent 错误码 → 产品化文案（规划输入页与执行页共用）
   原则：不向用户展示「AI 出错了」，只说明条件问题与下一步。 */

export const AGENT_ERROR_MESSAGES: Record<string, string> = {
  CITY_NOT_FOUND: '这个城市目前还没有足够的星途内容。',
  CELEBRITY_NOT_FOUND: '这位明星目前还没有相关地点。',
  INVALID_TIME_RANGE: '时间范围不合法，请检查开始与结束时间。',
  INVALID_DATE: '出行日期不合法。',
  INVALID_MAX_STOPS: '期望地点数至少为 3 个。',
  CONTEXT_LOCATION_NOT_FOUND: '你选择的地点不存在，请移除后重新选择。',
  CONTEXT_POST_NOT_FOUND: '你参考的内容不存在。',
  CONTEXT_ROUTE_NOT_FOUND: '你参考的路线不存在。',
  NO_AVAILABLE_LOCATIONS: '当前条件下没有找到可执行的打卡地点。',
  TOO_SHORT_WINDOW: '可用时间太短，暂时无法安排足够的打卡地点，试试放宽时间。',
  OPTIMIZATION_LIMIT: '已尽力调整，但部分条件无法同时满足，请调整条件后再试。',
}

export function getAgentErrorMessage(code: string | undefined, fallback: string): string {
  return (code && AGENT_ERROR_MESSAGES[code]) || fallback
}
