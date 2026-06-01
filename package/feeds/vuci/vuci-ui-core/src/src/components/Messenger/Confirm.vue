<template>
  <tlt-modal
    ref="modal"
    :open="open"
    size="small"
    class="z-40"
    container-class="confirm"
    @close="onCancelClicked"
  >
    <template #custom>
      <tlt-button
        class="absolute right-4 md:right-5 top-4 md:top-5 hover:text-theme-text-primary"
        type="text"
        color="tertiary"
        button-id="close"
        :disabled="false"
        @click="onCancelClicked"
      >
        <tlt-icon
          icon="x"
          class="size-6"
        />
      </tlt-button>
      <div class="text-body-secondary md:text-body-main flex gap-6 mx-1 flex-col items-center lg:items-start text-center lg:text-left lg:flex-row lg:justify-start">
        <tlt-icon
          v-if="resolvedIconConfig"
          :icon="resolvedIconConfig.name"
          class="size-10 shrink-0 mt-7 lg:mt-0"
          :class="resolvedIconConfig.class"
        />
        <div class="grow">
          <h2
            test-id="modal-title"
            class="font-semibold text-body-main md:text-salmon mb-4 px-6 lg:pl-0"
          >
            {{ title }}
          </h2>
          <Content />
        </div>
      </div>
      <hr class="mb-6 border-theme-border-base" />
      <div class="flex gap-8 justify-center lg:justify-end mx-1">
        <tlt-button
          v-if="cancelDisplay"
          button-id="cancel"
          color="secondary"
          :disabled="false"
          @click="onCancelClicked"
        >
          {{ cancelText ? cancelText : $t('No') }}
        </tlt-button>
        <tlt-button
          v-if="okDisplay"
          :disabled="false"
          button-id="ok"
          @click="onOkClicked"
        >
          {{ okText ? okText : $t('Yes') }}
        </tlt-button>
      </div>
    </template>
  </tlt-modal>
</template>

<script setup lang="ts">
import { useXss } from '@ui-core/plugins/xss'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import { isFunction, isString } from '@ui-core/utils/inspect'
import { noop } from '@ui-core/utils/props'
import { h, computed, type RenderFunction } from 'vue'

export type IconConfig = {
  name: Icon
  class: string
}
type Props = {
  icon?: IconConfig | Icon
  open: boolean
  title?: string
  content?: RenderFunction | string
  onOk?: () => void
  onCancel?: () => void
  cancelText?: string
  okText?: string
  okDisplay?: boolean
  cancelDisplay?: boolean
  rawhtml?: boolean
}
const emit = defineEmits<{ close: [] }>()

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '',
  content: '',
  onOk: noop,
  onCancel: noop,
  cancelText: '',
  cancelDisplay: true,
  okDisplay: true,
  okText: '',
  icon: undefined
})

const resolvedIconConfig = computed<IconConfig | null>(() => {
  if (!props.icon) return null
  return isString(props.icon) ? { name: props.icon, class: 'text-theme-text-primary' } : props.icon
})

const Content = computed(() => {
  if (isFunction(props.content)) return h('div', { class: 'mb-8' }, [props.content()])
  const xss = useXss()
  const [key, content] = props.rawhtml ? ['innerHTML', xss(props.content)] : ['innerText', props.content]
  return h('div', { class: 'mb-8', [key]: content })
})

function onCancelClicked() {
  props.onCancel()
  emit('close')
}
function onOkClicked() {
  props.onOk()
  emit('close')
}
</script>
