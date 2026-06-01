<template>
  <FormRoot
    v-if="dontHide || props.entry"
    v-slot="slotProps"
    :name="entry?.id"
    :default-values="entry?.data"
    :as="props.as"
    :as-child="props.asChild"
    :validate-submit="validateSubmit"
    :readonly="!entry || entry.meta?.loading || props.readonly"
  >
    <slot
      v-bind="slotProps"
      :id="id"
      :action-url="actionUrl"
    />
  </FormRoot>
</template>

<script lang="ts">
type ReadonlyShallow<T> = Readonly<ShallowRef<T>>

type MutationItemContext = {
  id: ReadonlyShallow<string>
  actionUrl: ReadonlyShallow<string>
  readonly: ReadonlyShallow<boolean>
  entry: ReadonlyShallow<ConfigEntry<any> | undefined>
}

export const [provideMutationItemContext, injectMutationItemContext] = createContext<MutationItemContext>('config-mutation-item')
</script>

<script setup lang="ts" generic="T extends Record<string, any>">
import type { PrimitiveProps } from '@components/primitive/Primitive.vue'
import type { ConfigEntry } from './query/collection-cache'
import { FormRoot } from '@components/form'
import { computed, toRef, type ShallowRef } from 'vue'
import { injectMutationContext } from './ConfigMutation.vue'
import { createContext } from '@ui-core/utils/create-context'
import type { FormValidateFn } from '@components/form/use-form'

type Props = PrimitiveProps & {
  /**
   * might be undefined, but must be provided for better DX, to not forget why something is not rendering
   */
  entry: ConfigEntry<T> | undefined
  validateSubmit?: FormValidateFn<T>
  readonly?: boolean
  /**
   * whether the form should be hidden if there's no entry given. Can be used to display the form in readonly state if no entry was given yet.
   */
  dontHide?: boolean
}
const props = defineProps<Props>()

const ctx = injectMutationContext()

const id = computed(() => {
  if (props.entry) {
    return props.entry.original[ctx.idKey as string]
  }
  return ''
})

const actionUrl = computed(() => `${ctx.baseUrl}/${id.value}`)

provideMutationItemContext({
  id: id,
  actionUrl: actionUrl,
  readonly: toRef(props, 'readonly'),
  entry: toRef(() => props.entry)
})
</script>
