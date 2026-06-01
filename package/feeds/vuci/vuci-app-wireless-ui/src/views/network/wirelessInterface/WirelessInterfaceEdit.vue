<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="formRef"
    v-model="formData"
    config="wireless"
    editing
    :before-save="beforeSave"
    :after-load="loadExtraFields"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="wifiInterfaces"
      :endpoints="[{ endpoint: `wireless/interfaces/config` }]"
      :name="props.section.id"
      :after-save="onInterfaceSave"
      :title="$utils.getModalTitle('SSID', section.ssid || section.mesh_id)"
      :exception-options="['network']"
    >
      <tlt-tabs
        v-model:selected="selectedTab"
        :tabs="tabs"
        @update:selected="hideApSection"
        @vue:mounted="changeTab"
      >
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :label="$t('Enable')"
            :help="$t('Toggle WiFi interface on or off.')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="auto_reconnect"
            initial="1"
            :label="$t('Auto-reconnect')"
            :help="$t('Enables automatic reconnection to the configured access point on connection loss.')"
            :depend="s.mode === 'sta'"
          />
          <vuci-form-item-button
            :uci-section="s"
            type="button"
            label=" "
            :text="$t('Reconnect')"
            name="reconnect"
            size="sm"
            :loading="!status.up"
            :disabled="!status.up"
            :depend="s.mode === 'sta' && s.auto_reconnect === '0'"
            no-write
            @click="staReconnect"
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
            :rules="[() => $wireless.validateClient(formData.wifiInterfaces, s.device, s), () => $wireless.validateMultiAP(formData.wifiInterfaces, s.device, s)]"
            :depend="modeOptions.filter(e => e[2] !== false).length > 1"
            @change="modeChange"
          />
          <tlt-inline-message
            v-if="radioAutoWarning"
            type="warning"
          >
            {{
              $t(
                'The selected radio has a frequency channel set to "auto". This makes mesh highly unstable. Please set the same static channel on every device using this mesh. For this device you can change it'
              )
            }}
            <router-link
              :to="`/network/wireless/radio?edit=${s.device?.[0] ?? deviceOptions[0].id}`"
              test-id="radio-config-link"
            >
              {{ $t('here') }} </router-link
            >.
          </tlt-inline-message>
          <vuci-form-item-select
            :uci-section="s"
            name="device"
            :label="$t('Radios')"
            :options="$wireless.radioOptions()"
            multiple
            :max-selectable="$store.isAccessPoint && s.mode === 'mesh' ? 1 : null"
            required
            :rules="[(value: string[]) => $wireless.validateRadios(formData.wifiInterfaces, value, s, true), validateClientDevices]"
            :depend="$wireless.radioOptions().length > 1"
            @change="$utils.validate"
          >
            <template #help>
              <hint-helper v-bind="$wireless.getRadioHelp()" />
            </template>
          </vuci-form-item-select>
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
            :label="$t('SSID')"
            :help="
              s.mode === 'sta'
                ? $t('Service Set Identifier is a name used to identify access point to which client will connect')
                : $t('Service Set Identifier is a name used to identify access point which is shown when client tries to connect to it.')
            "
            :rules="[validateSSID, 'max_bytes(32)']"
            :depend="[undefined, 'ap', 'sta'].includes(s.mode)"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="bssid"
            :label="$t('BSSID')"
            :help="$t('Basic Service Set Identifier.')"
            rules="macaddr"
            :depend="s.mode === 'sta' && s.bgscan_enabled !== '1'"
          />
          <vuci-form-item-input
            id="password-field"
            ref="keyRef"
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
            :depend="!isMultiAp"
            :can-randomize="isAp"
            sensitive
          >
            <template
              v-if="disablePassword && !isMultiAp"
              #after-content="{ controlRef }"
            >
              <tlt-tooltip
                :target="() => controlRef"
                placement="bottom-start"
                fallback-placements="top-start"
              >
                {{ $t('Current encryption method does not require a password.') }}
              </tlt-tooltip>
            </template>
          </vuci-form-item-input>
          <vuci-form-item-select
            v-if="$store.isRouter"
            :uci-section="s"
            name="network"
            :label="$t('Network')"
            :help="
              $t(
                'Choose the network you want to attach to this wireless interface or \
                fill out the %s Custom %s field to define a new network (you will be redirected \
                to the newly created network configuration page).'
              ).format('<em>', '</em>')
            "
            :options="[['', $t('-- No network --')], [autoName, $t('Auto (%s)').format(autoName)], ...networkOptions]"
            rawhtml
            allow-create
            :rules="['uciname', validateNetwork]"
          />
          <template v-else>
            <vuci-form-item-select
              :uci-section="s"
              name="vlan_id_local"
              :label="'VLAN ID'"
              :help="$t('Use tagged VLAN from the network as untagged VLAN on the SSID.')"
              :options="vlanOptions"
              :rules="s.vlan_id_local !== 'lan' ? 'irange(1,4094)' : undefined"
              :depend="isAp"
              allow-create
              no-write
            />
          </template>
          <vuci-form-item-switch
            :uci-section="s"
            name="ieee80211r"
            :label="$t('802.11r Fast Transition')"
            :help="$t('Enables fast roaming among access points that belong to the same Mobility Domain.')"
            :depend="isAp && !['none', 'owe'].includes(s.encryption) && driver !== 'qcawifi'"
          />
          <vuci-form-item-input
            :depend="isMultiAp"
            :uci-section="s"
            name="scan_time"
            :label="$t('Scan time (sec)')"
            :help="$t('Time between scans of available access points (minimum 30 sec).')"
            rules="min(30)"
            placeholder="60"
            initial="60"
            required
          />
          <tlt-form-model-item
            v-show="isMultiAp"
            element-id="ap_list"
            :label="$t('Upload AP list')"
          >
            <template #help>
              <div class="flex flex-col gap-4">
                <hint-helper
                  :main-hint="$t('Upload file to add new access points to Multi AP.')"
                  :hints="[
                    { option: 'ssid', hint: $t('access point SSID. Also indicates start of new AP') },
                    { option: 'key', hint: $t('access point password') },
                    { option: 'enable', hint: $t('can be 1 or 0 to enable or disable ssid. Optional (default: 1)') }
                  ]"
                  :choice-hint="$t('Values')"
                />
                <div>
                  {{ $t('Example of a file:') }}
                  <i>
                    <div>ssid: my_ap_1</div>
                    <div>key: my_password_1</div>
                    <div>enable: 1</div>
                  </i>
                </div>
              </div>
            </template>
            <tlt-upload
              instant
              :max-size="100000"
              name="ap_list"
              action="/api/wireless/multi_ap/config"
              :errors="{ 2: $t('Invalid format - no SSID provided') }"
              @uploaded="afterUpload"
            />
          </tlt-form-model-item>
        </template>
        <template #encryption="{ tab: { show = true } }">
          <vuci-form-item-select
            :uci-section="s"
            name="encryption"
            :label="$t('Encryption')"
            :help="$t('The type of WiFi encryption used.')"
            :options="encryptionOptions"
            :depend="show && encryptionOptions.length > 0"
            :warnings="getEncryptionWarning"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="cipher"
            :label="$t('Cipher')"
            :help="$t('An algorithm for performing encryption or decryption.')"
            :options="cipherOptions"
            :warnings="getCipherWarning"
            :depend="['wpa3', 'wpa', 'wpa2', 'psk', 'psk2', 'wpa-mixed', 'psk-mixed'].includes(s.encryption)"
          />
          <vuci-form-item-radio-group
            :uci-section="s"
            name="radius_ppsk"
            initial="0"
            :label="$t('PPSK mode')"
            :options="ppskModes"
            :depend="s.encryption === 'ppsk2' && isAp"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Select how PPSK user authentication is managed.')"
                :choice-hint="$t('Possible modes')"
                :hints="[
                  { option: $t('Local'), hint: $t('Manage PPSK user authentication locally.') },
                  { option: 'RADIUS', hint: $t('Manage PPSK user authentication using a RADIUS server.') }
                ]"
              />
            </template>
          </vuci-form-item-radio-group>
          <vuci-form-item-select
            :uci-section="s"
            name="radius_ppsk_mode"
            :label="$t('RADIUS PPSK mode')"
            :options="[
              ['mac_auth', $t('MAC authentication')],
              ['freeradius', 'PPSK FreeRadius'],
              ['teltonika', $t('PPSK with Teltonika attributes')]
            ]"
            :depend="s.encryption === 'ppsk2' && s.radius_ppsk === '1'"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Select the RADIUS PPSK operation mode.')"
                :hints="[
                  { option: $t('MAC authentication'), hint: $t('Authenticate clients based on their MAC address.') },
                  { option: 'PPSK FreeRadius', hint: $t('Use FreeRadius specific attributes for PPSK management.') },
                  { option: $t('PPSK with Teltonika attributes'), hint: $t('Use Teltonika specific attributes for PPSK management.') }
                ]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="dynamic_vlan"
            :label="$t('RADIUS dynamic VLAN assignment')"
            :options="[
              ['optional', $t('Optional')],
              ['disabled', $t('Disabled')],
              ['required', $t('Required')]
            ]"
            :depend="s.encryption === 'ppsk2' && s.radius_ppsk === '1'"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Allows RADIUS authentication server to decide which VLAN is used for the stations.')"
                :hints="[
                  { option: $t('Optional'), hint: $t('Use default interface when no VLAN ID is used.') },
                  { option: $t('Disabled'), hint: $t('Do not use VLAN assignment from RADIUS server.') },
                  { option: $t('Required'), hint: $t('Reject authentication if no VLAN ID is included.') }
                ]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="vlan_tagged_interface"
            :label="$t('RADIUS VLAN tagged device')"
            :help="$t('Select the device which will be used for VLAN tagging.')"
            :options="[['', $t('-- No device --')], ...availableRadiusDevices]"
            :depend="s.encryption === 'ppsk2' && s.radius_ppsk === '1' && !$store.isAccessPoint"
          />
          <!-- workaround @change - false-value initially contains '0' -->
          <vuci-form-item-switch
            :uci-section="s"
            name="vlan_tagged_interface"
            :label="$t('Enable RADIUS VLAN tagging')"
            :help="$t('Enable VLAN tagging using the physical port.')"
            :true-value="$store.lanPortDevices[0] || ''"
            false-value=""
            :depend="s.encryption === 'ppsk2' && s.radius_ppsk === '1' && $store.isAccessPoint"
            @change="
              ({ uciSection }: { uciSection: WifiInterface }) => {
                if (uciSection.vlan_tagged_interface === '0') {
                  setSection(section => {
                    section.vlan_tagged_interface = ''
                  })
                }
              }
            "
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
            sensitive
          />
          <vuci-form-item-select
            :uci-section="s"
            name="psk_group"
            :label="$t('PPSK profile')"
            :options="[['', $t('-- No PPSK profile --')], ...wifiPpskGroups.map(g => [g.id, g.description])]"
            :depend="s.encryption === 'ppsk2' && s.radius_ppsk !== '1'"
          >
            <template #help>
              <string-with-links :text="$t('Select the PPSK profile to use for this interface. Profiles can be created %s.').format(formatLink('/network/wireless/ppsk_profiles', $t('here')))" />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-input
            :uci-section="s"
            name="auth_server"
            :label="$t('Radius-Authentication-Server')"
            :help="$t('Ip address of the authentification server.')"
            :depend="isAp && (encryptionDepend || (s.encryption === 'ppsk2' && s.radius_ppsk === '1'))"
            rules="ipaddr"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="auth_port"
            :label="$t('Radius-Authentication-Port')"
            :help="$t('Default port for the server is 1812.')"
            :depend="isAp && (encryptionDepend || (s.encryption === 'ppsk2' && s.radius_ppsk === '1'))"
            rules="port"
            placeholder="1812"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="auth_secret"
            :label="$t('Radius-Authentication-Secret')"
            :help="$t('Server\'s shared secret.')"
            :depend="isAp && (encryptionDepend || (s.encryption === 'ppsk2' && s.radius_ppsk === '1'))"
            rules="credentials_validate"
            maxlength="256"
            password
            required
            sensitive
          />
          <vuci-form-item-input
            :uci-section="s"
            name="acct_server"
            :label="$t('Radius-Accounting-Server')"
            :help="$t('Ip address of the accounting server.')"
            :depend="isAp && encryptionDepend && driver !== 'ralink'"
            rules="ipaddr"
            :required="!!s.acct_port || !!s.acct_secret"
            @change="$utils.validate"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="acct_port"
            :label="$t('Radius-Accounting-Port')"
            :help="$t('Default port for the server is 1813.')"
            :depend="isAp && encryptionDepend && driver !== 'ralink'"
            rules="port"
            placeholder="1813"
            @change="$utils.validate"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="acct_secret"
            :label="$t('Radius-Accounting-Secret')"
            :help="$t('Server\'s shared secret.')"
            :depend="isAp && encryptionDepend && driver !== 'ralink'"
            rules="credentials_validate"
            maxlength="256"
            password
            :required="!!s.acct_server || !!s.acct_port"
            sensitive
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
            sensitive
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="device_files"
            :label="$t('Certificate files from device')"
            :depend="s.mode === 'sta' && encryptionDepend && $store.hasPackages('vuci-app-certificates-api')"
          >
            <template #help>
              {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
              <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
              >.
            </template>
          </vuci-form-item-switch>
          <vuci-form-item-upload
            :uci-section="s"
            name="ca_cert"
            option="ca_cert"
            :label="$t('CA Certificate')"
            :depend="s.mode === 'sta' && encryptionDepend && s.device_files !== '1'"
            :help="$t('CA-Certificate is used to verify the authentication server.')"
            max-size="16MB"
            :warnings="getCaWarning"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="ca_cert"
            :label="$t('CA Certificate')"
            :depend="s.mode === 'sta' && encryptionDepend && s.device_files === '1'"
            :help="$t('CA-Certificate is used to verify the authentication server.')"
            :options="[['', $t('No CA Certificate')]].concat(caOpts)"
            :warnings="getCaWarning"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="client_cert"
            option="client_cert"
            :label="$t('Client-Certificate')"
            :depend="s.mode === 'sta' && s.eap_type === 'tls' && encryptionDepend && s.device_files !== '1' && s.use_pkcs !== '1'"
            max-size="16MB"
            required
          />
          <vuci-form-item-select
            :uci-section="s"
            name="client_cert"
            :label="$t('Client-Certificate')"
            :depend="s.mode === 'sta' && s.eap_type === 'tls' && encryptionDepend && s.device_files === '1' && s.use_pkcs !== '1'"
            :options="certOpts"
            required
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="priv_key"
            option="priv_key"
            :label="$t('Private Key')"
            :depend="s.mode === 'sta' && s.eap_type === 'tls' && encryptionDepend && s.device_files !== '1' && s.use_pkcs !== '1'"
            max-size="16MB"
            required
          />
          <vuci-form-item-select
            :uci-section="s"
            name="priv_key"
            :label="$t('Private Key')"
            :depend="s.mode === 'sta' && s.eap_type === 'tls' && encryptionDepend && s.device_files === '1' && s.use_pkcs !== '1'"
            :options="keyOpts"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="priv_key_pwd"
            :label="$t('Password of Private Key')"
            :depend="s.mode === 'sta' && s.eap_type === 'tls' && encryptionDepend && s.use_pkcs !== '1' && (s.device_files !== '1' || keyEncrypted(s.priv_key))"
            password
            rules="credentials_validate"
            maxlength="512"
            :required="s.device_files === '1'"
            sensitive
          />
          <vuci-form-item-select
            :uci-section="s"
            name="auth"
            :label="$t('Authentication')"
            :depend="s.mode === 'sta' && ['peap', 'ttls', 'fast'].includes(s.eap_type) && encryptionDepend"
            :options="authOptions"
            :warnings="getAuthWarnings"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="device_files2"
            :label="$t('Inner certificate files from device')"
            :depend="s.mode === 'sta' && encryptionDepend && s.auth === 'EAP-TLS' && $store.hasPackages('vuci-app-certificates-api')"
          >
            <template #help>
              {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
              <router-link to="/system/admin/certificates/generation">{{ $t('here') }}</router-link
              >.
            </template>
          </vuci-form-item-switch>
          <vuci-form-item-upload
            :uci-section="s"
            name="ca_cert2"
            option="ca_cert2"
            :label="$t('Inner CA-Certificate')"
            :help="$t('CA-Certificate is used to verify the authentication server.')"
            :depend="s.mode === 'sta' && s.auth === 'EAP-TLS' && encryptionDepend && s.device_files2 !== '1'"
            max-size="16MB"
            :warnings="getCaWarning"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="ca_cert2"
            :label="$t('Inner CA-Certificate')"
            :help="$t('CA-Certificate is used to verify the authentication server.')"
            :depend="s.mode === 'sta' && s.auth === 'EAP-TLS' && encryptionDepend && s.device_files2 === '1'"
            :options="[['', $t('No CA Certificate')]].concat(caOpts)"
            :warnings="getCaWarning"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="client_cert2"
            option="client_cert2"
            :label="$t('Inner Client-Certificate')"
            :depend="s.mode === 'sta' && s.auth === 'EAP-TLS' && encryptionDepend && s.device_files2 !== '1'"
            max-size="16MB"
            required
          />
          <vuci-form-item-select
            :uci-section="s"
            name="client_cert2"
            :label="$t('Inner Client-Certificate')"
            :depend="s.mode === 'sta' && s.auth === 'EAP-TLS' && encryptionDepend && s.device_files2 === '1'"
            :options="certOpts"
            required
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="priv_key2"
            option="priv_key2"
            :label="$t('Inner Private Key')"
            :depend="s.mode === 'sta' && s.auth === 'EAP-TLS' && encryptionDepend && s.device_files2 !== '1'"
            max-size="16MB"
            required
          />
          <vuci-form-item-select
            :uci-section="s"
            name="priv_key2"
            :label="$t('Inner Private Key')"
            :depend="s.mode === 'sta' && s.auth === 'EAP-TLS' && encryptionDepend && s.device_files2 === '1'"
            :options="keyOpts"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="priv_key2_pwd"
            :label="$t('Password of inner Private Key')"
            :depend="s.mode === 'sta' && s.auth === 'EAP-TLS' && encryptionDepend && (s.device_files !== '1' || keyEncrypted(s.priv_key2))"
            password
            rules="credentials_validate"
            maxlength="512"
            :required="s.device_files2 === '1'"
            sensitive
          />
          <vuci-form-item-input
            :uci-section="s"
            name="identity"
            :label="$t('Identity')"
            :help="$t('Used as the username for authentication.')"
            maxlength="4096"
            :depend="s.mode === 'sta' && ['fast', 'peap', 'ttls', 'tls'].includes(s.eap_type) && encryptionDepend"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="anonymous_identity"
            :label="$t('Anonymous Identity')"
            :help="$t('Shown as username outside the encrypted tunnel. Not used for authentication.')"
            :depend="s.mode === 'sta' && ['fast', 'peap', 'ttls', 'tls'].includes(s.eap_type) && encryptionDepend"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="password"
            :label="$t('Password')"
            :help="$t('Used for authentication.')"
            :depend="s.mode === 'sta' && ['fast', 'peap', 'ttls'].includes(s.eap_type) && encryptionDepend"
            password
            rules="credentials_validate"
            maxlength="512"
            required
            sensitive
          />
          <!-- There is dublicate NAS id field, because it's used by two different things -->
          <!-- Disable rmempty to prevent false positive changed tab status -->
          <!-- Because of this s.nasid cannot be used as it won't get deleted on false depend !!! -->
          <vuci-form-item-input
            :uci-section="s"
            name="nasid"
            :label="$t('NAS id')"
            :help="$t('Used for fast transition and Radius server.')"
            :depend="isAp && (encryptionDepend || (s.encryption === 'ppsk2' && s.radius_ppsk === '1'))"
            :rmempty="s.ieee80211r !== '1'"
          />
        </template>

        <template #vlans="{ tab: { show = true } }">
          <vuci-typed-section
            :visible="section.encryption === 'ppsk2' && section.radius_ppsk === '1'"
            :uci-data="uciData"
            :before-add="(newSection: WifiVlan) => (newSection.iface = section.id)"
            :after-add="(_: WifiVlan, { newSection }: { newSection: WifiVlan }) => modalData().vuciForm.initialForm.wifiVlans.push(newSection)"
            :endpoints="[{ endpoint: `wireless/vlans/config`, sectionFilter: (s: WifiVlan) => s.iface === section.id }]"
            data-key="wifiVlans"
            type="wifi-vlan"
            :title="$t('VLANs')"
            :columns="vlanCols"
            :table-actions="['column-list', 'search']"
          >
            <template #description="{ s }">
              <vuci-form-item-input
                :uci-section="s"
                name="description"
                :rules="['uciname', () => $utils.validateNoDuplicates(formData.wifiVlans, 'description', s.description, $t('name'))]"
                required
                @change="$utils.validate"
              />
            </template>
            <template #network="{ s }">
              <vuci-form-item-select
                :uci-section="s"
                name="network"
                :options="[['', $t('-- Please select --')]].concat(availableNetworks)"
                required
                :depend="show"
              />
            </template>
            <template #vid="{ s }">
              <vuci-form-item-input
                :uci-section="s"
                name="vid"
                rules="irange(1,4094)"
                required
              />
            </template>
          </vuci-typed-section>
        </template>

        <template #macfilter="{ tab: { show = true } }">
          <vuci-form-item-select
            :uci-section="s"
            name="macfilter"
            :label="$t('MAC-Address Filter')"
            :help="
              $t(
                'Allow listed only - only allows devices with MAC addresses specified in the MAC list to connect to your WiFi network \
              Allow all except listed - blocks devices with MAC addresses specified in the MAC list from connecting to your WiFi network'
              )
            "
            :options="macFilterOptions"
            :depend="show"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="maclist"
            :label="$t('MAC-List')"
            :depend="s.macfilter === 'allow' || s.macfilter === 'deny'"
            rules="macaddrrange"
            allow-create
            multiple
            :options="$network.getMacOptions(macAddresses)"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('List of MAC addresses to be included or excluded from connecting to your WiFi network.')"
                :hints="e => [e.macaddrrange()]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-switch
            :uci-section="s"
            name="delete_from_whitelist"
            :label="$t('Remove from allowlist')"
            :help="$t(`Enables MAC removal from allowlist when 'Hotspot' service's 'MAC blocking' blocks MAC ('Hotspot' must be on same interface)`)"
            :depend="s.macfilter === 'allow'"
          />
        </template>

        <template #additional="{ tab: { show = true } }">
          <vuci-form-item-switch
            :uci-section="s"
            name="mesh_fwding"
            :label="$t('Forward mesh peer traffic')"
            :depend="show && s.mode === 'mesh'"
            :rmempty="false"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="mesh_rssi_threshold"
            :label="$t('RSSI threshold for joining')"
            :help="$t('0 = not using RSSI threshold, 1 = do not change driver default.')"
            initial="0"
            rules="irange(-255,1)"
            :depend="show && s.mode == 'mesh'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="hidden"
            :label="$t('Hide SSID')"
            :help="$t('If enabled, when connecting to this access point SSID will need to be entered manually because it will not be shown during a scan.')"
            :depend="show && isAp"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="isolate"
            :label="$t('Isolate Clients')"
            :help="$t('Prevents client-to-client communication.')"
            :depend="show && isAp && s.encryption !== 'ppsk2'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="bss_transition"
            :label="$t('802.11v BSS Transition Management')"
            :help="
              $t('Enables suggestions for clients to leave this AP if a signal is getting low. For clients not understanding this standard AP can kick them forcibly so they can connect to other AP')
            "
            :depend="show && isAp"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="ieee80211k"
            :label="$t('802.11k Radio Resource Measurement')"
            :help="$t('Enables suggestions for clients to join other APs when this AP has too many clients.')"
            :depend="show && isAp"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="disassoc_low_ack"
            :label="$t('Disassociate On Low Acknowledgement')"
            :help="$t('Allow AP mode to disconnect STAs based on low ACK condition.')"
            :depend="show && isAp"
            initial
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="bgscan_enabled"
            :label="$t('Enable fast roaming')"
            :help="$t('Requests background scans for the purpose of roaming within an ESS.')"
            :depend="show && isClient && encryption.sta_80211r"
            @change="(self: any) => (s.ieee80211r = self.model)"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="trm_enabled"
            :label="$t('Redirect captive portal')"
            :help="$t('Enables captive portal redirection.')"
            :depend="show && isClient && $store.hasPackages('travelmate')"
            :no-write="!isClient"
          />
        </template>

        <template #advanced="{ tab: { show = true } }">
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
            :depend="show"
            initial
          />
          <vuci-form-item-input
            :uci-section="s"
            name="dtim_period"
            :label="$t('DTIM Interval')"
            :help="$t('Delivery Traffic Indication Message Interval.')"
            placeholder="2"
            rules="irange(1,255)"
            :depend="show"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="wpa_group_rekey"
            :label="$t('Time interval for rekeying GTK')"
            :help="$t('Period of time in between automatic changes of the group key, which all devices on the network share.')"
            placeholder="600"
            rules="irange(1,65535)"
            :depend="show"
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
            :depend="show"
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
            :depend="show"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="max_listen_interval"
            :label="$t('Maximum allowed Listen Interval')"
            :help="$t('Association will be refused if a client/station attempts to associate with a listen interval greater than this value.')"
            placeholder="65535"
            rules="irange(0, 65535)"
            :depend="show"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="wds"
            :label="$t('WDS')"
            :help="$t('Enable WDS.')"
            :depend="show && (s.mode === 'sta' || isAp)"
            @change="$utils.validate"
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
            :depend="show && isAp"
            initial
          />
          <vuci-form-item-select
            :uci-section="s"
            name="ieee80211w"
            :label="$t('802.11w Management frame protection')"
            :help="$t(`Enables Management frame protection (MFP or PMF). By default it is set to 'Required' when using WPA3 encryption`)"
            :options="ieee80211wOptions"
            :depend="show && isAp && !isWpa3 && s.encryption !== 'none'"
          />
        </template>

        <template #fastTransition="{ tab: { show = true } }">
          <!-- There is dublicate NAS id field, because it's used by two different things -->
          <!-- Disable rmempty to prevent false positive changed tab status -->
          <!-- Because of this s.nasid cannot be used as it won't get deleted on false depend !!! -->
          <vuci-form-item-input
            :uci-section="s"
            name="nasid"
            :label="$t('NAS id')"
            :help="$t('Used for fast transition and Radius server.')"
            :depend="show"
            :rmempty="!(isAp && encryptionDepend)"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="mobility_domain"
            :label="$t('Mobility Domain')"
            :help="$t('4-character hexadecimal ID.')"
            :depend="show"
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
            :depend="show && driver !== 'ralink'"
            placeholder="1000"
            rules="irange(1000,65535)"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="ft_over_ds"
            :label="$t('FT protocol')"
            :depend="show"
            :options="ftOverOptions"
          />
        </template>

        <template #bgScan="{ tab: { show = true } }">
          <vuci-form-item-select
            :uci-section="s"
            name="bgscan_mode"
            :label="$t('Mode')"
            :options="bgscanOptions"
            :depend="show"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Mode used by fast roaming')"
                :choice-hint="$t('Possible modes')"
                :hints="[
                  { option: $t('Simple'), hint: $t('Periodic background scans based on signal strength.') },
                  { option: $t('Learn'), hint: $t('Learns channels used by the network and tries to avoid scans on other channels.') }
                ]"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-input
            :uci-section="s"
            name="short_interval"
            :label="$t('Short interval')"
            :help="$t('Defines the interval between background scans (in seconds) if the actual signal level of the currently connected access point is worse than signal threshold.')"
            initial="30"
            rules="irange(5,86400)"
            :depend="show"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="long_interval"
            :label="$t('Long interval')"
            :help="$t('Defines the interval between background scans (in seconds) if the actual signal level of the currently connected access point is better than signal threshold.')"
            initial="300"
            rules="irange(5,86400)"
            :depend="show"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="signal_thresh"
            :label="$t('Signal threshold')"
            :help="$t('Defines a threshold (in dBm) that determines if short interval or longer interval will be used.')"
            initial="-70"
            rules="irange(-90, -30)"
            :depend="show"
            required
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
    <vuci-typed-section
      :show="showMultiAP"
      :visible="isMultiAp"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'wireless/multi_ap/config' }]"
      data-key="multiAccessPoints"
      type="wifi-iface"
      :title="$t('Access points')"
      :help="
        $t(
          'Configure multiple access points for the router to connect to the internet. \
        Click and drag the access points to change priority (higher place means higher priority).'
        )
      "
      :columns="cols"
      :exception-options="['priority']"
      sortable
      sort-by="priority"
    >
      <template #ssid="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="ssid"
          required
          rules="max_bytes(32)"
        />
      </template>
      <template #key="{ s }">
        <!-- maxlength null, to not show double error message, when length is more than 4096 -->
        <vuci-form-item-input
          :uci-section="s"
          name="key"
          password
          rules="wpakey"
          :maxlength="null"
          sensitive
        />
      </template>
      <template #on_off>
        <tlt-switch
          v-show="uciData.multiAccessPoints?.length > 0"
          key="on_off"
          v-model="isOn"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :rmempty="false"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import { computed, inject, nextTick, ref, watchEffect } from 'vue'
