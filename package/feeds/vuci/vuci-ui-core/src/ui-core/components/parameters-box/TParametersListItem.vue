<template>
  <li class="flex gap-3 py-2 px-4 items-center">
    <tlt-button
      :id="id"
      type="icon"
      icon="copy"
      color="tertiary"
      class="-my-1"
      @click="onCopyClick"
    />
    <div ref="content">
      <slot>
        <span
          v-for="(param, index) in parameters"
          :key="param"
        >
          <strong>{{ param }}</strong>
          <span
            v-if="index + 1 < parameters.length"
            class="mx-1"
          >
            {{ $t('or') }}
          </span>
        </span>
        <span v-if="props.description"> - {{ props.description }}</span>
      </slot>
    </div>
    <tlt-tooltip
      :target="`#${id}`"
      triggers="click"
      :close-delay="1200"
    >
      {{ $t('Copied') }}
    </tlt-tooltip>
  </li>
</template>

<script setup lang="ts">
import { useTemplateRef, computed } from 'vue'
import { utils } from '@/plugins/utils'
import { copyToClipboard } from '@ui-core/plugins/helper'
const content = useTemplateRef('content')

type Props = {
  /**
   * parameter string. When clicked on copy it will copy:
   * - if it's an array: the first item of the parameter string array
   * - if it's string: the whole string
   */
  parameter?: string | string[]
  /**
   * description of the parameter.
   */
  description?: string
}

const props = defineProps<Props>()

const id = `parameter-${utils.getUniqueId()}`

const parameters = computed(() => [props.parameter].flat().filter(Boolean) as string[])

function onCopyClick() {
  if (parameters.value.length > 0) {
    return copyToClipboard(parameters.value[0])
  }
  return copyToClipboard(content.value?.innerText || '')
}
</script>
