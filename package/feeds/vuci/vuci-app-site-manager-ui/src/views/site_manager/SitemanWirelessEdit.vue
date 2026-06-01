<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="siteman_wireless"
    editing
  >
    <template #default="{ uciData }">
      <devman-apply-to-section
        :section="section"
        :mapped-groups="unref(group)"
        :mapped-devices="unref(device)"
        :section-name="$t('wireless SSID configuration')"
      />
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        data-key="wifiInterfaces"
        :endpoints="[{ endpoint: `site_manager/wireless/interfaces/config` }]"
        :error-handlers="{ edit: handleEditErrorsMixin }"
        :name="section.id"
        :exception-options="['dm_device_id', 'dm_group_id']"
        :title="$t('%s SSID configuration').format(section.ssid || section.mesh_id)"
      >
        <tlt-tabs :tabs="tabs">
          <template #general>
            <vuci-form-item-switch
              :uci-section="s"
              name="enabled"
              :label="$t('Enable')"
              :help="$t('Toggle WiFi interface on or off.')"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="mode"
              :label="$t('Mode')"
              :help="
                $t(
                  'Defines what role this interface will do, Access point to supply WiFi for \
              other devices, or as a Client to use other devices WiFi for WWAN.'
                )
              "
              :options="modeOptions"
              @change="modeChange"
            />
            <tlt-inline-message
              v-if="meshAutoChannelWarning.show"
              type="warning"
              class="mb-4"
            >
              <div>
                {{ $t('The following devices have wireless radios set to auto channel:') }}
                <strong>{{ meshAutoChannelWarning.devices.join(', ') }}</strong
                >.
                {{ $t('This may cause mesh connectivity issues.') }}
              </div>
              <router-link
                to="/site_manager/devices"
                class="text-primary underline mt-2 inline-block"
              >
                {{ $t('Go to Devices page to set channels to static values') }} →
              </router-link>
            </tlt-inline-message>
            <vuci-form-item-select
              :uci-section="s"
              name="device"
              :label="$t('Radios')"
              :help="$t('SSID will use these radios. Use one of them if you want seperate SSIDs for each radio or use all of them if you want combined SSID.')"
              :options="radioOptions"
              multiple
              required
              :depend="radioOptions.length > 1"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="mesh_id"
              maxlength="32"
              :label="$t('Mesh ID')"
              :rules="validateMeshID"
              :depend="s.mode == 'mesh'"
              :required="s.mode == 'mesh'"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="ssid"
              label="SSID"
              :help="
                s.mode === 'sta'
                  ? $t('Service Set Identifier is a name used to identify access point to which client will connect')
                  : $t('Service Set Identifier is a name used to identify access point which is shown when client tries to connect to it.')
              "
              maxlength="32"
              rules="max_bytes(32)"
              :depend="[undefined, 'ap', 'sta'].includes(s.mode)"
              required
            />
            <tlt-tooltip
              v-if="disablePassword"
              target="#password-field"
              expand-to="bottom-start"
              :content="$t('Current encryption method does not require a password.')"
            />
            <vuci-form-item-input
              id="password-field"
              ref="key"
              name="key"
              :label="$t('Password')"
              :help="$t('Custom passphrase used for authentication (at least 8 characters long).')"
              :uci-section="s"
              :readonly="disablePassword"
              :no-write="disablePassword"
              rules="wpakey"
              :maxlength="null"
              password
              :required="!disablePassword"
              :can-randomize="isAp"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="vlan_id"
              label="VLAN ID"
              :help="$t('Use tagged VLAN from the network as untagged VLAN on the SSID.')"
              :options="vlanOptions"
              :rules="s.vlan_id !== 'lan' ? 'irange(1,4094)' : undefined"
              :depend="isAp"
              allow-create
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="ieee80211r"
              :label="$t('802.11r Fast Transition')"
              :help="$t('Enables fast roaming among access points that belong to the same Mobility Domain.')"
              :depend="ieee80211rDepend"
            />
          </template>
          <template #additional>
            <vuci-form-item-switch
              :uci-section="s"
              name="mesh_fwding"
              :label="$t('Forward mesh peer traffic')"
              :depend="s.mode === 'mesh'"
              :rmempty="false"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="mesh_rssi_threshold"
              :label="$t('RSSI threshold for joining')"
              :help="$t('0 = not using RSSI threshold, 1 = do not change driver default.')"
              initial="0"
              rules="irange(-255,1)"
              :depend="s.mode == 'mesh'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="hidden"
              :label="$t('Hide SSID')"
              :help="$t('If enabled, when connecting to this access point SSID will need to be entered manually because it will not be shown during a scan.')"
              :depend="isAp"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="isolate"
              :label="$t('Isolate Clients')"
              :help="$t('Prevents client-to-client communication.')"
              :depend="isAp"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="bss_transition"
              :label="$t('802.11v BSS Transition Management')"
              :help="
                $t(
                  'Enables suggestions for clients to leave this AP if a signal is getting low. For clients not understanding this standard AP can kick them forcibly so they can connect to other AP.'
                )
              "
              :depend="isAp"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="ieee80211k"
              :label="$t('802.11k Radio Resource Measurement')"
              :help="$t('Enables suggestions for clients to join other APs when this AP has too many clients.')"
              :depend="isAp"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="disassoc_low_ack"
              :label="$t('Disassociate On Low Acknowledgement')"
              :help="$t('Allow AP mode to disconnect STAs based on low ACK condition.')"
              :depend="isAp"
              initial="1"
            />
          </template>
          <template #encryption>
            <vuci-form-item-select
              :uci-section="s"
              name="encryption"
              :label="$t('Encryption')"
              :help="$t('The type of WiFi encryption used.')"
              :options="encryptionOptions"
              :depend="s.mode !== 'multi_ap' && encryptionOptions.length > 0"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="cipher"
              :label="$t('Cipher')"
              :help="$t('An algorithm for performing encryption or decryption.')"
              :options="cipherOptions"
              :depend="['wpa3', 'wpa', 'wpa2', 'psk', 'psk2', 'wpa-mixed', 'psk-mixed'].includes(s.encryption)"
            />
            <!-- maxlength null, to not show double error message, when length is more than 4096 -->
            <vuci-form-item-input
              :uci-section="s"
              name="key"
              :label="$t('Password')"
              :help="$t('Custom passphrase used for authentication (at least 8 characters long).')"
              :depend="!disablePassword"
              rules="wpakey"
              :maxlength="null"
              password
              required
              :can-randomize="isAp"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="auth_server"
              :label="$t('Radius-Authentication-Server')"
              :help="$t('Ip address of the authentication server.')"
              :depend="isAp && encryptionDepend"
              rules="ipaddr"
              required
            />
            <vuci-form-item-input
              :uci-section="s"
              name="auth_port"
              :label="$t('Radius-Authentication-Port')"
              :help="$t('Default port for the server is 1812.')"
              :depend="isAp && encryptionDepend"
              rules="port"
              placeholder="1812"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="auth_secret"
              :label="$t('Radius-Authentication-Secret')"
              :help="$t('Server\'s shared secret.')"
              :depend="isAp && encryptionDepend"
              rules="credentials_validate"
              maxlength="256"
              password
              required
            />
            <vuci-form-item-input
              :uci-section="s"
              name="acct_server"
              :label="$t('Radius-Accounting-Server')"
              :help="$t('Ip address of the accounting server.')"
              :depend="isAp && encryptionDepend"
              rules="ipaddr"
              :required="!!s.acct_port || !!s.acct_secret"
              @change="$utils.validate"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="acct_port"
              :label="$t('Radius-Accounting-Port')"
              :help="$t('Default port for the server is 1813.')"
              :depend="isAp && encryptionDepend"
              rules="port"
              placeholder="1813"
              :required="!!s.acct_server || !!s.acct_secret"
              @change="$utils.validate"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="acct_secret"
              :label="$t('Radius-Accounting-Secret')"
              :help="$t('Server\'s shared secret.')"
              :depend="isAp && encryptionDepend"
              rules="credentials_validate"
              maxlength="256"
              password
              :required="!!s.acct_server || !!s.acct_port"
              @change="$utils.validate"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="eap_type"
              :label="$t('EAP-Method')"
              :depend="s.mode === 'sta' && encryptionDepend"
              :options="[
                ['tls', 'TLS'],
                ['ttls', 'TTLS'],
                ['peap', 'PEAP'],
                ['fast', 'FAST']
              ]"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="use_pkcs"
              :label="$t('Use PKCS#12 format')"
              :help="$t('Use PKCS#12 file format for client certificate.')"
              :depend="encryptionDepend && s.eap_type === 'tls'"
            />
            <vuci-form-item-upload
              :uci-section="s"
              name="pkcs_cert"
              :label="$t('PKCS#12 client certificate file')"
              :depend="encryptionDepend && s.eap_type === 'tls' && s.use_pkcs === '1'"
              required
            />
            <vuci-form-item-input
              :uci-section="s"
              name="pkcs_passwd"
              :label="$t('PKCS#12 passphrase')"
              password
              :depend="encryptionDepend && s.eap_type === 'tls' && s.use_pkcs === '1'"
              rules="credentials_validate"
            />
            <!-- There is dublicate NAS id field, because it's used by two different things -->
            <!-- v-show is needed because pure depend would delete field input in other place -->
            <!-- v-show cannot be put dirrectly on input because it doesn't work everytime when depend changes -->
            <div v-show="isAp && encryptionDepend">
              <vuci-form-item-input
                :uci-section="s"
                name="nasid"
                :label="$t('NAS id')"
                :help="$t('Used for fast transition and Radius server.')"
                :depend="s.ieee80211r === '1' || (isAp && encryptionDepend)"
              />
            </div>
          </template>

          <template #advance>
            <vuci-form-item-switch
              :uci-section="s"
              name="short_preamble"
              :label="$t('Short Preamble')"
              :help="
                $t(
                  'Uses Short Preamble, it uses shorter data strings that adds less data \
              to transmit the error redundancy check which means that it is much faster.'
                )
              "
              initial
            />
            <vuci-form-item-input
              :uci-section="s"
              name="dtim_period"
              :label="$t('DTIM Interval')"
              :help="$t('Delivery Traffic Indication Message Interval.')"
              placeholder="2"
              rules="irange(1,255)"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="wpa_group_rekey"
              :label="$t('Time interval for rekeying GTK')"
              :help="$t('Period of time in between automatic changes of the group key, which all devices on the network share.')"
              placeholder="600"
              rules="irange(1,65535)"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="skip_inactivity_poll"
              :label="$t('Disable Inactivity Polling')"
              :help="
                $t(
                  'Inactivity polling can be disabled to disconnect stations based on inactivity timeout so that \
              idle stations are more likely to be disconnected even if they are still in range of the AP.'
                )
              "
            />
            <vuci-form-item-input
              :uci-section="s"
              name="max_inactivity"
              :label="$t('Station inactivity limit')"
              :help="
                $t(
                  'Station inactivity limit in seconds: If a station/client does not send anything in a set time frame, \
              an empty data frame is sent to it in order to verify whether it is still in range. If this frame is not acknowledged, \
              the station will be disassociated and then deauthenticated.'
                )
              "
              placeholder="300"
              rules="irange(0, 65535)"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="max_listen_interval"
              :label="$t('Maximum allowed Listen Interval')"
              :help="$t('Association will be refused if a client/station attempts to associate with a listen interval greater than this value.')"
              placeholder="65535"
              rules="irange(0, 65535)"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="wds"
              label="WDS"
              :help="$t('Enable WDS')"
              :depend="s.mode === 'sta' || isAp"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="wmm"
              :label="$t('WMM Mode')"
              :help="
                $t(
                  'Wi-Fi Multimedia (WMM), previously known as Wireless Multimedia Extensions (WME), is a subset of the 802.11e wireless \
              LAN (WLAN) specification that enhances quality of service (QoS) on a network by prioritizing data packets according to four categories.'
                )
              "
              :depend="isAp"
              initial="1"
            />
          </template>

          <template #transition>
            <vuci-form-item-input
              :uci-section="s"
              name="nasid"
              :label="$t('NAS id')"
              :depend="s.ieee80211r === '1' || (isAp && encryptionDepend)"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="mobility_domain"
              :label="$t('Mobility Domain')"
              :help="$t('4-character hexadecimal ID.')"
              :depend="s.ieee80211r === '1'"
              placeholder="4f57"
              rules="hexstring"
              minlength="4"
              maxlength="4"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="reassociation_deadline"
              :label="$t('Reassociation Deadline')"
              :help="$t('Time units (TUs / 1.024 ms) [1000-65535].')"
              :depend="s.ieee80211r === '1'"
              placeholder="1000"
              rules="range(1000,65535)"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="ft_over_ds"
              :label="$t('FT protocol')"
              :depend="s.ieee80211r === '1'"
              :options="[
                ['1', $t('FT over DS')],
                ['0', $t('FT over the Air')]
              ]"
            />
          </template>

          <template #macfilter>
            <vuci-form-item-select
              :uci-section="s"
              name="macfilter"
              :label="$t('MAC-Address Filter')"
              :help="
                $t(
                  'Allow listed only - only allows devices with MAC addresses specified in the MAC list to connect to your WiFi network \
              Allow all except listed - blocks devices with MAC addresses specified in the MAC list from connecting to your WiFi network.'
                )
              "
              :options="macFilterOptions"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="maclist"
              :label="$t('MAC-List')"
              :help="$t('List of MAC addresses to be included or excluded from connecting to your WiFi network.')"
              :depend="s.macfilter === 'allow' || s.macfilter === 'deny'"
              rules="macaddr"
              allow-create
              multiple
              :options="[]"
            />
          </template>
        </tlt-tabs>
      </vuci-named-section>
    </template>
    <template #form-buttons="{ save }">
      <tlt-button
        class="ml-auto"
        button-id="saveandapply"
        @click="save"
      >
        {{ $t('Save & Sync') }}
      </tlt-button>
    </template>
  </vuci-form>
