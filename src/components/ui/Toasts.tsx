import { CheckCircle2 } from 'lucide-react'
import { useUserStore } from '@/store/userStore'

/** 全局轻量 Toast：成功反馈 + 行动引导 */
export default function Toasts() {
  const toast = useUserStore((s) => s.toast)
  const clearToast = useUserStore((s) => s.clearToast)

  if (!toast) return null

  return (
    <div className="xr-toast" role="status" onClick={clearToast}>
      <CheckCircle2 size={18} strokeWidth={1.8} color="var(--success)" />
      <span>{toast.text}</span>
    </div>
  )
}
