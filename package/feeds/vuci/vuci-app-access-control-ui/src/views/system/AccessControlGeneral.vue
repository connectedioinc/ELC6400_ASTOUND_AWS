<template>
  <tlt-table
    id="access-control-table"
    :title="$t('Access control')"
    :columns="tableCols"
    :data-source="tableData"
    :table-actions="['link', 'refresh', 'column-list', 'search']"
    :row-actions="['edit']"
    @refresh="loadData"
  >
    <template #link>
      <link-to-page
        v-slot="{ title }"
        :icon="null"
        path="/network/firewall/attack_prevention"
      >
        <table-action
          id="attack-prevention"
          icon="external-link"
        >
          {{ title }}
        </table-action>
      </link-to-page>
    </template>
    <template #local_access="{ record }">
      <tlt-form-item-switch
        v-if="['SSH', 'CLI', 'Telnet'].includes(record.id)"
        prop="local_access"
        :model-value="record.enabled === '1'"
        @input="accessChange(record.id, 'enabled')"
      />
      <tlt-form-item-switch
        v-if="record.id === 'HTTP'"
        prop="local_access"
        :model-value="record.enable_http === '1'"
        @input="accessChange(record.id, 'enable_http')"
      />
      <tlt-form-item-switch
        v-if="record.id === 'HTTPS'"
        prop="local_access"
        :model-value="record.enable_https === '1'"
        @input="accessChange(record.id, 'enable_https')"
      />
    </template>
    <template #port="{ record }">
      <tlt-form-item-input
        v-if="['SSH', 'CLI', 'Telnet'].includes(record.id)"
        :ref="`val-${record.id}`"
        v-model="record.port"
        :uci-section="record"
        prop="port"
        class="md:w-64 w-full"
        required
        :placeholder="record.id === 'CLI' ? '4200-4220' : ''"
        :rules="['SSH', 'Telnet'].includes(record.id) ? ['port', self => validatePorts(self, record.id === 'SSH' ? 'sshPort' : 'telnetPort')] : ['portrange', validatePortRange]"
        @change="updateValidationsOverview"
      />
      <tlt-form-item-select
        v-if="record.id === 'HTTP'"
        :ref="`val-${record.id}`"
        v-model="record.listen_http"
        :uci-section="record"
        prop="listen_http"
        class="md:w-64 w-full"
        placeholder="80"
        required
        allow-create
        multiple
        :rules="['ipport', self => validatePorts(self, 'webuiListenHttp')]"
        @change="updateValidationsOverview"
      />
      <tlt-form-item-select
        v-if="record.id === 'HTTPS'"
        :ref="`val-${record.id}`"
        v-model="record.listen_https"
        :uci-section="record"
        prop="listen_https"
        class="md:w-64 w-full"
        placeholder="443"
        required
        allow-create
        multiple
        :rules="['ipport', self => validatePorts(self, 'webuiListenHttps')]"
        @change="updateValidationsOverview"
      />
    </template>
    <template #remote_access="{ record }">
      <tlt-form-item-switch
        v-if="['SSH', 'CLI', 'Telnet'].includes(record.id)"
        prop="remote_access"
        :model-value="record.wan_access === '1'"
        @input="accessChange(record.id, 'wan_access')"
      />
      <tlt-form-item-switch
        v-if="record.id === 'HTTP'"
        prop="remote_access"
        :model-value="record.http_wan_access === '1'"
        @input="accessChange(record.id, 'http_wan_access')"
      />

      <tlt-form-item-switch
        v-if="record.id === 'HTTPS'"
        prop="remote_access"
        :model-value="record.https_wan_access === '1'"
        @input="accessChange(record.id, 'https_wan_access')"
      />
    </template>
    <template #wan_port="{ record }">
      <tlt-form-item-input
        v-if="['SSH', 'CLI', 'Telnet'].includes(record.id)"
        :ref="`val-${record.id}-wan`"
        v-model="record.wan_port"
        :uci-section="record"
        prop="wan_port"
        class="md:w-64 w-full"
        required
        :placeholder="record.id === 'CLI' ? '4200-4220' : ''"
        :rules="['SSH', 'Telnet'].includes(record.id) ? ['port', self => validatePorts(self, record.id === 'SSH' ? 'sshPortWan' : 'telnetPortWan')] : ['portrange', validatePortRange]"
        :readonly="record.wan_access === '0'"
        @change="updateValidationsOverview"
      />
      <tlt-form-item-select
        v-if="record.id === 'HTTP'"
        :ref="`val-${record.id}-wan`"
        v-model="record.wan_listen_http"
        :uci-section="record"
        prop="wan_listen_http"
        class="md:w-64 w-full"
        placeholder="80"
        required
        allow-create
        multiple
        :rules="['ipport', self => validatePorts(self, 'webuiListenHttpWan')]"
        :readonly="record.http_wan_access === '0'"
        @change="updateValidationsOverview"
      />
      <tlt-form-item-select
        v-if="record.id === 'HTTPS'"
        :ref="`val-${record.id}-wan`"
        v-model="record.wan_listen_https"
        :uci-section="record"
        prop="wan_listen_https"
        class="md:w-64 w-full"
        placeholder="443"
        required
        allow-create
        multiple
        :rules="['ipport', self => validatePorts(self, 'webuiListenHttpsWan')]"
        :readonly="record.https_wan_access === '0'"
        @change="updateValidationsOverview"
      />
    </template>
    <template #pam="{ record }">
      <tlt-form-model-item element-id="pam">
        <tlt-dummy-value
          :value="(record.id === 'SSH' && sshPamStatus) || (['HTTP', 'HTTPS'].includes(record.id) && httpHttpsPamStatus) || '-'"
          :class="{
            success: (record.id === 'SSH' && sshPamStatus === 'Enabled') || (['HTTP', 'HTTPS'].includes(record.id) && httpHttpsPamStatus === 'Enabled'),
            error: (record.id === 'SSH' && sshPamStatus === 'Disabled') || (['HTTP', 'HTTPS'].includes(record.id) && httpHttpsPamStatus === 'Disabled')
          }"
        />
      </tlt-form-model-item>
    </template>
    <template #edit="{ record }">
      <table-row-action
        id="edit"
        icon="edit"
        :button-props="{
          color: 'primary',
          size: 'md',
          disabled: false,
          type: 'text'
        }"
        @click="openModal(record.id)"
      >
        {{ $store.readOnlyPage ? $t('View') : $t('Edit') }}
      </table-row-action>
    </template>
  </tlt-table>
  <div class="flex justify-end list-layout--ignore">
    <tlt-button
      button-id="saveandapply"
      @click="isHttpDisabled && isHttpsDisabled ? saveTableDataWithPrompt() : saveTableData()"
    >
      {{ $t('Save & Apply') }}
    </tlt-button>
  </div>
  <tlt-modal
    :open="showModal"
    :nav-bar="[$t('%s configuration').format(modalServiceId)]"
    @close="closeModal"
  >
    <vuci-form
      ref="form"
      v-model="formData"
      config="dropbear;firewall;uhttpd;cli;telnetd;rpcd"
      :after-load="['HTTP', 'HTTPS'].includes(modalServiceId) ? loadDataHttpHttps : loadEditedOverviewData"
    >
      <template #default="{ uciData }">
        <vuci-named-section
          v-if="modalServiceId === 'SSH'"
          v-slot="{ s }"
          :after-save="(_, res) => afterSaveUpdate('SSH', res)"
          :uci-data="uciData"
          :title="$utils.getModalTitle('SSH')"
          type="dropbear"
          :endpoints="[
            {
              endpoint: 'access_control/ssh/config',
              sectionFilter: sections => sections.find(section => section['.type'] === 'dropbear')
            }
          ]"
          data-key="dropbear"
        >
          <tlt-form-model-item
            v-if="pamExists"
            element-id="pam"
            :label="$t('PAM')"
          >
            <template #help>
              {{ $t('You can change PAM configuration') }}
              <router-link to="/system/admin/access_control/pam"> {{ $t('here') }} </router-link>.
            </template>
            <tlt-dummy-value
              :value="(modalServiceId === 'SSH' && sshPamStatus) || (['HTTP', 'HTTPS'].includes(modalServiceId) && httpHttpsPamStatus) || '-'"
              :class="{
                success: (modalServiceId === 'SSH' && sshPamStatus === 'Enabled') || (['HTTP', 'HTTPS'].includes(modalServiceId) && httpHttpsPamStatus === 'Enabled'),
                error: (modalServiceId === 'SSH' && sshPamStatus === 'Disabled') || (['HTTP', 'HTTPS'].includes(modalServiceId) && httpHttpsPamStatus === 'Disabled')
              }"
            />
          </tlt-form-model-item>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable SSH access')"
            :help="$t('Turns SSH access from the local network (LAN) on or off.')"
            name="enabled"
            initial="1"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Remote SSH access')"
            :help="$t('Turns SSH access from remote networks (WAN) on or off.')"
            name="wan_access"
            :depend="remoteAvailable"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port (LAN)')"
            :help="$t('Selects which port to use for SSH access from local network.')"
            name="port"
            required
            :rules="['port', self => validatePorts(self, 'sshPort')]"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port (WAN)')"
            :help="$t('Selects which port to use for SSH access from remote networks.')"
            name="wan_port"
            required
            :placeholder="s.port"
            :rules="['port', self => validatePorts(self, 'sshPortWan')]"
            :depend="s.wan_access === '1'"
          />
          <vuci-form-item-radio-group
            :uci-section="s"
            name="enable_key_ssh"
            :label="$t('Authentication type')"
            :options="selected"
          >
            <template #help>
              <strong> {{ $t('Password') }} </strong> - {{ $t('SSH access with password for root user.') }}<br />
              <strong> {{ $t('Key-based only') }} </strong> - {{ $t('enables key-based authentication only and disables password authentication for root user.') }}<br />
              <strong> {{ $t('Use Both') }} </strong> - {{ $t('use both password and public keys for authentication.') }}<br />
            </template>
          </vuci-form-item-radio-group>
          <vuci-form-item-text-area
            :uci-section="s"
            name="ssh_keys"
            :label="$t('Public keys')"
            :help="$t('Public keys for ssh key-based authentication. Each individual key must be specified on a new line.')"
            rows="5"
            :depend="s.enable_key_ssh === '1' || s.enable_key_ssh === '2'"
          />
        </vuci-named-section>
        <vuci-named-section
          v-if="modalServiceId === 'HTTP'"
          v-slot="{ s }"
          :after-save="(_, res) => afterSaveUpdate('HTTP', res)"
          :uci-data="uciData"
          config="uhttpd"
          name="general"
          :title="$utils.getModalTitle('HTTP')"
          :endpoints="[{ endpoint: 'access_control/webui/config' }]"
          data-key="webui"
          :error-handlers="{ edit: handleEditErrors }"
        >
          <tlt-form-model-item
            v-if="pamExists"
            element-id="pam"
            :label="$t('PAM')"
          >
            <template #help>
              {{ $t('You can change PAM configuration') }}
              <router-link to="/system/admin/access_control/pam"> {{ $t('here') }} </router-link>.
            </template>
            <tlt-dummy-value
              :value="httpHttpsPamStatus"
              :class="{ success: httpHttpsPamStatus === 'Enabled', error: httpHttpsPamStatus === 'Disabled' }"
            />
          </tlt-form-model-item>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable HTTP access')"
            :help="$t('Turns HTTP access from the local network (LAN) to the device\'s WebUI on or off.')"
            name="enable_http"
            initial="1"
            @change="handleHttpAccessChange"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable remote HTTP access')"
            :help="$t('Turns HTTP access from remote networks (WAN) to the router\'s WebUI on or off.')"
            name="http_wan_access"
            :depend="remoteAvailable"
          />
          <vuci-form-item-list
            :uci-section="s"
            :label="$t('HTTP Port (LAN)')"
            :help="$t('Selects which port to use for HTTP access from the local network. Accepts port or an IP address with a port.')"
            name="listen_http"
            :rules="['ipport', self => validatePorts(self, 'webuiListenHttp')]"
            placeholder="80"
            :maxlines="64"
            required
            @change="updateValidations"
          />
          <vuci-form-item-list
            :uci-section="s"
            :label="$t('HTTP Port (WAN)')"
            :help="$t('Selects which port to use for HTTP access from remote networks. Accepts port or an IP address with a port.')"
            name="wan_listen_http"
            :rules="['ipport', self => validatePorts(self, 'webuiListenHttpWan')]"
            placeholder="80"
            :maxlines="64"
            required
            :depend="s.http_wan_access === '1'"
            @change="updateValidations"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Ignore private IPs on public interface')"
            :help="$t('Prevent access from private (RFC1918) IPs on an interface if it has a public IP address.')"
            name="rfc1918_filter_http"
            :depend="remoteAvailable"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable JSON-RPC')"
            :help="$t('Turns JSON-RPC access on or off.')"
            name="enable_json_rpc"
            :depend="$store.hasPackages('uhttpd-mod-ubus.control')"
          />
        </vuci-named-section>
        <vuci-named-section
          v-if="modalServiceId === 'HTTPS'"
          v-slot="{ s }"
          :after-save="(_, res) => afterSaveUpdate('HTTPS', res)"
          :uci-data="uciData"
          config="uhttpd"
          name="general"
          :title="$utils.getModalTitle('HTTPS')"
          :endpoints="[{ endpoint: 'access_control/webui/config' }]"
          data-key="webui"
          :error-handlers="{ edit: handleEditErrors }"
        >
          <tlt-form-model-item
            v-if="pamExists"
            element-id="pam"
            :label="$t('PAM')"
          >
            <template #help>
              {{ $t('You can change PAM configuration') }}
              <router-link to="/system/admin/access_control/pam"> {{ $t('here') }} </router-link>.
            </template>
            <tlt-dummy-value
              :value="httpHttpsPamStatus"
              :class="{ success: httpHttpsPamStatus === 'Enabled', error: httpHttpsPamStatus === 'Disabled' }"
            />
          </tlt-form-model-item>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable HTTPS access')"
            :help="$t('Turns HTTPS access from the local network (LAN) to the device\'s WebUI on or off.')"
            name="enable_https"
            initial="1"
            @change="handleHttpsChange"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Redirect to HTTPS')"
            :help="$t('Redirects connection attempts from HTTP to HTTPS.')"
            name="redirect_https"
            @change="handleRedirectChange"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable remote HTTPS access')"
            :help="$t('Turns HTTPS access from remote networks (WAN) to the router\'s WebUI on or off.')"
            name="https_wan_access"
            :depend="remoteAvailable"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable Basic Authentication')"
            :help="$t('Enable HTTP Basic Authentication for the WebUI. Requires HTTPS and automatic redirect to be active for secure login.')"
            name="enable_basic_auth"
            @change="handleBasicAuthChange"
          />
          <vuci-form-item-list
            :uci-section="s"
            :label="$t('HTTPS Port (LAN)')"
            :help="$t('Selects which port to use for HTTPS access from the local network. Accepts port or an IP address with a port.')"
            name="listen_https"
            :rules="['ipport', self => validatePorts(self, 'webuiListenHttps')]"
            placeholder="443"
            :maxlines="64"
            required
            @change="updateValidations"
          />
          <vuci-form-item-list
            :uci-section="s"
            :label="$t('HTTPS Port (WAN)')"
            :help="$t('Selects which port to use for HTTPS access from remote networks. Accepts port or an IP address with a port.')"
            name="wan_listen_https"
            :rules="['ipport', self => validatePorts(self, 'webuiListenHttpsWan')]"
            placeholder="443"
            :maxlines="64"
            required
            :depend="s.https_wan_access === '1'"
            @change="updateValidations"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Ignore private IPs on public interface')"
            :help="$t('Prevent access from private (RFC1918) IPs on an interface if it has a public IP address.')"
            name="rfc1918_filter_https"
            :depend="remoteAvailable"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable JSON-RPC')"
            :help="$t('Turns JSON-RPC access on or off.')"
            name="enable_json_rpc"
            :depend="$store.hasPackages('uhttpd-mod-ubus.control')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="device_files"
            :label="$t('Certificate files from device')"
            initial="1"
            :depend="certsExists"
          >
            <template #help>
              {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
              <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
              >.
            </template>
          </vuci-form-item-switch>
          <vuci-form-item-upload
            ref="certField"
            :uci-section="s"
            name="cert"
            :label="$t('Server certificate')"
            max-size="16MB"
            :warnings="v => [getWarning(v), getCertExpirationWarning(v)]"
            :depend="(s.device_files === '0' || !s.device_files) && certsExists"
            required
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            name="cert"
            :label="$t('Server certificate')"
            :options="uhttpd.certs"
            :warnings="v => [getWarning(v), getCertExpirationWarning(v)]"
            :depend="s.device_files === '1' && certsExists"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="key"
            :label="$t('Server key')"
            max-size="16MB"
            :depend="(s.device_files === '0' || !s.device_files) && certsExists"
            required
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            name="key"
            :label="$t('Server key')"
            :options="uhttpd.keys"
            :depend="s.device_files === '1' && certsExists"
          />
          <vuci-form-item-button
            v-if="certsExists && s.cert === '/etc/uhttpd.crt' && s.key === '/etc/uhttpd.key'"
            :uci-section="s"
            name="download"
            :label="$t('Certificate file')"
            :help="$t('Download certificate file from device. Used for browsers to reach HTTPS connection.')"
            :text="$t('Download')"
            @click="downloadCertificate"
          />
          <vuci-form-item-button
            v-if="showRenewButton"
            :uci-section="s"
            name="renew"
            :label="$t('Renew certificate')"
            :help="$t('Renew certificate to ensure safe and smooth system performance.')"
            :text="$t('Renew')"
            @click="handleUhttpdCertificateRenewal()"
          />
        </vuci-named-section>
        <vuci-named-section
          v-if="modalServiceId === 'CLI'"
          v-slot="{ s }"
          :uci-data="uciData"
          config="cli"
          name="general"
          :title="$utils.getModalTitle('CLI')"
          :endpoints="[{ endpoint: 'access_control/cli/config' }]"
          data-key="cli"
          :after-save="(_, res) => afterSaveUpdate('CLI', res)"
        >
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable CLI')"
            :help="$t('Turns CLI access from the local network (LAN) on or off.')"
            name="enabled"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable remote CLI')"
            :help="$t('Turns CLI access from remote networks (WAN) on or off.')"
            name="wan_access"
            :depend="remoteAvailable"
          />
          <vuci-form-item-input
            :uci-section="s"
            required
            :rules="['portrange', validatePortRange]"
            :label="$t('Port range (LAN)')"
            placeholder="4200-4220"
            :help="$t('Selects which ports to use for CLI access from local network.')"
            name="port"
            @change="updateValidations"
          />
          <vuci-form-item-input
            :uci-section="s"
            required
            :rules="['portrange', validatePortRange]"
            :label="$t('Port range (WAN)')"
            placeholder="4200-4220"
            :help="$t('Selects which ports to use for CLI access from remote networks.')"
            name="wan_port"
            :depend="s.wan_access === '1'"
            @change="updateValidations"
          />
          <vuci-form-item-input
            :uci-section="s"
            required
            :label="$t('Shell limit')"
            placeholder="5"
            :help="$t('Maximum number of active CLI connections.')"
            name="shell_limit"
            rules="range(1,10)"
          />
        </vuci-named-section>
        <vuci-named-section
          v-if="modalServiceId === 'Telnet'"
          v-slot="{ s }"
          :uci-data="uciData"
          :title="$utils.getModalTitle('Telnet')"
          type="telnetd"
          :endpoints="[
            {
              endpoint: 'access_control/telnet/config',
              sectionFilter: sections => sections.find(section => section['.type'] === 'telnetd')
            }
          ]"
          data-key="telnet"
          :after-save="(_, res) => afterSaveUpdate('Telnet', res)"
        >
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable Telnet access')"
            :help="$t('Turns Telnet access from the local network (LAN) on or off.')"
            name="enabled"
            initial="1"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable remote Telnet access')"
            :help="$t('If check box is selected user can access the router via Telnet from the outside (WAN).')"
            name="wan_access"
            :depend="remoteAvailable"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port (LAN)')"
            :help="$t('Port to listen for Telnet access from local network.')"
            :rules="['port', self => validatePorts(self, 'telnetPort')]"
            initial="23"
            required
            name="port"
            @change="updateValidations"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port (WAN)')"
            :help="$t('Port to listen for Telnet access from remote networks.')"
            :rules="['port', self => validatePorts(self, 'telnetPortWan')]"
            initial="23"
            name="wan_port"
            required
            :depend="s.wan_access === '1'"
            @change="updateValidations"
          />
        </vuci-named-section>
      </template>
      <template #form-buttons="{ save }">
        <div class="w-max ml-auto">
          <tlt-button
            button-id="saveandapply"
            @click="save"
          >
            {{ $t('Save & Apply') }}
          </tlt-button>
        </div>
      </template>
    </vuci-form>
  </tlt-modal>
