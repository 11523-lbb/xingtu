import type { PostView } from '@/types'
import PostCard from './PostCard'

/** 瀑布流 Feed：桌面 3 列 / 平板 2 列 / 小屏 1 列 */
export default function FeedGrid({ posts }: { posts: PostView[] }) {
  return (
    <div className="xr-feed">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  )
}