</template>
<script setup>
import { ref, unref, computed, inject, watch, onBeforeUnmount, nextTick } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { $bus } from '@ui-core/plugins/event-bus'
import { useDevmanCommonFunction } from './SitemanCommon'
import DevmanApplyToSection from './SitemanApplyToSection.vue'

const props = defineProps({
  section: {
    type: Object,
    required: true
  }
})

const group = inject('groups')
const device = inject('devices')
const wifiDevices = inject('wifiDevices')
const deviceStatus = inject('deviceStatus')

const t = useTranslate()
const { handleEditErrorsMixin } = useDevmanCommonFunction()

const formData = ref({})

const meshAutoChannelWarning = computed(() => {
  if (props.section.mode !== 'mesh') return { show: false, devices: [] }

  const appliedDeviceIds = new Set()

  if (Array.isArray(props.section.dm_device_id)) {
    props.section.dm_device_id.forEach(id => appliedDeviceIds.add(id))
  }

  if (props.section.dm_group_id) {
    unref(deviceStatus)
      ?.filter(dev => dev.group_id === props.section.dm_group_id)
      .forEach(dev => appliedDeviceIds.add(dev.id))
  }

  if (appliedDeviceIds.size === 0) return { show: false, devices: [] }

  const devicesWithAutoChannel = []
  const devices = unref(deviceStatus) || []

  unref(wifiDevices)?.forEach(wifiDev => {
    if (wifiDev?.dm_device_id && appliedDeviceIds.has(wifiDev.dm_device_id) && (wifiDev.channel === 'auto' || !wifiDev.channel)) {
      const device = devices.find(d => d.id === wifiDev.dm_device_id)
      if (device && !devicesWithAutoChannel.includes(device.custom_name || device.device_type)) {
        devicesWithAutoChannel.push(device.custom_name || device.device_type)
      }
    }
  })

  return { show: devicesWithAutoChannel.length > 0, devices: devicesWithAutoChannel }
})

