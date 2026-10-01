/* ============================================================
   发布打卡页（Stage 9）
   路线概览 + 打卡感受 → 帖子预览 → 发布到社区（本地持久化）
   帖子写入 localPostsStore，data.ts 自动合并进社区 Feed。
   标题为 UI 默认生成（可修改），不称为 AI 生成。
   ============================================================ */
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Star } from 'lucide-react'
import { getLocation, getLocationRefSync } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import { useCheckinStore } from '@/store/checkinStore'
import { useLocalPostsStore } from '@/store/localPostsStore'
import type { LocalPost } from '@/store/localPostsStore'
import { useUserStore } from '@/store/userStore'
import { formatDate } from '@/utils/format'
import SmartImage from '@/components/ui/SmartImage'
import StarRailMark from '@/components/icons/StarRailMark'

export default function PublishPage() {
  const navigate = useNavigate()
  const session = useCheckinStore((s) => s.session)
  const markPublished = useCheckinStore((s) => s.markPublished)
  const addPost = useLocalPostsStore((s) => s.addPost)
  const profile = useUserStore((s) => s.profile)

  const defaultTitle = session ? `我的${session.cityName}${session.celebName}打卡路线 ✦` : ''
  const [title, setTitle] = useState(defaultTitle)
  const [feeling, setFeeling] = useState('')

  const firstLocationId = session?.locationIds[0]
  // 封面：本次路线中某个地点已有图片（数据层派生，不新增图片资源）
  const { data: coverLoc } = useAsync(
    () => (firstLocationId ? getLocation(firstLocationId) : Promise.resolve(null)),
    [firstLocationId],
  )

  if (!session) {
    return <Navigate to="/" replace />
  }
  if (session.checkedLocationIds.length < session.locationIds.length) {
    return <Navigate to="/checkin" replace />
  }

  const checkedNames = session.locationIds.map((id) => getLocationRefSync(id)?.name ?? id)
  const finishedAt = session.completedAt ?? new Date().toISOString()
  const cover = coverLoc?.stats.coverImage ?? ''

  const buildContent = (text: string): string => {
    const lines = [
      '已完成：',
      ...checkedNames.map((n) => `✦ ${n}`),
      '',
      text.trim() ? text.trim() : '',
    ].filter((l, i, arr) => !(l === '' && (i === 0 || i === arr.length - 1)))
    return lines.join('\n').trim()
  }

  const handlePublish = () => {
    const post: LocalPost = {
      id: `post_local_${Date.now()}`,
      type: 'checkin',
      authorId: profile.id,
      author: { nickname: profile.nickname, avatar: profile.avatar },
      locationIds: [...session.locationIds],
      routeId: session.routeId,
      title: title.trim() || defaultTitle,
      content: buildContent(feeling),
      images: cover ? [cover] : [],
      tags: ['打卡路线', session.cityName],
      likes: 0,
      collected: 0,
      comments: [],
      postedAt: new Date().toISOString(),
    }
    addPost(post)
    markPublished(post.id)
  }

  const publishedPostId = session.publishedPostId

  // —— 发布成功态 ——
  if (publishedPostId) {
    return (
      <div className="xr-container xr-page">
        <div className="xr-publish-success">
          <div className="xr-ai-placeholder__mark">
            <CheckCircle2 size={36} strokeWidth={1.8} color="var(--gold-500)" />
          </div>
          <h1>已发布到星途社区</h1>
          <p>你的打卡记录已经成为社区的一部分。</p>
          <div className="xr-publish-success__cta">
            <button className="xr-btn xr-btn--accent xr-btn--lg" onClick={() => navigate('/community')}>
              回到社区
            </button>
            <button
              className="xr-btn xr-btn--secondary xr-btn--md"
              onClick={() => navigate(`/post/${publishedPostId}`)}
            >
              查看我的帖子
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="xr-container xr-page">
      <button className="xr-back-row" onClick={() => navigate('/checkin')}>
        <ArrowLeft size={16} strokeWidth={1.8} />
        返回打卡
      </button>

      <header className="xr-checkin-head">
        <h1>分享这次打卡</h1>
      </header>

      <div className="xr-publish-grid">
        {/* —— 左：概览 + 感受 —— */}
        <div className="xr-publish-form">
          <div className="xr-card xr-publish-summary">
            <p className="xr-publish-summary__name">
              <StarRailMark size={15} />
              {session.routeName}
            </p>
            <p className="xr-publish-summary__meta">
              {formatDate(finishedAt)} · 完成 {session.checkedLocationIds.length} 个地点
            </p>
            <ul className="xr-publish-summary__list">
              {checkedNames.map((n) => (
                <li key={n}>
                  <Star size={12} strokeWidth={1.8} color="var(--gold-600)" />
                  {n}
                </li>
              ))}
            </ul>
          </div>

          <div className="xr-field">
            <label className="xr-publish-label" htmlFor="xr-publish-title">
              帖子标题
            </label>
            <input
              id="xr-publish-title"
              className="xr-publish-input"
              value={title}
              maxLength={40}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="xr-publish-hint">默认标题，可自行修改</p>
          </div>

          <div className="xr-field">
            <label className="xr-publish-label" htmlFor="xr-publish-feeling">
              打卡感受
            </label>
            <textarea
              id="xr-publish-feeling"
              className="xr-publish-input xr-publish-textarea"
              placeholder="记录一下这次追星之旅……"
              value={feeling}
              maxLength={500}
              onChange={(e) => setFeeling(e.target.value)}
            />
          </div>
        </div>

        {/* —— 右：帖子预览 —— */}
        <aside className="xr-card xr-publish-preview">
          <p className="xr-publish-preview__label">发布预览</p>
          {cover && <SmartImage src={cover} alt="打卡封面" ratio="16 / 9" />}
          <h2 className="xr-publish-preview__title">{title.trim() || defaultTitle}</h2>
          <p className="xr-publish-preview__meta">
            {profile.nickname} · {formatDate(new Date().toISOString())}
          </p>
          <div className="xr-publish-preview__content">
            <p>已完成：</p>
            {checkedNames.map((n) => (
              <p key={n}>✦ {n}</p>
            ))}
            {feeling.trim() && <p className="xr-publish-preview__feeling">{feeling.trim()}</p>}
          </div>
          <button
            className="xr-btn xr-btn--primary xr-btn--lg"
            onClick={handlePublish}
            disabled={coverLoc === null}
          >
            {coverLoc === null ? '封面准备中…' : '发布到社区'}
          </button>
          <p className="xr-publish-hint">发布后帖子将出现在社区推荐流中（本地演示数据）</p>
        </aside>
      </div>
    </div>
  )
}
