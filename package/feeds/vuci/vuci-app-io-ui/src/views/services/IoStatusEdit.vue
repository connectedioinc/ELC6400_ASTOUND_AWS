<template>
  <tlt-modal
    :open="open"
    @close="handleModalClose"
  >
    <tlt-form
      ref="tltFormRef"
      :model="form"
      sid="custom-io-status-labels"
      :title="editTitle"
    >
      <tlt-form-item-input
        v-model="form.custom_name"
        :label="$t('Custom name')"
        :help="$t('Sets custom name for this I/O.')"
        rules="string"
        prop="custom_name"
        maxlength="15"
      />

      <tlt-form-item-input
        v-model="form.custom_unit"
        :depend="isAdcOrAcl"
        :label="$t('User defined unit of measurement')"
        :help="$t('Sets custom measurement unit name.')"
        rules="string"
        prop="custom_unit"
        maxlength="15"
      />

      <tlt-form-item-inline
        v-for="inlineComponent in customStateNameInputs"
        :key="inlineComponent"
        :label="$t('Custom names for')"
        :help="$t('Sets custom state names.')"
        :depend="inlineComponent.depend"
        has-headers
      >
        <tlt-form-item-input
          v-model="form[inlineComponent.inputs[0].prop as keyof typeof form]"
          :label="$t('%s state').format(inlineComponent.inputs[0].label)"
          :help="$t('Sets custom %s state name.').format(inlineComponent.inputs[0].help)"
          rules="string"
          :prop="inlineComponent.inputs[0].prop"
          :depend="inlineComponent.depend"
          maxlength="15"
        />

        <tlt-form-item-input
          v-model="form[inlineComponent.inputs[1].prop as keyof typeof form]"
          :label="$t('%s state').format(inlineComponent.inputs[1].label)"
          :help="$t('Sets custom %s state name.').format(inlineComponent.inputs[1].help)"
          rules="string"
          :prop="inlineComponent.inputs[1].prop"
          :depend="inlineComponent.depend"
          maxlength="15"
        />
      </tlt-form-item-inline>

      <tlt-form-item-radio-group
        v-for="group in radioGroups"
        :key="group.key"
        v-model="form[group.prop as keyof typeof form]"
        :label="group.label"
        :help="group.help"
        :depend="group.depend"
        :options="group.options"
        :prop="group.prop"
        rules="string"
      />

      <tlt-form-model-item
        v-if="isAdcOrAcl"
        element-id="formula-label"
        :label="$t('Add custom values into fields to calculate formula:')"
      >
        <div />
      </tlt-form-model-item>

      <io-status-formula
        v-if="isAdcOrAcl"
        ref="ioFormulaRef"
        v-model="form as FormulaModel"
      />

      <tlt-form-item-switch
        v-model="form.invert_input"
        :label="$t('Invert input')"
        :help="$t('Inverts the input signal.')"
        true-value="1"
        false-value="0"
        :depend="form.type === 'dwi' || form.direction === 'in'"
        prop="invert_input"
      />

      <template #applyButton>
        <div class="flex justify-end">
          <tlt-button
            button-id="custom-save"
            @click="handleSave"
          >
            {{ $t('Save & Apply') }}
          </tlt-button>
        </div>
      </template>
    </tlt-form>
  </tlt-modal>
</template>
<script setup lang="ts">
import IoStatusFormula from '../../components/services/io-formula/IoStatusFormula.vue'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { useIoPinData } from '@/components/services/io/useIoPinData'
import { useIoStatusContext } from '../../components/services/useIoStatusContext'
import { ref, computed, watch, useTemplateRef } from 'vue'
import { utils } from '@/plugins/utils'
import type { FormulaModel } from '@/types/ioTypes'
import type { Io } from '@/types/ioTypes'

interface IoStatusEditProps {
  open: boolean
  initialSection: Io | null
}

const props = defineProps<IoStatusEditProps>()

const emit = defineEmits(['close'])

const store = useMainStore()
const $t = useTranslate()
const message = useMessages()
const prompt = usePrompt()

const { ioPinData } = useIoPinData()
const { handleIoStatusLoad, aclSection, adcSection } = useIoStatusContext()

const tltFormRef = useTemplateRef('tltFormRef')
const ioFormulaRef = useTemplateRef('ioFormulaRef')

const defaultForm: Partial<Io> & { analogSectionType?: string } = {
  id: '',
  type: '',
  custom_name: '',
  custom_unit: '',
  custom_add: '',
  custom_mul: '',
  custom_div: '',
  custom_off: '',
  hr_state_low: '',
  hr_state_high: '',
  hr_state_open: '',
  hr_state_closed: '',
  hr_state_shorted: '',
  state: '',
  value: '',
  invert_input: '',
  direction: '',
  analogSectionType: ''
}

const form = ref({ ...defaultForm })

