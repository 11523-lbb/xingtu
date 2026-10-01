import { BookOpen, Camera } from 'lucide-react'
import { POST_TYPE_LABELS } from '@/utils/format'
import type { PostType } from '@/types'
import StarRailMark from '@/components/icons/StarRailMark'
import Tag from './Tag'

interface Props {
  type: PostType
}

/** 帖子类型徽章：打卡(粉) / 攻略(紫) / 路线(金+星轨) —— 内容识别的视觉锚点 */
export default function PostTypeBadge({ type }: Props) {
  if (type === 'checkin') {
    return (
      <Tag variant="pink">
        <Camera size={12} strokeWidth={1.8} />
        {POST_TYPE_LABELS.checkin}
      </Tag>
    )
  }
  if (type === 'guide') {
    return (
      <Tag variant="violet">
        <BookOpen size={12} strokeWidth={1.8} />
        {POST_TYPE_LABELS.guide}
      </Tag>
    )
  }
  return (
    <Tag variant="gold">
      <StarRailMark size={12} />
      {POST_TYPE_LABELS.route}
    </Tag>
  )
}
