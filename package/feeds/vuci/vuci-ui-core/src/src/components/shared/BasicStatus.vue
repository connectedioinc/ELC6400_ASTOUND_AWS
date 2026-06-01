<template>
  <tlt-overflow-hint
    v-if="typeof status === 'string' || typeof status === 'number' || status === undefined"
    class="max-w-full"
  >
    {{ status === '' || status === undefined ? '-' : status }}
  </tlt-overflow-hint>
  <div
    v-else
    ref="statusRef"
    class="flex items-center gap-2 max-w-full w-fit"
    :class="[colors[status.type ?? ''], { 'flex-row-reverse': iconFirst }]"
  >
    <template v-if="status.status !== null">
      <div
        v-if="status.help || $slots.help"
        class="truncate"
      >
        {{ status.status ?? '-' }}
      </div>
      <tlt-overflow-hint v-else>
        {{ status.status ?? '-' }}
      </tlt-overflow-hint>
    </template>
    <tlt-icon
      v-if="(status.help || $slots.help) && !noIcon"
      :icon="status.type || 'info'"
      :class="[colors[status.type || 'info'], 'size-5 shrink-0']"
    />
    <tlt-popover
      v-if="status.help || $slots.help"
      :target="() => statusRef"
      :title="status.helpTitle"
    >
      <slot
        name="help"
        :status="status"
      >
        <string-with-links :text="status.help" />
      </slot>
    </tlt-popover>
  </div>
</template>

<script lang="ts" setup generic="T extends StatusObject">
import StringWithLinks from './StringWithLinks.vue'
import { useTemplateRef } from 'vue'

export type Status<T extends StatusObject = StatusObject> = T | string | number | undefined

export type StatusObject = {
  /** null - show only icon */
  status: string | null
  type?: 'success' | 'warning' | 'info' | 'error' | ''
  help?: string
  helpTitle?: string
}

export interface Props<T extends StatusObject = StatusObject> {
  status: Status<T>
  /** When there is table full of status values and icons would make everything overwhelming */
  noIcon?: boolean
  /** Reverse icon and status positions */
  iconFirst?: boolean
}

defineProps<Props>()

const colors = {
  success: 'text-theme-text-success',
  warning: 'text-theme-text-warning',
  error: 'text-theme-text-danger',
  /** Set info if both text and icon needs to be primary color */
  info: 'text-theme-text-info',
  /** Do not set color if only icon needs to be primary color */
  '': 'text-theme-text-secondary-subtle'
} as const

const statusRef = useTemplateRef('statusRef')
</script>
