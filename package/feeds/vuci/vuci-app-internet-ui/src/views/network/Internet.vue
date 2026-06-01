<template>
  <vuci-form
    v-slot="{ uciData }"
    config="connchecker"
  >
    <tlt-card :title="$t('Status')">
      <tlt-value-list
        id="internet_status"
        class="w-80 max-md:w-full m-auto"
        :data-source="$network.parseInternetStatus(status)"
      >
        <template
          v-for="name in $network.parseInternetStatus(status).map(e => `${e.slotName}_value`)"
          #[name]="{ item }"
          :key="name"
        >
          <span :class="item.style">
            {{ item.info }}
          </span>
        </template>
      </tlt-value-list>
    </tlt-card>
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Configuration')"
      :help="$t('Monitors the connectivity status of specified IPv4, IPv6, and DNS addresses. Repeatedly checks the connectivity status at specified intervals and reports changes.')"
      data-key="internet"
      :endpoints="[{ endpoint: 'internet_connection/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable internet monitoring.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="track_ipv4"
        :label="$t('Track IPv4')"
        :help="$t('IPv4 address to be monitored.')"
        rules="ip4addr"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="track_ipv6"
        :label="$t('Track IPv6')"
        :help="$t('IPv6 address to be monitored.')"
        rules="ip6addr"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="track_domain"
        :label="$t('Track domain')"
        :help="$t('Domain to be checked if alive.')"
        rules="hostname"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="interval"
        :label="$t('Interval')"
        :help="$t('The time interval in seconds at which the connectivity status should be checked.')"
        rules="irange(30,86400)"
        required
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      status: {}
    }
  },
  mounted() {
    this.$timer.start({ method: this.getStatus, time: 5000, autostart: true, immediate: true })
  },
  methods: {
    getStatus() {
      return this.$axios
        .get('/api/internet_connection/status')
        .then(({ data }) => {
          this.status = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load internet status data'))
        })
    }
  }
}
</script>
