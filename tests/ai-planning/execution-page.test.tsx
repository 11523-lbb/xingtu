/* @vitest-environment jsdom */
/* ============================================================
   Agent 执行过程页测试（Stage 7）
   运行：npm run test:ui
   使用假定时器驱动动画状态机；数据全部来自真实 planTrip 结果。
   ============================================================ */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AIExecutionPage from '@/pages/AIExecutionPage'
import { useAgentStore } from '@/store/agentStore'
import { planTrip } from '@/services/agent'
import type { PlanningRequest } from '@/services/agent'

/** 固定周六（2026-10-10），避开店休日，保证结果稳定 */
const OK_REQUEST: PlanningRequest = {
  cityId: 'city_shanghai',
  celebrityId: 'cele_jaychou',
  date: '2026-10-10',
  startTime: '13:00',
  endTime: '20:00',
  availableMin: 420,
  maxStops: 4,
  preferences: { photo: true, classic: true },
}

/** 以真实 planTrip 结果种子 store */
function seed(request: PlanningRequest = OK_REQUEST) {
  const currentRequest = { ...request }
  const currentResult = planTrip(currentRequest)
  useAgentStore.setState({ currentRequest, currentResult })
  return { currentRequest, currentResult }
}

function renderExec(entry = '/ai/execution') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/ai/execution" element={<AIExecutionPage />} />
        <Route path="/ai/result" element={<div>RESULT_PROBE</div>} />
        <Route path="/ai/planning" element={<div>PLANNING_PROBE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

/** 走完整个动画（400 进入延迟 + 各步骤时长 + 余量） */
async function advanceAll() {
  await advance(11000)
}

const STEP_TITLES = ['理解你的需求', '寻找相关地点', '查看社区攻略', '筛选地点', '规划路线', '校验行程', '优化路线']

beforeEach(() => {
  vi.useFakeTimers()
  useAgentStore.setState({ currentRequest: null, currentResult: null })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Agent 执行过程页', () => {
  it('Test 1：正常 Shanghai+Jay+4 站 → 页面正常，7 个步骤逐步完成', async () => {
    const { currentResult } = seed()
    renderExec()

    // 初始：进入延迟期，第一步尚未开始
    expect(screen.getByText('正在为你整理一条打卡路线')).toBeInTheDocument()

    // 第一步进行中
    await advance(500)
    expect(screen.getByText('进行中')).toBeInTheDocument()

    // 第一步完成（trace 摘要出现）
    await advance(1000)
    expect(screen.getByText(/已理解你的需求/)).toBeInTheDocument()

    // 走完全程
    await advanceAll()
    // 页头与完成横幅均为「路线整理完成」
    expect(screen.getAllByText('路线整理完成').length).toBeGreaterThanOrEqual(2)
    // 地点步骤的真实 trace 摘要（动态数字，来自真实结果）
    expect(screen.getByText(new RegExp(`找到 ${currentResult.trace.find((t) => t.tool === 'getCelebrityLocations')?.outputSummary.split(' ')[0]} 个相关打卡点`))).toBeInTheDocument()
    // 全部 7 步均已完成（无"进行中"）
    expect(screen.queryByText('进行中')).not.toBeInTheDocument()
  })

  it('Test 2：trace 正确映射为 7 个产品步骤', () => {
    seed()
    renderExec()

    STEP_TITLES.forEach((title) => {
      expect(screen.getByText(title), `缺少产品步骤：${title}`).toBeInTheDocument()
    })
    // 不暴露内部字段
    expect(screen.queryByText(/getCelebrityLocations/)).not.toBeInTheDocument()
    expect(screen.queryByText(/understandRequest/)).not.toBeInTheDocument()
  })

  it('Test 3：communityEvidence 在社区攻略步骤正确展示', async () => {
    const { currentResult } = seed()
    renderExec()

    // 进入「查看社区攻略」步骤（400 + 900 + 1100 + 500）
    await advance(2900)

    const evidence = currentResult.communityEvidence[0]
    expect(evidence).toBeTruthy()
    expect(screen.getByText(evidence.title)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(evidence.content))).toBeInTheDocument()
    // 同一作者可能出现在多条证据卡中
    expect(screen.getAllByText(new RegExp(evidence.author)).length).toBeGreaterThanOrEqual(1)
  })

  it('Test 4：route 真实数据在完成态正确展示', async () => {
    const { currentResult } = seed()
    renderExec()

    await advanceAll()

    const route = currentResult.route!
    // 统计条：站点数 / 总距离 / 预计用时（全部来自真实 route）
    expect(screen.getByText(new RegExp(`${route.totalKm}km`))).toBeInTheDocument()
    // 完成横幅：N 站路线
    expect(screen.getByText(new RegExp(`${route.stops.length}\\s*站路线`))).toBeInTheDocument()
    // 时间信息出现在画布（到达时间）
    expect(screen.getByText(route.stops[0].arriveTime)).toBeInTheDocument()
  })

  it('Test 5：直接访问 /ai/execution 且无 store → 自动回 /ai/planning', () => {
    renderExec()

    expect(screen.getByText('PLANNING_PROBE')).toBeInTheDocument()
  })

  it('Test 6：Agent 错误 → 结构化错误页，不显示「AI 出错」', () => {
    const currentRequest: PlanningRequest = {
      ...OK_REQUEST,
      startTime: '10:00',
      endTime: '11:00',
      availableMin: 60,
    }
    const currentResult = planTrip(currentRequest)
    expect(currentResult.success).toBe(false)
    useAgentStore.setState({ currentRequest, currentResult })
    renderExec()

    expect(screen.getByText('这次没能完成规划')).toBeInTheDocument()
    expect(screen.getByText(/可用时间太短/)).toBeInTheDocument()
    expect(screen.getByText('返回调整条件')).toBeInTheDocument()
    expect(screen.queryByText(/AI 出错/)).not.toBeInTheDocument()
    expect(screen.queryByText(/出错了/)).not.toBeInTheDocument()
  })

  it('Test 7：动画结束后出现「查看路线」CTA', async () => {
    seed()
    renderExec()

    // 未完成前无 CTA
    await advance(2000)
    expect(screen.queryByRole('button', { name: '查看路线' })).not.toBeInTheDocument()

    await advanceAll()
    expect(screen.getByRole('button', { name: '查看路线' })).toBeInTheDocument()
  })

  it('Test 8：点击「查看路线」→ 进入 /ai/result', async () => {
    seed()
    renderExec()

    await advanceAll()
    fireEvent.click(screen.getByRole('button', { name: '查看路线' }))

    expect(screen.getByText('RESULT_PROBE')).toBeInTheDocument()
    // agentStore 数据继续保留
    expect(useAgentStore.getState().currentResult).not.toBeNull()
  })
})