const macFilterOptions = [
  ['', t('Disable')],
  ['allow', t('Allow listed only')],
  ['deny', t('Allow all except listed')]
]
const cipherOptions = [
  ['auto', t('Auto')],
  ['ccmp', t('Force CCMP (AES)')],
  ['tkip', t('Force TKIP')],
  ['tkip+ccmp', t('Force TKIP and CCMP (AES)')]
]
const encryptionOptions = [
  ['none', t('No encryption')],
  ['psk', 'WPA-PSK'],
  ['psk2', 'WPA2-PSK'],
  ['psk-mixed', 'WPA-PSK/WPA2-PSK ' + t('Mixed Mode')],
  ['sae', 'WPA3-SAE'],
  ['sae-mixed', 'WPA2-PSK/WPA3-SAE ' + t('Mixed Mode')],
  ['wpa', 'WPA-EAP'],
  ['wpa2', 'WPA2-EAP'],
  ['owe', 'OWE'],
  ['wpa3-mixed', 'WPA2-EAP/WPA3-EAP ' + t('Mixed Mode')],
  ['wpa3', 'WPA3-EAP']
]
const radioOptions = [
  ['radio0', '2.4GHz'],
  ['radio1', '5GHz']
]
const modeOptions = [
  ['ap', t('Access Point')],
  ['mesh', t('Mesh')]
]

