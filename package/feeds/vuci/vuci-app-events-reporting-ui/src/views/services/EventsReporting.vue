<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="event_juggler"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="rule"
      :title="$t('Events reporting rules')"
      :help="
        $t(`This section displays Events Reporting rules that are currently configured on the router.
                Events Reporting rules inform you via SMS when certain specified events occur on the router.
                Click the 'Add' button to create a new rule and begin configuring it.`)
      "
      :columns="deviceColumns"
      :add-validate="onAdd"
      :uci-data="uciData"
      :table-actions="['column-list', 'search']"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'events_reporting/config', sectionFilter: section => section }]"
      data-key="events_reporting"
      pagination
    >
      <template #event="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="event"
          :display-value="getEvent"
        />
      </template>
      <template #eventMark="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="eventMark"
          :display-value="getEventMark"
        />
      </template>
      <template #action="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="action"
          :display-value="getAction"
        />
      </template>
      <template #enable="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enable"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './EventsReportingEdit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      formData: {},
      formOptions: {
        emailUserGroups: [],
        phoneUserGroups: [],
        availableEvents: {},
        parameters: [],
        modems: [],
        devices: []
      },
      editModal: markRaw(EditForm),
      deviceColumns: [
        { name: 'event', label: this.$t('Event type'), help: this.$t('Event type for which the rule is applied.') },
        { name: 'eventMark', label: this.$t('Event subtype'), help: this.$t('Event subtype for which the rule is applied.') },
        { name: 'action', label: this.$t('Action'), help: this.$t('Action to perform when an event occurred.') },
        { name: 'enable', label: this.$t('Enabled') }
      ],
      actions: {
        sendSMS: this.$t('Send SMS'),
        sendEmail: this.$t('Send email')
      }
    }
  },
  mounted() {
    this.$alert.warning({
      id: 'events_reporting_deprecation',
      title: this.$t('Feature deprecation notice'),
      text: this.$t("'Events Reporting' page is deprecated and will be removed in future firmware updates. Please visit 'Event Juggler' page to configure it and explore additional options."),
      action: {
        text: this.$t('Go to Event Juggler'),
        to: '/services/event_juggler'
      }
    })
  },
  methods: {
    getEventMark(value) {
      return (
        Object.values(this.$eventsOptions.getTranslatedSubtypes(this.formOptions.availableEvents)).reduce((acc, curr) => {
          curr.forEach(item => {
            acc[item[0]] = item[1]
          })
          return acc
        }, {})[value] || this.$t('N/A')
      )
    },
    getFormOptions() {
      return this.formOptions
    },
    getEvent(value) {
      return this.$eventsOptions.getTypes()[value] || this.$t('N/A')
    },
    getAction(value) {
      return this.actions[value] || this.$t('N/A')
    },
    loadData() {
      const requests = [
        '/api/recipients/email_users/config',
        { endpoint: '/api/recipients/phone_groups/config', condition: this.$store.board.hwinfo.mobile },
        { endpoint: '/api/events_reporting/options', condition: 'vuci-app-events-reporting-api.control' },
        { endpoint: '/api/modems/status', condition: 'mobifd.control' }
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([emailGroups, phoneGroups, events, modems]) => {
          this.formOptions = {
            emailUserGroups: emailGroups.success ? emailGroups.data : [],
            phoneUserGroups: phoneGroups.success ? phoneGroups.data : [],
            availableEvents: events.success ? events.data.events : {},
            parameters: events.success ? events.data.params : [],
            modems: modems.success ? this.$mobile.parseModems(modems.data) : []
          }
          if (!modems.success) this.$message.error(this.$t('Failed to load modems'))
          if (!emailGroups.success) this.$message.error(this.$t('Failed to load email groups'))
          if (!phoneGroups.success) this.$message.error(this.$t('Failed to load phone groups'))
          if (!events.success) this.$message.error(this.$t('Failed to load available events'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    onAdd(_, dataSource) {
      if (dataSource.length >= 90) {
        return {
          valid: false,
          message: this.$t('Cannot create more instances. Only 90 Events Reporting rules are allowed')
        }
      }
      return { valid: true }
    },
    validateEnable(self) {
      const section = self.uciSection
      if (self.model === '0' || section.enable !== '1') return
      const requiredEnableOptions = []
      if (!section.event) {
        requiredEnableOptions.push(this.$t('Event type'))
      }
      if (!section.eventMark) {
        requiredEnableOptions.push(this.$t('Event subtype'))
      }
      if (!section.action) {
        requiredEnableOptions.push(this.$t('Action'))
      }
      if (section.action === 'sendEmail') {
        if (!section.subject) {
          requiredEnableOptions.push(this.$t('Subject'))
        }
        if (!section.message) {
          requiredEnableOptions.push(this.$t('Message text on event'))
        }
        if (!section.emailgroup) {
          requiredEnableOptions.push(this.$t('Email account'))
        }
        if (!section.recipEmail || section.recipEmail.every(sec => sec === '')) {
          requiredEnableOptions.push(this.$t("Recipient's email address"))
        }
      }
      if (section.action === 'sendSMS') {
        if (!section.message) {
          requiredEnableOptions.push(this.$t('Message text on event'))
        }
        if (!section.recipient_format) {
          requiredEnableOptions.push(this.$t('Recipients'))
        }
        if (section.recipient_format === 'single' && !section.telnum) {
          requiredEnableOptions.push(this.$t("Recipient's phone number"))
        }
        if (section.recipient_format === 'group' && !section.group) {
          requiredEnableOptions.push(this.$t("Recipient's phone number"))
        }
      }
      if (requiredEnableOptions.length === 1) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
        self.model = '0'
      }
      if (requiredEnableOptions.length > 1) {
        this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
        self.model = '0'
      }
    }
  }
}
</script>
