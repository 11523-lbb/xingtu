import StarRailMark from '@/components/icons/StarRailMark'

interface Props {
  message: string
  onBack: () => void
}

/** Agent 结构化错误视图（执行页/结果页共用）：产品化文案，绝不出现「AI 出错了」 */
export default function AgentErrorView({ message, onBack }: Props) {
  return (
    <div className="xr-plan-page">
      <div className="xr-container">
        <div className="xr-exec-error">
          <div className="xr-ai-placeholder__mark">
            <StarRailMark size={36} />
          </div>
          <h1>这次没能完成规划</h1>
          <p className="xr-exec-error__message">{message}</p>
          <p className="xr-exec-error__hint">调整一下时间或条件，星途可以再试一次。已填写的内容不会丢失。</p>
          <button className="xr-btn xr-btn--accent xr-btn--md" onClick={onBack}>
            返回调整条件
          </button>
        </div>
      </div>
    </div>
  )
}
