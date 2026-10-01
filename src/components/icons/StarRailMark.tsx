/* ============================================================
   星轨标记 —— 星途唯一品牌图标
   三节点短弧 + 星尘虚线 + 四角星终点
   用途：Logo、AI 功能入口、品牌时刻（禁止作装饰滥用）
   ============================================================ */
interface Props {
  size?: number
  className?: string
}

export default function StarRailMark({ size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* 星轨弧线（星尘虚线） */}
      <path
        d="M7 31 Q 18 6 32 14"
        stroke="#EACD8F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="0.5 4.2"
      />
      {/* 起点节点 */}
      <circle cx="7" cy="31" r="3" fill="#C39A45" />
      {/* 中点星尘 */}
      <circle cx="20" cy="16.5" r="2" fill="#DFB96A" />
      {/* 终点：四角星（主星） */}
      <path
        d="M32 7.5 l1.9 3.9 4.3 .6 -3.1 3 .7 4.3 -3.8-2 -3.8 2 .7-4.3 -3.1-3 4.3-.6 z"
        fill="#DFB96A"
      />
    </svg>
  )
}
