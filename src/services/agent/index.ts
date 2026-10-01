/* ============================================================
   Agent 对外入口
   页面未来只调用 planTrip(request)；
   五个 Tool 亦独立导出，供单测与未来 LLM Function Calling 映射。
   ============================================================ */
export { planTrip } from './orchestrator'
export { getCelebrityLocations } from './tools/getCelebrityLocations'
export { searchCommunity } from './tools/searchCommunity'
export { filterLocations } from './tools/filterLocations'
export { planRoute } from './tools/planRoute'
export { validateItinerary } from './tools/validateItinerary'
export * from './types'
export * from './rules'
