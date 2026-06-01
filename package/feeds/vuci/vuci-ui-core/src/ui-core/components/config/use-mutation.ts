import { onScopeDispose } from 'vue'
import { useClient } from './use-client'
import type { MutationOptions } from './query/mutation'
import type { Client } from './query/client'
import { checkIfInScope } from './utils'

export function useMutation<TArgs, TRes, TMutRes>(options: MutationOptions<TArgs, TRes, TMutRes>, client?: Client) {
  checkIfInScope('useMutation')
  client ||= useClient()
  const mutation = client.getMutationCache().build(options)

  const { isMutating, mutateAsync, mutationId } = mutation

  onScopeDispose(() => {
    mutation.destroy()
  })

  /**
   * mutation that catches errors and returns undefined.
   */
  async function mutate(args: TArgs) {
    return mutateAsync(args).catch(() => {})
  }

  return {
    mutateAsync,
    mutationId,
    isMutating,
    mutate
  }
}
