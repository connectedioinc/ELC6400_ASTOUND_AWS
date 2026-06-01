import { watch } from 'vue'
import { Client } from './query/client'
import { checkIfInScope } from './utils'
import { useMainStore } from '@/stores/main'

export function useVuciClient() {
  checkIfInScope('createVuciClient')

  const client = new Client()
  const $store = useMainStore()
  // we're using two separate watchers instead of one, because watching both might cause issues when loading
  // and mutating at the same time (too much calls to the spin method)
  watch(
    () => client.isLoading.value,
    isLoading => {
      if (isLoading) {
        $store.spin()
      } else {
        $store.spin(false)
      }
    }
  )
  watch(
    () => client.isMutating.value,
    isMutating => {
      if (isMutating) {
        $store.spin()
      } else {
        $store.spin(false)
      }
    }
  )
  return client
}
