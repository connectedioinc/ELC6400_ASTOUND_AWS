import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios } from '@ui-core/plugins/axios'
import type { TimerOptions } from '@ui-core/utils/timer'
import { computed, ref, type Ref } from 'vue'

export function useLiveData<T>(endpoint: string, dataSpan: number, timerOptions?: Partial<TimerOptions>) {
  const message = useMessages()
  const $t = useTranslate()
  // not sure why 'as' was needed some kind of vue unwrapping magic fails probably
  const rawLiveData = ref<{ time: number; value: T }[]>([]) as Ref<{ time: number; value: T }[]>
  const liveDataTimer = useTimer({
    method: getLiveData,
    time: 3000,
    immediate: false,
    autostart: false,
    ...(timerOptions ?? {})
  })
  function getLiveData() {
    return axios
      .get(endpoint)
      .then(({ data }: { data: T }) => {
        const now = Date.now()
        rawLiveData.value.push({
          time: now,
          value: data
        })
        // Removes old data that is out of bounds
        if (rawLiveData.value.length > 1 && now - rawLiveData.value[0].time > dataSpan * 20) {
          rawLiveData.value = rawLiveData.value.slice(1)
        }
      })
      .catch(() => {
        message.error($t('Failed to load live data'))
      })
  }

  const lastLiveStatus = computed(() => {
    return rawLiveData.value.at(-1)?.value
  })
  return {
    liveDataTimer,
    rawLiveData,
    lastLiveStatus,
    getLiveData
  }
}
