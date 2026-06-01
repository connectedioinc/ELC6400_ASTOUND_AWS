<template>
  <div
    v-if="props.options.length"
    class="flex gap-2 max-w-full flex-wrap"
  >
    <tlt-button
      v-for="option in props.options"
      :id="`button-badge-${option[0]}`"
      :key="option[0]"
      :button-id="option[0]"
      :disabled="props.readOnly || props.disabledOptions.includes(option[0])"
      type="text"
      @click="model = option[0]"
    >
      <tlt-badge
        :type="model === option[0] ? 'primary' : props.readOnly || props.disabledOptions.includes(option[0]) ? 'disabled' : 'inactive'"
        :custom-color="model === option[0] && (props.readOnly || props.disabledOptions.includes(option[0])) ? 'bg-theme-bg-secondary-1' : undefined"
      >
        {{ option[1] }}
      </tlt-badge>
    </tlt-button>
  </div>
</template>

<script setup lang="ts" generic="TOption extends string">
export interface Props<T> {
  options: [T, string][]
  readOnly?: boolean
  disabledOptions?: string[]
}
const props = withDefaults(defineProps<Props<TOption>>(), { readOnly: false, disabledOptions: () => [] })
const model = defineModel<TOption>()
</script>
