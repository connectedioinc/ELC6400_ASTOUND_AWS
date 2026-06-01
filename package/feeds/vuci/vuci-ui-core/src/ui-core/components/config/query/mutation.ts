import { ref, type Ref } from 'vue'
import type { MutationCache } from './mutation-cache'
import { Subscribable } from './subscribable'

export type MutationOptions<TArgs, TResult, MutateResult> = {
  onMutate?: (args: TArgs) => Promise<MutateResult | undefined> | MutateResult
  mutation: (args: TArgs, onMutateResult: MutateResult | undefined) => Promise<TResult>
  onSuccess?: (result: TResult, args: TArgs, onMutateResult: MutateResult | undefined) => Promise<void> | void
  onError?: (error: any, args: TArgs, onMutateResult: MutateResult | undefined) => Promise<void> | void
  onSettled?: (result: TResult | undefined, error: undefined | any, args: TArgs, onMutateResult: MutateResult | undefined) => Promise<void> | void
}

export type MutateOptions<TArgs, TResult, MutateResult> = Omit<MutationOptions<TArgs, TResult, MutateResult>, 'onMutate' | 'mutation'>

type MutationConfig = {
  id: number
  mutationCache: MutationCache
}

export class Mutation<TArgs, TResult, MutateResult> extends Subscribable {
  mutationId: number
  isMutating: Ref<boolean>
  private mutationCache: MutationCache
  private options: MutationOptions<TArgs, TResult, MutateResult>
  constructor(config: MutationConfig, options: MutationOptions<TArgs, TResult, MutateResult>) {
    super()
    this.isMutating = ref(false)
    this.options = options
    this.mutationId = config.id
    this.mutationCache = config.mutationCache
    this.mutateAsync = this.mutateAsync.bind(this)
    this.destroy = this.destroy.bind(this)
  }

  async mutateAsync(args: TArgs, extraHooks: MutateOptions<TArgs, TResult, MutateResult> = {}): Promise<TResult> {
    this.isMutating.value = true
    let mutateResult: MutateResult | undefined = undefined
    try {
      mutateResult = await this.options.onMutate?.(args)
      const result = await this.options.mutation(args, mutateResult)

      await this.options.onSuccess?.(result, args, mutateResult)
      await extraHooks.onSuccess?.(result, args, mutateResult)

      await this.options.onSettled?.(result, undefined, args, mutateResult)
      await extraHooks.onSettled?.(result, undefined, args, mutateResult)

      return result
    } catch (e) {
      await this.options.onError?.(e, args, mutateResult)
      await extraHooks.onError?.(e, args, mutateResult)

      await this.options.onSettled?.(undefined, e, args, mutateResult)
      await extraHooks.onSettled?.(undefined, e, args, mutateResult)

      throw e
    } finally {
      this.isMutating.value = false
    }
  }
  destroy() {
    this.mutationCache.delete(this)
  }
}
