<template>
  <div class="flex items-center lg:px-4 lg:py-4 lg:border-b border-b-theme-border-base divide-x divide-theme-border-base">
    <div class="pr-4 max-lg:hidden">
      <span>{{ selectedValues.length }} {{ $t('selected') }}</span>
    </div>
    <div class="lg:pl-4 flex gap-4 items-center flex-wrap *:px-0!">
      <slot
        v-for="action of shownActions"
        :key="action.id"
        :name="action.id"
      >
        <TableAction
          type="text"
          color="primary"
          :disabled="disabled || action.buttonProps?.disabled"
          show-prompt="mobile"
          v-bind="action"
        />
      </slot>
      <TableAction
        v-if="actions.length > 3"
        id="more-bulk-actions"
        :disabled="false"
        type="icon"
        class="p-0! bg-transparent! text-theme-text-subtle! hover:text-theme-bg-secondary-hover!"
        :dropdown-options="dropdownOptions"
      >
        <TltIcon
          icon="more"
          class="rotate-90 size-5"
        />
      </TableAction>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { isString } from '@ui-core/utils/inspect'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import type { AcceptableValue, Action } from './types'

export interface Props<T extends AcceptableValue = AcceptableValue> {
  actions: Action<T[keyof T][]>[]
}

const props = defineProps<Props<T>>()

const { selectedValues } = useTableRootContext<TableRootContext<T>>()

const $t = useTranslate()

const disabled = computed(() => !selectedValues.value.length)

const shownActions = computed(() => props.actions.slice(0, 3))
const dropdownActions = computed(() => props.actions.slice(3))

const dropdownOptions = computed(() =>
  dropdownActions.value.map(action => {
    return {
      id: action.id,
      label: action.label ?? '',
      icon: action.buttonProps?.icon || action.buttonProps?.iconLeft || action.buttonProps?.iconRight,
      callback: action.callback,
      disabled: disabled.value || action.buttonProps?.disabled,
      class: action.buttonProps && 'class' in action.buttonProps && isString(action.buttonProps.class) ? action.buttonProps.class : 'text-theme-text-primary'
    }
  })
)
</script>
