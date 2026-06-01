<template>
  <vuci-named-section
    :endpoints="[{ endpoint: 'date_time/ntp/client/config' }]"
    :uci-data="uciData"
    :title="title"
    :help="help"
    data-key="ntpclient"
    :after-save="_afterSave"
  >
    <template
      v-if="displaySubscribe"
      #title-content
    >
      <tlt-hint
        class="self-center ml-auto"
        :hints="[{ info: $t('Subscribe to newsletter and receive notifications about new firmware updates.') }]"
        show-icon="mobile"
      >
        <a
          href="https://teltonika-networks.com/subscribe"
          target="_blank"
          class="no-underline self-center"
        >
          <tlt-button
            button-id="subscribe"
            type="text"
            color="primary"
            icon-left="mail"
          >
            {{ $t('Subscribe') }}
          </tlt-button>
        </a>
      </tlt-hint>
    </template>
    <template #default="{ s }">
      <tlt-form-model-item
        :help="$t('Current time of the selected time zone.')"
        :label="$t('Current system time')"
      >
        <span class="mr-2">{{ time }}</span>
        <tlt-button
          button-id="sync"
          type="text"
          size="md"
          class="inline!"
          :readonly="isButtonDisabled"
          @click="syncTime(s)"
        >
          {{ $t('Sync with browser') }}
        </tlt-button>
      </tlt-form-model-item>
      <vuci-form-item-select
        :uci-section="s"
        name="zoneName"
        :label="$t('Time zone')"
        :help="$t('The device will synchronize its time in accordance with the specified time zone.')"
        :options="timeZones()"
      />
      <slot :s="s" />
    </template>
  </vuci-named-section>
</template>
<script>
export default {
  inject: {
    timeZones: { default: () => () => [] },
    deprecatedTimezoneSelected: { default: () => () => '' }
  },
  props: {
    uciData: {
      type: Object,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    help: {
      type: String,
      default: ''
    },
    afterSave: {
      type: Function,
      default: () => {}
    }
  },
  data() {
    return {
      time: '-',
      isButtonDisabled: false,
      notificationShown: false
    }
  },
  computed: {
    displaySubscribe() {
      return this.$route.path === '/system/wizard/step_pwd'
    }
  },
  created() {
    if (!this.$store.showNewsletterNotification) {
      this.showNotification()
    }
  },
  timers: {
    loadRouterTime: { time: 2000, autostart: true, immediate: true, repeat: true }
  },
  methods: {
    showNotification() {
      if (!this.displaySubscribe) return
      this.$notification.info(
        {
          id: 'subscribe',
          text: this.$t('Sign up for our newsletter to get the latest news, events, and product changes delivered directly to your inbox.'),
          action: {
            text: this.$t('Subscribe to newsletter'),
            href: 'https://teltonika-networks.com/subscribe'
          }
        },
        true
      )
      this.$store.showNewsletterNotification = true
    },
    syncTime(section) {
      const browserTime = Math.floor(new Date().getTime() / 1000)
      const browserTimeZone = Intl.DateTimeFormat()?.resolvedOptions()?.timeZone
      this.isButtonDisabled = true
      return this.$axios
        .put(`/api/date_time/ntp/client/config/${section.id}`, {
          data: { current_system_time: browserTime.toString(), zoneName: browserTimeZone === 'Europe/Kiev' ? 'Europe/Kyiv' : browserTimeZone }
        })
        .then(({ data }) => {
          section.zoneName = data.zoneName
          this.$store.setTimeZone(data.zoneName)
          this.time = this.$localDate(data.current_system_time)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to sync time with browser'))
        })
        .finally(() => {
          this.isButtonDisabled = false
        })
    },
    loadRouterTime() {
      if (!this.uciData.ntpclient || this.uciData.ntpclient.length === 0) return
      const sectionID = this.uciData.ntpclient[0].id
      return this.$axios
        .get(`/api/date_time/ntp/client/config/${sectionID}`)
        .then(({ data }) => {
          this.time = this.$localDate(data.current_system_time)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load router time'))
        })
        .finally(() => {
          this.isButtonDisabled = false
        })
    },
    _afterSave(section, res) {
      this.$store.setTimeZone(res.data?.zoneName)
      if (this.deprecatedTimezoneSelected() && res.data?.zoneName !== this.deprecatedTimezoneSelected()) {
        const idx = this.timeZones().findIndex(val => val === this.deprecatedTimezoneSelected())
        if (idx !== -1) {
          this.timeZones().splice(idx, 1)
        }
      }
      this.afterSave(section, res)
    }
  }
}
</script>
