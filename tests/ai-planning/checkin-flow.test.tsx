/* @vitest-environment jsdom */
/* ============================================================
   打卡 → 发布 → 社区回流 闭环测试（Stage 9）
   运行：npm run test:ui
   ============================================================ */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AIRouteResultPage from '@/pages/AIRouteResultPage'
import CheckinPage from '@/pages/CheckinPage'
import PublishPage from '@/pages/PublishPage'
import CommunityPage from '@/pages/CommunityPage'
import { useAgentStore } from '@/store/agentStore'
import { useCheckinStore } from '@/store/checkinStore'
import { useLocalPostsStore } from '@/store/localPostsStore'
import { useUserStore } from '@/store/userStore'
import { planTrip } from '@/services/agent'
import type { PlanningRequest } from '@/services/agent'

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

function seedFlow() {
  const currentRequest = { ...OK_REQUEST }
  const currentResult = planTrip(currentRequest)
  useAgentStore.setState({ currentRequest, currentResult })
  return { currentRequest, currentResult }
}

function renderApp(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/ai/result" element={<AIRouteResultPage />} />
        <Route path="/checkin" element={<CheckinPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/" element={<div>HOME_PROBE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** 从结果页走完：开始打卡 → 逐站完成 → 分享 → 发布 */
async function runFullFlow(feelingText: string) {
  // 开始打卡
  fireEvent.click(await screen.findByRole('button', { name: /开始打卡/ }))

  // 逐站：完成 → 前往下一站（最后一站完成 → 分享）
  const session = useCheckinStore.getState().session!
  for (let i = 0; i < session.locationIds.length; i++) {
    fireEvent.click(await screen.findByRole('button', { name: '完成打卡' }))
    const nextBtn = screen.queryByRole('button', { name: /前往下一站/ })
    if (nextBtn) {
      fireEvent.click(nextBtn)
    }
  }
  fireEvent.click(await screen.findByRole('button', { name: /分享这次打卡/ }))

  // 填写感受 → 发布（等待封面就绪，按钮才可点击）
  fireEvent.change(await screen.findByLabelText(/打卡感受/), { target: { value: feelingText } })
  const publishBtn = await screen.findByRole('button', { name: '发布到社区' })
  await waitFor(() => expect(publishBtn).toBeEnabled(), { timeout: 3000 })
  fireEvent.click(publishBtn)
}

beforeEach(() => {
  localStorage.clear()
  useAgentStore.setState({ currentRequest: null, currentResult: null, pendingAdjustRequest: null })
  useCheckinStore.setState({ session: null })
  useLocalPostsStore.setState({ publishedPosts: [] })
  useUserStore.setState({ savedRoutes: [] })
})

afterEach(() => {
  cleanup()
})

describe('打卡 → 发布 → 社区回流', () => {
  it('Test 1：Route Result 点击「开始打卡」→ 进入第一站', async () => {
    const { currentResult } = seedFlow()
    renderApp('/ai/result')

    fireEvent.click(await screen.findByRole('button', { name: /开始打卡/ }))

    expect(await screen.findByText('正在打卡')).toBeInTheDocument()
    expect(screen.getByText(/第 1 \/ 4 站/)).toBeInTheDocument()
    const firstLoc = currentResult.selectedLocations.find(
      (l) => l.id === currentResult.route!.stops[0].locationId,
    )
    // 站名同时出现在打卡卡与星轨进度栏
    expect(screen.getAllByText(firstLoc!.name).length).toBeGreaterThanOrEqual(1)
  })

  it('Test 2：第一站信息来自真实 route.stop 与地点数据', async () => {
    const { currentResult } = seedFlow()
    renderApp('/ai/result')
    fireEvent.click(await screen.findByRole('button', { name: /开始打卡/ }))

    await screen.findByText('正在打卡')
    const loc = currentResult.selectedLocations.find(
      (l) => l.id === currentResult.route!.stops[0].locationId,
    )!
    // 建议停留来自真实地点数据
    expect(await screen.findByText(new RegExp(`建议停留 ${loc.suggestedStayMin} 分钟`))).toBeInTheDocument()
  })

  it('Test 3：完成第一站 → checkedLocationIds 正确更新', async () => {
    seedFlow()
    renderApp('/ai/result')
    fireEvent.click(await screen.findByRole('button', { name: /开始打卡/ }))

    fireEvent.click(await screen.findByRole('button', { name: '完成打卡' }))

    expect(await screen.findByText(/这一站，完成了/)).toBeInTheDocument()
    const session = useCheckinStore.getState().session!
    expect(session.checkedLocationIds).toContain(session.locationIds[0])
    // 同步 userStore 已打卡资产
    expect(useUserStore.getState().checkedInLocationIds).toContain(session.locationIds[0])
  })

  it('Test 4：点击前往下一站 → 正确进入第二站', async () => {
    seedFlow()
    renderApp('/ai/result')
    fireEvent.click(await screen.findByRole('button', { name: /开始打卡/ }))

    fireEvent.click(await screen.findByRole('button', { name: '完成打卡' }))
    fireEvent.click(await screen.findByRole('button', { name: /前往下一站/ }))

    expect(await screen.findByText(/第 2 \/ 4 站/)).toBeInTheDocument()
    const session = useCheckinStore.getState().session!
    expect(session.currentIndex).toBe(1)
  })

  it('Test 5：最后一站完成 → 进入发布页面', async () => {
    seedFlow()
    renderApp('/ai/result')
    fireEvent.click(await screen.findByRole('button', { name: /开始打卡/ }))

    const session = useCheckinStore.getState().session!
    for (let i = 0; i < session.locationIds.length; i++) {
      fireEvent.click(await screen.findByRole('button', { name: '完成打卡' }))
      const nextBtn = screen.queryByRole('button', { name: /前往下一站/ })
      if (nextBtn) fireEvent.click(nextBtn)
    }
    fireEvent.click(await screen.findByRole('button', { name: /分享这次打卡/ }))

    expect(await screen.findByText('分享这次打卡')).toBeInTheDocument()
    // 封面就绪后按钮可用（加载期间显示「封面准备中…」）
    expect(await screen.findByRole('button', { name: '发布到社区' }, { timeout: 3000 })).toBeInTheDocument()
  })

  it('Test 6：填写打卡感受 → 预览正确显示', async () => {
    seedFlow()
    renderApp('/ai/result')
    fireEvent.click(await screen.findByRole('button', { name: /开始打卡/ }))

    const session = useCheckinStore.getState().session!
    for (let i = 0; i < session.locationIds.length; i++) {
      fireEvent.click(await screen.findByRole('button', { name: '完成打卡' }))
      const nextBtn = screen.queryByRole('button', { name: /前往下一站/ })
      if (nextBtn) fireEvent.click(nextBtn)
    }
    fireEvent.click(await screen.findByRole('button', { name: /分享这次打卡/ }))

    fireEvent.change(await screen.findByLabelText(/打卡感受/), {
      target: { value: '这次打卡太开心了' },
    })
    // 感受同时出现在输入框与预览中
    expect((await screen.findAllByText('这次打卡太开心了')).length).toBeGreaterThanOrEqual(1)
  })

  it('Test 7：发布 → 生成新帖子（字段完整）', async () => {
    seedFlow()
    renderApp('/ai/result')
    await runFullFlow('圆满的一天')

    expect(await screen.findByText('已发布到星途社区')).toBeInTheDocument()

    const { publishedPosts } = useLocalPostsStore.getState()
    expect(publishedPosts.length).toBe(1)
    const post = publishedPosts[0]
    expect(post.type).toBe('checkin')
    expect(post.authorId).toBe('user_001')
    expect(post.locationIds.length).toBe(4)
    expect(post.images.length).toBeGreaterThanOrEqual(1)
    expect(post.content).toContain('圆满的一天')
    expect(new Date(post.postedAt).getTime()).toBeGreaterThan(0)
  })

  it('Test 8：发布成功 → 回到社区', async () => {
    seedFlow()
    renderApp('/ai/result')
    await runFullFlow('闭环测试')

    fireEvent.click(await screen.findByRole('button', { name: '回到社区' }))

    expect(await screen.findByText('社区')).toBeInTheDocument()
  })

  it('Test 9：社区推荐流能看到新发布内容', async () => {
    seedFlow()
    renderApp('/ai/result')
    await runFullFlow('闭环测试')

    fireEvent.click(await screen.findByRole('button', { name: '回到社区' }))
    await screen.findByText('社区')

    // 新帖标题出现在推荐流（默认 Tab）
    expect(await screen.findByText('我的上海周杰伦打卡路线 ✦')).toBeInTheDocument()
  })

  it('Test 10：刷新后 check-in / 发布状态仍然存在', async () => {
    seedFlow()
    renderApp('/ai/result')
    await runFullFlow('持久化验证')

    // 模拟刷新：持久化数据在 localStorage 中
    expect(localStorage.getItem('xingtu-local-content-v1')).toContain('我的上海周杰伦打卡路线 ✦')
    expect(localStorage.getItem('xingtu-checkin-v1')).toContain('completed')

    // 卸载后重新渲染社区（等价于刷新后重新打开）
    cleanup()
    renderApp('/community')
    expect(await screen.findByText('社区')).toBeInTheDocument()
    expect(await screen.findByText('我的上海周杰伦打卡路线 ✦')).toBeInTheDocument()
  })
})
