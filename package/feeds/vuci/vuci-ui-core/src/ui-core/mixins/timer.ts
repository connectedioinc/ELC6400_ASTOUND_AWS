import type { ComponentOptions } from 'vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { TimerController, type TimerOptions } from '../utils/timer'

type ComponentTimerOption = {
  [key: string]: Omit<TimerOptions, 'method'>
}

declare module 'vue' {
  interface ComponentCustomOptions {
    timers?: ComponentTimerOption
  }
}

export default {
  computed: {
    ...mapState(useMainStore, {
      _modalOpen: state => state.modalOpen,
      _spinning: state => state.spinner.spinning
    })
  },
  watch: {
    _modalOpen(open) {
      open ? this.$timer.stopAll('edit') : this.$timer.startAll('edit')
    },
    _spinning(spin) {
      if (this._modalOpen) return
      spin ? this.$timer.stopAll('spinner') : this.$timer.startAll('spinner')
    }
  },
  created() {
    const timerOptions: ComponentTimerOption = this.$options.timers ?? {}
    const options: TimerOptions[] = Object.entries(timerOptions).map(([methodName, params]) => {
      const method = this[methodName]
      if (typeof method !== 'function') throw new Error(`[timer]: method ${methodName} does not exist.`)
      return {
        method,
        ...params
      } satisfies TimerOptions
    })
    this.$timer = new TimerController(options)
    const store = useMainStore()
    store.$onAction(({ name, after }) => {
      after(() => name === 'clearStore' && this.$timer.destroyAll())
    })
  },
  beforeUnmount() {
    this.$timer.destroyAll()
  }
} as ComponentOptions
