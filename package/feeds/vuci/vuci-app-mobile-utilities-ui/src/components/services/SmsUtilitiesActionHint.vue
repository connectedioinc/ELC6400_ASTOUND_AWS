<template>
  <tlt-form-accordion
    name="parameter-list"
    :title="$t('%s rule description').format('SMS')"
  >
    <tlt-form-model-item>
      <t-parameters class="w-full">
        <p>
          <strong>{{ $t('%s rule description').format('SMS') }}:</strong>
          {{ ruleDescription }}
        </p>
        <p v-if="ruleFormatParameters">
          <strong>{{ $t('%s text format').format('SMS') }}:</strong>
        </p>
        <t-parameters-list v-if="ruleFormatParameters">
          <t-parameters-list-item
            v-for="param in ruleFormatParameters"
            :key="param.parameter"
            v-bind="param"
          />
        </t-parameters-list>
        <p v-if="ruleExampleParameters">
          <strong>{{ $t('%s text example').format('SMS') }}:</strong>
        </p>
        <t-parameters-list v-if="ruleExampleParameters">
          <t-parameters-list-item
            v-for="param in ruleExampleParameters"
            :key="param.parameter"
            v-bind="param"
          />
        </t-parameters-list>
      </t-parameters>
    </tlt-form-model-item>
  </tlt-form-accordion>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { UtilitiesAction, AuthorizationOptions } from '@/types/mobileUtilitiesTypes'

interface SmsActionHintProps {
  section: {
    action: UtilitiesAction
    smstext?: string
    authorization: AuthorizationOptions
  }
  showExample?: boolean
}

interface HintData {
  [key: string]: {
    description: string
    format?: string | string[]
    example?: string | string[]
    customExample?: (pw: string, smsKeyword: string) => Record<string, string>[]
  }
}

const props = defineProps<SmsActionHintProps>()

const $t = useTranslate()

