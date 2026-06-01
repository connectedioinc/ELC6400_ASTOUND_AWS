<template>
  <tlt-input
    :model-value="modelValue"
    :placeholder="`${$t('Search')}...`"
    :placeholder-prefix="false"
    :readonly="false"
    icon="search"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #after>
      <button
        v-if="!!modelValue"
        class="bg-theme-bg-secondary-1 rounded-full flex justify-center items-center text-theme-text-on-secondary! size-5"
        @click="$emit('update:modelValue', '')"
      >
        <tlt-icon
          icon="X"
          class="size-5"
        />
      </button>
    </template>
  </tlt-input>
</template>

<script>
import { KEY_ELEMENT_ID } from './_shared/constants'

export default {
  provide() {
    return {
      [KEY_ELEMENT_ID]: 'search'
    }
  },
  props: {
    modelValue: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue']
}
</script>
