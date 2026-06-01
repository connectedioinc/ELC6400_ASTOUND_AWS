<template>
  <tlt-modal
    :open="showModal"
    size="big"
    @close="back"
  >
    <tlt-form
      ref="tltForm"
      :model="form"
      :title="selectedPorts.length === 1 ? $t('Port settings: %').format(selectedPorts[0]) : $t('Port settings: Multiple ports selected')"
      sid="port-settings"
    >
      <tlt-inline-message
        v-show="!isMatchingConfigs && selectedPorts.length > 1"
        id="config-mismatch"
        :message="
          $t(
            'Because multiple selected ports have different configurations,\
          %s settings are used as a template.\
          After saving the configuration, all ports will be configured with the same settings.'
          ).format(selectedPorts[0]?.toUpperCase())
        "
        type="info"
      />
      <tlt-form-item-switch
        v-model="form.enabled"
        :label="$t('Enable')"
        prop="enabled"
        true-value="1"
        false-value="0"
      />
      <tlt-form-item-input
        v-model="form.description"
        :depend="isSinglePort"
        :label="$t('Port name')"
        :help="$t('Name of the port. This is only used for easier management purposes.')"
        prop="description"
        :placeholder="$ports.getPrettyPortId(selectedPorts[0])"
        :placeholder-prefix="false"
        :rules="['string', validateNoDuplicates]"
      />
      <tlt-form-item-switch
        v-model="form.eee_enable"
        label="EEE"
        :help="$t('Enable Energy-Efficient Ethernet.')"
        prop="eee_enable"
        true-value="1"
        false-value="0"
      />
      <tlt-form-item-switch
        v-model="form.isolated"
        :label="$t('Isolate port')"
        :help="$t('When enabled port will be isolated from other isolated ports. Traffic between isolated ports will dropped. Traffic between isolated and normal ports will be sent as normal.')"
        prop="isolated"
        true-value="1"
        false-value="0"
      />
      <tlt-inline-message
        v-show="isAnyEth && isAnySfp"
        id="eth-mismatch"
        :message="$t('Options bellow will only be configured on Ethernet type ports.')"
        type="info"
      />
      <tlt-form-item-switch
        v-model="form.autoneg"
        :label="$t('Auto negotiation')"
        :help="$t('Auto negotiation allows the device to communicate with devices on the other end of the link to determine the optimal duplex mode and speed for the port.')"
        prop="autoneg"
        true-value="on"
        false-value="off"
        :depend="isAnyEth"
      />
      <tlt-form-item-select
        v-if="isAnyEth && form.autoneg === 'on'"
        v-model="form.advert"
        :label="$t('Advertisement')"
        :help="$t('Advertises preferred duplex mode and speed for negotiation with other devices.')"
        :options="advertOptions"
        prop="advert"
        multiple
        required
      />
      <tlt-form-item-select
        v-model="form.speed"
        :label="$t('Link Speed')"
        :help="$t('A measure of how fast ports are able to transmit and receive data.')"
        :options="linkSpeedOptions"
        :depend="isAnyEth && form.autoneg === 'off'"
        prop="speed"
      />
      <tlt-form-item-select
        v-model="form.duplex"
        :label="$t('Duplex')"
        :help="
          $t(
            'Bidirectional communication system that allows both end nodes to send and receive communication data or signals. Full - sends and receives simultaneously. Half - sends or receives one path at a time.'
          )
        "
        :options="duplexOptions"
        :depend="isAnyEth && form.autoneg === 'off'"
        prop="duplex"
      />
      <tlt-inline-message
        v-show="poe && isAnyPoe && isAnySfp"
        id="poe-mismatch"
        :message="$t('PoE setting will only be configured on PoE capable ports.')"
        type="info"
      />
      <tlt-form-item-switch
        v-model="form.poe_enable"
        :label="$t('PoE')"
        :help="$t('Enable Power over Ethernet.')"
        :depend="isAnyPoe && poe && selectedPorts.some(port => poePorts.includes(port))"
        prop="poe_enable"
        true-value="1"
        false-value="0"
      />
      <template #applyButton>
        <div class="flex justify-end mb-4">
          <tlt-button
            button-id="custom-save"
            @click="save"
          >
            {{ $t('Save & Sync') }}
          </tlt-button>
        </div>
      </template>
    </tlt-form>
  </tlt-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { usePrompt, useMessages } from '@/stores/messages'
import { useMainStore } from '@/stores/main'

const t = useTranslate()

const store = useMainStore()

const prompt = usePrompt()

const message = useMessages()