import type { WifiInterface, WifiAp, WifiInterfaceStatus, WifiDeviceOptions, WifiVlan } from '@/types/wirelessTypes'
import NetworkAutoConfig, { type FakeWifiInterface } from '../../../components/NetworkAutoConfig'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { FormOptionKey, type FormModel, type FormOptions } from './WirelessInterfaceCommon'
import HintHelper from '@/components/shared/HintHelper.vue'
import type VuciFormItemInput from '@ui-core/vuci-form/src/VuciFormItemInput.vue'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { axios } from '@ui-core/plugins/axios'
import { wireless } from '@/plugins/wireless'
import { utils } from '@/plugins/utils'
import type { Interface, TapInterface } from '@/types/networkTypes'
import { useRouter } from 'vue-router'
import type { GeneratedCert } from '@/types/certTypes'
import { copy } from '@ui-core/utils/vue-helpers'
import { session } from '@ui-core/plugins/session'
import type { Tab } from '@ui-core/components/tabs/TltTabs.vue'
import StringWithLinks, { formatLink } from '@/components/shared/StringWithLinks.vue'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()
const prompt = usePrompt()
const router = useRouter()
const { networkDeviceStatus, bridgeConfigs, certData, deviceConfigs, deviceOptions, deviceStatus, wifiInterfaceStatus, interfaceConfigs, macAddresses, wifiPpskGroups, updateInterfaces } = inject(
  FormOptionKey
) as FormOptions
const setSection = inject<(arg0: (section: WifiInterface) => void) => void>('setSection', () => () => {})
const modalData = inject('modalData', () => ({
  vuciForm: { initialForm: copy<FormModel>({ multiAccessPoints: [], wifiInterfaces: [], wifiVlans: [] }) },
  uciData: copy<FormModel>({ multiAccessPoints: [], wifiInterfaces: [], wifiVlans: [] })
}))