const vlanOptions = [['lan', t('Default')]]

// --- Computed ---
const isAp = computed(() => props.section.mode === 'ap' || props.section.mode === undefined)
const ieee80211rDepend = computed(() => isAp.value && !['none', 'owe'].includes(props.section.encryption))
const tabs = ref([])
const disablePassword = computed(() => !['psk', 'psk2', 'psk+psk2', 'psk-mixed', 'sae', 'sae-mixed'].includes(props.section.encryption))

function updateTabs() {
  tabs.value = [
    { name: 'general', title: t('General Setup') },
    { name: 'additional', title: t('Additional Settings') },
    { name: 'encryption', title: t('Wireless Security') },
    {
      name: 'transition',
      title: t('Fast Transition'),
      show: props.section.ieee80211r === '1' && isAp.value
    },
    { name: 'advance', title: t('Advanced Settings') },
    { name: 'macfilter', title: t('MAC-Filter'), show: isAp.value }
  ]
}

updateTabs()

watch([() => props.section.ieee80211r, () => isAp.value], updateTabs)

watch(disablePassword, newVal => {
  if (newVal && props.section.key !== '') {
    const targetSection = formData.value.wifiInterfaces?.find(iface => iface.id === props.section.id)
    if (targetSection) {
      targetSection.key = ''
    }
  }
})