const props = defineProps({
  modelValue: {
    type: Array,
    required: false,
    default: undefined
  },
  selectedPorts: {
    type: Array,
    required: true
  },
  poe: {
    type: Boolean,
    required: true
  },
  showModal: {
    type: Boolean,
    required: true
  },
  poePorts: {
    type: Array,
    required: false,
    default: () => []
  }
})

const emit = defineEmits(['update', 'update:showModal', 'update:modelValue'])

const linkSpeedOptions = [
  ['10', '10Mbps (E)'],
  ['100', '100Mbps (FE)']
]

const duplexOptions = [
  ['full', t('Full')],
  ['half', t('Half')]
]

const advertOptions = [
  ['10mh', t('10 Mbps-Half')],
  ['10mf', t('10 Mbps-Full')],
  ['100mh', t('100 Mbps-Half')],
  ['100mf', t('100 Mbps-Full')],
  ['1000mf', t('1000 Mbps-Full')]
]

const form = ref({})
const combinedInitialForm = ref({})
const configSettings = ['enabled', 'eee_enable', 'autoneg', 'advert', 'isolated', 'duplex', 'speed', 'poe_enable', 'description']

const isMatchingConfigs = computed(() => {
  return props.modelValue
    .filter(section => props.selectedPorts.includes(section._id))
    .every(section => configSettings.every(setting => !section[setting] || section[setting] === combinedInitialForm.value[setting]))
})

const isAnySfp = computed(() => props.selectedPorts.some(port => port.includes('sfp')))
const isAnyEth = computed(() => props.selectedPorts.some(port => port.includes('port')))
const isAnyPoe = computed(() => props.selectedPorts.some(port => port.includes('port')))
const isSinglePort = computed(() => props.selectedPorts.length === 1)

watch(
  () => props.showModal,
  val => {
    if (val === false) return
    // Get config for the first selected port as the template
    const firstPortConfig = props.modelValue.find(section => section._id === props.selectedPorts[0])

    // Initialize form with the first port's configuration
    configSettings.forEach(key => {
      form.value[key] = firstPortConfig?.[key]
    })

    combinedInitialForm.value = JSON.parse(JSON.stringify(form.value))
  }
)

const save = async () => {
  store.spin('Waiting for configuration to be applied...')
  const data = props.selectedPorts.map(port => {
    const isEth = port.includes('port')
    const isPoePort = props.poePorts && props.poePorts.includes(port)
    const payload = {
      ...form.value,
      id: props.modelValue.find(section => section._id === port).id,
      poe_enable: isEth && isPoePort ? form.value.poe_enable : undefined,
      description: isSinglePort.value ? form.value.description : undefined
    }
    // Only send speed/duplex for ethernet ports when autoneg is off
    if (isEth && form.value.autoneg === 'off') {
      payload.speed = form.value.speed
      payload.duplex = form.value.duplex
      payload.advert = undefined
    } else if (isEth && form.value.autoneg === 'on') {
      payload.speed = undefined
      payload.duplex = undefined
      payload.advert = form.value.advert
    } else {
      // SFP ports don't support autoneg/speed/duplex/advert
      payload.autoneg = undefined
      payload.speed = undefined
      payload.duplex = undefined
      payload.advert = undefined
    }
    return payload
  })
  try {
    const res = await axios.put('/api/site_manager/ports_settings/config', { data })
    const newValue = props.modelValue.map(original => {
      const edited = res.data.find(editSection => editSection.id === original.id)
      return edited ?? original
    })
    message.success(t('Configuration has been applied'))
    emit('update', newValue)
    emit('update:modelValue', newValue)
  } catch {
    message.error(t('Failed to edit configuration'))
  } finally {
    emit('update:showModal', false)
    store.spin(false)
  }
}

const back = () => {
  prompt.show({
    title: t('Go back?'),
    content: t('Unsaved changes will be discarded'),
    okText: t('Discard'),
    cancelText: t('Cancel'),
    onOk: () => {
      emit('update:showModal', false)
    }
  })
}

const validateNoDuplicates = val => {
  // Get the device ID from the first selected port
  const firstPort = props.modelValue.find(section => section._id === props.selectedPorts[0])
  const deviceId = firstPort?.dm_device_id

  // Only check for duplicates within the same device
  const hasDuplicate = props.modelValue.some(section => section.dm_device_id === deviceId && section._id !== props.selectedPorts[0] && section.description === val)

  if (hasDuplicate) {
    return {
      isValid: false,
      message: t("Instance with %s '%s' already exists").format(t('Port name'), val)
    }
  }
  return { isValid: true }
}
</script>
