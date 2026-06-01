<template>
  <div
    class="field-select__value"
    :data-placeholder-shown="dataAttribute(placeholderShown)"
  >
    <template v-if="placeholderShown">
      {{ props.placeholder }}
    </template>
    <slot
      v-else
      :model="model"
      :selected="selectedOptions"
    >
      {{ selectedOptions.map(v => v.textContent).join(', ') }}
    </slot>
  </div>
</template>

<script lang="ts" setup>
import { dataAttribute } from '@ui-core/utils/attributes'
import { injectSelectContext } from './use-select-context'
import { computed } from 'vue'
type Props = {
  placeholder?: string
}
const props = defineProps<Props>()
const { model, selectedOptions } = injectSelectContext()

const placeholderShown = computed(() => props.placeholder && selectedOptions.value.length === 0)
</script>

<style scoped></style>
