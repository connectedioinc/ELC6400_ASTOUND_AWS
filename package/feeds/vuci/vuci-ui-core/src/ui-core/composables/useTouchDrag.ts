import { ref } from 'vue'

export function useTouchDrag(options: { delay?: number; cancelDistance?: number; callback?: (event: TouchEvent) => void } = {}) {
  const { delay = 500, cancelDistance = 10, callback } = options

  const dragging = ref(false)

  let startPosition: { x: number; y: number } | null = null
  let timeout: any

  function onTouchstart(event: TouchEvent) {
    startPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY }

    timeout = setTimeout(() => {
      event.preventDefault()
      dragging.value = true
      callback?.(event)
    }, delay)
  }

  function onTouchmove(event: TouchEvent) {
    if (dragging.value) event.preventDefault()

    if (!startPosition) return
    const x = event.touches[0].clientX
    const y = event.touches[0].clientY
    const dx = Math.abs(x - startPosition.x)
    const dy = Math.abs(y - startPosition.y)
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > cancelDistance && !dragging.value) {
      clearTimeout(timeout)
      startPosition = null
    }
  }

  function onTouchend(event: TouchEvent) {
    if (dragging.value) event.preventDefault()

    dragging.value = false
    clearTimeout(timeout)
    startPosition = null
  }

  return {
    dragging,
    events: {
      onTouchstart,
      onTouchmove,
      onTouchend
    }
  }
}
