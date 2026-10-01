/* @vitest-environment jsdom */
/* ============================================================
   AI 规划输入页行为测试（Stage 6）
   运行：npm run test:ui
   ============================================================ */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AIPlanningPage from '@/pages/AIPlanningPage'
import { useAgentStore } from '@/store/agentStore'

/** 以指定 URL 渲染输入页，并用探针元素承接 /ai/execution 跳转 */
function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/ai/planning" element={<AIPlanningPage />} />
        <Route path="/ai/execution" element={<div>EXECUTION_PROBE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function submit() {
  const button = await screen.findByRole('button', { name: /开始规划/ })
  fireEvent.click(button)
}

beforeEach(() => {
  useAgentStore.setState({ currentRequest: null, currentResult: null })
})

afterEach(() => {
  cleanup()
})

describe('AI 规划输入页', () => {
  it('Test 1：上海 + 周杰伦 + photo/classic + 4 站 → 成功进入 /ai/execution', async () => {
    renderAt('/ai/planning')

    // 数据加载后选择偏好
    await screen.findByRole('button', { name: /拍照/ })
    fireEvent.click(screen.getByRole('button', { name: /拍照/ }))
    fireEvent.click(screen.getByRole('button', { name: /经典地点/ }))

    await submit()

    // 进入执行页探针
    await waitFor(() => expect(screen.getByText('EXECUTION_PROBE')).toBeInTheDocument(), { timeout: 3000 })

    const { currentRequest, currentResult } = useAgentStore.getState()
    expect(currentRequest).not.toBeNull()
    expect(currentRequest!.preferences.photo).toBe(true)
    expect(currentRequest!.preferences.classic).toBe(true)
    expect(currentRequest!.maxStops).toBe(4)
    expect(currentRequest!.cityId).toBe('city_shanghai')
    expect(currentResult!.success).toBe(true)
  })

  it('Test 2：从地点详情进入（?locationId=）→ context.locationId 正确传递', async () => {
    renderAt('/ai/planning?locationId=loc_sh_004')

    // 上下文卡展示「从这个地点开始」
    await waitFor(() => expect(screen.getByText(/从这个地点开始/)).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText(/田子坊/)).toBeInTheDocument()

    await submit()
    await waitFor(() => expect(screen.getByText('EXECUTION_PROBE')).toBeInTheDocument(), { timeout: 3000 })

    const { currentRequest } = useAgentStore.getState()
    expect(currentRequest!.context?.locationId).toBe('loc_sh_004')
    expect(currentRequest!.celebrityId).toBe('cele_jaychou') // 地点所属明星自动预填
  })

  it('Test 3：从明星主页进入（?celebrityId=）→ 明星正确预选并传递', async () => {
    renderAt('/ai/planning?celebrityId=cele_jjlin')

    const linChip = await screen.findByRole('button', { name: /林俊杰/ })
    await waitFor(() => expect(linChip).toHaveAttribute('aria-pressed', 'true'))

    await submit()
    await waitFor(() => expect(screen.getByText('EXECUTION_PROBE')).toBeInTheDocument(), { timeout: 3000 })

    const { currentRequest } = useAgentStore.getState()
    expect(currentRequest!.celebrityId).toBe('cele_jjlin')
    expect(currentRequest!.cityId).toBe('city_shanghai')
  })

  it('Test 4：选择北京 → 提前提示暂无内容，提交得到结构化错误', async () => {
    renderAt('/ai/planning')

    const beijing = await screen.findByRole('button', { name: '北京' })
    fireEvent.click(beijing)

    // 提前提示（不等到提交才发现）
    expect(await screen.findByText(/北京目前还没有足够的社区内容/)).toBeInTheDocument()

    await submit()

    // Agent 结构化错误展示，且不跳转
    await waitFor(() => expect(screen.getByText(/没有找到可执行的打卡地点/)).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByText('EXECUTION_PROBE')).not.toBeInTheDocument()
    expect(useAgentStore.getState().currentResult).toBeNull()
  })

  it('Test 5：结束时间早于开始时间（20:00 → 13:00）→ 前端阻止提交', async () => {
    renderAt('/ai/planning')

    await screen.findByRole('button', { name: /开始规划/ })
    fireEvent.change(screen.getByLabelText('开始时间'), { target: { value: '20:00' } })
    fireEvent.change(screen.getByLabelText('结束时间'), { target: { value: '13:00' } })

    expect(screen.getByText('结束时间需要晚于开始时间。')).toBeInTheDocument()

    await submit()
    await waitFor(() => expect(screen.queryByText('EXECUTION_PROBE')).not.toBeInTheDocument(), { timeout: 1500 })
    expect(useAgentStore.getState().currentResult).toBeNull()
  })

  it('Test 6：重复点击提交 → 只创建一次规划流程', async () => {
    renderAt('/ai/planning')

    // 统计 store 中 result 被写入的次数
    let writes = 0
    const unsub = useAgentStore.subscribe((state, prev) => {
      if (state.currentResult !== prev.currentResult && state.currentResult !== null) writes += 1
    })

    const button = await screen.findByRole('button', { name: /开始规划/ })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(screen.getByText('EXECUTION_PROBE')).toBeInTheDocument(), { timeout: 3000 })
    await waitFor(() => expect(writes).toBe(1))
    unsub()
  })
})
