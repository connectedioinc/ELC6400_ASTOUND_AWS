import { composeId } from '@ui-core/utils/core-utils'
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'

export function useComposedIds<TBase extends string | number | undefined, TPart extends string>(baseId: MaybeRefOrGetter<TBase>, parts: readonly TPart[]) {
  const main = computed(() => toValue(baseId)?.toString())
  return {
    /**
     * the main identifier (basically resolved baseId)
     */
    main,
    ...(Object.fromEntries(parts.map(part => [part, computed(() => (main.value ? composeId(main.value, part) : undefined))])) as Record<TPart, ComputedRef<string | undefined>>)
  }
}
