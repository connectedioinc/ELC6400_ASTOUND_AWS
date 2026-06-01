<template>
  <vuci-form
    v-model="formData"
    config="snmpd"
    editing
  >
    <template #default="{ uciData: formUciData }">
      <tag-edit-section
        v-model="formData"
        :uci-data="formUciData"
        :section="section"
        :endpoint="endpoint"
        :title="$utils.getModalTitle($t('object'), section.tag_name)"
        :remove-tag-size="true"
        :labels="tagFieldLabels"
      >
        <template #default="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="snmp_tag_oid"
            label="SNMP OID"
            :help="$t('OID at which the value will be accessible via SNMP.')"
            :rules="['uinteger', (value: string) => validateOID(value, s)]"
            :required="s.enabled === '1'"
          />
        </template>
      </tag-edit-section>
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
</template>

<script lang="ts" setup>
import TagEditSection from '@/components/shared/UniversalGatewayUtilities/TagEditSection.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { inject, ref, type Ref } from 'vue'
import type { SnmpTagConfig } from '@/types/tagTypes'

interface DataSourceEditProps {
  uciData: { tags: SnmpTagConfig[]; [key: string]: any }
  section: SnmpTagConfig
  endpoint: string
}

const props = defineProps<DataSourceEditProps>()

const $t = useTranslate()

const snmpData = inject('snmpData') as Ref<SnmpTagConfig[]>

const formData = ref<{ tags: SnmpTagConfig[]; [key: string]: any }>({ ...props.uciData })

const tagFieldLabels = {
  tag_name: $t('Object name'),
  tag_source: $t('Object source'),
  tag_value: $t('Object value'),
  tag_range: $t('Object range'),
  tag_type: $t('Object type'),
  tag_size: $t('Object size')
}

function validateOID(value: string, s: SnmpTagConfig) {
  return {
    isValid: !snmpData.value.find((snmpTag: SnmpTagConfig) => snmpTag.snmp_tag_oid === value && snmpTag.id !== s.id),
    message: $t('This OID is already in use by another object.')
  }
}
</script>
