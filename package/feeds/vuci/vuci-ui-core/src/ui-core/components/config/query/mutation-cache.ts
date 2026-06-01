import { computed, shallowRef, triggerRef, type ComputedRef, type ShallowRef } from 'vue'
import { Mutation, type MutationOptions } from './mutation'

type AnyMutation = Mutation<any, any, any>

export class MutationCache {
  mutations: ShallowRef<Map<number, Mutation<any, any, any>>>
  all: ComputedRef<Mutation<any, any, any>[]>
  private newMutationId: number = 0
  constructor() {
    this.mutations = shallowRef(new Map())
    this.all = computed(() => [...this.mutations.value.values()])
  }
  build<TArgs, TRes, TMutateRes>(options: MutationOptions<TArgs, TRes, TMutateRes>) {
    const mutation = new Mutation(
      {
        mutationCache: this,
        id: this.newMutationId++
      },
      options
    )
    this.set(mutation)
    return mutation
  }

  get<TArgs, TRes, TMutateRes>(id: number) {
    return this.mutations.value.get(id) as Mutation<TArgs, TRes, TMutateRes> | undefined
  }

  set(mutation: AnyMutation) {
    if (!this.mutations.value.has(mutation.mutationId)) {
      this.mutations.value.set(mutation.mutationId, mutation)
      triggerRef(this.mutations)
    }
  }

  has(id: number) {
    return this.mutations.value.has(id)
  }

  delete(mutation: AnyMutation) {
    if (this.has(mutation.mutationId)) {
      this.mutations.value.delete(mutation.mutationId)
      triggerRef(this.mutations)
    }
  }
}
