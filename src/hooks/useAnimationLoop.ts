import { useEffect, useRef, useCallback } from 'react'

export function useAnimationLoop(callback: () => void, isRunning: boolean) {
  const requestRef = useRef<number>()
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const animate = useCallback(() => {
    callbackRef.current()
    requestRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [isRunning, animate])
}