export interface Props {
  section: FakeWifiInterface
  tab: {
    initialTab: string
    revert: () => void
  }
}
const props = withDefaults(defineProps<Props>(), { tab: () => ({ initialTab: '', revert: () => {} }) })
const formData = ref<FormModel>({ multiAccessPoints: [], wifiInterfaces: [], wifiVlans: [] })
const ppskModes = ref<{ name: string; value: string }[]>([
  { name: $t('Local'), value: '0' },
  { name: 'RADIUS', value: '1' }
])

const cols = [
  { name: 'ssid', label: $t('SSID'), help: $t('SSID of the access point.') },
  { name: 'key', label: $t('Password'), help: $t('Password used for connecting to the AP.') },
  { name: 'enabled', label: $t('Enabled'), scopedSlots: { customHeader: 'on_off' } }
]

const vlanCols = computed(() => [
  { name: 'description', label: $t('Name'), help: $t('Name of the VLAN entry.') },
  { name: 'network', label: $t('Network'), help: $t('Network interface that this VLAN ID will be assigned.'), show: !store.isAccessPoint },
  { name: 'vid', label: 'VLAN ID', help: $t('VLAN ID to match against (between 1 and 4094).') }
])

const tabs = computed<Tab<'general' | 'additional' | 'encryption' | 'fastTransition' | 'bgScan' | 'advanced' | 'macfilter' | 'vlans'>[]>(() => {
  return [
    { name: 'general', title: $t('General Setup') },
    { name: 'additional', title: $t('Additional Settings'), show: driver.value !== 'qcawifi' },
    { name: 'encryption', title: $t('Wireless Security'), show: !isMultiAp.value },
    { name: 'vlans', title: $t('VLANs'), show: props.section.encryption === 'ppsk2' && props.section.radius_ppsk === '1' },
    { name: 'fastTransition', title: $t('Fast Transition'), show: props.section.ieee80211r === '1' && isAp.value },
    { name: 'bgScan', title: $t('Fast Roaming'), show: props.section.bgscan_enabled === '1' },
    { name: 'advanced', title: $t('Advanced Settings'), show: driver.value !== 'qcawifi' },
    { name: 'macfilter', title: $t('MAC-Filter'), show: isAp.value && driver.value !== 'qcawifi' }
  ]
})

