<template>
  <tlt-modal
    size="small"
    :title="incorrectPassword ? $t('Incorrect password') : $t('Expected password mismatch')"
    @close="closeModal"
  >
    <div class="mb-8 text-base flex flex-col items-center">
      <div
        v-if="!incorrectPassword"
        class="w-full p-4"
      >
        <div class="mb-4 text-center font-semibold">
          {{ $t('Input password value for devices that had a changed password or has unique passwords') }}
        </div>
        <div class="mb-4 text-center font-semibold">
          {{ $t('If password field is left empty pairing will not be executed for that device.') }}
        </div>
      </div>
      <div
        v-else
        class="w-full p-4"
      >
        <div class="mb-4 text-center font-semibold">
          {{ $t('Incorrect password was provided, please input a correct password and try again.') }}
        </div>
      </div>
      <div class="w-full max-w-md">
        <template
          v-for="(device, index) in devices"
          :key="device.mac"
        >
          <div class="flex flex-row items-center gap-x-2 mb-2">
            <div class="w-1/5">{{ $t('Device') }}:</div>
            <div class="flex-1">
              <tlt-dummy-value :value="mappedDevices[index][form[index + 1].device]" />
            </div>
          </div>
          <div class="flex flex-row items-center gap-x-2 mb-2">
            <div class="w-1/5">{{ $t('Password') }}:</div>
            <div class="flex-1">
              <tlt-form-item-input
                v-model="form[index + 1].password"
                prop="password"
                password
              />
            </div>
          </div>
          <!-- Separator -->
          <div
            v-if="index < devices.length - 1"
            class="border-b border-gray-200 my-4"
          ></div>
        </template>
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
          type="button"
          button-id="pair"
          @click="handlePair()"
        >
          {{ incorrectPassword ? $t('Retry pairing') : $t('Pair') }}
        </tlt-button>
      </div>
    </template>
  </tlt-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  devices: {
    type: Array,
    required: true
  },
  incorrectPassword: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['close', 'pair'])

const form = ref({})

const mappedDevices = computed(() => {
  return props.devices?.map(device => {
    return { [device.mac]: `${device.devicename} (${device.mac})` }
  })
})

watch(
  () => props.devices,
  newDevices => {
    initializeForm(newDevices)
  },
  { immediate: true }
)

function initializeForm(devices) {
  form.value = devices?.reduce((acc, device, index) => {
    acc[index + 1] = {
      device: device.mac,
      password: device.devicename.includes('TAP') ? 'admin01' : ''
    }
    return acc
  }, {})
}

function closeModal() {
  document.body.style.overflow = 'auto'
  document.body.style.paddingRight = 'unset'
  emit('close')
}

function handlePair() {
  let data = []
  const keys = Object.keys(form.value)
  keys.forEach(key => {
    if (form.value[key].password) {
      data.push({
        mac: form.value[key].device,
        password: form.value[key].password
      })
    }
  })
  const devicesToPair = props.devices.filter(device => data.some(d => d.mac === device.mac))
  emit('pair', data, devicesToPair)
  closeModal()
}
</script>