const hintData = ref<HintData>({
  wol: {
    description: $t('Wakes up a device with a magic packet.')
  },
  reboot: {
    description: $t('Reboots the device.')
  },
  send_status: {
    description: $t("Returns the device's status described in the text message below.")
  },
  vpnstatus: {
    description: $t('Returns the status of all OpenVPN instances.')
  },
  wifi: {
    description: $t("Turns on or off device's WiFi.")
  },
  exec: {
    description: $t('Executes custom script.')
  },
  mobile: {
    description: $t("Turns on or off device's mobile data.")
  },
  dout: {
    description: $t("Turns on or off device's digital output.")
  },
  data_usage_reset: {
    description: $t('Resets mobile data usage limit for the selected mobile interface.'),
    format: '<interface_name>',
    example: 'mob1s1a1'
  },
  data_limit: {
    description: $t('Returns mobile data limit status.')
  },
  change_mobile_settings: {
    description: $t("Changes device's mobile settings."),
    format: '<mobile_settings>',
    example: 'apn=internet.gprs auth=pap service=3g username=user password=user'
  },
  reset_conn: {
    description: $t('Resets mobile connection. Useful when you want to reconnect to the best available operator.')
  },
  list_of_profile: {
    description: $t('Returns a list of created profiles.')
  },
  monitoring_status: {
    description: $t("Returns the device's monitoring status.")
  },
  change_profile: {
    description: $t('Changes device profile.'),
    format: '<profile_name>',
    example: 'my_profile'
  },
  vpn: {
    description: $t('Stops or starts the selected OpenVPN instance.'),
    format: '<openvpn_instance_name>',
    example: 'my_openvpn'
  },
  ssh_access: {
    description: $t("Manages device's SSH access, depending on the settings selected below.")
  },
  web_access: {
    description: $t("Manages device's web access, depending on the settings selected below.")
  },
  esim_list: {
    description: $t('Lists available eSIM profiles.')
  },
  esim_change: {
    description: $t('Changes the eSIM profile according to the provided ICCID.'),
    format: '<iccid>',
    example: '0000000000000000000F'
  },
  esim_install: {
    description: $t('Install the eSIM profile by using the provided activation code.'),
    format: '<activation-code> [<confirmation-code>]',
    example: 'ABCDEFGHIYJK 123456'
  },
  ip_unblock: {
    description: $t('Unblocks IP routes that have been blocked due to too many login attempts over SSH or WebUI.'),
    format: ['<src_ip> [<opt_dest_ip>] [<opt_port>]', '<src_ip> [<opt_port>]'],
    customExample: (pw: string, smsKeyword: string) => [
      { parameter: `${pw} ${smsKeyword}`, description: $t('Unblocks all routes') },
      { parameter: `${pw} ${smsKeyword} 192.168.1.2`, description: $t('Unblocks all routes for source %s').format('IP 192.168.1.2') },
      { parameter: `${pw} ${smsKeyword} 192.168.1.2 192.168.1.10`, description: $t('Unblocks all routes going from %s to %s').format('192.168.1.2', '192.168.1.10') },
      {
        parameter: `${pw} ${smsKeyword} 192.168.1.2 192.168.1.10 22`,
        description: $t('Unblocks the route going from %s to %s on port %s').format('192.168.1.2', '192.168.1.10', '22')
      },
      { parameter: `${pw} ${smsKeyword} 192.168.1.2 22`, description: $t('Unblocks all routes going from %s to any destination on port %s').format('192.168.1.2', '22') },
      {
        parameter: `${pw} ${smsKeyword} 192.168.1.2 192.168.1.3 192.168.1.4 80 81`,
        description: $t(
          'Please note that only one destination IP and one port will be selected from one SMS message. If more than one destination IP and/or port is specified, first occurring entry is chosen. This example unblocks route going from %s to %s on port %s'
        ).format('192.168.1.2', '192.168.1.3', '80')
      }
    ]
  },
  firstboot: {
    description: $t('Resets device to default settings. After this rule executes, the device will reboot.')
  },
  userdefaults: {
    description: $t("Resets device's settings to user's configured. After this rule executes, the device will reboot.")
  },
  switch_sim: {
    description: $t('Switches SIM to the other one.')
  },
  fw_upgrade: {
    description: $t("Upgrades device's firmware from the server. After this rule executes, the device will reboot.")
  },
  gps: {
    description: $t("Turns on or off device's GPS.")
  },
  gps_coordinates: {
    description: $t("Returns device's GPS coordinates.")
  },
  rms_status: {
    description: $t("Returns device's RMS status.")
  },
  rms_action: {
    description: $t('Turns on or off RMS service.')
  },
  rms_connect: {
    description: $t('Forces RMS to connect to the server.')
  },
  more: {
    description: $t('Returns the next part of the message.')
  },
  iostatus: {
    description: $t('Returns input/output status.')
  },
  io_set: {
    description: $t('Sets the state of the selected pin.')
  },
  uci: {
    description: $t("UCI lets you set or get any parameter from the device's configuration files. API should be used instead of UCI, whenever possible."),
    format: [
      'get <config>.<section>[.<option>]',
      'set <config>.<section>[.<option>]=<value>',
      'add_list <config>.<section>.<option>=<string>',
      'show [<config>[.<section>[.<option>]]]',
      'delete <config>[.<section>[[.<option>][=<id>]]]'
    ],
    example: [
      'get config.section.option',
      'set config.section.option=value',
      'add_list config.section.option=value1',
      'add_list config.section.option=value2',
      'show config',
      'show config.section',
      'delete config.section',
      'delete config.section.option',
      'get network.lan.ipaddr',
      'set network.lan.ipaddr="192.168.1.1"'
    ]
  },
  api: {
    description: $t('API allows creating, reading, updating, or deleting configurations using the allowed API endpoints from a list. Refer to API documentation for more information.'),
    format: '<http_method> <endpoint> [<body>]',
    example: [
      'get /auto_reboot/scheduler/config',
      'post /auto_reboot/scheduler/config {"data": {"action": "1", "period": "week", "days": ["mon"], "time": ["12:00"]}}',
      'put /auto_reboot/scheduler/config/{id} {"data": { "enable": "1"}}',
      'delete /auto_reboot/scheduler/config/{id}'
    ]
  },
  config_reload: {
    description: $t('Reloads the config and all affected services.')
  }
})

const ruleDescription = computed(() => {
  return hintData.value[props.section.action].description
})

const authFormat = {
  password: 'password',
  local: 'password',
  serial: 'serial',
  no: ''
}

const authExamples = {
  password: 'MyPassword123',
  local: 'MyPassword123',
  serial: '12345678',
  no: ''
}

function getRuleParameters(type: 'example' | 'format') {
  return computed(() => {
    let smstext = props.section?.smstext
    if (!smstext) return ''
    formatSmsText(smstext)
    const auth = authFormat[props.section.authorization] || ''
    const pwValue = type === 'example' ? authExamples[props.section.authorization] || '' : auth ? `<${auth}>` : ''
    const data = hintData.value[props.section.action][type]
    if (type === 'example' && hintData.value[props.section.action].customExample) {
      return hintData.value[props.section.action].customExample?.(pwValue, smstext)
    }
    if (Array.isArray(data)) {
      return data.map(formatString => ({
        parameter: `${props.section.authorization === 'no' ? '' : pwValue + ' '}${smstext} ${formatString}`
      }))
    }
    return [{ parameter: `${props.section.authorization === 'no' ? '' : pwValue + ' '}${smstext} ${data || ''}` }]
  })
}

const ruleFormatParameters = getRuleParameters('format')
const ruleExampleParameters = getRuleParameters('example')

function formatSmsText(smstext: string) {
  return smstext.length > 17 ? smstext.substring(0, 14) + '...' : smstext
}
</script>
