<template>
  <template v-if="actions && actions.length <= limit">
    <template
      v-for="action of actions"
      :key="isString(action) ? action : action.id"
    >
      <slot
        v-if="isString(action)"
        :name="action"
        :record="row"
      />
      <slot
        v-else
        :name="action.id"
        :record="row"
      >
        <TableRowAction
          type="text"
          color="primary"
          v-bind="action"
        />
      </slot>
    </template>
  </template>
  <template v-else-if="actionsDropdownOptions">
    <button
      ref="actionsDropdownButton"
      type="button"
      class="text-theme-text-subtle hover:text-theme-text-primary active:text-theme-text-primary transition-colors"
      @click="actionsDropdownOpen = !actionsDropdownOpen"
    >
      <tlt-icon icon="more" />
    </button>
    <tlt-dropdown
      v-model:open="actionsDropdownOpen"
      :target="$refs.actionsDropdownButton"
      :options="actionsDropdownOptions"
      :test-id="`row-actions-${id}`"
      close-on-click
      :on-option-click="(option: DropdownOption) => option.callback?.(row as any)"
      @outside-click="actionsDropdownOpen = false"
    />
  </template>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { ref, computed } from 'vue'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableRowContext, type TableRowContext } from './useTableRowContext'
import type { DropdownOption } from '@ui-core/tlt-design/layout/TltDropdown.vue'
import type { AcceptableValue, Action } from './types'
import { isArray, isString } from '@ui-core/utils/inspect'
import type { Color } from '@ui-core/tlt-design/form/core/TltButton.vue'
import { useRouteQueryWatcher } from '@ui-core/composables/useRouteQueryWatcher'
import { provideTableRowActionsContext } from './useTableRowActionsContext'

export interface Props<T extends AcceptableValue = AcceptableValue> {
  actions?: (Action<T> | string)[] | null
  limit?: number
}

const props = withDefaults(defineProps<Props<T>>(), {
  actions: () => [],
  limit: 3
})

const { id } = useTableRootContext<TableRootContext<T>>()
const { row, rowId } = useTableRowContext<TableRowContext<T>>()

const actionsDropdownOpen = ref(false)

const actionsDropdownOptions = computed(() =>
  props.actions?.map(action => {
    if (isString(action)) return { label: action, slotName: action }
    return {
      label: action.label || '',
      id: action.id,
      icon: action.buttonProps?.icon || action.buttonProps?.iconLeft || action.buttonProps?.iconRight,
      callback: action.callback,
      disabled: action.buttonProps?.disabled ?? action.buttonProps?.readonly,
      hints: action.hints,
      variant: getDropdownVariant(action.buttonProps?.color)
    } as const
  })
)

function getDropdownVariant(type?: Color) {
  switch (type) {
    case 'primary':
    case 'secondary':
    case 'tertiary':
    default:
      return 'info'
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
  }
}

const registeredActions = ref(new Map<string, () => void>())

function registerAction(id: string, trigger: () => void) {
  registeredActions.value.set(id, trigger)
}

function unregisterAction(id: string) {
  registeredActions.value.delete(id)
}

provideTableRowActionsContext({
  actions: registeredActions,
  registerAction,
  unregisterAction
})

useRouteQueryWatcher(query => {
  for (const [actionId, trigger] of registeredActions.value ?? []) {
    if (isString(query[actionId]) && query[actionId] === rowId.value) return trigger()
    else if (isArray(query[actionId]) && query[actionId].includes(rowId.value as string)) trigger()
  }

  for (const option of actionsDropdownOptions.value || []) {
    if (option.id && query[option.id] === rowId.value && option.disabled !== true) {
      return option.callback?.(row.value)
    }
  }
})
</script>
