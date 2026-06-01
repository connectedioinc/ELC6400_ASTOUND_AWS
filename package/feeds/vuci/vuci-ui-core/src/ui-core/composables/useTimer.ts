import { onUnmounted, watchEffect } from 'vue'

import { Timer, type TimerOptions } from '../utils/timer'
import { useMainStore } from '@/stores/main'
import { isArray } from '@ui-core/utils/inspect'

export function useTimer(options: TimerOptions) {
  const store = useMainStore()
  const timer = new Timer(options)

  function isInGroup(group: string) {
    return timer.group === group || (isArray(timer.group) && timer.group.includes(group))
  }

  watchEffect(() => {
    if (isInGroup('edit')) {
      store.modalOpen ? timer.stop() : timer.start()
    }
    if (isInGroup('spinner') && !store.modalOpen) {
      store.spinner.spinning ? timer.stop() : timer.start()
    }
  })

  onUnmounted(() => {
    timer.stop()
  })

  return timer
}
