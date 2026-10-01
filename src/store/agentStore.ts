/* ============================================================
   Agent 流程状态（Zustand）
   承载「Planning Input → Agent Execution → Route Result」三页共享的：
   currentRequest（本次需求）与 currentResult（planTrip 输出）。
   注意：仅存会话内流程数据，不做持久化（与 userStore 的用户资产区分），
   避免刷新后回落到已过期的规划结果。
   ============================================================ */
import { create } from 'zustand'
import type { PlanningRequest, PlanningResult } from '@/services/agent'

interface AgentFlowState {
  currentRequest: PlanningRequest | null
  currentResult: PlanningResult | null
  /** 「调整路线」：回传上一轮条件给输入页一次性预填 */
  pendingAdjustRequest: PlanningRequest | null
  /** 提交成功后由 Planning Input 调用，随后跳转 /ai/execution */
  startPlanning: (request: PlanningRequest, result: PlanningResult) => void
  /** 结果页「调整路线」调用：记录条件并跳回输入页 */
  startAdjust: (request: PlanningRequest) => void
  /** 只读查看待预填条件（输入页初始化用，不消费） */
  peekAdjustRequest: () => PlanningRequest | null
  /** 消费待预填条件（输入页挂载后调用一次） */
  consumeAdjustRequest: () => PlanningRequest | null
  clearFlow: () => void
}

export const useAgentStore = create<AgentFlowState>()((set, get) => ({
  currentRequest: null,
  currentResult: null,
  pendingAdjustRequest: null,
  startPlanning: (currentRequest, currentResult) => set({ currentRequest, currentResult }),
  startAdjust: (request) => set({ pendingAdjustRequest: request }),
  peekAdjustRequest: () => get().pendingAdjustRequest,
  consumeAdjustRequest: () => {
    const request = get().pendingAdjustRequest
    set({ pendingAdjustRequest: null })
    return request
  },
  clearFlow: () => set({ currentRequest: null, currentResult: null, pendingAdjustRequest: null }),
}))
