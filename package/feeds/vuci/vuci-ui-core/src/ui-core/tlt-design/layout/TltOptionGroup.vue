<template>
  <ul>
    <li
      v-for="(option, index) in options"
      :key="index"
      class="break-all text-left"
      @click="$emit('click', option)"
    >
      <slot
        v-if="!isArray(option)"
        :option="option"
      />
      <!-- if option is another option group, use the component itself  -->
      <template v-else>
        <hr v-if="index > 0" />
        <tlt-option-group
          v-slot="{ option: opt }"
          :options="option"
        >
          <slot :option="opt" />
        </tlt-option-group>
      </template>
    </li>
  </ul>
</template>

<script setup lang="ts" generic="T">
import { isArray } from '@ui-core/utils/inspect'

export interface Props<T> {
  options: (T | T[])[]
}

defineProps<Props<T>>()

defineEmits<{
  click: [T | T[]]
}>()

defineSlots<{
  default(props: { option: T }): any
}>()
</script>
