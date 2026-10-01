import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import HomePage from '@/pages/HomePage'
import CommunityPage from '@/pages/CommunityPage'
import SearchPage from '@/pages/SearchPage'
import CelebrityPage from '@/pages/CelebrityPage'
import LocationDetailPage from '@/pages/LocationDetailPage'
import PostDetailPage from '@/pages/PostDetailPage'
import RoutePage from '@/pages/RoutePage'
import MyPage from '@/pages/MyPage'
import AIPlanningPage from '@/pages/AIPlanningPage'
import AIExecutionPage from '@/pages/AIExecutionPage'
import AIRouteResultPage from '@/pages/AIRouteResultPage'
import CheckinPage from '@/pages/CheckinPage'
import PublishPage from '@/pages/PublishPage'

/** 路由切换时回到顶部 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/**
 * 路由结构（HashRouter：纯静态托管下深链可直接刷新，无需服务端重写）
 * AI 规划为全屏流程入口（非 Tab），从地点/明星/帖子等场景带上下文进入
 */
export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/celebrity/:celebrityId" element={<CelebrityPage />} />
          <Route path="/location/:locationId" element={<LocationDetailPage />} />
          <Route path="/post/:postId" element={<PostDetailPage />} />
          <Route path="/route/:routeId" element={<RoutePage />} />
          <Route path="/my" element={<MyPage />} />
          <Route path="/ai/planning" element={<AIPlanningPage />} />
          <Route path="/ai/execution" element={<AIExecutionPage />} />
          <Route path="/ai/result" element={<AIRouteResultPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/publish" element={<PublishPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
