import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Toasts from '@/components/ui/Toasts'

/**
 * 全局框架：
 * - 桌面(≥768px)：顶部导航（Stage 2 桌面规范：Logo + 三 Tab + 搜索 + AI 次级入口 + 头像）
 * - 移动(<768px)：底部固定三 Tab（首页/社区/我的，AI 不进导航）
 */
export default function AppShell() {
  return (
    <div className="xr-app">
      <TopBar />
      <main className="xr-main">
        <Outlet />
      </main>
      <BottomNav />
      <Toasts />
    </div>
  )
}
