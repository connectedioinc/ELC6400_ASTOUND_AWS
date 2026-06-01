<template>
  <vuci-form
    v-slot="{ uciData }"
    config="events_reporting;user_groups"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      data-key="events_reporting"
      :endpoints="[{ endpoint: 'events_reporting/config' }]"
      :title="$utils.getModalTitle($t('events reporting'))"
      :help="$t('This section is used to customize how an Events Reporting rule will function. Scroll your mouse pointer over field names in order to see helpful hints.')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turns the rule on or off.')"
        name="enable"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Event type')"
        :help="$t('Event that will trigger the rule.')"
        name="event"
        :options="eventTypes"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Event subtype')"
        :help="$t('More specific event type that will trigger the rule.')"
        name="eventMark"
        :options="eventSubtypes"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Action')"
        :help="$t('Action that will be executed when the rule is triggered.')"
        name="action"
        :options="actionOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Modem')"
        :help="$t('Modem, which is used to get information from.')"
        name="info_modem_id"
        :options="modemList"
        :depend="modemList.length > 1"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Gateway modem')"
        :help="$t('Modem, which is used to send information from.')"
        name="send_modem_id"
        :options="modemList"
        :depend="s.action === 'sendSMS' && modemList.length > 1"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Subject')"
        :help="$t('Subject of an email. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
        name="subject"
        rules="fieldvalidation(\'^[a-zA-Z0-9!@#$%%&*+\/=?^_`{|}~. -]+$\',0)"
        :depend="s.action === 'sendEmail'"
        maxlength="256"
        :required="s.enable === '1'"
      />
      <vuci-form-item-text-area
        :uci-section="s"
        :label="$t('Message text on event')"
        :help="$t('Message to send.')"
        name="message"
        rules="string"
        maxlength="4096"
        initial="Router name - %rn; Events log type - %et; Event text - %ex; Time stamp - %ts"
        :required="s.enable === '1'"
      />
      <tlt-form-accordion
        name="text-parameters"
        :title="$t('message text parameters')"
      >
        <tlt-form-model-item>
          <t-parameters class="w-full">
            <strong>{{ $t('Message text parameters') }}:</strong>
            <t-parameters-list>
              <t-parameters-list-item
                v-for="param in formattedParameters"
                :key="param.parameter"
                v-bind="param"
              />
            </t-parameters-list>
          </t-parameters>
        </tlt-form-model-item>
      </tlt-form-accordion>
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Recipients')"
        :help="$t('You can choose to add a single number or use a phone group list.')"
        name="recipient_format"
        :options="recipientFormatOptions"
        :depend="s.action === 'sendSMS'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Recipient\'s phone number')"
        :help="$t('To whom the message will be sent. The number must be specified in full format, country code included. e.g., +37000000000.')"
        name="telnum"
        placeholder="+37000000000"
        rules="phonedigit"
        :required="s.action === 'sendSMS' && s.enable === '1'"
        :depend="s.action === 'sendSMS' && s.recipient_format === 'single'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Phone group')"
        :placeholder="$t('No phone groups created')"
        name="group"
        :options="phoneGroupList"
        :required="s.enable === '1'"
        :depend="s.action === 'sendSMS' && s.recipient_format === 'group'"
      >
        <template #help>
          {{ $t("Recipient's phone number users group.") }}
          {{ $t('Configure it') }}
          <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Sender\'s email account')"
        name="emailgroup"
        :placeholder="$t('No email accounts created')"
        :options="emailGroupList"
        :depend="s.action === 'sendEmail'"
        :required="s.enable === '1'"
      >
        <template #help>
          {{ $t("Senders's email configuration.") }}
          {{ $t('Configure it') }}
          <router-link to="/system/admin/group/email"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Recipient\'s email address')"
        :help="$t('For whom you want to send an email to. Allowed characters: &quot;a-zA-Z0-9._%+@-&quot;.')"
        name="recipEmail"
        placeholder="mail@domain.com"
        rules="email"
        :required="s.enable === '1'"
        :depend="s.action === 'sendEmail'"
      />
      <vuci-form-item-button
        :uci-section="s"
        :text="$t('Send')"
        :label="$t('Send test email')"
        name="sendtest"
        :readonly="disableButton"
        :depend="s.action === 'sendEmail'"
        no-write
        @click="testMail"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { getAllParameters } from '@/utils/message-parameters'

export default {
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      recipientFormatOptions: [
        ['single', this.$t('Single')],
        ['group', this.$t('Group')]
      ],
      disableButton: false
    }
  },
  computed: {
    ...mapState(useMainStore, ['board']),
    eventTypes() {
      return this.$eventsOptions.getTranslatedTypes(this.formOptions().availableEvents)
    },
    translatedSubtypes() {
      return this.$eventsOptions.getTranslatedSubtypes(this.formOptions().availableEvents)
    },
    eventSubtypes() {
      return this.translatedSubtypes[this.section.event] || []
    },
    phoneGroupList() {
      return this.formOptions().phoneUserGroups.map(group => group.name)
    },
    emailGroupList() {
      return this.formOptions().emailUserGroups.map(group => group.name)
    },
    modemList() {
      return this.$mobile.modemsOptions(this.formOptions().modems)
    },
    formattedParameters() {
      const parameters = getAllParameters(this.formOptions().parameters)
      return parameters.map(params => ({ parameter: `%${params[0]}`, description: params[1] }))
    },
    actionOptions() {
      const actionOptions = [['sendEmail', this.$t('Send Email')]]
      if (this.modemList.length > 0) {
        actionOptions.push(['sendSMS', this.$t('Send SMS')])
      }
      return actionOptions
    }
  },
  methods: {
    testMail(self) {
      this.disableButton = true
      return self.vuciForm
        .validate()
        .then(valid => {
          if (!valid) throw new Error('invalid')
          const data = {
            event: this.section.event,
            subject: this.section.subject,
            message: this.section.message,
            group: this.section.emailgroup,
            recipients: this.section.recipEmail
          }
          if (this.modemList.length > 1) {
            data.info_modem_id = this.section.info_modem_id
          }
          return this.$axios.post('/api/events_reporting/actions/send_test_email', { data })
        })
        .then(() => {
          this.$message.success(this.$t('Mail sent successfully'))
        })
        .catch(error => {
          if (error?.message === 'invalid') {
            return this.$message.error(this.$t('Some fields are invalid'))
          }
          const errorMessages = {
            1: this.$t('Failed to send the email'),
            2: this.$t('Email account not found'),
            3: this.$t('Email sending timed out'),
            4: this.$t('Email account configuration is invalid'),
            default: this.$t('Failed to send the email')
          }
          const message = errorMessages[error.response?.data?.errors?.[0]?.code] || errorMessages.default
          this.$message.error(message)
        })
        .finally(() => {
          this.disableButton = false
        })
    }
  }
}
</script>
