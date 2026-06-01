<template>
  <vuci-form
    v-slot="{ uciData }"
    config="aws_jobs"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      data-key="aws_jobs"
      :endpoints="[{ endpoint: 'aws/jobs/config' }]"
      :title="$utils.getModalTitle($t('AWS job thing'), section.thing_name)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turns the thing instance on or off.')"
        name="enabled"
        @change="provisioningIdRef.validate()"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Thing\'s name')"
        :help="$t('Thing\'s name on AWS IoT Core platform.')"
        name="thing_name"
        rules="uciname"
        maxlength="128"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Endpoint')"
        :help="$t('AWS IoT Core platform endpoint used to determine AWS account to connect to.')"
        name="endpoint"
        rules="hostname"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-upload
        name="cafile"
        :label="$t('CA file')"
        :help="$t('AWS CA certificate obtained from AWS IoT Core platform.')"
        :uci-section="s"
        max-size="16MB"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        ref="provisioningIdRef"
        :uci-section="s"
        name="aws_provisioning_id"
        :label="$t('Provisioning')"
        :help="$t('AWS provisioning configuration to use. It can be configured in AWS provisiong page. If basic provisioning is used, Thing\'s certificate and private key must be uploaded.')"
        :options="provisioningOptions"
        :rules="[(value: string) => validateProvisioning(value, provisioningData, s, $t('Selected provisioning configuration is missing required options. Please configure it fully.'))]"
      />
      <vuci-form-item-upload
        name="certfile"
        :label="$t('Thing\'s certificate')"
        :help="$t('Thing\'s certificate obtained from AWS IoT Core platform.')"
        :uci-section="s"
        max-size="16MB"
        :required="s.enabled === '1'"
        :depend="s.aws_provisioning_id === '0'"
      />
      <vuci-form-item-upload
        name="keyfile"
        :label="$t('Thing\'s private key')"
        :help="$t('Thing\'s private key obtained from AWS IoT Core platform.')"
        :uci-section="s"
        max-size="16MB"
        :required="s.enabled === '1'"
        :depend="s.aws_provisioning_id === '0'"
      />
      <tlt-form-accordion
        name="advanced_settings"
        :title="$t('advanced settings')"
      >
        <vuci-form-item-input
          :uci-section="s"
          name="mqtt_port"
          :label="$t('Port')"
          :help="$t('MQTT port number.')"
          initial="8883"
          placeholder="8883"
          rules="port"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="mqtt_qos"
          :label="$t('QoS')"
          :help="
            $t(
              'MQTT Quality of Service. Allowed values: %s 0 - when we prefer that the message will not arrive at all rather than arrive twice %s \
            1 - when we want the message to arrive at least once but don\'t care if it arrives twice (or more).'
            ).format('<br/>', '<br/>')
          "
          rawhtml
          :options="qosOptions"
          initial="1"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="mqtt_keepalive"
          :label="$t('Keepalive')"
          :help="$t('MQTT keepalive time in seconds.')"
          initial="120"
          placeholder="120"
          rules="irange(30,65535)"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="mqtt_max_loops"
          :label="$t('Max loops')"
          :help="
            $t(
              'MQTT max loops - during initial subscription to topics the service has to wait for a successful subscription acknowledgement. The service performs mosquitto loops to wait for the answer. This option determines how many loops can be performed while waiting for subscription acknowledgement.'
            )
          "
          initial="50"
          placeholder="50"
          rules="irange(10,200)"
        />
      </tlt-form-accordion>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useAwsUtils } from '../../components/services/useAwsUtils'
import { useAwsJobsContext } from '../../components/services/useAwsJobsContext'
import { computed, useTemplateRef } from 'vue'
import type { AwsJobConfig } from '@/types/awsTypes'

const $t = useTranslate()

defineProps<{
  section: AwsJobConfig
}>()

const provisioningIdRef = useTemplateRef('provisioningIdRef')

const { validateProvisioning } = useAwsUtils()
const { provisioningData } = useAwsJobsContext()

const qosOptions = [
  ['0', $t('At most once (0)')],
  ['1', $t('At least once (1)')]
]

const provisioningOptions = computed(() => {
  const options = [['0', $t('Basic provisioning')]]
  provisioningData.value?.forEach(prov => {
    options.push([prov.id, prov.template ?? prov.id])
  })
  return options
})
</script>
