<template>
  <vuci-form
    v-slot="{ uciData }"
    config="network"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      type="interface"
      :title="$t('SSTP configuration')"
      :columns="deviceColumns"
      :edit-form="editModal"
      :table-actions="['column-list', 'search']"
      data-key="sstp"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'sstp/config' }]"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :readonly="!s.server"
          :hints="!s.server ? [{ info: $t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values.') }] : []"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('New configuration name')"
          prop="id"
          :help="$t('Name of the new SSTP configuration. Used for easier configurations management purpose only.')"
          maxlength="8"
          rules="uciname"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup>
import { ref, markRaw, provide } from 'vue'
import EditForm from './SstpEdit'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'

const $t = useTranslate()

const warningMessages = ref([])
const certificates = ref([])
const message = useMessages()

const editModal = markRaw(EditForm)

const deviceColumns = [
  {
    name: 'name',
    label: $t('Tunnel name'),
    help: $t('Name of the tunnel. Used for easier tunnels management purpose only.')
  },
  { name: 'enabled', label: $t('Enabled') }
]

const afterLoad = (_, responses) => {
  if (responses && responses[0]?.messages) {
    warningMessages.value = responses[0].messages
  }
  return axios
    .get('/api/certificates/ca/config')
    .then(response => {
      certificates.value = response.success ? response.data.certificates : []
    })
    .catch(() => {
      message.error($t('Failed to load certificate data'))
    })
}

provide('certificates', certificates)
provide('warningMessages', () => warningMessages.value)
provide('setWarningMessages', messages => {
  warningMessages.value = messages
})
</script>