const networkOptions = computed(() => {
  return (interfaceConfigs.value as Interface[]).map(e => e.name)
})

const macFilterOptions = [
  ['', $t('Disable')],
  ['allow', $t('Allow listed only')],
  ['deny', $t('Allow all except listed')]
]
const ftOverOptions = [
  ['1', $t('FT over DS')],
  ['0', $t('FT over the Air')]
]
const cipherOptions = [
  ['auto', $t('Auto')],
  ['ccmp', $t('Force CCMP (AES)')],
  ['tkip', $t('Force TKIP')],
  ['tkip+ccmp', $t('Force TKIP and CCMP (AES)')]
]
function getCipherWarning(val: string): string | undefined {
  if (!isAp.value) return
  if (['tkip', 'tkip+ccmp'].includes(val)) return $t('TKIP has been deprecated by IEEE. Consider using other cypher.')
  return
}
const bgscanOptions = [
  ['simple', $t('Simple')],
  ['learn', $t('Learn')]
]
const ieee80211wOptions = [
  ['0', $t('Disabled')],
  ['1', $t('Optional')],
  ['2', $t('Required')]
]
const modeOptions = computed(() => [
  ['ap', $t('Access Point')],
  ['sta', $t('Client'), store.isRouter && driver.value !== 'qcawifi'],
  ['mesh', $t('Mesh'), driver.value === 'nl80211'],
  ['multi_ap', $t('Multi AP'), store.isRouter && driver.value !== 'qcawifi']
])

