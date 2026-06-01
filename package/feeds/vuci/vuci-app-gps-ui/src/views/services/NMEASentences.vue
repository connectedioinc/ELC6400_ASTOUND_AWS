<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :extra-load="extraLoad"
    config="gps"
  >
    <vuci-typed-section
      type="nmea_rule"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'gps/nmea/rules/config' }]"
      data-key="nmeaRules"
      :form-methods="['get', 'edit']"
      :title="$t('NMEA sentence rules')"
      :help="$t('This section is used to specify which NMEA sentences should be forwarded, collected and at what frequency (in seconds).')"
      :table-actions="['column-list', 'search']"
      pagination
      :columns="rulesColumns"
      :no-value-text="$t('There are no currently available NMEA sentences')"
      :after-save="afterSave"
    >
      <template #id="{ s }">
        <div class="flex flex-row items-center gap-2">
          {{ s.id }}
          <tlt-hint
            v-if="displayHint(s)"
            :hints="[{ info: $t('The NMEA sentence will not be forwarded or collected because it is no longer available.') }]"
          >
            <tlt-icon
              icon="warning"
              class="text-theme-text-warning"
            />
          </tlt-hint>
        </div>
      </template>
      <template #forwarding_enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="forwarding_enabled"
        />
      </template>
      <template #forwarding_interval="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="forwarding_interval"
          placeholder="5"
          :rules="['uinteger', 'max(2147483647)']"
        />
      </template>
      <template #collecting_enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="collecting_enabled"
        />
      </template>
      <template #collecting_interval="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="collecting_interval"
          placeholder="5"
          :rules="['uinteger', 'max(2147483647)']"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      formData: {},
      rulesColumns: [
        {
          name: 'id',
          label: this.$t('Name'),
          help: this.$t('NMEA sentence name.')
        },
        {
          name: 'forwarding_enabled',
          label: this.$t('Forwarding enabled'),
          help: this.$t('Enable forwarding for a sentence.')
        },
        {
          name: 'forwarding_interval',
          label: this.$t('Forwarding interval'),
          help: this.$t('Set interval of seconds for sentence forwarding.')
        },
        {
          name: 'collecting_enabled',
          label: this.$t('Collecting enabled'),
          help: this.$t('Enable collecting for a sentence.')
        },
        {
          name: 'collecting_interval',
          label: this.$t('Collecting interval'),
          help: this.$t('Set interval of seconds for sentence collecting.')
        }
      ],
      infoMessages: {
        1: this.$t("Detected multiple enabled satellite systems. Some NMEA sentences might only be available with a 'GN' prefix."),
        2: this.$t("'PQ' or 'GB' prefixed NMEA sentences are interchangeable, but one of them might not be available due to modem version.")
      },
      availableNmeaSentences: []
    }
  },
  methods: {
    ruleFilter(rule) {
      return rule.forwarding_enabled === '1' || rule.collecting_enabled === '1' || this.availableNmeaSentences.includes(rule.id)
    },
    showNotifications(responseMessages) {
      if (!responseMessages) return

      responseMessages.forEach(message => {
        if (this.infoMessages[message.code]) {
          this.$notification.remove(this.infoMessages[message.code])
          this.$notification.info(this.infoMessages[message.code])
        }
      })
    },
    extraLoad(uciData) {
      return this.$axios
        .get('/api/gps/nmea/rules/options')
        .then(nmeaRulesData => {
          this.availableNmeaSentences = nmeaRulesData.data.available_nmea_sentences
          uciData.nmeaRules = uciData.nmeaRules.filter(this.ruleFilter)
          this.showNotifications(nmeaRulesData.messages)
          return uciData
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load available NMEA sentences'))
          return { nmeaRules: [] }
        })
    },
    afterSave(_, __, allData) {
      const filteredData = allData.filter(this.ruleFilter)
      this.formData.nmeaRules = filteredData
      return filteredData
    },
    displayHint(s) {
      return (s.forwarding_enabled === '1' || s.collecting_enabled === '1') && !this.availableNmeaSentences.includes(s.id)
    }
  }
}
</script>
