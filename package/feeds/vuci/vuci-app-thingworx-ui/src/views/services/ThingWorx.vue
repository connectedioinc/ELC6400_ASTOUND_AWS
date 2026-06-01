<template>
  <vuci-form
    v-slot="{ uciData }"
    config="iottw"
    :after-load="loadData"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      name="thingworx"
      :title="$t('ThingWorx')"
      :endpoints="[{ endpoint: 'thingworx/config' }]"
      data-key="thingworx"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable ThingWorx Application.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="server"
        :label="$t('Server address')"
        :help="$t('ThingWorx server IP address or hostname.')"
        placeholder="PP-0000000000AA.devportal.ptc.io"
        rules="host"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="port"
        :label="$t('Server port')"
        :help="$t('ThingWorx Server Port.')"
        rules="port"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="thing"
        :label="$t('Thing name')"
        :help="$t('Thing name defined in ThingWorx CP.')"
        rules="uciname"
        maxlength="32"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="appkey"
        :label="$t('Application key')"
        :help="$t('Application key generated in ThingWorx CP.')"
        maxlength="128"
        rules="fieldvalidation('^[a-zA-Z0-9_-]+$')"
        :required="s.enabled === '1'"
        password
        sensitive
      />
      <vuci-form-item-select
        :uci-section="s"
        name="iface"
        :label="$t('Mobile interface')"
        :help="$t('Mobile network interface used for GSM data collection.')"
        :depend="interfaceOptions.length > 0"
        :options="interfaceOptions"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { network } from '@/plugins/network'
import { ref, computed } from 'vue'
import type { InterfaceStatus } from '@/types/networkTypes'

const $t = useTranslate()
const message = useMessages()

const interfaces = ref<InterfaceStatus[]>([])

const interfaceOptions = computed(() => interfaces.value.filter(s => s.network_type === 'mobile').map(network.getName))

function loadData() {
  return axios
    .get('/api/interfaces/basic/status')
    .then(({ data }) => {
      interfaces.value = data
    })
    .catch(() => {
      message.error($t('Failed to load interface options'))
    })
}
</script>
