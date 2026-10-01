import { useNavigate } from 'react-router-dom'
import { Bookmark, Heart, MapPin, MessageCircle } from 'lucide-react'
import type { PostView } from '@/types'
import { formatCount, formatDuration } from '@/utils/format'
import { useUserStore } from '@/store/userStore'
import SmartImage from '@/components/ui/SmartImage'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import PostTypeBadge from '@/components/ui/PostTypeBadge'
import StarRailStrip from '@/components/route/StarRailStrip'

/* ---------- 互动栏（卡片与详情页共用） ---------- */

interface ActionBarProps {
  postId: string
  likes: number
  collected: number
  commentCount: number
  dark?: boolean
  onLike?: () => void
  onCollect?: () => void
  onComment?: () => void
}

export function ActionBar({ postId, likes, collected, commentCount, dark, onLike, onCollect, onComment }: ActionBarProps) {
  const liked = useUserStore((s) => s.likedPostIds.includes(postId))
  const collectedPost = useUserStore((s) => s.collectedPostIds.includes(postId))
  const toggleLike = useUserStore((s) => s.toggleLikePost)
  const toggleCollect = useUserStore((s) => s.toggleCollectPost)

  const base = `xr-action${dark ? ' xr-action--dark' : ''}`

  return (
    <div className="xr-actions">
      <button
        className={`${base}${liked ? ' xr-action--liked' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onLike?.()
          toggleLike(postId)
        }}
        aria-label="点赞"
      >
        <Heart size={18} strokeWidth={1.8} fill={liked ? 'currentColor' : 'none'} />
        <span className="num">{formatCount(likes + (liked ? 1 : 0))}</span>
      </button>
      <button
        className={`${base}${collectedPost ? ' xr-action--collected' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onCollect?.()
          toggleCollect(postId)
        }}
        aria-label="收藏"
      >
        <Bookmark size={18} strokeWidth={1.8} fill={collectedPost ? 'currentColor' : 'none'} />
        <span className="num">{formatCount(collected + (collectedPost ? 1 : 0))}</span>
      </button>
      <button className={base} onClick={(e) => { e.stopPropagation(); onComment?.() }} aria-label="评论">
        <MessageCircle size={18} strokeWidth={1.8} />
        <span className="num">{commentCount}</span>
      </button>
    </div>
  )
}

/* ---------- 作者行 ---------- */

function AuthorRow({ post, dark }: { post: PostView; dark?: boolean }) {
  return (
    <div className={`xr-author-row${dark ? ' xr-author-row--dark' : ''}`}>
      <Avatar src={post.author.avatar} name={post.author.nickname} size={28} />
      <span className="xr-author-row__name">{post.author.nickname}</span>
    </div>
  )
}

/* ---------- 帖子卡片（三态：照片 / 攻略 / 路线） ---------- */

interface PostCardProps {
  post: PostView
}

export default function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate()

  if (post.type === 'guide') return <GuideCard post={post} onClick={() => navigate(`/post/${post.id}`)} />
  if (post.type === 'route') return <RouteShareCard post={post} onClick={() => navigate(`/post/${post.id}`)} />
  return <CheckinCard post={post} onClick={() => navigate(`/post/${post.id}`)} />
}

/** 打卡照片帖：照片主导（≥65% 卡面）+ 地点玻璃标签 */
function CheckinCard({ post, onClick }: { post: PostView; onClick: () => void }) {
  const navigate = useNavigate()
  return (
    <article className="xr-card xr-card--hover xr-post-card" onClick={onClick}>
      <div className="xr-post-card__photo">
        <SmartImage src={post.images[0]} alt={post.title} ratio="3 / 4" />
        {post.locations[0] && (
          <button
            className="xr-post-card__locchip"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/location/${post.locations[0].id}`)
            }}
          >
            <MapPin size={12} strokeWidth={1.8} />
            {post.locations[0].name}
          </button>
        )}
      </div>
      <div className="xr-post-card__body">
        <h3 className="xr-post-card__title">{post.title}</h3>
        <AuthorRow post={post} />
        <ActionBar
          postId={post.id}
          likes={post.likes}
          collected={post.collected}
          commentCount={post.comments.length}
        />
      </div>
    </article>
  )
}

/** 攻略帖：文字主导 + 亮点 chips + 缩略图 */
function GuideCard({ post, onClick }: { post: PostView; onClick: () => void }) {
  return (
    <article className="xr-card xr-card--hover xr-post-card xr-post-card--guide" onClick={onClick}>
      <div className="xr-post-card__body">
        <div className="xr-post-card__meta">
          <PostTypeBadge type="guide" />
          {post.tags.slice(0, 2).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <h3 className="xr-post-card__title">{post.title}</h3>
        <p className="xr-post-card__excerpt">{post.content}</p>
        {post.highlights.length > 0 && (
          <div className="xr-post-card__highlights">
            {post.highlights.slice(0, 3).map((h) => (
              <Tag key={h} variant="gold">
                {h}
              </Tag>
            ))}
          </div>
        )}
        {post.images.length > 0 && (
          <div className="xr-post-card__thumbs">
            {post.images.slice(0, 3).map((img, i) => (
              <SmartImage key={i} src={img} alt={`${post.title} 配图 ${i + 1}`} ratio="1 / 1" />
            ))}
          </div>
        )}
        <AuthorRow post={post} />
        <ActionBar
          postId={post.id}
          likes={post.likes}
          collected={post.collected}
          commentCount={post.comments.length}
        />
      </div>
    </article>
  )
}

/** 路线分享帖：夜域卡 + 星轨节点条（光域 Feed 中的品牌节奏点） */
function RouteShareCard({ post, onClick }: { post: PostView; onClick: () => void }) {
  const route = post.route
  return (
    <article className="xr-card--night xr-post-card xr-post-card--route" onClick={onClick}>
      <div className="xr-post-card__body">
        <div className="xr-post-card__meta">
          <PostTypeBadge type="route" />
          {route && <Tag variant="night-gold">{route.theme}</Tag>}
        </div>
        {route && <StarRailStrip count={Math.min(route.stops.length, 6)} />}
        <h3 className="xr-post-card__title xr-post-card__title--night">{post.title}</h3>
        {route && (
          <div className="xr-post-card__route-meta num">
            {route.stops.length} 个地点 · {formatDuration(route.totalMin)}
          </div>
        )}
        <AuthorRow post={post} dark />
        <ActionBar
          postId={post.id}
          likes={post.likes}
          collected={post.collected}
          commentCount={post.comments.length}
          dark
        />
      </div>
    </article>
  )
}

/* ---------- 紧凑行（地点详情页帖子列表 / 搜索页结果） ---------- */

interface PostRowProps {
  post: PostView
}

export function PostRow({ post }: PostRowProps) {
  const navigate = useNavigate()
  return (
    <article className="xr-post-row" onClick={() => navigate(`/post/${post.id}`)}>
      <SmartImage src={post.images[0]} alt={post.title} ratio="4 / 3" className="xr-post-row__thumb" />
      <div className="xr-post-row__body">
        <div className="xr-post-row__meta">
          <PostTypeBadge type={post.type} />
          <span className="xr-post-row__time num">{post.comments.length} 评</span>
        </div>
        <h3 className="xr-post-row__title">{post.title}</h3>
        <div className="xr-post-row__author">
          <Avatar src={post.author.avatar} name={post.author.nickname} size={18} />
          <span>{post.author.nickname}</span>
          <Heart size={12} strokeWidth={1.8} color="var(--pink-500)" fill="var(--pink-500)" />
          <span className="num">{formatCount(post.likes)}</span>
        </div>
      </div>
    </article>
  )
}
