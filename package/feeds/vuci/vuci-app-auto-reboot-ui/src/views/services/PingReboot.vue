<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="ping_reboot"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      :title="$t('Ping/Wget reboot settings')"
      :help="
        $t(
          'This section displays Ping/Wget Reboot rules. \
          This service periodically sends ICMP or Wget requests to a specified IP address or host \
          and waits for a response. If no response is received, the device will execute a specified action (reboot, by default). \
          Click the \'Add\' button to create more rules.'
        )
      "
      type="ping_reboot"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'auto_reboot/ping_wget/config' }]"
      :add-validate="onAdd"
      data-key="ping_reboot"
      :columns="pingRebootColumns"
      :edit-form="pingRebootEditModal"
      :table-actions="['column-list', 'search']"
      fixed-table
    >
      <template #type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayValue"
          name="type"
        />
      </template>
      <template #action="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="val => actionList[val]"
          name="action"
        />
      </template>
      <template #time="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayValue"
          name="time"
        />
      </template>
      <template #time_out="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayValue"
          name="time_out"
        />
      </template>
      <template #retry="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayValue"
          name="retry"
        />
      </template>
      <template #host="{ s }">
        <div class="flex truncate">
          <tlt-overflow-hint :test-id="`text-${s.id}_host`">
            {{ displayHost(s) }}
          </tlt-overflow-hint>
        </div>
      </template>
      <template #enable="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enable"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import pingRebootEdit from './PingRebootEdit'

