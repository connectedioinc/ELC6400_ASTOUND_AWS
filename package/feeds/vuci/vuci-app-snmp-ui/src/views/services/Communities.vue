<template>
  <vuci-form
    v-model="formData"
    config="snmpd"
  >
    <template #default="{ uciData }">
      <vuci-typed-section
        type="com2sec"
        :title="$t('SNMP community')"
        :help="$t('This section is used to add new SNMP communities.')"
        :uci-data="uciData"
        data-key="communities"
        :endpoints="[{ endpoint: 'snmp/communities/config' }]"
        :columns="communityColumns"
        :table-actions="['column-list', 'search']"
        :edit-form="communitiesEdit"
        :error-handlers="{ delete: returnErrorMessage }"
      >
        <template #community="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="community"
            :display-value="value => (value || s['community:set'] === '1' ? '********' : '')"
          />
        </template>
        <template #ipaddr="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="ipaddr"
          />
        </template>
        <template #netmask="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="netmask"
          />
        </template>
        <template #secname="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="secname"
            :display-value="value => accessModes[value]"
          />
        </template>
      </vuci-typed-section>
      <vuci-typed-section
        type="com2sec6"
        :title="$t('SNMPv6 community')"
        :help="$t('This section is used to add new SNMPv6 communities.')"
        :uci-data="uciData"
        data-key="communities_v6"
        :endpoints="[{ endpoint: 'snmp/communities_v6/config' }]"
        :columns="communityV6Columns"
        :table-actions="['column-list', 'search']"
        :edit-form="communitiesEdit"
        :error-handlers="{ delete: returnErrorMessage }"
      >
        <template #community="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="community"
            :display-value="value => (value || s['community:set'] === '1' ? '********' : '')"
          />
        </template>
        <template #source="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="source"
          />
        </template>
        <template #secname="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="secname"
            :display-value="value => accessModes[value]"
          />
        </template>
      </vuci-typed-section>
    </template>
    <template #form-buttons><div></div></template>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import communitiesEdit from './CommunitiesEdit'

export default {
  provide() {
    return {
      validateName: this.validateName
    }
  },
  data() {
    return {
      formData: {},
      communitiesEdit: markRaw(communitiesEdit),
      communityColumns: [
        {
          name: 'community',
          label: this.$t('Community name'),
          help: this.$t("SNMP community name is an ID that allows access to a device's SNMP data.")
        },
        { name: 'ipaddr', label: this.$t('IP address'), help: this.$t('IP address of the community.') },
        { name: 'netmask', label: this.$t('IP mask'), help: this.$t('Netmask for the IP address.') },
        {
          name: 'secname',
          label: this.$t('Access mode'),
          help: this.$t('Access mode specifies if you can only read or read and write information from and to the device.')
        }
      ],
      communityV6Columns: [
        {
          name: 'community',
          label: this.$t('Community name'),
          help: this.$t("SNMPv6 community name is an ID that allows access to a device's SNMPv6 data.")
        },
        { name: 'source', label: this.$t('Source') },
        {
          name: 'secname',
          label: this.$t('Access mode'),
          help: this.$t('Access mode specifies if you can only read or read and write information from and to the device.')
        }
      ],
      accessModes: {
        ro: this.$t('Read-Only'),
        rw: this.$t('Read-Write')
      },
      errorMessages: {
        1: this.$t('SNMP service requires at least one community instance when it is enabled.'),
        default: this.$t('Failed to delete configuration')
      }
    }
  },
  methods: {
    returnErrorMessage(res) {
      const errorCode = res.data.errors[0].code
      return this.errorMessages[errorCode] || this.errorMessages.default
    },
    validateName(isSec6, sectionValues, val) {
      if (!isSec6 && this.formData.communities.some(instance => instance.id !== sectionValues.id && instance.community === val)) {
        return { isValid: false, message: this.$t('SNMP Community with the same name already exists') }
      }
      if (isSec6 && this.formData.communities_v6.some(instance => instance.id !== sectionValues.id && instance.community === val)) {
        return { isValid: false, message: this.$t('SNMP Community V6 with the same name already exists') }
      }
      return { isValid: true }
    }
  }
}
</script>