const authOptions = computed(() => {
  const options = ['EAP-GTC', 'EAP-MD5', ['EAP-MSCHAPV2', 'EAP-MSCHAPv2'], 'EAP-TLS']
  if (props.section.eap_type === 'ttls') {
    options.push(['PAP', 'PAP'], ['CHAP', 'CHAP'], ['MSCHAP', 'MSCHAP'], ['MSCHAPV2', 'MSCHAPv2'])
  }
  return options
})
function getAuthWarnings(val: string): string | undefined {
  if (['EAP-MD5', 'EAP-MSCHAPV2', 'PAP', 'CHAP', 'MSCHAP', 'MSCHAPV2'].includes(val)) return $t('"%s" is not a secure authentication method. Consider using EAP-TLS or EAP-GTC').format(val)
  return
}

function certPair(cert: GeneratedCert): [string, string] {
  return [cert.path, cert.fullname]
}
const keyOpts = computed(() => certData.value.filter(cert => cert.type === 'key').map(certPair))
const caOpts = computed(() => certData.value.filter(cert => (['root_ca', 'ca', 'import', 'scep'] as GeneratedCert['cert_type'][]).includes(cert.cert_type) && cert.type === 'cert').map(certPair))
const certOpts = computed(() => certData.value.filter(cert => (['client', 'server', 'import', 'scep'] as GeneratedCert['cert_type'][]).includes(cert.cert_type) && cert.type === 'cert').map(certPair))

