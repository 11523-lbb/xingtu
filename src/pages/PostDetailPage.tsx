import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Camera, Heart, Lightbulb, MapPin, Share2, Star } from 'lucide-react'
import { getPost, getRelatedPosts } from '@/services/data'
import { useAsync } from '@/hooks/useAsync'
import { useUserStore } from '@/store/userStore'
import { formatDateTime } from '@/utils/format'
import SmartImage from '@/components/ui/SmartImage'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import PostTypeBadge from '@/components/ui/PostTypeBadge'
import { ActionBar, PostRow } from '@/components/feed/PostCard'
import StarRailTimeline from '@/components/route/StarRailTimeline'
import CommentList from '@/components/post/CommentList'
import AIEntryCard from '@/components/ai/AIEntryCard'

/** 帖子详情：打卡帖强调照片与地点 / 攻略帖展示亮点与拍照建议 / 路线帖展示星轨时间轴 */
export default function PostDetailPage() {
  const navigate = useNavigate()
  const { postId = '' } = useParams()
  const [imgIdx, setImgIdx] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [commentFocus, setCommentFocus] = useState(false)

  const { data, loading } = useAsync(
    () =>
      Promise.all([getPost(postId), getRelatedPosts(postId)]).then(([post, related]) => ({
        post,
        related,
      })),
    [postId],
  )

  const myComments = useUserStore((s) => s.myComments[postId] ?? [])
  const profile = useUserStore((s) => s.profile)
  const addComment = useUserStore((s) => s.addComment)
  const wanted = useUserStore((s) => s.wantedLocationIds)
  const toggleWanted = useUserStore((s) => s.toggleWanted)
  const showToast = useUserStore((s) => s.showToast)

  useEffect(() => {
    setImgIdx(0)
    setCommentText('')
  }, [postId])

  const submitComment = () => {
    const text = commentText.trim()
    if (!text) return
    addComment(postId, text)
    setCommentText('')
  }

  if (loading || !data) {
    return (
      <div className="xr-container xr-page">
        <div className="xr-skeleton" style={{ height: 40, width: 120, marginBottom: 16 }} />
        <div className="xr-skeleton" style={{ height: 420, marginBottom: 20, borderRadius: 'var(--r-lg)' }} />
        <div className="xr-skeleton" style={{ height: 28, width: '60%', marginBottom: 12 }} />
        <div className="xr-skeleton" style={{ height: 16, width: '90%', marginBottom: 8 }} />
        <div className="xr-skeleton" style={{ height: 16, width: '75%' }} />
      </div>
    )
  }

  const { post, related } = data
  const firstLocation = post.locations[0]
  const isWanted = firstLocation ? wanted.includes(firstLocation.id) : false
  const allComments = [...post.comments, ...myComments]

  return (
    <div className="xr-container xr-page">
      <button className="xr-back-row" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} strokeWidth={1.8} />
        返回
      </button>

      <div className="xr-detail-layout">
        {/* —— 主栏 —— */}
        <div className="xr-post-detail">
          {/* 图片区 */}
          <div className="xr-post-detail__media">
            <SmartImage src={post.images[imgIdx] ?? post.images[0]} alt={post.title} ratio="16 / 9" className="xr-post-detail__main-img" />
            {post.images.length > 1 && (
              <div className="xr-post-detail__thumbs">
                {post.images.map((img, i) => (
                  <button
                    key={i}
                    className={`xr-post-detail__thumb${i === imgIdx ? ' xr-post-detail__thumb--active' : ''}`}
                    onClick={() => setImgIdx(i)}
                  >
                    <SmartImage src={img} alt={`配图 ${i + 1}`} ratio="1 / 1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 标题与元信息 */}
          <div className="xr-post-detail__head">
            <h1 className="xr-post-detail__title">{post.title}</h1>
            <div className="xr-post-detail__badges">
              <PostTypeBadge type={post.type} />
              {post.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
              {post.locations.map((l) => (
                <Tag key={l.id} variant="violet">
                  <MapPin size={12} strokeWidth={1.8} />
                  {l.name}
                </Tag>
              ))}
            </div>
            <div className="xr-post-detail__author">
              <Avatar src={post.author.avatar} name={post.author.nickname} size={40} />
              <div>
                <p className="xr-post-detail__author-name">{post.author.nickname}</p>
                <p className="xr-post-detail__author-time">{formatDateTime(post.postedAt)}</p>
              </div>
            </div>
          </div>

          {/* 正文 */}
          <p className="xr-post-detail__content">{post.content}</p>

          {/* 攻略帖：亮点 + 拍照建议 */}
          {post.type === 'guide' && post.highlights.length > 0 && (
            <div className="xr-guide-block">
              <h3 className="xr-guide-block__title">
                <Star size={16} strokeWidth={1.8} color="var(--gold-600)" />
                打卡攻略亮点
              </h3>
              <div className="xr-guide-block__highlights">
                {post.highlights.map((h, i) => (
                  <div key={h} className="xr-guide-block__item">
                    <span className="xr-guide-block__no num">{i + 1}</span>
                    {h}
                  </div>
                ))}
              </div>
              {post.photoTips && (
                <div className="xr-guide-block__tips">
                  <Camera size={16} strokeWidth={1.8} color="var(--violet-600)" />
                  <div>
                    <p className="xr-guide-block__tips-label">拍照建议</p>
                    <p>{post.photoTips}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 路线帖：星轨时间轴 */}
          {post.type === 'route' && post.route && (
            <div className="xr-guide-block">
              <h3 className="xr-guide-block__title">
                <Star size={16} strokeWidth={1.8} color="var(--gold-600)" />
                路线安排
              </h3>
              <StarRailTimeline route={post.route} />
              <button
                className="xr-btn xr-btn--soft-gold xr-btn--md"
                style={{ marginTop: 16 }}
                onClick={() => navigate(`/route/${post.route!.id}`)}
              >
                查看完整路线
              </button>
            </div>
          )}

          {/* 互动栏 */}
          <div className="xr-post-detail__actions">
            <ActionBar
              postId={post.id}
              likes={post.likes}
              collected={post.collected}
              commentCount={allComments.length}
              onComment={() => setCommentFocus(true)}
            />
            {firstLocation && (
              <button
                className={`xr-btn xr-btn--soft xr-btn--sm${isWanted ? ' xr-btn--wanted' : ''}`}
                onClick={() => toggleWanted(firstLocation.id)}
              >
                <Heart size={15} strokeWidth={1.8} fill={isWanted ? 'currentColor' : 'none'} />
                {isWanted ? '已加入想去' : `想去「${firstLocation.name.slice(0, 6)}」`}
              </button>
            )}
            <span className="xr-post-detail__actions-spacer" />
            <button
              className="xr-btn xr-btn--secondary xr-btn--sm"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
                showToast('链接已复制，去分享给同好吧')
              }}
            >
              <Share2 size={15} strokeWidth={1.8} />
              分享
            </button>
          </div>

          {/* AI 入口（攻略/打卡帖场景 → 规划上下文） */}
          {firstLocation && post.type !== 'route' && (
            <div className="xr-section--first">
              <AIEntryCard
                variant="feed"
                text={`想去「${firstLocation.name}」打卡？把这篇攻略变成你的路线`}
                actionLabel="用 AI 规划我的路线"
                onAction={() => navigate(`/ai/planning?locationId=${firstLocation.id}`)}
              />
            </div>
          )}

          {/* 评论 */}
          <div className="xr-post-detail__comments">
            <h3 className="xr-guide-block__title">
              <Lightbulb size={16} strokeWidth={1.8} color="var(--gold-600)" />
              评论 · {allComments.length}
            </h3>
            <CommentList comments={allComments} />
            <div className="xr-comment-input">
              <Avatar src={profile.avatar} name={profile.nickname} size={32} />
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onFocus={() => setCommentFocus(true)}
                placeholder="说点什么…"
                maxLength={200}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <button
                className="xr-btn xr-btn--primary xr-btn--sm"
                disabled={!commentText.trim()}
                onClick={submitComment}
              >
                发送
              </button>
            </div>
            {commentFocus && !commentText.trim() && (
              <p className="xr-comment-input__hint">评论发布后仅保存在本地演示状态</p>
            )}
          </div>
        </div>

        {/* —— 右栏 —— */}
        <aside className="xr-rail">
          {/* 作者卡 */}
          <div className="xr-card xr-rail-card xr-author-card">
            <Avatar src={post.author.avatar} name={post.author.nickname} size={56} ring />
            <p className="xr-author-card__name">{post.author.nickname}</p>
            <p className="xr-author-card__bio">{post.author.bio}</p>
            <p className="xr-author-card__stats num">
              粉丝 {post.author.followers} · 获赞 {post.author.likesReceived}
            </p>
            <FollowButton userId={post.author.id} />
          </div>

          {/* 关联地点 */}
          {post.locations.length > 0 && (
            <div className="xr-card xr-rail-card">
              <h3 className="xr-rail-card__title">关联地点</h3>
              {post.locations.map((l) => (
                <div key={l.id} className="xr-loc-mini" onClick={() => navigate(`/location/${l.id}`)}>
                  <MapPin size={16} strokeWidth={1.8} color="var(--violet-600)" />
                  <div>
                    <p className="xr-loc-mini__name">{l.name}</p>
                    <p className="xr-loc-mini__meta">
                      {l.celebrityName} · {l.cityName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 相关帖子 */}
          {related.length > 0 && (
            <div className="xr-card xr-rail-card">
              <h3 className="xr-rail-card__title">同地点内容</h3>
              <div className="xr-rail-card__posts">
                {related.map((p) => (
                  <PostRow key={p.id} post={p} />
                ))}
              </div>
            </div>
          )}

          {/* 相关路线（路线帖） */}
          {post.route && (
            <div className="xr-card xr-rail-card">
              <h3 className="xr-rail-card__title">本路线包含地点</h3>
              {post.route.stops.map((s) => (
                <div key={s.location.id} className="xr-loc-mini">
                  <span className="xr-rail-card__stop-no num">{post.route!.stops.indexOf(s) + 1}</span>
                  <div>
                    <Link to={`/location/${s.location.id}`} className="xr-loc-mini__name">
                      {s.location.name}
                    </Link>
                    <p className="xr-loc-mini__meta num">
                      {s.arriveAt} – {s.leaveAt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function FollowButton({ userId }: { userId: string }) {
  const following = useUserStore((s) => s.followingIds.includes(userId))
  const toggleFollow = useUserStore((s) => s.toggleFollow)
  const profile = useUserStore((s) => s.profile)
  if (userId === profile.id) return null

  return (
    <button
      className={`xr-btn xr-btn--sm ${following ? 'xr-btn--secondary' : 'xr-btn--soft-violet'}`}
      onClick={() => toggleFollow(userId)}
    >
      {following ? '已关注' : '+ 关注'}
    </button>
  )
}
