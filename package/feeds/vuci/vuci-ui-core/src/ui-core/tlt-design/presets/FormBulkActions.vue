<template>
  <form-filter-preset
    @submit="onSubmit"
    @reset="onReset"
  >
    <template #header>
      <slot name="header">
        <h2 class="font-bold text-base">
          {{ $t('Rows selected') }} <span class="text-theme-text-subtle">({{ selectedValues }})</span>
        </h2>
      </slot>
    </template>
    <template #footer>
      <slot name="footer">
        <div class="flex gap-4 pb-4 px-4 w-full sticky bg-theme-bg-floating bottom-0">
          <tlt-button
            button-id="cancel"
            color="secondary"
            :disabled="false"
            button-type="reset"
            class="justify-center grow"
          >
            {{ $t('Cancel') }}
          </tlt-button>
          <tlt-button
            button-id="apply"
            :disabled="!selectedValues"
            button-type="submit"
            class="justify-center grow"
          >
            {{ $t('Apply') }}
          </tlt-button>
        </div>
      </slot>
    </template>
    <span>{{ $t('Select action') }}:</span>
    <div
      :key="action.id"
      class="pb-4 pt-2.5"
      test-id="select-actions"
    >
      <label>{{ action.label }}</label>
      <tlt-select
        :id="action.id"
        v-model="selectedAction"
        class="mt-1"
        :disabled="!selectedValues"
        :data-source="actionOptions"
        :allow-create="action.allowCreate"
        disable-teleport
      />
    </div>
  </form-filter-preset>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SelectAction, ActionOption } from '@ui-core/components/table/types'

export interface Props {
  selectedValues: number
  action: SelectAction<(string | number)[]>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [ActionOption]
  reset: []
}>()

const actionOptions = computed(() => props.action.options?.map(opt => ({ key: opt.key, value: opt.label })))
const selectedAction = ref<string | undefined>(actionOptions.value?.[0]?.key)

function onSubmit() {
  const option = props.action.options?.find(option => option.key === selectedAction.value)
  const cb = props.action.callback || (() => {})
  if (!option && selectedAction.value && props.action.allowCreate) {
    return emit('submit', { key: selectedAction.value, label: selectedAction.value, callback: cb })
  } else if (option) emit('submit', { ...option, callback: cb })
  selectedAction.value = actionOptions.value?.[0]?.key
}
function onReset() {
  selectedAction.value = actionOptions.value?.[0]?.key
  emit('reset')
}

defineExpose({ onSubmit, onReset })
</script>