function keyEncrypted(key: string): boolean {
  // ?? true is for backwards compatability as old certs will have this undefined and they should be treated same as before this option was added (with pass field shown)
  return certData.value.find(cert => cert.path === key)?.pass_required ?? true
}

function getCaWarning(val: string): string | undefined {
  if (!val) return $t('By not including the CA certificate, the Authentication server will not be verified. If possible, include the CA certificate.')
  return
}

const status = computed<Partial<WifiInterfaceStatus>>(() => {
  return wifiInterfaceStatus.value.find(iface => iface.id === props.section.id) || {}
})

const isAp = computed(() => {
  return props.section.mode === 'ap' || props.section.mode === undefined
})
const isClient = computed(() => {
  return ['sta', 'multi_ap'].includes(props.section.mode ?? 'ap')
})
const isMultiAp = computed(() => {
  return props.section.mode === 'multi_ap'
})
const driver = computed(() => {
  return deviceStatus.value.find(e => e.id === 'radio0')?.type
})
const isWpa3 = computed(() => {
  return ['wpa3', 'wpa3-mixed', 'sae', 'sae-mixed', 'owe'].includes(props.section.encryption)
})

const deviceFeatures = computed<Partial<WifiDeviceOptions['features']>>(() => {
  return deviceOptions.value.find(e => e.id === 'radio0')?.features || {}
})
const encryption = computed<Partial<WifiDeviceOptions['features']['encryption']>>(() => {
  return deviceFeatures.value.encryption || {}
})
const supplicant = computed<Partial<WifiDeviceOptions['features']['supplicant']>>(() => {
  return deviceFeatures.value.supplicant || false
})
const hostapd = computed<Partial<WifiDeviceOptions['features']['hostapd']>>(() => {
  return deviceFeatures.value.hostapd || false
})

