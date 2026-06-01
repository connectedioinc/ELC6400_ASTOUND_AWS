<template>
  <GridLayout
    class="grid-cols-1 md:grid-cols-2"
    borders="row"
  >
    <template v-for="cardType in cards">
      <tlt-card
        v-for="card in cardType"
        :key="card.title"
        :title="card.title"
        :help="card.help"
      >
        <tlt-value-list :data-source="card.content">
          <template #device_name_title="{ item }">
            <span class="whitespace-nowrap max-md:font-semibold">{{ item.item.title }}</span>
          </template>
          <template #device_name_value="{ item }">
            <span class="break-all text-theme-text-secondary-subtle">{{ item.value }}</span>
          </template>
          <template
            v-for="column in progressBarHeaders"
            :key="column"
            #[column]="{ item }"
          >
            <usage-indicator
              :used="item.value.used"
              :total="item.value.total"
              :unit="item.value.unit"
              inline
              class="w-36"
            />
          </template>
          <template #fw_version_with_config_title="{ item }">
            <tlt-hint>
              {{ item.item.title }}
              <template #hintBox>
                <ul>
                  <li
                    v-for="(hintItem, index) in item.item.customHints"
                    :key="index"
                  >
                    <strong>{{ hintItem.title }}</strong
                    ><br />
                    {{ hintItem.info }}
                  </li>
                </ul>
              </template>
            </tlt-hint>
          </template>
        </tlt-value-list>
      </tlt-card>
    </template>
  </GridLayout>
</template>

<script>
import UsageIndicator from '@/components/UsageIndicator.vue'