</template>

<script>
import { formBus } from '@ui-core/vuci-form/src/form-bus'
import { copy } from '@ui-core/utils/vue-helpers'
import LinkToPage from '@/components/shared/LinkToPage.vue'
import { isArray } from '@ui-core/utils/inspect.ts'
import { mapState } from 'pinia'
import { useCertificatesStore } from '@/stores/certificates'
import { normalizeFileName, getCertificateWarning } from '@/plugins/certificates'
import TableRowAction from '@ui-core/components/table/TableRowAction.vue'

export default {
  components: { LinkToPage, TableRowAction },
  data() {
    return {
      httpKeys: ['enable_http', 'http_wan_access', 'listen_http', 'wan_listen_http'],
      httpsKeys: ['enable_https', 'https_wan_access', 'listen_https', 'wan_listen_https', 'redirect_https'],
      modalServiceId: null,
      formData: {},
      editErrors: {
        3: this.$t('Certificate key length is too low, minimum RSA key length is 1024 bits'),
        4: this.$t('Certificate key length is too low, minimum ECC key length is 160 bits'),
        5: this.$t('Certificate and key pair do not match'),
        103: this.$t('"Server certificate" and "Server key" files are both required'),
        default: this.$t('Failed to edit configuration')
      },
      remoteAvailable: !!this.$store.board.network.wan || !!this.$store.board.hwinfo.mobile || !!this.$store.board.hwinfo.industrial_access_point || false,
      certsExists: this.$store.hasPackages('vuci-app-certificates'),
      sideMessage: this.$t('Enabling remote %s access makes your device reachable from WAN, this might pose a security risk, especially if you are using a weak or default user password!'),
      httpPort: undefined,
      httpsPort: undefined,
      warningMessages: [],
      certificates: [],
      pamData: [],
      certificateWarnings: {
        1: this.$t("It's recommended to use a minimum RSA key length of 2048 bits for the certificate."),
        2: this.$t("It's recommended to use a minimum ECC key length of 256 bits for the certificate."),
        3: this.$t(`It's recommended to use a minimum key length of 2048 bits for the certificate.`)
      },
      showModal: false,
      tableData: [],
      enabledRemoteServices: [],
      selected: [
        {
          name: this.$t('Password'),
          value: '0'
        },
        {
          name: this.$t('Key-based only'),
          value: '2'
        },
        {
          name: this.$t('Use both'),
          value: '1'
        }
      ],
      interfaces: []
    }
  },
  computed: {
    ...mapState(useCertificatesStore, ['httpsCertificate', 'handleUhttpdCertificateRenewal']),
    uhttpd() {
      const certs = []
      const keys = []
      const pair = cert => [cert.path, normalizeFileName(cert.fullname)]
      const certificatesStore = useCertificatesStore()
      const certificatesData = certificatesStore.rawData
      if (certificatesData?.generated?.length) {
        certificatesData.generated.forEach(cert => {
          if (cert.tpm2) return
          const expirationDetails = certificatesStore.calculateExpirationDetails(cert.datetime, certificatesStore.deviceTime)
          const isInUse = cert.services?.includes('uhttpd:main')
          if (expirationDetails?.isExpired && !isInUse) return
          const certTypes = ['server', 'import', 'letsencrypt'].includes(cert.cert_type)
          if (certTypes) {
            if (cert.type === 'key') keys.push(pair(cert))
            if (cert.type === 'cert') certs.push(pair(cert))
          }
        })
      }
      return { certs, keys }
    },
    sshPamStatus() {
      const status = this.pamData.find(x => x.service === 'sshd')?.enabled
      return status === '1' ? 'Enabled' : 'Disabled'
    },
    httpHttpsPamStatus() {
      const status = this.pamData.find(x => x.service === 'rpcd')?.enabled
      return status === '1' ? 'Enabled' : 'Disabled'
    },
    telnetExists() {
      return this.$store.hasPackages('vuci-app-telnet-api')
    },
    pamExists() {
      return this.$store.hasPackages('vuci-app-pamd-api')
    },
    tableCols() {
      const cols = [
        { dataIndex: 'id', title: this.$t('Service') },
        { dataIndex: 'local_access', title: this.$t('Local access') },
        { dataIndex: 'port', width: 'md', title: this.$t('Port / Port range (LAN)') },
        { dataIndex: '__row-actions', title: this.$t('Advanced settings') }
      ]
      if (this.remoteAvailable) {
        cols.splice(3, 0, { dataIndex: 'remote_access', title: this.$t('Remote access') }, { dataIndex: 'wan_port', width: 'md', title: this.$t('Port / Port range (WAN)') })
      }
      if (this.pamExists) {
        cols.push({ dataIndex: 'pam', title: this.$t('PAM') })
      }
      return cols
    },
    ports() {
      const portsArray = [
        { title: this.$t("SSH 'port' (LAN)"), name: 'sshPort', val: this.tableData[0].port },
        { title: this.$t("SSH 'port' (WAN)"), name: 'sshPortWan', val: this.tableData[0].wan_port || this.tableData[0].port },
        { title: this.$t("WebUI 'HTTP port' (LAN)"), name: 'webuiListenHttp', val: this.tableData[1].listen_http },
        { title: this.$t("WebUI 'HTTP port' (WAN)"), name: 'webuiListenHttpWan', val: this.tableData[1].wan_listen_http || this.tableData[1].listen_http },
        { title: this.$t("WebUI 'HTTPS port' (LAN)"), name: 'webuiListenHttps', val: this.tableData[2].listen_https },
        { title: this.$t("WebUI 'HTTPS port' (WAN)"), name: 'webuiListenHttpsWan', val: this.tableData[2].wan_listen_https || this.tableData[2].listen_https }
      ]
      if (this.telnetExists) {
        portsArray.push(
          { title: this.$t("Telnet 'port' (LAN)"), name: 'telnetPort', val: this.tableData[4].port },
          { title: this.$t("Telnet 'port' (WAN)"), name: 'telnetPortWan', val: this.tableData[4].wan_port || this.tableData[4].port }
        )
      }
      return portsArray
    },
    isHttpDisabled() {
      return this.tableData.find(x => x.id === 'HTTP')?.enable_http === '0'
    },
    isHttpsDisabled() {
      return this.tableData.find(x => x.id === 'HTTPS')?.enable_https === '0'
    },
    showRenewButton() {
      const certPath = this.formData.webui?.[0]?.cert
      return this.certsExists && !!this.getCertExpirationWarning(certPath) && !this.httpsCertificate?.isCustomCertificate
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    handleHttpAccessChange(self) {
      this.showDisableAccessAlert(self.uciSection)
    },
    handleHttpsChange(self) {
      const section = self.uciSection
      section.enable_https === '0' && section.redirect_https === '1' ? (section.redirect_https = '0') : section.redirect_https
      section.enable_https === '0' && section.enable_basic_auth === '1' ? (section.enable_basic_auth = '0') : section.enable_basic_auth
      this.showDisableAccessAlert(section)
    },
    handleRedirectChange(self) {
      const section = self.uciSection
      section.redirect_https === '1' && section.enable_https === '0' ? (section.enable_https = '1') : section.enable_https
      section.redirect_https === '0' && section.enable_basic_auth === '1' ? (section.enable_basic_auth = '0') : section.enable_basic_auth
    },
    handleBasicAuthChange(self) {
      const section = self.uciSection
      if (section.enable_basic_auth === '1') {
        section.enable_https = '1'
        section.redirect_https = '1'
      }
    },
    async updateValidationsOverview() {
      const validations = await Promise.all(Object.entries(this.$refs).map(([key]) => (key.startsWith('val-') && this.$refs[key].validate()) || true))
      return !validations.includes(false)
    },
    loadEditedOverviewData(uciData) {
      switch (this.modalServiceId) {
        case 'SSH':
          uciData.dropbear[0] = { ...this.tableData[0], id: 'general' }
          break
        case 'HTTP':
          uciData.webui[0] = { ...uciData.webui[0], ...this.tableData[1], id: 'general' }
          break
        case 'HTTPS':
          uciData.webui[0] = { ...uciData.webui[0], ...this.tableData[2], id: 'general' }
          break
        case 'CLI':
          uciData.cli[0] = { ...this.tableData[3], id: 'general' }
          break
        case 'Telnet':
          uciData.telnet[0] = { ...this.tableData[4], id: 'general' }
          break
      }
    },
    async saveTableData() {
      const isValid = await this.updateValidationsOverview()
      if (!isValid) return this.$message.error(this.$t('Some fields are invalid'))
      this.$spin()
      const sshReq = { data: [copy(this.tableData[0], true)], method: 'PUT', endpoint: '/api/access_control/ssh/config' }
      const webHttpHttpsReq = {
        data: [{ ...this.filterKeys({ ...this.tableData[1], ...this.tableData[2] }, [...this.httpKeys, ...this.httpsKeys]) }],
        method: 'PUT',
        endpoint: '/api/access_control/webui/config'
      }
      const cliReq = { data: [copy(this.tableData[3], true)], method: 'PUT', endpoint: '/api/access_control/cli/config' }
      const requests = [sshReq, cliReq, webHttpHttpsReq]
      if (this.telnetExists) requests.push({ data: [copy(this.tableData[4], true)], method: 'PUT', endpoint: '/api/access_control/telnet/config' })
      requests.forEach(req => (req.data[0].id = 'general'))
      return this.$axios
        .bulk(requests)
        .then(res => {
          if (!res[0].success) this.$message.error(this.$t('Failed to save SSH data'))
          if (!res[1].success) this.$message.error(this.$t('Failed to save CLI data'))
          if (!res[2].success) this.$message.error(this.$t('Failed to save HTTP and HTTPS data'))
          if (this.telnetExists && !res[3].success) this.$message.error(this.$t('Failed to save Telnet data'))
          if (res[0].success && res[1].success && res[2].success && this.telnetExists ? res[3].success : true) this.$message.success(this.$t('Configuration has been applied'))
          this.reconnectPort(res[2].data[0])
          if (this.isHttpDisabled && this.isHttpsDisabled) {
            sessionStorage.removeItem('redirect-path')
            this.$session.logout()
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$spin(false)
          this.sideWarning()
        })
    },
    saveTableDataWithPrompt() {
      this.$prompt.show({
        title: this.$t('Are you sure you want to save settings?'),
        content: this.$t('By disabling HTTP and HTTPS local access WebUI will be inaccessible and you will be logged out.'),
        okText: this.$t('Confirm'),
        cancelText: this.$t('Cancel'),
        onOk: () => this.saveTableData()
      })
    },
    accessChange(recordId, field) {
      const recordIndex = this.tableData.findIndex(x => x.id === recordId)
      this.tableData[recordIndex][field] = this.tableData[recordIndex][field] === '1' ? '0' : '1'
      if ((recordId === 'HTTPS' && field === 'enable_https') || (recordId === 'HTTP' && field === 'enable_http')) {
        const section = this.tableData[recordIndex]
        if (section.enable_https === '0' && section.redirect_https === '1') {
          section.redirect_https = '0'
        }
        this.showDisableAccessAlert(this.tableData)
      }
    },
    afterSaveUpdate(type, res) {
      if (['HTTP', 'HTTPS'].includes(type)) this.onAfterSave(res)
      const index = this.tableData.findIndex(x => x.id === type)
      this.tableData[index] = res.data
      this.tableData[index].id = type
      this.showModal = false
    },
    openModal(recordId) {
      this.modalServiceId = recordId
      this.showModal = true
      this.$router.push({ query: { edit: recordId } })
    },
    downloadCertificate() {
      return this.$utils.downloadFileApi('/api/access_control/webui/actions/download', 'text/plain', 'POST').catch(() => this.$message.error(this.$t('Failed to download certificate files')))
    },
    filterInterfaces() {
      return this.interfaces
        .filter(item => item['ipv4-address'])
        .flatMap(interfaces => {
          const ipAddresses = interfaces['ipv4-address']
          return ipAddresses.map(ipObj => ipObj.address)
        })
    },
    extractPort(value) {
      return value.includes(':') ? value.split(':')[1] : value
    },
    checkPortConflicts(port, otherPorts) {
      const extractedPort = this.extractPort(port)
      return otherPorts.some(x => {
        return isArray(x.val) ? x.val.some(v => this.extractPort(v) === extractedPort) : this.extractPort(x.val) === extractedPort
      })
    },
    isPortInRange(port) {
      const [cliRangeStart, cliRangeEnd] = this.tableData[3].port.split('-').map(Number)
      const numPort = Number(this.extractPort(port))
      return cliRangeStart && cliRangeEnd && numPort >= cliRangeStart && numPort <= cliRangeEnd
    },
    checkIPValidity(self) {
      if (self.includes(':')) {
        const [ip] = self.split(':')
        const validIPs = this.filterInterfaces()
        if (!validIPs.includes(ip)) {
          return {
            isValid: false,
            message: this.$t('Invalid IP address. Must be one of: %s.').format(validIPs.join(', '))
          }
        }
      }
      return { isValid: true }
    },
    checkPortRange(port) {
      if (this.isPortInRange(port)) {
        return {
          isValid: false,
          message: this.$t("Value must be outside range of CLI 'Port range'.")
        }
      }
      return { isValid: true }
    },
    checkDuplicatesInArray(ports) {
      const uniquePorts = new Set(ports)
      if (uniquePorts.size < ports.length) {
        return {
          isValid: false,
          message: this.$t('Duplicate port found in configuration.')
        }
      }
      return { isValid: true }
    },
    checkExistingPortInConfig(portToCheck, currentConfig, self) {
      if (!currentConfig) return { isValid: true }
      const invalidRes = {
        isValid: false,
        message: this.$t('Port is already in use in current configuration.')
      }
      if (isArray(currentConfig.val) && currentConfig.val.some(val => this.extractPort(val) === portToCheck && val !== self)) {
        return invalidRes
      } else if (this.extractPort(currentConfig.val) === portToCheck && currentConfig.val !== self) {
        return invalidRes
      }
      return { isValid: true }
    },
    validatePorts(self, name) {
      const extractedPorts = isArray(self) ? self.map(val => this.extractPort(val)) : this.extractPort(self)
      const ipCheck = this.checkIPValidity(self)
      if (!ipCheck.isValid) return ipCheck
      if (isArray(extractedPorts) && extractedPorts.length > 64) {
        return {
          isValid: false,
          message: this.$t('Maximum allowed number of ports has been reached.')
        }
      }
      if (isArray(extractedPorts)) {
        for (const port of extractedPorts) {
          const rangeCheck = this.checkPortRange(port)
          if (!rangeCheck.isValid) return rangeCheck
        }
      } else {
        const rangeCheck = this.checkPortRange(extractedPorts)
        if (!rangeCheck.isValid) return rangeCheck
      }
      const isWanLanPair = (name1, name2) => {
        const isWanVariant = portName => portName.endsWith('Wan')
        const getBaseName = portName => (isWanVariant(portName) ? portName.slice(0, -3) : portName)
        if (name1 === name2) return false
        return (isWanVariant(name1) || isWanVariant(name2)) && getBaseName(name1) === getBaseName(name2)
      }
      if (isArray(self)) {
        const duplicateCheck = this.checkDuplicatesInArray(extractedPorts)
        if (!duplicateCheck.isValid) return duplicateCheck
      }
      const currentConfig = this.ports.find(p => p.name === name)
      const selfConflictCheck = this.checkExistingPortInConfig(extractedPorts, currentConfig, self)
      if (!selfConflictCheck.isValid) return selfConflictCheck
      const conflictingPorts = this.ports.filter(x => {
        if (x.name === name || isWanLanPair(name, x.name)) return false
        if (isArray(extractedPorts)) {
          return extractedPorts.some(port => this.checkPortConflicts(port, [x]))
        } else {
          return this.checkPortConflicts(extractedPorts, [x])
        }
      })
      if (conflictingPorts.length) {
        const conflictingServices = conflictingPorts.map(x => x.title).join(', ')
        return {
          isValid: false,
          message: this.$t('This value cannot be equal to %s value(s).').format(conflictingServices)
        }
      }
      return { isValid: true }
    },
    validatePortRange(self) {
      const rangeParts = self.split('-')
      if (rangeParts.length !== 2) return { isValid: false, message: this.$t('Specified range is incorrect') }
      const [start, end] = rangeParts
      const inRange = this.ports.filter(x => Number(x.val) >= Number(start) && Number(x.val) <= Number(end))
      return { isValid: !inRange.length, message: this.$t('Value(s) of %s cannot be inside port range.').format(inRange.map(x => x.title).join(', ')) }
    },
    updateValidations() {
      this.$refs.form.validate()
    },
    onAfterSave(res) {
      const updatedMessages = this.warningMessages.filter(message => !message.source.startsWith(res.data.id))
      this.warningMessages = updatedMessages.concat(res?.messages || [])
      formBus.emit('subscribe-reload')
      this.reconnectPort(res.data)
      this.showModal = false
    },
    showDisableAccessAlert(data) {
      const isHttpDisabled = isArray(data) ? data.find(x => x.id === 'HTTP')?.enable_http === '0' : data.enable_http === '0'
      const isHttpsDisabled = isArray(data) ? data.find(x => x.id === 'HTTPS')?.enable_https === '0' : data.enable_https === '0'
      if (isHttpDisabled && isHttpsDisabled) {
        this.$message.warning(this.$t('Disabling both HTTP and HTTPS access will prevent you from accessing the WebUI.'))
      }
    },
    reconnectPort(data) {
      const { protocol } = window.location
      let redirectProtocol
      let newPorts
      if (protocol === 'http:' && data.enable_https === '1' && data.redirect_https === '1') {
        redirectProtocol = 'https:'
        newPorts = isArray(data.listen_https) ? data.listen_https : [data.listen_https]
      } else if ((protocol === 'https:' && data.enable_https === '1') || (data.enable_http === '0' && data.enable_https === '1')) {
        redirectProtocol = 'https:'
        newPorts = isArray(data.listen_https) ? data.listen_https : [data.listen_https]
      } else if ((protocol === 'http:' && data.enable_http === '1') || (data.enable_https === '0' && data.enable_http === '1')) {
        redirectProtocol = 'http:'
        newPorts = isArray(data.listen_http) ? data.listen_http : [data.listen_http]
      } else return
      let certChanged = false
      if (this.modalServiceId === 'HTTPS' && this.$refs.form && this.formData.webui) {
        certChanged = this.formData.webui[0].cert !== this.$refs.form.initialForm.webui[0].cert
      }
      const shouldReconnect = this.isPortAndProtocolMatching(newPorts, redirectProtocol)
      if (shouldReconnect || certChanged) {
        this.$router.push({ query: {} })
        this.$reconnect(this.$t('Reconnecting'), { port: newPorts.at(-1), protocol: redirectProtocol })
      }
    },
    isPortAndProtocolMatching(newPorts, redirectProtocol) {
      if (redirectProtocol !== window.location.protocol) return true
      const currentPort = window.location.port !== '' ? window.location.port : redirectProtocol === 'https:' ? '443' : '80'
      const newNormalized = newPorts.map(url => this.extractPort(url))
      return !newNormalized.includes(currentPort)
    },
    findEnabledRemoteServices() {
      const servicesFields = [
        { field: 'wan_access', service: 'SSH', filter: true },
        { field: 'http_wan_access', service: 'HTTP', filter: true },
        { field: 'https_wan_access', service: 'HTTPS', filter: true },
        { field: 'wan_access', service: 'CLI', filter: true },
        { field: 'wan_access', service: 'Telnet', filter: this.telnetExists }
      ]
      this.enabledRemoteServices = servicesFields.filter((x, i) => x.filter && this.tableData?.[i]?.[x.field] === '1').map(x => x.service)
    },
    sideWarning() {
      if (this.enabledRemoteServices.length) this.$notification.remove(this.sideMessage.format(this.enabledRemoteServices.join(', ')))
      this.findEnabledRemoteServices()
      if (this.enabledRemoteServices.length) this.$notification.info(this.sideMessage.format(this.enabledRemoteServices.join(', ')))
    },
    loadDataHttpHttps(form, responses) {
      this.loadEditedOverviewData(form)
      if (responses && responses[1]?.messages) this.warningMessages = responses[1].messages
      this.httpPort = form.webui[0].listen_http
      this.httpsPort = form.webui[0].listen_https
      if (!this.certsExists) return Promise.resolve()
      return Promise.resolve()
    },
    getUploadWarning(val) {
      return this.$utils.certificateWarnings(val, this.warningMessages, this.formData.webui, this.certificateWarnings)
    },
    getCertExpirationWarning(val) {
      if (!val || (!this.httpsCertificate?.isExpired && !this.httpsCertificate?.expires)) return
      const text = this.httpsCertificate?.isExpired ? this.$t('Certificate has expired.') : this.$t('HTTPS certificate expires in %s.').format(this.httpsCertificate.formattedTime)
      if (this.httpsCertificate?.cert === '/etc/uhttpd-ca.crt') {
        return text + ' ' + this.$t('Note: If you choose to regenerate this certificate, it will be replaced with a new self-signed certificate.')
      }
      return text + ' ' + this.$t('Please select another certificate to maintain access.')
    },
    getWarning(val) {
      const certificatesStore = useCertificatesStore()
      return getCertificateWarning(val, certificatesStore?.rawData?.generated)
    },
    handleEditErrors(res) {
      const errorCode = res.data.errors?.[0].code
      return this.editErrors[errorCode] || this.editErrors.default
    },
    closeModal() {
      this.$prompt.show({
        title: this.$t('Go back?'),
        content: this.$t('Unsaved changes will be discarded'),
        okText: this.$t('Discard'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.showModal = false
          this.$router.push({ query: {} })
        }
      })
    },
    filterKeys(obj, keys) {
      const vals = Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)))
      if (vals.listen_https && !isArray(vals.listen_https)) vals.listen_https = [vals.listen_https]
      if (vals.listen_http && !isArray(vals.listen_http)) vals.listen_http = [vals.listen_http]
      if (vals.wan_listen_https && !isArray(vals.wan_listen_https)) vals.wan_listen_https = [vals.wan_listen_https]
      if (vals.wan_listen_http && !isArray(vals.wan_listen_http)) vals.wan_listen_http = [vals.wan_listen_http]
      return vals
    },
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    },
    loadData() {
      this.$spin()
      return this.$axios
        .bulkGet([
          '/api/access_control/ssh/config',
          '/api/access_control/webui/config',
          '/api/access_control/cli/config',
          { endpoint: '/api/access_control/telnet/config', condition: this.telnetExists },
          { endpoint: '/api/access_control/pam/config', condition: this.pamExists },
          '/api/interfaces/basic/status'
        ])
        .then(([sshData, webuiData, cliData, telnetData, pamData, interfaces]) => {
          if (sshData.success) this.tableData[0] = { ...sshData.data[0], id: 'SSH' }
          else this.$message.error(this.$t('Failed to load SSH data'))
          if (webuiData.success) {
            this.tableData[1] = { ...this.filterKeys(webuiData.data[0], this.httpKeys), id: 'HTTP' }
            this.tableData[2] = { ...this.filterKeys(webuiData.data[0], this.httpsKeys), id: 'HTTPS' }
          } else this.$message.error(this.$t('Failed to load HTTP and HTTPS data'))
          if (cliData.success) this.tableData[3] = { ...cliData.data[0], id: 'CLI' }
          else this.$message.error(this.$t('Failed to load CLI data'))
          if (this.telnetExists && telnetData.success) this.tableData[4] = { ...telnetData.data[0], id: 'Telnet' }
          else if (this.telnetExists && !telnetData.success) this.$message.error(this.$t('Failed to load Telnet data'))
          if (pamData.success) this.pamData = pamData.data
          else this.$message.error(this.$t('Failed to load PAM data'))
          if (interfaces.success) this.interfaces = interfaces.data
          else this.$message.error(this.$t('Failed to load interface data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$spin(false)
          this.sideWarning()
        })
    }
  }
}
</script>
