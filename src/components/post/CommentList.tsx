import { Heart } from 'lucide-react'
import type { CommentEntity } from '@/types'
import { getUserPublic } from '@/services/data'
import { formatCount, timeAgo } from '@/utils/format'
import Avatar from '@/components/ui/Avatar'

interface Props {
  comments: CommentEntity[]
}

/** 评论列表：数据全部来自 mock 内嵌评论 + 当前用户本地新增（store 合并后传入） */
export default function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return <p className="xr-comments-empty">还没有评论，来抢沙发吧</p>
  }

  return (
    <div className="xr-comments">
      {comments.map((c) => {
        const author = getUserPublic(c.authorId)
        return (
          <div key={c.id} className="xr-comment">
            <Avatar
              src={author?.avatar ?? ''}
              name={author?.nickname ?? '用户'}
              size={28}
            />
            <div className="xr-comment__body">
              <div className="xr-comment__head">
                <span className="xr-comment__name">{author?.nickname ?? '用户'}</span>
                <span className="xr-comment__time">{timeAgo(c.postedAt)}</span>
              </div>
              <p className="xr-comment__content">{c.content}</p>
              <div className="xr-comment__foot">
                <Heart size={12} strokeWidth={1.8} color="var(--pink-500)" />
                <span className="num">{formatCount(c.likes)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
