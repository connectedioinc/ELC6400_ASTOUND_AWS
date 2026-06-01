<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="tinc"
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: `tinc/${parent}/hosts/config` }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('Tinc host'), section.id)"
      :uci-data="uciData"
      data-key="tinc_hosts"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turn this tinc interface on/off.')"
        name="enabled"
        initial="0"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Description')"
        :help="$t('Optional. Description of host.')"
        name="description"
        :placeholder="$t('My Host')"
        rules="string"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="address"
        :label="$t('Address')"
        :help="$t('Remote host\'s IP address or domain name, optionally followed by a port number (e.g., example.com:8080). If no port is specified, the default port (655) will be used.')"
        :rules="addressValidation"
        placeholder="0.0.0.0:655"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="subnet"
        :label="$t('Subnet')"
        :help="$t('Specify the host-side subnets you need to access. You can add multiple subnet entries for each daemon.')"
        :rules="validateSubnet"
        placeholder="0.0.0.0/0"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="publickeyfile"
        :label="$t('Public Key')"
        :help="$t('Generated RSA public key.')"
        max-size="16MB"
        :required="s.enabled === '1'"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { normalizeFileName } from '@/plugins/certificates'

export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      parent: this.section.net
    }
  },
  methods: {
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    },
    validateSubnet(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.ipmask()
      const res2 = this.$VuciValidator.macaddr()
      if (res.isValid || res2.isValid) {
        return { isValid: true }
      }
      return {
        isValid: false,
        message: this.$t('One of the following: IPv4, IPv6 or MAC addresses are accepted (e.g., 192.168.1.0/24, 00:1a:2b:3c:4b:5c).')
      }
    },
    addressValidation(val) {
      this.$VuciValidator.value = val
      const hostResult = this.$VuciValidator.host()
      const ip6Result = this.$VuciValidator.ip6addr()
      const hostIpPortResult = this.$VuciValidator.hostipport()
      if (hostResult.isValid || ip6Result.isValid || hostIpPortResult.isValid) {
        return { isValid: true }
      }
      return {
        isValid: false,
        message: this.$t('Domain names or IP addresses with an optional port number accepted (e.g., 192.168.1.1, [::0000:8a2e:0370]:7334, example.com).')
      }
    }
  }
}
</script>