const isDwiWet = computed(() => form.value.type === 'dwi' && form.value.state === 'wet')
const isDwiDry = computed(() => form.value.type === 'dwi' && form.value.state === 'dry')
const isAdcOrAcl = computed(() => ['adc', 'acl'].includes(form.value?.type || ''))

const editTitle = computed(() => {
  const pinData = ioPinData[(form.value?.id as keyof typeof ioPinData) || '']
  if (!pinData) return ''
  return utils.getModalTitle(pinData.name(form.value as unknown as Io))
})

const customStateNameInputs = computed(() => [
  {
    depend: form.value.type === 'gpio' || isDwiWet.value,
    inputs: [
      { prop: 'hr_state_low', label: $t('Low'), help: $t('low') },
      { prop: 'hr_state_high', label: $t('High'), help: $t('high') }
    ]
  },
  {
    depend: form.value.type === 'relay',
    inputs: [
      { prop: 'hr_state_closed', label: $t('Closed'), help: $t('closed') },
      { prop: 'hr_state_open', label: $t('Open'), help: $t('open') }
    ]
  },
  {
    depend: isDwiDry.value,
    inputs: [
      { prop: 'hr_state_shorted', label: $t('Shorted'), help: $t('shorted') },
      { prop: 'hr_state_open', label: $t('Open'), help: $t('open') }
    ]
  }
])

const radioGroups = computed(() => {
  return [
    {
      depend: isAdcOrAcl.value && !!aclSection.value,
      prop: 'analogSectionType',
      key: 'analog_type',
      label: $t('Analog type'),
      help: $t('Sets the type of the analog input.'),
      options: [
        { name: $t('Input'), value: 'adc' },
        { name: $t('Current loop'), value: 'acl' }
      ]
    },
    {
      depend: form.value.type === 'dwi',
      prop: 'state',
      key: 'state_dwi',
      label: $t('Input type'),
      help: $t('Sets the type of the input to passive (dry) or active (wet).'),
      options: [
        { name: $t('Passive (dry)'), value: 'dry' },
        { name: $t('Active (wet)'), value: 'wet' }
      ]
    },
    {
      depend: form.value.id?.startsWith('dio'),
      prop: 'direction',
      key: 'direction_dio',
      label: $t('I/O direction'),
      help: $t('Sets the direction of the configurable input or output.'),
      options: [
        { name: $t('Input'), value: 'in' },
        { name: $t('Output'), value: 'out' }
      ]
    },
    {
      depend: form.value.type === 'relay',
      prop: 'state',
      key: 'state_relay',
      label: $t('Relay state'),
      help: $t('Sets the state of the relay.'),
      options: [
        { name: $t('Closed'), value: 'closed' },
        { name: $t('Opened'), value: 'open' }
      ]
    },
    {
      depend: form.value.direction === 'out',
      prop: 'value',
      key: 'value_output',
      label: $t('Output state'),
      help: $t('Sets the state of the output.'),
      options: [
        { name: $t('Low level'), value: '0' },
        { name: $t('High level'), value: '1' }
      ]
    }
  ]
})

watch(
  () => props.open,
  newValue => {
    if (newValue) setForm()
  }
)

watch(
  () => form.value.analogSectionType,
  newValue => {
    if (!isAdcOrAcl.value) return
    form.value = { ...defaultForm, ...(newValue === 'acl' ? aclSection.value : adcSection.value), analogSectionType: newValue, state: 'active' }
  }
)

function setForm() {
  form.value = { ...props.initialSection }
  if (isAdcOrAcl.value) form.value.analogSectionType = form.value?.type || ''
}

function handleModalClose() {
  return prompt.show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => emit('close')
  })
}

function handleSave() {
  const formulaValidatePromises = ioFormulaRef.value ? [tltFormRef.value?.validate(), ioFormulaRef.value.validate()] : [tltFormRef.value?.validate()]

  return Promise.all(formulaValidatePromises)
    .then(formulaRes => {
      if (formulaRes.some((field: { valid: boolean }) => field.valid === false)) throw new Error('validation')
      const tltFormData = tltFormRef.value?.getData()
      const ioFormulaData = ioFormulaRef.value?.getData()
      const data = { ...tltFormData, ...ioFormulaData, state: form.value?.state || '' }
      store.spin($t('Waiting for configuration to be applied...'))
      delete data.analogSectionType
      return axios
        .post(`/api/io/${form.value.id}/actions/change_state`, { data })
        .then(() => handleIoStatusLoad())
        .then(() => {
          message.success($t('Configuration has been applied'))
          form.value = { ...defaultForm }
          emit('close')
        })
    })
    .catch(e => {
      if (e.message === 'validation') return message.error($t('Some fields are invalid'))
      message.error($t('Failed to save configuration'))
    })
    .finally(() => {
      store.spin(false)
    })
}
</script>