export default {
  components: {
    UsageIndicator
  },
  data() {
    return {
      progressBarHeaders: ['ram_used_value', 'ram_buffered_value', 'flash_used_value'],
      cards: {
        device_card: {},
        system_card: {},
        macs_card: {},
        modems_card: {},
        memory_card: {}
      }
    }
  },
  async mounted() {
    this.$spin(true)
    await this.getStatusData()
    await this.getDynamicData()
    this.$timer.start({ method: this.getDynamicData, time: 3000, autostart: true, immediate: false })
    this.$spin(false)
  },
  methods: {
    getStatusData() {
      const endpoints = [
        {
          endpoint: '/api/wireless/devices/basic/status',
          condition: 'vuci-app-wireless-api'
        },
        {
          endpoint: '/api/modems/status',
          condition: 'mobifd.control'
        }
      ]
      return this.$axios
        .bulkGet(endpoints)
        .then(([addressRes, modemRes]) => {
          if (!addressRes.success) {
            this.$message.error(this.$t('Failed to load network devices status'))
          }
          if (this.$store.deviceInfo) {
            this.cards.device_card = this.parseDeviceData(this.$store.deviceInfo)
          } else {
            this.$message.error(this.$t('Failed to load device info'))
          }
          if (modemRes.success) {
            this.cards.modems_card = this.parseModemsData(this.$mobile.parseModems(modemRes.data))
          } else {
            this.$message.error(this.$t('Failed to load modems status'))
          }
          if (this.$store.board.hwinfo.ethernet && this.$store.deviceInfo && addressRes.success) {
            this.cards.macs_card = this.parseMacsData(addressRes.data)
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get system status'))
        })
    },
    getDynamicData() {
      return this.$axios
        .get('/api/system/device/usage/status?exclude=loadavg')
        .then(systemRes => {
          this.cards.memory_card = this.parseMemoryData(systemRes.data.memory)
          this.cards.system_card = this.parseSystemData(systemRes.data, this.$store.deviceInfo.static)
        })
        .catch(() => {
          this.$message.error(this.$t("Failed to load device's memory usage"))
        })
    },
    /**
     * @param {*} data
     * @param {import('@/types/wirelessTypes').WifiDeviceStatus[]} wifiData
     */
    parseMacsData(wifiData) {
      const isSwitch = this.$store.isSwitch
      const parsedContent = []
      const parsedData = isSwitch
        ? [{ title: this.$t('Device MAC address'), value: this.macConverter(this.$store.deviceInfo.mnfinfo?.mac || '-'), hint: this.$t('MAC (Media Access Control) address used for communication.') }]
        : this.$store.deviceInfo.ports.reduce((acc, port) => {
            const duplicate = acc.some(i => i.value === port.mac)
            if (!duplicate) {
              const title = this.$store.device.startsWith('OTD') ? this.$t('Ethernet %s %s MAC address').format(port.name, port.position) : this.$t('Ethernet %s MAC address').format(port.name)
              const hint = isSwitch
                ? this.$t('MAC (Media Access Control) address used for communication.')
                : this.$t('MAC (Media Access Control) address used for communication in a Ethernet %s (Local Area Network).').format(port.name)
              acc.push({ title, value: port.mac || '-', hint })
            }
            return acc
          }, [])
      const wifiMacs = wifiData.map(data => ({
        title: this.$t('Wireless (%s) MAC address').format(data.band),
        value: data.macaddr?.toUpperCase() || '-',
        hint: this.$t('MAC (Media Access Control) address used for communication in a wireless network.')
      }))
      parsedData.push(...wifiMacs)
      parsedContent.push({
        title: this.$t('Mac addresses'),
        content: parsedData,
        help: this.$t("This section displays the device's MAC addresses.")
      })
      return parsedContent
    },
    parseDeviceData(data) {
      const parsedData = []
      const parsedContent = []
      parsedData.push({
        title: this.$t('Device name'),
        value: data.static.device_name || '-',
        hint: this.$t("The device's model name.")
      })
      if (data.mnfinfo.blver !== 'N/A') {
        parsedData.push({
          title: this.$t('Bootloader version'),
          value: data.mnfinfo.blver || '-',
          hint: this.$t('Bootloader version currently used by the device. A Bootloader is a program that loads the operating system.')
        })
      }
      parsedData.push({
        title: this.$t('Serial number'),
        value: data.mnfinfo.serial || '-',
        hint: this.$t(
          "A unique 10-digit device identifier. It is required when connecting the device to %s's Remote Management System (RMS). The device can be added to RMS via the Services → Cloud Solutions → RMS page."
        ).format(this.$brand('companyShort'))
      })
      parsedData.push({
        title: this.$t('Hardware revision'),
        value: data.mnfinfo.hwver || '-',
        hint: this.$t("A 4-digit number representing the device's hardware revision version.")
      })
      parsedData.push({
        title: this.$t('Batch number'),
        value: data.mnfinfo.batch || '-',
        hint: this.$t('A 4-digit number that indicates the batch of materials.')
      })
      parsedData.push({
        title: this.$t('Branch'),
        value: data.mnfinfo.branch || '-',
        hint: this.$t('Hardware branch identifier.')
      })
      parsedContent.push({
        title: this.$t('Device'),
        content: parsedData,
        help: this.$t("This section displays the device's manufacturing information.")
      })
      return parsedContent
    },
    parseMemoryData(data) {
      const parsedData = []
      const parsedContent = []
      parsedData.push({
        title: this.$t('RAM used'),
        value: {
          used: data.ram_used,
          total: data.ram_total,
          unit: data.ram_total / 1000 > 100 ? 'GB' : 'MB'
        },
        hint: this.$t('Amount of random-access memory (RAM) used by temporarily stored data before moving it to another location.'),
        scoped: true,
        slotName: 'ram_used'
      })
      if (!this.$store.isSwitch) {
        parsedData.push({
          title: this.$t('RAM buffered'),
          value: {
            used: data.ram_buffered,
            total: data.ram_total,
            unit: data.ram_total / 1000 > 100 ? 'GB' : 'MB'
          },
          hint: this.$t('Amount of buffered memory.'),
          scoped: true,
          slotName: 'ram_buffered'
        })
      }
      parsedData.push({
        title: this.$t('Flash used'),
        value: {
          used: data.flash_used,
          total: data.flash_total
        },
        hint: this.$t('Amount of Flash memory used.'),
        scoped: true,
        slotName: 'flash_used'
      })
      parsedContent.push({
        title: this.$t('Memory'),
        content: parsedData,
        help: this.$t('This section displays memory usage information.')
      })
      return parsedContent
    },
    parseSystemData(sysData, boardData) {
      const parsedData = []
      const parsedContent = []
      parsedData.push({
        title: this.$t('Firmware version'),
        value: boardData.fw_version || '-',
        hint: this.$t('Firmware version currently installed in the device.')
      })
      parsedData.push({
        title: this.$t('Kernel version'),
        value: boardData.kernel || '-',
        hint: this.$t("Device's kernel version. A kernel is a computer program responsible for connecting a device's software to its hardware.")
      })
      parsedData.push({
        title: this.$t('Local device time'),
        value: sysData.localtime ? this.$localDate(sysData.localtime) : '-',
        hint: this.$t("Device's time based on the time zone settings selected in Services → NTP.")
      })
      parsedData.push({
        title: this.$t('Uptime'),
        value: sysData.uptime ? '%t'.format(sysData.uptime_seconds) : '-',
        hint: this.$t("The amount of time that has passed since the device's last start up.")
      })
      parsedData.push({
        title: this.$t('Load average'),
        value: sysData.load ? this.cpuLoadConverter(sysData.load) : '-',
        hint: this.$t('CPU load average (in %) over the last minute, 5 minutes and 15 minutes.')
      })
      parsedContent.push({
        title: this.$t('System'),
        content: parsedData,
        help: this.$t('This section displays basic system related information.')
      })
      return parsedContent
    },
    parseModemsData(data) {
      const parsedContent = []
      data.forEach(info => {
        const parsedData = []
        parsedData.push({
          title: this.$t('Model'),
          value: info.model || '-',
          hint: this.$t("Modem's model number.")
        })
        parsedData.push({
          title: this.$t('IMEI'),
          value: info.imei || '-',
          hint: this.$t(
            'The IMEI (International Mobile Equipment Identity) is a unique 15 decimal digit number used to identify mobile modules. GSM network operators use the IMEI to identify devices in their networks.'
          )
        })
        const fwHints = info.cfg_version
          ? [
              {
                title: this.$t("Modem's current version:"),
                info: info.version || '-'
              },
              {
                title: this.$t('Configuration version:'),
                info: info.cfg_version
              }
            ]
          : null
        parsedData.push({
          title: this.$t('FW version'),
          value: info.version || '-',
          hint: this.$t("Modem's current firmware version."),
          customHints: fwHints,
          slotName: info.cfg_version ? 'fw_version_with_config' : undefined
        })
        parsedContent.push({
          title: this.$mobile.parseModems([info])[0].name + (this.$mobile.modemOffline(info) ? this.$t(' (%s)'.format(this.$t('unreachable'))) : '') || '-',
          content: parsedData,
          help: this.$t("This section displays information related to the device's cellular module.")
        })
        parsedData.push({
          title: this.$t('Temperature'),
          value: !info.temperature ? '-' : info.temperature + '°C',
          hint: this.$t("Modem's current temperature.")
        })
      })
      return parsedContent
    },
    cpuLoadConverter(data) {
      return data ? data.min1.toFixed(2) + ', ' + data.min5.toFixed(2) + ', ' + data.min15.toFixed(2) : '-'
    },
    convert(mbytes, constant) {
      let recvdata = mbytes
      if (recvdata > constant) {
        recvdata = recvdata / constant
        recvdata = recvdata.toFixed(1) + ' GB'
      } else {
        recvdata = recvdata.toFixed(1) + ' MB'
      }
      return recvdata
    },
    macConverter(string) {
      if (string === 'N/A') return string
      return string.match(/.{1,2}/g).join(':')
    }
  }
}
</script>

<style scoped>
.progress-bar-float-right {
  display: flex;
  justify-content: flex-end;
}
</style>
