<template>
  <div class="max-w-full max-h-full h-full flex flex-col">
    <div
      ref="wrapper"
      class="tlt-input-wrapper overflow-hidden size-full max-w-full max-h-full relative lg:min-w-xs"
      :aria-disabled="disabled"
    >
      <textarea
        :id="inputId"
        ref="textarea"
        v-model="modelValue"
        :test-id="`textarea-${elementId || inputId}`"
        class="tlt-input-field max-w-full! max-h-full size-full"
        :class="[
          {
            'resize-y md:resize': !autoGrow && (resize === true || resize === 'both'),
            'resize-none md:resize-x': !autoGrow && resize === 'horizontal',
            'resize-y': !autoGrow && resize === 'vertical',
            'md:resize-x': autoGrow && (resize === true || resize === 'both'),
            'resize-none': !resize,
            'pr-10': copyButton || $slots.after
          },
          props.class
        ]"
        :placeholder="placeholder && $t('e.g., %s').format(placeholder)"
        :max-length="maxlength"
        :min-length="minlength"
        :readonly="readOnly"
        :data-state="inputState"
        :disabled="disabled"
        :rows="autoGrow ? undefined : rows"
      />
      <div
        v-if="copyButton || $slots.after"
        class="tlt-input-after top-0 right-0 py-1.5 inline-flex flex-col gap-1 align-top absolute"
      >
        <template v-if="copyButton">
          <tlt-button
            ref="copyBtn"
            type="text"
            color="tertiary"
            icon="copy"
            @click="onCopyClick"
          />
          <tlt-tooltip
            :target="() => copyBtn?.$el"
            :force-show="showTooltip"
            :triggers="[]"
            placement="left"
          >
            {{ $t('Copied!') }}
          </tlt-tooltip>
        </template>
        <slot name="after" />
      </div>
    </div>
    <div
      v-if="maxlength && !noCounter"
      class="flex tlt-input-placeholder mx-1 mt-1"
    >
      <div class="ml-auto">
        {{ '%s/%s'.format(modelValue.length, maxlength) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import { useMainStore } from '@/stores/main'
import type { BaseProps } from './_shared/input-props'
import { useCommonInjects } from './_shared/useCommonInjects'
import { copyToClipboard } from '@ui-core/plugins/helper'
import { useTextareaAutosize } from '@vueuse/core'

interface Props extends Omit<BaseProps<string>, 'icon' | 'iconRight' | 'modelValue'> {
  /**
   * @default true
   */
  resize?: boolean | 'both' | 'horizontal' | 'vertical'
  /**
   * @default false
   */
  copyButton?: boolean
  /**
   * @default 6
   */
  rows?: string | number
  /**
   * @default false
   */
  autoGrow?: boolean
  /**
   * @default false
   */
  noCounter?: boolean
  customId?: string
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<Props>(), {
  rows: 6,
  customId: '',
  readonly: undefined,
  noCounter: false,
  autoGrow: false,
  resize: true,
  class: undefined
})

const modelValue = defineModel<string>({ default: '' })

const { itemId, elementId, inputState, minlength, maxlength } = useCommonInjects()

if (!itemId && !props.customId) {
  console.error('customId not provided')
}

const copyBtn = useTemplateRef('copyBtn')
const textarea = useTemplateRef('textarea')

props.autoGrow
  ? useTextareaAutosize({
      element: textarea,
      input: modelValue
    })
  : { textarea: ref('') }

const store = useMainStore()

const inputId = computed(() => itemId || props.customId)
const readOnly = computed(() => props.readonly ?? store.readOnlyPage)

const showTooltip = ref(false)
function onCopyClick() {
  copyToClipboard(modelValue.value)
  showTooltip.value = true
  setTimeout(() => {
    showTooltip.value = false
  }, 1500)
}
</script>
