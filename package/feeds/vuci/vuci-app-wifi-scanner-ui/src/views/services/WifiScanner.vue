<template>
  <vuci-form
    v-slot="{ uciData }"
    config="general"
    :after-load="loadData"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :title="$t('Wifi scanner settings')"
      :endpoints="[{ endpoint: 'wifi_scanner/config' }]"
      data-key="scannerData"
      :uci-data="uciData"
      :after-save="onAfterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="two_g_enabled"
        :label="$t('Enable 2.4GHz')"
        :help="$t('Enable or disable the wifi scanner.')"
        :rmempty="false"
      />
      <vuci-form-item-switch
        v-if="!!s.five_g_enabled"
        :uci-section="s"
        name="five_g_enabled"
        :label="$t('Enable 5GHz')"
        :help="$t('Enable or disable the wifi scanner.')"
        :rmempty="false"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="interval"
        :label="$t('Interval')"
        :help="$t('Interval between scans in seconds.')"
        :rules="v => [v.uinteger, v.range.bind(v, 1, 2147483)]"
        required
      />
      <tlt-inline-message
        v-if="errorCode"
        id="ussd-message"
        type="info"
      >
        {{ $t('Enabling wifi scanning on the') }}
        <span v-if="errorCode === 1 || errorCode === 2">
          <router-link
            test-id="device-service-enabled-link"
            :to="`/network/wireless/radio?tab=advance?edit=${radios[0]}`"
            >2.4GHz</router-link
          >
        </span>
        <span v-if="errorCode === 1">{{ ' ' + $t('or') + ' ' }}</span>
        <span v-if="errorCode === 1 || errorCode === 3">
          <router-link
            test-id="device-service-enabled-link"
            :to="`/network/wireless/radio?tab=advance?edit=${radios[1] || radios[0]}`"
            >5GHz</router-link
          >
        </span>
        <span v-if="errorCode === 1">
          {{ ' ' + $t('radios will set their beacon interval to 300') }}
        </span>
        <span v-else>
          {{ ' ' + $t('radio will set its beacon interval to 300') }}
        </span>
      </tlt-inline-message>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      formData: {},
      errorCode: '',
      radios: ''
    }
  },
  methods: {
    onAfterSave(_, data) {
      if (!data?.messages) {
        this.errorCode = ''
        this.radios = []
        return
      }
      if (data?.messages?.[0]?.code) this.errorCode = data.messages[0].code
      if (data?.messages?.[0]?.radios) this.radios = data.messages[0].radios
    },
    loadData() {
      return this.$axios
        .get('/api/wifi_scanner/config')
        .then(data => {
          if (data?.messages?.[0]?.code) this.errorCode = data.messages[0].code
          if (data?.messages?.[0]?.radios) this.radios = data.messages[0].radios
          this.formData = data.data
        })
        .catch(() => {
          return this.$message.error(this.$t('Failed to load scanner data'))
        })
    }
  }
}
</script>
