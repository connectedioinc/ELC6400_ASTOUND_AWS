<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="wireless"
    :after-load="loadData"
    bulk-request
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :title="$t('Global settings')"
        type="wifi-global"
        :endpoints="[{ endpoint: 'wireless/devices/global' }]"
        data-key="wifiGlobal"
      >
        <vuci-form-item-select
          :uci-section="s"
          name="country"
          :label="$t('Country code')"
          :help="$t('The country code is used for regulatory compliance. Different areas allow different maximum transmit power and operating frequencies.')"
          :options="countryOptions"
        />
        <vuci-form-item-radio-group
          :uci-section="s"
          :label="$t('Installation type')"
          :help="
            $t('The installation type is used for regulatory compliance. In most countries outdoor installations have additional restrictions for maximum transmit power and operating frequencies.')
          "
          name="location"
          :options="$wireless.getRadioUseOptions()"
        />
      </vuci-named-section>
      <vuci-typed-section
        :uci-data="uciData"
        type="wifi-iface"
        :endpoints="[{ endpoint: 'wireless/interfaces/config' }]"
        data-key="devices"
        :form-methods="['get', 'edit']"
        :title="defaultTitle"
        :no-value-text="$t('No wireless interfaces available')"
      >
        <template #default="{ dataSource }">
          <tlt-card
            v-for="s in dataSource"
            :id="s.id"
            :key="s.id"
            :title="`${$t('Wifi')} ${s.ssid}`"
          >
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Enable')"
              :help="$t('Turns the WiFi access point on or off.')"
              name="enabled"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('SSID')"
              :help="$t('Service Set Identifier is a name used to identify access point which is shown when client tries to connect to it.')"
              name="ssid"
              maxlength="32"
              :validator-hint="$t('All characters except ` are allowed. Only 32 bytes size SSID is allowed')"
              :rules="['fieldvalidation(\'^[^`]+$\',1)', 'max_bytes(32)']"
              required
            />
            <vuci-form-item-select
              :uci-section="s"
              name="device"
              :label="$t('Radios')"
              :options="$wireless.radioOptions()"
              multiple
              required
              :rules="[(value: string[]) => $wireless.validateRadios(allWirelessInterfaces, value, s, true)]"
              :depend="$wireless.radioOptions().length > 1"
            >
              <template #help>
                <hint-helper v-bind="$wireless.getRadioHelp()" />
              </template>
            </vuci-form-item-select>
            <!-- maxlength null, to not show double error message, when length is more than 4096 -->
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Password')"
              :help="$t('A password used to authenticate users to the access point.')"
              name="key"
              rules="wpakey"
              maxlength="null"
              password
              :depend="['psk', 'psk2', 'psk+psk2', 'psk-mixed', 'sae', 'sae-mixed'].includes(s.encryption)"
            />
          </tlt-card>
        </template>
      </vuci-typed-section>
    </template>
    <template #form-buttons="{ save }">
      <setup-wizard-steps
        :save="save"
        :back="{ reverse: true }"
      />
    </template>
  </vuci-form>
</template>
<script lang="ts" setup>
import { wireless } from '@/plugins/wireless'
import { useMessages } from '@/stores/messages'
import type { WifiDeviceGlobal, WifiDeviceOptions, WifiInterface } from '@/types/wirelessTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { computed, ref } from 'vue'
import SetupWizardSteps from '@/components/system/SetupWizardSteps.vue'
import HintHelper from '@/components/shared/HintHelper.vue'

interface FormData {
  devices: WifiInterface[]
  wifiGlobal: Partial<WifiDeviceGlobal>
}

const $t = useTranslate()
const message = useMessages()

const formData = ref<FormData>({
  devices: [],
  wifiGlobal: {}
})

const allWirelessInterfaces = ref<WifiInterface[]>([])

const defaultTitle = computed(() => (formData.value.devices.length === 0 ? $t('Wifi') : ''))

/**
 * compares wifi interfaces while prefering ones with lan network
 */
function compareInterfaces(a: WifiInterface, b: WifiInterface): number {
  const isALan = a.network === 'lan' ? 1 : 0
  const isBLan = b.network === 'lan' ? 1 : 0
  return isBLan - isALan
}

function loadData(form: FormData) {
  allWirelessInterfaces.value = form.devices
  form.devices = form.devices
    .filter(wifi => [undefined, 'ap'].includes(wifi.mode))
    .sort(compareInterfaces)
    .slice(0, wireless.allRadios().length)
  return axios
    .get('/api/wireless/devices/options/radio0?exclude=features')
    .then(options => {
      if (options.success) deviceOptions.value = options.data
      else message.error($t('Failed to load device option data'))
      return { devices: form.devices }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

const deviceOptions = ref<WifiDeviceOptions | null>(null)
const countryOptions = computed(() => {
  const countrylist = deviceOptions.value?.options.countrylist
  if (!countrylist) return []
  return countrylist.map(country => [country?.alpha2, `${country?.alpha2} - ${country?.name}`])
})
</script>
