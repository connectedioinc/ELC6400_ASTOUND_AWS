<template>
  <vuci-form
    v-slot="{ uciData }"
    config="chilli"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      :endpoints="[{ endpoint: 'hotspot/groups/config' }]"
      data-key="groups"
      :title="$t('&quot;%s&quot; group settings').format(section.name)"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="defidletimeout"
        :label="$t('Idle timeout')"
        :help="$t('Max idle time in sec. (0, meaning unlimited).')"
        :rules="['uinteger', 'range(0, 86400)']"
        placeholder="0"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="defsessiontimeout"
        :label="$t('Time limit')"
        :help="$t('Disable hotspot user after time limit in sec is reached. (0, meaning unlimited).')"
        :rules="['uinteger', 'range(0, 86400)']"
        placeholder="0"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="downloadbandwidth"
        :label="$t('Download bandwidth')"
        :help="$t('The max allowed download speed, in megabits.')"
        :rules="['uinteger', 'range(0, 1000000)']"
        placeholder="1000"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="uploadbandwidth"
        :label="$t('Upload bandwidth')"
        :help="$t('The max allowed upload speed, in megabits.')"
        :rules="['uinteger', 'range(0, 1000000)']"
        placeholder="500"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="downloadlimit"
        :label="$t('Download limit')"
        :help="$t('Disable hotspot user after download limit value in MB is reached.')"
        :rules="['uinteger', 'range(0, 1000000)']"
        placeholder="10000"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="uploadlimit"
        :label="$t('Upload limit')"
        :help="$t('Disable hotspot user after upload limit value in MB is reached.')"
        :rules="['uinteger', 'range(0, 1000000)']"
        placeholder="10000"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="warning"
        :label="$t('Warning')"
        :help="
          $t(
            'Send an SMS warning to hotspot user after warning value of download or upload data in MB is reached. \
        Only works with SMS OTP authentication.'
          )
        "
        :rules="['uinteger', 'range(0, 1000000)']"
        :depend="hasModem"
        placeholder="10000"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="period"
        :label="$t('Period')"
        :help="$t('Period for which hotspot data limiting should apply. After the period is over, all specified limits are reset.')"
        :options="periodOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="day"
        :label="$t('Start day')"
        :help="$t('Specifies which day of the month, week or hour of the day the limits will be reset.')"
        :options="dayOptions()"
        :depend="s.period === '3'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="hour"
        :label="$t('Start hour')"
        :help="$t('Specifies which day of the month, week or hour of the day the limits will be reset.')"
        :options="hourOptions()"
        :depend="s.period === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="weekday"
        :label="$t('Start day')"
        :help="$t('Specifies which day of the month, week or hour of the day the limits will be reset.')"
        :options="weekdayOptions"
        :depend="s.period === '2'"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      periodOptions: [
        ['3', this.$t('Month')],
        ['2', this.$t('Week')],
        ['1', this.$t('Day')]
      ],
      weekdayOptions: [
        ['1', this.$t('Monday')],
        ['2', this.$t('Tuesday')],
        ['3', this.$t('Wednesday')],
        ['4', this.$t('Thursday')],
        ['5', this.$t('Friday')],
        ['6', this.$t('Saturday')],
        ['0', this.$t('Sunday')]
      ]
    }
  },
  computed: {
    hasModem() {
      return this.$store.hasPackages('mobifd.control')
    }
  },
  methods: {
    dayOptions() {
      const o = []
      for (let i = 1; i <= 28; i++) {
        o.push(i.toString())
      }
      return o
    },
    hourOptions() {
      const o = []
      for (let i = 1; i <= 23; i++) {
        o.push(i.toString())
      }
      o.push(['0', '24'])
      return o
    }
  }
}
</script>
