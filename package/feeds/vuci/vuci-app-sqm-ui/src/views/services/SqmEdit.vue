<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formModel"
    config="sqm"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'sqm/config' }]"
      :name="props.section.id"
      :title="$utils.getModalTitle('SQM', props.section.id)"
      :uci-data="uciData"
      data-key="sqm"
    >
      <tlt-tabs :tabs="sqmEditTabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :label="$t('Enabled')"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="interface"
            :label="$t('Interface name')"
            :options="interfaceOptions"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="download"
            :label="$t('Download speed (kbit/s)')"
            rules="irange(0, 2147483647)"
            :help="downloadHint"
            rawhtml
            required
            @change="$utils.validate"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="upload"
            :label="$t('Upload speed (kbit/s)')"
            rules="irange(0, 2147483647)"
            :help="uploadHint"
            rawhtml
            required
            @change="$utils.validate"
          />
        </template>
        <template #advanced>
          <vuci-form-item-select
            ref="qdiscSelect"
            :uci-section="s"
            name="qdisc"
            :label="$t('Queuing disciplines usable on this system')"
            initial="cake"
            :options="qdiscsOptions"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="script"
            :label="$t('Queue setup script')"
            :help="scriptOptDescripts[s.script]"
            initial="piece_of_cake.qos"
            rawhtml
            :options="scriptOptions"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import { useTranslate } from '@ui-core/composables/useI18n'
import type { FormOptions, SqmConfig, FormData } from './SqmCommon'
import { FormOptionKey } from './SqmCommon'
import { inject, computed, ref } from 'vue'
import type { Interface } from '@/types/networkTypes'
import { network } from '@/plugins/network'
import { useMainStore } from '@/stores/main'

const store = useMainStore()
const $t = useTranslate()
const formModel = ref<FormData>({ sqm: [] })

export interface Props {
  section: SqmConfig
}
const props = defineProps<Props>()

const formOptions = inject(FormOptionKey) as FormOptions

const sqmEditTabs = [
  { name: 'general', title: $t('General Setup') },
  { name: 'advanced', title: $t('Advanced Settings') }
]
const downloadHint = `${$t('(Ingress) set to 0 to selectively disable ingress shaping.')}<br>
      ${$t("For better results it's recommended to use 85% of your bandwidth speed.")}`
const uploadHint = `${$t('(Egress) set to 0 to selectively disable egress shaping.')}<br>
      ${$t("For better results it's recommended to use 85% of your bandwidth speed.")}`
const scriptOptDescripts: Record<string, string> = {
  'piece_of_cake.qos': `<p><b>piece_of_cake.qos</b><br>${$t('This just uses the cake qdisc as a replacement for both htb as shaper and fq_codel as leaf qdisc.')}
        ${$t('It just does not come any simpler than this, in other words it truely is a "piece of cake".')}</p>`,
  'layer_cake.qos': `<p><b>layer_cakes.qos</b><br>${$t('This uses the cake qdisc as a replacement for both htb as shaper and fq_codel as leaf qdisc.')}
        ${$t('This exercises cake\'s diffserv profile(s) as different "layers" of priority.')}</p>`,
  'simple.qos': `<p><b>simple.qos</b><br>${$t('BW-limited three-tier prioritisation scheme with your qdisc on each queue. (default)')}</p>`,
  'simplest.qos': `<p><b>simplest.qos</b><br>${$t('Simplest possible configuration: HTB rate limiter with your qdisc attached.')}</p>`,
  'simplest_tbf.qos': `<p><b>simplest_tbf.qos</b><br>${$t('Simplest possible configuration (TBF): TBF rate limiter with your qdisc attached.')}
        ${$t('TBF may give better performance than HTB on some architectures.')}</p>`
}

const interfaceOptions = computed(() => {
  const filteredInterfaces = formOptions.interfaceStatus.value.filter(iface => {
    const ifaceConfig: Partial<Interface> = formOptions.interfacesConfig.value.find(ifaceConf => ifaceConf.id === iface.id) ?? {}
    return iface.device && iface.device !== 'lo' && !iface.device.startsWith('wwan') && (!ifaceConfig || ifaceConfig.enabled === '1')
  })

  const wirelessInterfaces = formOptions.wirelessData.value.flatMap(iface => iface.devices.map(dev => ({ name: iface.ssid || iface.mesh_id, ifname: [dev.ifname] })))
  const interfaces = filteredInterfaces.map(iface => ({ name: network.getName(iface), ifname: Array.isArray(iface.device) ? iface.device : [iface.device] })).concat(wirelessInterfaces)

  const usedPhyDevices = formOptions.deviceData.value
    .filter(dev => dev.type === 'bridge')
    .flatMap(dev => dev['bridge-members'] ?? [])
    .filter(m => store.allPortDevices.includes(m))
  const vlanNameRegex = /^(.+)\.\d+$/
  const usedBridges = formOptions.deviceData.value.filter(dev => dev.type === 'VLAN' && vlanNameRegex.test(dev.name)).map(dev => dev.name.match(vlanNameRegex)![1])
  const usedDevices = [...new Set(usedPhyDevices.concat(usedBridges)), ...(store.board?.hwinfo.dsa ? formOptions.deviceData.value.filter(dev => dev.type === 'DSA CPU').map(d => d.name) : [])]

  const deviceNames = formOptions.deviceData.value
    .filter(device => device.type !== 'vrf' && device.name !== 'lo' && !device.name.startsWith('wwan') && !device.name.startsWith('rmnet') && !usedDevices.includes(device.name))
    .map(device => device.name)
  const uniqueDevices = [...new Set(deviceNames)]

  const deviceInterfaces = uniqueDevices.map(device => {
    const ifaces = interfaces.filter(iface => iface.ifname.includes(device) && iface.name).map(iface => iface.name)
    return { device, ifaces }
  })

  return deviceInterfaces.map(({ device, ifaces }) => [device, ifaces.length ? `${device} (${ifaces.join(', ')})` : device])
})

const scriptOptions = computed<string[]>(() => {
  return (
    {
      cake: formOptions.cake.value,
      fq_codel: formOptions.fqCodel.value
    }[props.section.qdisc] ?? []
  )
})

const qdiscsOptions = computed<[string, string, boolean][]>(() => [
  ['fq_codel', 'fq_codel', formOptions.fqCodel.value.length > 0],
  ['cake', 'cake', formOptions.cake.value.length > 0]
])
</script>
