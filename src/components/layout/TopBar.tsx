import { useNavigate, NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'
import StarRailMark from '@/components/icons/StarRailMark'
import Avatar from '@/components/ui/Avatar'
import { useUserStore } from '@/store/userStore'

const TABS = [
  { to: '/', label: '首页' },
  { to: '/community', label: '社区' },
  { to: '/my', label: '我的' },
]

export default function TopBar() {
  const navigate = useNavigate()
  const profile = useUserStore((s) => s.profile)

  return (
    <header className="xr-topbar">
      <div className="xr-container xr-topbar__inner">
        <button className="xr-topbar__logo" onClick={() => navigate('/')}>
          <StarRailMark size={22} />
          <span>星途</span>
        </button>

        <nav className="xr-topbar__tabs">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) => `xr-topbar__tab${isActive ? ' xr-topbar__tab--active' : ''}`}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <button className="xr-topbar__search" onClick={() => navigate('/search')}>
          <Search size={16} strokeWidth={1.8} />
          <span>搜索明星、地点、攻略</span>
        </button>

        <div className="xr-topbar__right">
          <button className="xr-btn xr-btn--soft-gold xr-btn--sm" onClick={() => navigate('/ai/planning')}>
            <StarRailMark size={14} />
            AI 规划
          </button>
          <button className="xr-topbar__avatar" onClick={() => navigate('/my')}>
            <Avatar src={profile.avatar} name={profile.nickname} size={32} />
          </button>
        </div>
      </div>
    </header>
  )
}
