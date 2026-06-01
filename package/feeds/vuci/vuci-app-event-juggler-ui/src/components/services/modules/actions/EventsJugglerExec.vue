<template>
  <vuci-form-item-select
    :uci-section="s"
    name="exec_file_type"
    :label="$t('Script file type')"
    :help="$t('Choose whether to upload a file directly or specify a file path.')"
    :options="fileTypeOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-upload
    :uci-section="s"
    name="exec_file_upload"
    :label="$t('Script file')"
    :help="$t('Upload the script file to be executed.')"
    :depend="isTypeSelected && s?.exec_file_type === 'upload'"
    :readonly="$session.group !== 'root'"
    required
  >
    <template
      v-if="$session.group !== 'root'"
      #after-content="{ controlRef }"
    >
      <tlt-tooltip
        :target="() => controlRef"
        placement="bottom-start"
        fallback-placements="top-start"
        :content="$t('Current user is unauthorized to edit scripts.')"
      />
    </template>
  </vuci-form-item-upload>
  <vuci-form-item-input
    :uci-section="s"
    name="exec_file_path"
    :label="$t('Script file path')"
    :help="$t('Enter the full path to the script file.')"
    :depend="isTypeSelected && s?.exec_file_type === 'path'"
    :readonly="$session.group !== 'root'"
    required
  >
    <template
      v-if="$session.group !== 'root'"
      #after-content="{ controlRef }"
    >
      <tlt-tooltip
        :target="() => controlRef"
        placement="bottom-start"
        fallback-placements="top-start"
        :content="$t('Current user is unauthorized to edit scripts.')"
      />
    </template>
  </vuci-form-item-input>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="exec_arg_type"
    :label="$t('Send arguments as')"
    :help="$t('Choose how to send arguments: as text or key-value pairs.')"
    :options="parameterOptions"
    :depend="isTypeSelected"
    initial="text"
  />
  <vuci-form-item-text-area
    :uci-section="s"
    name="exec_arguments"
    :label="$t('Text arguments')"
    :help="$t('Arguments to be sent to the script as text.')"
    placeholder="-T %ut -i %si"
    maxlength="4096"
    :depend="isTypeSelected && s?.exec_arg_type === 'text'"
  />
  <EventsJugglerParamList
    v-if="isTypeSelected && s?.exec_arg_type === 'text'"
    :title="$t('text argument list')"
    :list-parameters="getListParameters()"
  />
  <vuci-form-item-custom
    :uci-section="s"
    name="exec_arg"
    :label="$t('Key-value arguments')"
    :help="$t('Arguments to be sent to the script as key-value pairs.')"
    :input-props="getParameterProps({ placeholder: '-T' })"
    allow-create
    :write-parse="getSaveParameters"
    inputs="input,select"
    separator="="
    maxlines="32"
    :depend="isTypeSelected && s?.exec_arg_type === 'list'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="exec_info_modem_id"
    :label="$t('Modem')"
    :help="$t('Choose the modem whose ID will be passed to the script.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
</template>
<script setup lang="ts">
import EventsJugglerParamList from '../../EventsJugglerParamList.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const { isTypeSelected, getSaveParameters, getParameterProps, getListParameters } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { modemOptions = [] } = eventsJugglerOptions?.value || {}

const $t = useTranslate()

const fileTypeOptions = [
  ['upload', $t('Upload')],
  ['path', $t('Path')]
]
const parameterOptions = [
  { value: 'text', name: $t('Text parameters') },
  { value: 'list', name: $t('Key-value parameters') }
]
</script>
