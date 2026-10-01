import { useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
}

/** 统一异步数据加载：返回 data/loading，页面配合骨架屏渲染 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true })

  useEffect(() => {
    let alive = true
    setState({ data: null, loading: true })
    fn().then((d) => {
      if (alive) setState({ data: d, loading: false })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
