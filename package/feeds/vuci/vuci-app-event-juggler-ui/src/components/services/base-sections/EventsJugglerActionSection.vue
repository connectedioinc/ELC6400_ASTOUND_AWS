<template>
  <module-section
    :uci-data="uciData"
    :section="section"
    module-type="actions"
    :hide-title="hideTitle"
  >
    <template #mainOptions>
      <vuci-form-item-input
        :uci-section="section"
        name="delay"
        :label="$t('Delay')"
        :help="$t('Delay in seconds before the action is executed.')"
        rules="irange(0,4294967295)"
        placeholder="1"
      />
    </template>
    <template
      v-if="!!section.plugin"
      #additionalOptions
    >
      <vuci-form-item-select
        :uci-section="section"
        name="operator"
        :label="$t('Condition compatibility')"
        :readonly="isOperatorDisabled()"
        :no-write="isOperatorDisabled()"
        :options="operationOptions"
      >
        <template #help>
          <p v-if="isOperatorDisabled()">
            {{ $t('Add at least 2 conditions to enable this field.') }}
          </p>
          <div v-else>
            <p>
              <span class="font-bold">{{ $t('And') }}</span> - {{ $t('all added conditions must evaluate to true.') }}
            </p>
            <p>
              <span class="font-bold">{{ $t('Or') }}</span> - {{ $t('at least one condition must evaluate to true.') }}
            </p>
          </div>
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="section"
        name="conditions"
        :label="$t('Active conditions')"
        :help="$t('All active conditions for the action.')"
        :placeholder="getConditionOptions(parentSection, uciData).length > 0 ? $t('-- Please select --') : $t('No conditions created')"
        :options="getConditionOptions(parentSection, uciData)"
        has-select-all
        multiple
      />
      <slot />
    </template>
  </module-section>
</template>
<script setup lang="ts">
import ModuleSection from './EventsJugglerModuleSection.vue'
import { inject } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerData } from '../useEventsJugglerData'
import type { FormData, ActionSection, EventSection } from '@/types/eventsJugglerTypes'

interface EditSectionProps {
  uciData: FormData
  section: ActionSection
  hideTitle: boolean
}

defineProps<EditSectionProps>()

const $t = useTranslate()

const parentSection = inject<EventSection>('parentSection')!
const { getConditionOptions } = useEventsJugglerData()

const operationOptions = [
  ['and', $t('And')],
  ['or', $t('Or')]
]

function isOperatorDisabled() {
  return (parentSection?.available_conditions?.length ?? 0) < 2
}
</script>