const autoName = computed(() => wireless.getAutoNetworkName(networkOptions.value))
const isOn = computed({
  get() {
    return !!formData.value.multiAccessPoints?.every(x => x.enabled === '1')
  },
  set(value) {
    if (!formData.value.multiAccessPoints || isOn.value === value) return
    formData.value.multiAccessPoints.forEach(iface => {
      iface.enabled = value ? '1' : '0'
    })
  }
})
const radioAutoWarning = computed(() => {
  return props.section.mode === 'mesh' && deviceConfigs.value.some(device => (!props.section.device || props.section.device.includes(device.id)) && device.channel === 'auto')
})

const encryptionOptions = computed(() => {
  const encryptionOptions = [['none', $t('No encryption (open network)')]]
  if (!(hostapd.value || supplicant.value)) return encryptionOptions
  if (props.section.mode === 'mesh') return [['sae', 'WPA3-SAE (strong security)', encryption.value.ap_sae || encryption.value.sta_sae], ...encryptionOptions]
  const mode = isAp.value ? 'ap' : 'sta'
  return [
    ['sae', $t('WPA3-SAE (strong security)'), encryption.value[`${mode}_sae`]],
    ['sae-mixed', $t('WPA2-PSK/WPA3-SAE Mixed Mode (strong security)'), encryption.value[`${mode}_sae`]],
    ['psk2', $t('WPA2-PSK (strong security)')],
    ['ppsk2', $t('WPA2-PPSK (strong security)'), isAp.value],
    ['wpa3', $t('WPA3-EAP (strong security)'), encryption.value[`${mode}_eap192`]],
    ['wpa3-mixed', $t('WPA2-EAP/WPA3-EAP Mixed Mode (strong security)'), encryption.value[`${mode}_eap192`]],
    ['wpa2', $t('WPA2-EAP (strong security)'), encryption.value[`${mode}_eap`]],
    ['psk-mixed', $t('WPA-PSK/WPA2-PSK Mixed Mode (weak security)')],
    ['psk', $t('WPA-PSK (weak security)')],
    ['wpa', $t('WPA-EAP (weak security)'), encryption.value[`${mode}_eap`]],
    ['owe', $t('OWE (open network, encrypted)'), encryption.value[`${mode}_owe`]],
    ['none', $t('No encryption (open network)')]
  ]
})
function getEncryptionWarning(val: string): string | undefined {
  if (!isAp.value) return
  if (val === 'none') return $t('SSID is not protected by password and traffic is not encrypted. Consider using OWE to encrypt traffic without password or encryption type protected by password.')
  if (val === 'owe') return $t('Traffic is encrypted but SSID is not protected by password. Consider an encryption type protected by password.')
  if (['psk', 'psk-mixed', 'wpa'].includes(val)) return $t('WPA is outdated and should not be used due to security concerns. Consider using only WPA2 or WPA3.')
  return
}
const encryptionDepend = computed(() => {
  return ['wpa', 'wpa2', 'wpa3', 'wpa3-mixed'].includes(props.section.encryption)
})
const disablePassword = computed(() => {
  return !['psk', 'psk2', 'psk+psk2', 'psk-mixed', 'ppsk2', 'sae', 'sae-mixed'].includes(props.section.encryption) || (props.section.encryption === 'ppsk2' && props.section.radius_ppsk === '1')
})
watchEffect(() => {
  if (disablePassword.value)
    setSection(section => {
      section.key = ''
    })
})

const apPassword = !props.section.mode || props.section.mode === 'ap' ? props.section.key : ''
async function modeChange(self: any, newVal: string, oldVal: string) {
  if (newVal === oldVal) return
  await nextTick()
  setSection(section => {
    section.ssid = ''
    section.key = newVal === 'ap' ? apPassword : ''
    section.ieee80211r = '0'
  })
  /** @type {Record<string, string>} */
  const encryptionDefaults: Record<string, string> = {
    ap: 'psk2',
    sta: 'psk2',
    mesh: 'sae'
  }
  setSection(section => (section.encryption = encryptionDefaults[newVal] ?? ''))

  if (store.isRouter && (newVal === 'ap' || oldVal === 'ap')) {
    setSection(section => (section.network = newVal === 'ap' ? 'lan' : autoName.value))
  }
  if (store.isAccessPoint) {
    const radios = wireless.allRadios()
    setSection(section => (section.device = newVal === 'mesh' ? radios.splice(-0, 1) : radios))
  }
  utils.validate(self)
}

function validateClientDevices(value: string[]) {
  if (['multi_ap', 'sta', 'mesh'].includes(props.section.mode ?? 'ap') && value.length > 1) return { isValid: false, message: $t('Client, Mesh and Multi AP interfaces can only have one radio') }
  return { isValid: true }
}
function validateMeshID(value: string) {
  const validationError = formData.value.wifiInterfaces.some(iface => {
    const sameRadio = !props.section.device || props.section.device.some(radio => iface.device?.includes(radio))
    return iface.mode === 'mesh' && iface.mesh_id === value && iface.id !== props.section.id && sameRadio
  })
  if (validationError) return { isValid: false, message: $t('Mesh ID must be unique within the same wireless device') }
  return { isValid: true }
}

function commonValidationCondition(cb: (arg0: WifiInterface) => boolean, message: string) {
  if (formData.value.wifiInterfaces.some(iface => iface.ssid === props.section.ssid && iface.id !== props.section.id && cb(iface))) return { isValid: false, message }
  return { isValid: true }
}
function validateSSID() {
  return commonValidationCondition(
    iface => iface.device?.some(device => props.section.device?.includes(device)) || iface.device === props.section.device,
    $t('There can only be one interface with the same SSID on wireless device.')
  )
}

