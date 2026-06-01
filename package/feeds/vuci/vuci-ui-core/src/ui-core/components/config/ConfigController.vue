<template>
  <slot
    :submit="handleSubmit"
    :soft-save="softSave"
    :back="back"
    :can-go-back="canGoBack"
    :changed="changed"
  />
</template>
<script lang="ts">
type Controllable = {
  isMutating: Readonly<Ref<boolean>>
  changed: ComputedRef<boolean>
  valid: ComputedRef<boolean>
  validate: () => Promise<boolean>
  /**
   * must return false to stop saving, if undefined or true is returned, the save will continue
   */
  save: () => Promise<boolean>
  softSave: () => Promise<boolean> | boolean
}

export type ControllerContext = {
  canGoBack: boolean
  back: () => void
  handleSubmit: () => Promise<void>
  softSave: () => Promise<void>
  readonly: Readonly<Ref<boolean>>
  changed: ComputedRef<boolean>
  valid: ComputedRef<boolean>
  add: (item: Controllable) => () => void
  remove: (item: Controllable) => void
  isMutating: ComputedRef<boolean>
}

export const [provideControllerContext, injectControllerContext] = createContext<ControllerContext>('config-controller')
</script>

<script setup lang="ts">
import { createContext } from '@ui-core/utils/create-context'
import type { ComputedRef, Ref } from 'vue'
import { computed, shallowRef, onUnmounted, toRef } from 'vue'
import { injectConfigRootContext } from './ConfigRoot.vue'
import { showUnsavedPrompt } from './utils'

type Props = {
  readonly?: boolean
  throwOnError?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  throwOnError: false,
  readonly: false
})

const context = injectConfigRootContext()
const canGoBack = context.depth.value > 0
let back = () => {}
context.onModalOpen(() => {
  softSave()
})
if (canGoBack) {
  back = () => context.closeModal()
  const { off: removeHandler } = context.onModalClose(async event => {
    if (!changed.value) return
    const confirmLeave = await showUnsavedPrompt()
    if (!confirmLeave) event.preventDefault()
  })
  onUnmounted(() => {
    removeHandler()
  })
}

const children = shallowRef<Controllable[]>([])
const changed = computed(() => children.value.some(c => c.changed.value))
const valid = computed(() => children.value.every(c => c.valid.value))
const isMutating = computed(() => children.value.some(c => c.isMutating.value))

function add(item: Controllable) {
  children.value = [...children.value, item]
  return () => remove(item)
}

async function handleSubmit() {
  let success = true
  for (const child of children.value) {
    try {
      success &&= await child.save()
    } catch (error) {
      if (props.throwOnError) throw error
    }
  }
  if (success) back()
}

async function softSave() {
  for (const child of children.value) {
    try {
      await child.softSave()
    } catch (error) {
      // this should not happen
      if (props.throwOnError) throw error
    }
  }
}

function remove(item: Controllable) {
  children.value = children.value.filter(i => i !== item)
}

provideControllerContext({
  back,
  canGoBack,
  handleSubmit,
  softSave,
  readonly: toRef(props, 'readonly'),
  changed,
  valid,
  add,
  remove,
  isMutating
})
</script>
