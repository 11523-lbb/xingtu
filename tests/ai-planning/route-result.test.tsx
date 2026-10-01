/* @vitest-environment jsdom */
/* ============================================================
   AI 路线结果页测试（Stage 8）
   运行：npm run test:ui
   数据全部来自真实 planTrip 结果。
   ============================================================ */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import AIRouteResultPage from '@/pages/AIRouteResultPage'
import AIPlanningPage from '@/pages/AIPlanningPage'
import { useAgentStore } from '@/store/agentStore'
import { useUserStore } from '@/store/userStore'
import { planTrip } from '@/services/agent'
import type { PlanningRequest } from '@/services/agent'
import { formatDurationShort } from '@/utils/format'

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

function seed(request: PlanningRequest = OK_REQUEST) {
  const currentRequest = { ...request }
  const currentResult = planTrip(currentRequest)
  useAgentStore.setState({ currentRequest, currentResult })
  return { currentRequest, currentResult }
}

function PostProbe() {
  const { postId } = useParams()
  return <div>POST_PROBE:{postId}</div>
}

function renderResult() {
  return render(
    <MemoryRouter initialEntries={['/ai/result']}>
      <Routes>
        <Route path="/ai/result" element={<AIRouteResultPage />} />
        <Route path="/ai/planning" element={<AIPlanningPage />} />
        <Route path="/post/:postId" element={<PostProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAgentStore.setState({ currentRequest: null, currentResult: null, pendingAdjustRequest: null })
  useUserStore.setState({ savedRoutes: [] })
})

afterEach(() => {
  cleanup()
})

describe('AI 路线结果页', () => {
  it('Test 1：正常 result → 正确展示路线', async () => {
    const { currentResult } = seed()
    renderResult()

    expect(await screen.findByText('你的打卡路线已经整理好了')).toBeInTheDocument()
    expect(screen.getByText('为什么是这条路线？')).toBeInTheDocument()

    // 每个站点名称出现（时间线）
    for (const stop of currentResult.route!.stops) {
      const loc = currentResult.selectedLocations.find((l) => l.id === stop.locationId)
      expect(loc).toBeTruthy()
      expect(screen.getAllByText(loc!.name).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('Test 2：路线站点数量与 currentResult.route 一致', async () => {
    const { currentResult } = seed()
    renderResult()

    await screen.findByText('你的打卡路线已经整理好了')
    const n = currentResult.route!.stops.length
    // 概览 chip 数字为独立 span（getByText 只匹配直接文本节点），用函数匹配器按 textContent 匹配
    expect(
      screen.getByText((_, el) => el?.textContent?.trim() === `${n} 个地点`),
    ).toBeInTheDocument()
  })

  it('Test 3：距离/时间来自真实 result', async () => {
    const { currentResult } = seed()
    renderResult()

    await screen.findByText('你的打卡路线已经整理好了')
    const route = currentResult.route!
    expect(screen.getByText(new RegExp(`约 ${route.totalKm} km`))).toBeInTheDocument()
    expect(screen.getByText(formatDurationShort(route.totalMin))).toBeInTheDocument()
  })

  it('Test 4：AI 推荐理由来自 reasoning', async () => {
    const { currentResult } = seed()
    renderResult()

    await screen.findByText('为什么是这条路线？')

    // 路线总述（reasoning.routeReason 原文）
    expect(screen.getByText(currentResult.reasoning.routeReason)).toBeInTheDocument()

    // 地点理由（reasoning.locationReasons 原文，不生成）
    const firstReason = currentResult.reasoning.locationReasons[0].reasons[0]
    expect(screen.getAllByText(firstReason).length).toBeGreaterThanOrEqual(1)
  })

  it('Test 5：communityEvidence 正确展示', async () => {
    const { currentResult } = seed()
    renderResult()

    expect(await screen.findByText('这条路线，也参考了星途社区')).toBeInTheDocument()
    const evidence = currentResult.communityEvidence[0]
    expect(evidence).toBeTruthy()
    expect(screen.getByText(evidence.title)).toBeInTheDocument()
    // 同一作者可能出现在多条证据中
    expect(screen.getAllByText(new RegExp(evidence.author)).length).toBeGreaterThanOrEqual(1)
  })

  it('Test 6：点击社区内容 → 进入现有 Post Detail', async () => {
    const { currentResult } = seed()
    renderResult()

    await screen.findByText('这条路线，也参考了星途社区')
    const evidence = currentResult.communityEvidence[0]
    fireEvent.click(screen.getByText(evidence.title))

    await waitFor(() => expect(screen.getByText(`POST_PROBE:${evidence.postId}`)).toBeInTheDocument())
  })

  it('Test 7：调整路线 → 回 /ai/planning 且条件保留', async () => {
    const customRequest: PlanningRequest = {
      ...OK_REQUEST,
      celebrityId: 'cele_jjlin',
      startTime: '11:00',
      endTime: '18:00',
      availableMin: 420,
      maxStops: 5,
      preferences: { food: true },
      supplement: '想顺路吃好吃的',
    }
    seed(customRequest)
    renderResult()

    await screen.findByText('你的打卡路线已经整理好了')
    fireEvent.click(screen.getByText('调整路线'))

    // 回到输入页
    expect(await screen.findByText('这次，想怎么打卡？')).toBeInTheDocument()

    // 条件保留
    await waitFor(() => expect(screen.getByRole('button', { name: /林俊杰/ })).toHaveAttribute('aria-pressed', 'true'))
    expect((screen.getByLabelText('开始时间') as HTMLInputElement).value).toBe('11:00')
    expect((screen.getByLabelText('结束时间') as HTMLInputElement).value).toBe('18:00')
    expect(screen.getByRole('button', { name: /美食/ })).toHaveAttribute('aria-pressed', 'true')
    expect((screen.getByLabelText(/补充说明|有什么想告诉星途/) as HTMLTextAreaElement).value).toBe('想顺路吃好吃的')
  })

  it('Test 8：无 store 直接访问 → 自动回 /ai/planning', async () => {
    renderResult()

    expect(await screen.findByText('这次，想怎么打卡？')).toBeInTheDocument()
  })

  it('Test 9：error result → 正确错误页，无「AI 出错」', async () => {
    const currentRequest: PlanningRequest = {
      ...OK_REQUEST,
      startTime: '10:00',
      endTime: '11:00',
      availableMin: 60,
    }
    const currentResult = planTrip(currentRequest)
    expect(currentResult.success).toBe(false)
    useAgentStore.setState({ currentRequest, currentResult })
    renderResult()

    expect(await screen.findByText('这次没能完成规划')).toBeInTheDocument()
    expect(screen.getByText(/可用时间太短/)).toBeInTheDocument()
    expect(screen.getByText('返回调整条件')).toBeInTheDocument()
    expect(screen.queryByText(/AI 出错/)).not.toBeInTheDocument()
  })

  it('Test 10：布局结构完整（夜域概览 + 光域时间线 + 三大模块）', async () => {
    seed()
    const { container } = renderResult()

    await screen.findByText('你的打卡路线已经整理好了')
    expect(container.querySelector('.xr-result-hero')).not.toBeNull()
    expect(container.querySelector('.xr-result-grid')).not.toBeNull()
    expect(container.querySelector('.xr-timeline')).not.toBeNull()
    expect(screen.getByText('为什么是这条路线？')).toBeInTheDocument()
    expect(screen.getByText('这条路线，也参考了星途社区')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /开始打卡/ })).toBeInTheDocument()
  })
})