function validateNetwork(value: string): { isValid: true } | { isValid: false; message: string } {
  const iface = (interfaceConfigs.value as Interface[]).find(e => e.name === value)
  if (!iface) return { isValid: true }
  if (['wwan', 'connm'].includes(iface.proto)) return { isValid: false, message: $t('Mobile network cannot be used') }
  const ifaceBridge = networkDeviceStatus.value.find(dev => dev.type === 'bridge' && (dev.id === iface.device || new RegExp(`^(${dev.name})\\.[0-9]+$`).test(iface.device!)))
  if (isClient.value && props.section.wds !== '1' && ifaceBridge)
    return {
      isValid: false,
      message: isMultiAp.value
        ? $t('Bridged networks cannot be used with Multi AP')
        : $t('Bridged networks cannot be used with regular clients. If bridged wireless network is needed consider using: Mesh, WDS or Relayd')
    }
  if (!ifaceBridge && formData.value.wifiInterfaces.some(wifi => wifi.id !== props.section.id && wifi.network === value))
    return {
      isValid: false,
      message:
        isClient.value || props.section.wds === '1'
          ? $t('This network is already being used by other wireless network. Unassign it or create different network')
          : $t('This network is already being used by other wireless network. Unassign it, create different network or make network bridged')
    }
  if (!ifaceBridge && iface.ifname?.length)
    return {
      isValid: false,
      message:
        isClient.value || props.section.wds === '1'
          ? $t('Network with an assigned physical interface cannot be used. Unassign it or create different network')
          : $t('Network with an assigned physical interface cannot be used. Unassign it, create different network or make network bridged')
    }
  return { isValid: true }
}

const keyRef = ref<InstanceType<typeof VuciFormItemInput> | null>(null)
const formRef = ref<InstanceType<typeof VuciForm> | null>(null)
const initialForm = copy(props.section)
async function beforeSave() {
  // need seperate key validation to mark this field as invalid as ui-core does not support dublicate fields properly
  keyRef.value?.validate()
  const validate = await formRef.value?.validate()
  if (!validate) return
  return new Promise<void>(resolve => {
    const existingSection = formData.value.wifiInterfaces.find(
      iface =>
        iface.id !== props.section.id &&
        iface.ssid === props.section.ssid &&
        iface.mode === props.section.mode &&
        (props.section.encryption !== iface.encryption || ((props.section.key || iface.key) && props.section.key !== iface.key))
    )
    if (!existingSection || !props.section.ssid) return resolve()
    prompt.show({
      title: $t('Configuration update'),
      content: $t('Due to encryption and password mismatch these settings for the other "%s" SSID will also be updated.').format(existingSection.ssid),
      okText: $t('Update'),
      cancelText: $t('Cancel'),
      onOk: () => {
        resolve()
      }
    })
  })
    .then(async () => {
      if (!store.isAccessPoint) return
      // spin is workaround for https://git.teltonika.lt/teltonika/rutx_open/-/issues/16850
      store.spin($t('Waiting for configuration to be applied...'))
      if (isAp.value) {
        await NetworkAutoConfig.manageApNetwork(props.section, interfaceConfigs.value as TapInterface[], bridgeConfigs.value, formData.value.wifiInterfaces, store.board!.network.lan?.device!)
      } else {
        await NetworkAutoConfig.manageMeshNetwork(props.section, initialForm, interfaceConfigs.value as TapInterface[], bridgeConfigs.value, formData.value.wifiInterfaces)
      }
      await NetworkAutoConfig.updateDevices(bridgeConfigs.value, formData.value.wifiInterfaces, store.board!.network.lan!.device!)
    })
    .finally(() => store.spin(false))
}

function staReconnect() {
  store.spin()
  return axios
    .post('/api/wireless/actions/reconnect', { data: { sta_id: props.section.id } })
    .then(res => {
      if (res.success) message.success($t('Reconnecting to the access point'))
    })
    .catch(() => {
      message.error($t('Failed to reconnect to the access point'))
    })
    .finally(() => {
      store.spin(false)
    })
}

const showMultiAP = ref(true)
function hideApSection(tab: string) {
  showMultiAP.value = tab === 'general'
}
const selectedTab = ref<string | undefined>()
function changeTab() {
  selectedTab.value = tabs.value.find(e => e.name === props.tab.initialTab)?.name ?? tabs.value[0].name
  props.tab.revert()
}
function afterUpload({ res }: { res: { data: WifiAp[] } }) {
  if (!Array.isArray(res?.data)) return
  const data = res.data.map(entry => ({
    ...entry,
    '.type': 'wifi-iface'
  }))
  formData.value.multiAccessPoints = [...formData.value.multiAccessPoints, ...data]
}

const vlanOptions = [['lan', $t('Default')]]
async function onInterfaceSave(_: unknown, { data }: { data: WifiInterface }) {
  if (data.encryption !== 'ppsk2' || data.radius_ppsk !== '1') {
    formData.value.wifiVlans = formData.value.wifiVlans.filter(vlan => vlan.iface !== data.id)
    modalData().vuciForm.initialForm.wifiVlans = formData.value.wifiVlans
    modalData().uciData.wifiVlans = formData.value.wifiVlans
  }
  if (store.isRouter) {
    const customNetwork = data.network && !networkOptions.value.includes(data.network)
    const areaType = !data.mode || data.mode === 'ap' ? 'lan' : 'wan'
    if (customNetwork && session.hasAccess(`network/${areaType}`)) return router.push({ path: `/network/${areaType}`, hash: `#name=${data.network}`, query: { persistSpinState: 'true' } })
    else if (initialForm.network !== props.section.network) await updateInterfaces()
  }
  // Update other SSID interface to use the same encryption and password if found
  const existingSection = formData.value.wifiInterfaces.find(iface => iface.id !== data.id && iface.ssid === data.ssid && iface.mode === data.mode)
  if (data.ssid && existingSection) {
    existingSection.encryption = data.encryption
    existingSection.key = data.key
  }
  // trm_enabled is "global" option for all stl interfaces
  const disableAll = formData.value.wifiInterfaces.every(wifi => wifi.mode !== 'sta')
  if (data.mode === 'sta' || disableAll) {
    const value = disableAll ? '0' : data.trm_enabled
    formData.value.wifiInterfaces.forEach((_, index) => {
      formData.value.wifiInterfaces[index].trm_enabled = value
    })
  }
}
function loadExtraFields() {
  if (!store.isAccessPoint || !isAp.value) return
  NetworkAutoConfig.setData(props.section, interfaceConfigs.value as TapInterface[], bridgeConfigs.value)
}

const availableNetworks = computed(() => wireless.getAvailableNetworks(interfaceConfigs.value as Interface[]))

const availableRadiusDevices = computed(() =>
  networkDeviceStatus.value
    .filter(dev => ['ethernet', 'vxlan'].includes(dev.type))
    .map(dev => [dev.name, dev.description || dev.name])
    .sort()
)
</script>
