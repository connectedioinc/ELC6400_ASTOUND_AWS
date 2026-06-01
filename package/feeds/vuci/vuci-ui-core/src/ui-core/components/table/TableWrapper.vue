<template>
  <TltCard
    v-if="title"
    :title="title"
    class="text-body-secondary font-sans"
    title-space-between
  >
    <template
      v-if="help || isOverflowing"
      #help
    >
      {{ help }}
      <template v-if="isOverflowing">
        <br v-if="help" />
        <span>{{ $t('To scroll hold Shift + Scroll mouse wheel.') }}</span>
      </template>
    </template>
    <template #title-content="{ expanded }">
      <div
        class="flex flex-wrap items-center gap-4 min-w-0 min-h-8 text-sm ml-auto justify-end"
        :class="wrapperClass"
      >
        <slot
          v-if="expanded"
          name="wrapper-content"
        />
      </div>
    </template>
    <div>
      <slot />
    </div>
  </TltCard>
  <div
    v-else
    class="text-body-secondary font-sans"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useTableRootContext } from './useTableRootContext'
import TltCard from '@ui-core/tlt-design/layout/TltCard.vue'

export interface Props {
  title: string
  help?: string
  wrapperClass?: string
}

withDefaults(defineProps<Props>(), {
  help: '',
  wrapperClass: ''
})

const { isOverflowing } = useTableRootContext()
</script>
