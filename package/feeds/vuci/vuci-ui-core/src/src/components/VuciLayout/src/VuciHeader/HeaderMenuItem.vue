<template>
  <component
    :is="is"
    :test-id="elementId"
    :to="href"
    class="group/item flex flex-row items-center gap-6 text-start w-full no-underline"
  >
    <div
      v-if="icon || $slots.icon"
      class="bg-theme-bg-secondary-subtle rounded-full p-2 shrink-0"
      :class="{ 'group-hover/item:bg-theme-bg-secondary-subtle-hover': !disabled }"
    >
      <div :class="{ 'badge group-hover/item:after:border-theme-bg-secondary-subtle-hover!': badge }">
        <slot name="icon">
          <tlt-icon
            :icon="icon!"
            class="text-theme-text-primary size-6"
          />
        </slot>
      </div>
    </div>
    <div class="flex flex-col gap-1 whitespace-pre grow max-w-48 2xl:max-w-96">
      <div
        class="text-sm leading-4 text-theme-text-secondary-subtle overflow-hidden text-ellipsis w-full"
        v-text="title"
      />
      <div
        class="text-sm leading-4 font-semibold"
        :class="{ 'text-theme-text-primary group-hover/item:text-theme-text-primary-hover': !disabled, 'text-theme-text-subtle': disabled }"
        v-text="editText"
      />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'

export interface Props {
  title: string
  editText: string
  href?: string
  elementId: string
  icon?: Icon
  disabled?: boolean
  badge?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  disabled: false,
  badge: false,
  href: undefined
})

const is = computed(() => {
  if (props.disabled) return 'span'
  if (!props.href) return 'button'
  return 'router-link'
})
</script>

<style scoped>
.badge {
  position: relative;
}

.badge::after {
  content: '';
  background-color: var(--color-theme-bg-danger);
  width: 0.5rem;
  height: 0.5rem;
  position: absolute;
  top: 0.125rem;
  right: 0;
  border: 1px solid var(--color-theme-bg-secondary-subtle);
  border-radius: 50%;
}
</style>
