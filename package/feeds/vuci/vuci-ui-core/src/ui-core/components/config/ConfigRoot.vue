<template>
  <slot> </slot>
  <TltModal
    :open="!!currentPage"
    size="big"
    :nav-bar="navBar"
    @close="closeModal"
  >
    <Component
      :is="currentPage!.component"
      v-bind="currentPage!.props"
    />
  </TltModal>
</template>

<script lang="ts">
export type EditProps<T, P = {}> = {
  entry: ConfigEntry<T>
  /**
   * name of the configuration
   */
  name: string
  title: string
  component: DefineComponent<P> | Component<P> | ComponentOptions<P>
  props: P
}

export type VContext = {
  client: Client
  navBar: ComputedRef<string[]>
  modalPages: Readonly<ShallowRef<EditProps<any, any>[]>>
  currentPage: ComputedRef<EditProps<any, any> | undefined>
  /**
   * opens edit modal with provided props. Invokes onModalOpen hook.
   */
  openModal: <T, P>(props: EditProps<T, P>) => Promise<void>
  /**
   * tries closing the current open modal window. Invokes onModalClose hook
   */
  closeModal: () => Promise<void>
  /**
   * the current depth of the modal navigation
   */
  depth: ComputedRef<number>
  /**
   * hook that will be invoked when `closeEdit` is called.
   * Page closing can be prevented by calling `event.preventDefault()` that's received as parameter
   * @example```js
   * onModalClose(event => event.preventDefault())
   * ```
   */
  onModalClose: EventHookOn<Event>
  /**
   * hook that will be invoked when `openEdit` is called.
   * Page opening can be prevented by calling `event.preventDefault()` that's received as parameter
   * @example```js
   * onModalOpen(event => event.preventDefault())
   * ```
   */
  onModalOpen: EventHookOn<Event>
}

export const [provideConfigRootContext, injectConfigRootContext] = createContext<VContext>('config-root')
</script>

<script setup lang="ts">
import { createContext } from '@ui-core/utils/create-context'
import { Client } from './query/client'
import { createEventHook, type EventHookOn } from '@vueuse/core'
import { shallowRef, computed } from 'vue'
import type { Component, ComponentOptions, DefineComponent, ComputedRef } from 'vue'
import type { ConfigEntry } from './query/collection-cache'
import type { ShallowRef } from 'vue'
import { provideClientContext } from './use-client'

type Props = {
  client?: Client
}
const props = withDefaults(defineProps<Props>(), {
  client: () => new Client({})
})

const modalPages = shallowRef<EditProps<any, any>[]>([])
const currentPage = computed(() => modalPages.value[modalPages.value.length - 1])
const navBar = computed(() => modalPages.value.map(p => p.title))
const depth = computed(() => modalPages.value.length)

const onModalCloseHook = createEventHook()
const onModalOpenHook = createEventHook()
const eventOptions = { cancelable: true, bubbles: false }

async function openModal<T, P = {}>(props: EditProps<T, P>) {
  const openEvent = new Event('modal-open', eventOptions)
  await onModalOpenHook.trigger(openEvent)
  if (openEvent.defaultPrevented) return
  modalPages.value = [...modalPages.value, props]
}

async function closeModal() {
  const closeEvent = new Event('modal-close', eventOptions)
  await onModalCloseHook.trigger(closeEvent)
  if (closeEvent.defaultPrevented) return
  if (modalPages.value.length === 0) return
  modalPages.value = modalPages.value.slice(0, -1)
}

provideClientContext(props.client)
provideConfigRootContext({
  client: props.client,
  modalPages: modalPages,
  currentPage,
  navBar,
  depth,
  onModalClose: onModalCloseHook.on,
  onModalOpen: onModalOpenHook.on,
  openModal,
  closeModal
})
</script>