export default {
  provide() {
    return {
      modemsList: () => this.modemList,
      simCount: () => this.simCount,
      ports: () => this.ports,
      renamePortList: (arr, fromCustom) => this.renamePortList(arr, fromCustom)
    }
  },
  data() {
    return {
      pingRebootEditModal: markRaw(pingRebootEdit),
      actionList: {
        1: this.$t('Reboot'),
        2: this.$t('Modem reboot'),
        3: this.$t('None'),
        4: this.$t('(Re)register'),
        5: this.$t('Restart mobile connection'),
        6: this.$t('Send SMS'),
        7: this.$t('Restart Port')
      },
      modemList: [],
      formData: {},
      pingRebootColumns: [
        { name: 'type', label: this.$t('Type'), help: this.$t('Ping/Wget.') },
        {
          name: 'action',
          label: this.$t('Action'),
          help: this.$t('Action that will be executed if there is no response after the specified amount of retries.')
        },
        {
          name: 'time',
          label: this.$t('Interval (min)'),
          help: this.$t('Time interval between two ping/wget requests.')
        },
        {
          name: 'time_out',
          label: this.$t('Timeout (sec)'),
          help: this.$t('Time interval (in seconds) to wait for a response.')
        },
        {
          name: 'retry',
          label: this.$t('Interval count'),
          help: this.$t('Number of failed to receive responses before selected action is executed.')
        },
        {
          name: 'host',
          label: this.$t('Host'),
          help: this.$t('Hostname, IP address or URL (if wget selected) to which the ping/wget requests will be sent (e.g., 1.1.1.1 or www.host.com if DNS server is configured correctly).')
        },
        {
          name: 'enable',
          label: this.$t('Enabled')
        }
      ],
      ports: []
    }
  },
  computed: {
    simCount() {
      return this.modemList.length > 0
        ? Math.max.apply(
            Math,
            this.modemList.map(o => o.sim_count)
          )
        : 0
    }
  },
  methods: {
    afterLoad() {
      const requests = [
        { endpoint: '/api/modems/status', condition: 'mobifd.control' },
        { endpoint: '/api/auto_reboot/ping_wget/options', condition: this.$store.board.hwinfo.poe }
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([modems, portList]) => {
          if (modems.success) {
            this.modemList = this.$mobile.parseModems(modems.data)
          } else {
            this.$message.error(this.$t('Failed to load modem options'))
          }
          if (portList.success) {
            this.ports = portList.data.available_ports || []
          } else {
            this.$message.error(this.$t('Failed to load options'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    displayValue(value) {
      if (typeof value === 'string') {
        return value.charAt(0).toUpperCase() + value.slice(1)
      }
      return '-'
    },
    getPortValue(portHost) {
      const renamedPortList = this.renamePortList(portHost)
      return portHost.map(item => {
        const digital = item.split('=')
        const renamedPort = renamedPortList.find(val => val[0] === item)
        return renamedPort ? `${renamedPort[1]} = ${digital[1]}` : '-'
      })
    },
    renamePortList(arr, fromCustom = false) {
      return arr
        .filter(item => item.startsWith('port'))
        .map(item => {
          const matches = fromCustom ? item.match(/\d+/) : item.match(/(\d+)=/)
          const num = (matches && fromCustom ? matches[0] : matches[1]) || ''
          return [item, this.$t('Port %s').format(num)]
        })
    },
    displayHost(s) {
      const host = this.arrToString(s.host)
      const host1 = this.arrToString(s.host1)
      const host2 = this.arrToString(s.host2)
      const url = this.arrToString(s.url)
      const type = s.type

      if (type === 'wget') {
        this.multipleHost = false
        return url || '-'
      } else if (type === 'ping') {
        if (!host1 && !host2) {
          this.multipleHost = false
          return host || '-'
        }
        this.multipleHost = true
        return this.simCount === 1 ? (host1 ?? '-') : (host1 ?? '-') + ', ' + (host2 ?? '-')
      } else if (type === 'port') {
        const pingPortType = s.ping_port_type
        const portHost = s.port_host
        if (portHost && pingPortType === 'ping_port') {
          return '%s'.format(this.getPortValue(portHost).join(', '))
        }
        return host || '-'
      }
      this.multipleHost = false
      return '-'
    },
    arrToString(host) {
      if (!host) return host
      return typeof host === 'string' ? host : host.join(', ')
    },
    onAdd(_, dataSource) {
      if (dataSource.length >= 30) {
        return { valid: false, message: this.$t("Can't create more instances. Only 30 instances are allowed") }
      }
      return { valid: true }
    },
    validateEnable(self) {
      const sectionValues = self.uciSection
      if (sectionValues.enable === '1') {
        const requiredEnableOptions = []
        if (!sectionValues.action) {
          requiredEnableOptions.push(this.$t('Action'))
        }
        if (!sectionValues.type) {
          requiredEnableOptions.push(this.$t('Type'))
        }
        if (!sectionValues.time) {
          requiredEnableOptions.push(this.$t('Interval'))
        }
        if (!sectionValues.retry) {
          requiredEnableOptions.push(this.$t('Interval count'))
        }
        if (!sectionValues.time_out) {
          requiredEnableOptions.push(this.$t('Timeout'))
        }
        if (sectionValues.type === 'wget' && !sectionValues.url) {
          requiredEnableOptions.push(this.$t('URL'))
        }
        if (sectionValues.type === 'ping') {
          if (!sectionValues.packet_size) {
            requiredEnableOptions.push(this.$t('Packet size'))
          }
          if (!sectionValues.host && sectionValues.interface === '1') {
            requiredEnableOptions.push(this.$t('Host to ping'))
          }
          if (!sectionValues.host1 && sectionValues.interface === '2') {
            requiredEnableOptions.push(this.$t('Host to ping from SIM 1'))
          }
          if (!sectionValues.host2 && sectionValues.interface === '2' && this.simCount > 1) {
            requiredEnableOptions.push(this.$t('Host to ping from SIM 2'))
          }
        }
        if (sectionValues.type === 'port') {
          if (!sectionValues.ping_port_type) {
            requiredEnableOptions.push(this.$t('Ping by'))
          }
          if (sectionValues.ping_port_type === 'ping_ip' && !sectionValues.ip_type) {
            requiredEnableOptions.push(this.$t('IP type'))
          }
          if (sectionValues.ping_port_type === 'ping_ip' && !sectionValues.host) {
            requiredEnableOptions.push(this.$t('Host to ping'))
          }
          if (sectionValues.ping_port_type === 'ping_port' && !sectionValues.port_host) {
            requiredEnableOptions.push(this.$t('Port to ping'))
          }
        }
        if (sectionValues.action === '6') {
          if (!sectionValues.number || sectionValues.number.every(x => x === '')) {
            requiredEnableOptions.push(this.$t('Phone number'))
          }
          if (!sectionValues.message) {
            requiredEnableOptions.push(this.$t('Message text'))
          }
        }
        if (requiredEnableOptions.length === 1) {
          this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
          self.model = '0'
        }
        if (requiredEnableOptions.length > 1) {
          this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
          self.model = '0'
        }
      }
    }
  }
}
</script>
