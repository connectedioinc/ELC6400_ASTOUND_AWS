<template>
  <tlt-modal
    size="small"
    :title="section.length === 1 ? $t('Unpair device?') : $t('Unpair devices?')"
    class="text-body-main"
    @close="closeModal"
  >
    <div class="mb-8 text-base">
      <div class="font-semibold text-center break-words max-w-full">
        {{
          section.length === 1 ? $t('Are you sure you want to unpair "%s" device?').format(section[0].custom_name || section[0].hostname) : $t('Are you sure that you want to unpair selected devices?')
        }}
      </div>
      <br />
      <div
        v-if="section.some(sec => sec.online)"
        class="text-center"
      >
        {{ section.length === 1 ? $t('This device will be rebooted and configuration will be restored to factory default.') : $t('These devices will be rebooted and restored to factory default.') }}
      </div>
      <div
        v-else
        class="text-center"
      >
        <span class="font-semibold text-error-100">{{ $t('Caution:\n') }}</span>
        <span>{{
          section.length === 1
            ? $t('To restore device configuration to factory default, unpair it only when the device is online.\n')
            : $t('To restore devices configuration to factory default, unpair it only when the devices are online.\n')
        }}</span>
        <span v-if="generalData.password === 'unset'">{{
          section.length === 1
            ? $t('Device will be unreachable if unpaired while offline since the general password is not set.')
            : $t('Devices will be unreachable if unpaired while offline since the general password is not set.')
        }}</span>
      </div>
    </div>
    <template #actions>
      <div class="flex gap-8 justify-center lg:justify-end mx-1">
        <tlt-button
          color="secondary"
          class="'ml-auto'"
          button-id="cancel"
          @click="closeModal"
        >
          {{ $t('Cancel') }}
        </tlt-button>
        <tlt-button
          button-id="submit"
          @click="unpairDevices"
        >
          {{ $t('Unpair') }}
        </tlt-button>
      </div>
    </template>
  </tlt-modal>
</template>

<script setup>
import { useTranslate } from '@ui-core/composables/useI18n'
import { defineProps, defineEmits } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

const t = useTranslate()
const message = useMessages()

const props = defineProps({
  section: {
    type: Array,
    required: true
  },
  generalData: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['close', 'multiunpair', 'unpaired'])

function closeModal() {
  document.body.style.overflow = 'auto'
  document.body.style.paddingRight = 'unset'
  emit('close')
}

function unpairDevices() {
  const requests = props.section.map(device => ({
    endpoint: '/api/site_manager/devices/actions/unpair',
    method: 'POST',
    data: { mac: device.mac }
  }))
  // Always use bulk, even for a single device
  return axios
    .bulk(requests)
    .then(data => {
      closeModal()
      if (props.section.length === 1) {
        emit('unpaired', { ...data[0], mac: props.section[0].mac })
      } else {
        const enrichedData = data.map((res, index) => {
          const newData = res.data || {}
          newData.mac = props.section[index].mac
          return { ...res, data: newData }
        })
        emit('multiunpair', enrichedData)
      }
    })
    .catch(() => {
      message.error(t('Failed to unpair device(s)'))
    })
}
</script>