onBeforeUnmount(() => {
  if (formData.value.syncErrors?.length === 0) return
  $bus.emit('show-edit-error', formData.value.syncErrors)
})

// --- Methods ---
function validateMeshID(value) {
  const validationError = formData.value.wifiInterfaces?.some(iface => {
    const sameRadio = !props.section.device || props.section.device.some(radio => iface.device?.includes(radio))
    return iface.mode === 'mesh' && iface.mesh_id === value && iface.id !== props.section.id && sameRadio
  })
  if (validationError)
    return {
      isValid: false,
      message: t('Mesh ID must be unique within the same wireless device')
    }
  return { isValid: true }
}

function encryptionDepend() {
  return ['wpa', 'wpa2', 'wpa3', 'wpa3-mixed'].includes(props.section.encryption)
}

async function modeChange(self, newVal, oldVal) {
  if (newVal === oldVal) return
  await nextTick()
  const targetSection = formData.value.wifiInterfaces?.find(iface => iface.id === props.section.id)
  if (targetSection) {
    targetSection.ssid = ''
    targetSection.key = newVal === 'ap' ? self.apPassword : ''
    targetSection.ieee80211r = '0'
    targetSection.encryption = {
      ap: 'psk2',
      sta: 'psk2',
      mesh: 'sae'
    }[newVal]
    if (self.$store.isRouter && (newVal === 'ap' || oldVal === 'ap')) {
      targetSection.network = newVal === 'ap' ? 'lan' : self.autoName
    }
    if (self.$store.isAccessPoint) {
      const radios = self.$wireless.allRadios()
      targetSection.device = newVal === 'mesh' ? radios.splice(-0, 1) : radios
    }
  }
  self.$utils.validate(self)
}
</script>
