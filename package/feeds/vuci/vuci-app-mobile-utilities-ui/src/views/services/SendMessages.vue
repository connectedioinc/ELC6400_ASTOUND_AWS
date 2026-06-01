<template>
  <modem-full-control-message />
  <tlt-form
    ref="tltForm"
    sid="send_messages"
    :title="$t('Send SMS message')"
    :help="
      $t(
        'This section provides you with the possibility to send SMS messages from the router. \
            Simply enter the recipient\'s phone number, message text and click the \'Send\' button.'
      )
    "
    :model="form"
  >
    <tlt-form-item-select
      v-show="modems.length > 1"
      v-model="form.modem"
      prop="modem"
      :label="$t('Modem')"
      :help="$t('Modem, which is used to send information from.')"
      :options="modems"
    />
    <tlt-form-item-input
      v-model="form.number"
      prop="number"
      :label="$t('Phone number')"
      :help="$t('To whom the message will be sent. The number must be specified in full format, country code included. e.g., +37000000000.')"
      rules="phonedigit"
      placeholder="+37000000000"
      required
    />
    <tlt-form-item-text-area
      v-model="form.message"
      prop="message"
      :label="$t('Message')"
      :help="$t('Contents of the SMS message.')"
      rows="15"
      :rules="validateSms"
      no-counter
      required
    />
    <tlt-inline-message
      v-if="$mobile.modemOffline(currentModem)"
      id="modem-message"
      type="info"
      :message="$t('Sending SMS messages is not possible due to the modem being blocked or disabled')"
    />
    <tlt-form-model-item>
      <tlt-dummy-value :value="getSmsCharacters(form.message)" />
    </tlt-form-model-item>
    <div class="flex justify-between">
      <tlt-button @click="resetMessage">
        {{ $t('Reset') }}
      </tlt-button>
      <tlt-button
        button-id="send"
        :readonly="$mobile.modemOffline(currentModem)"
        @click="sendMessage"
      >
        {{ $t('Send') }}
      </tlt-button>
    </div>
  </tlt-form>
</template>
<script>
import { useMessageValidation } from '@/composables/useMessageValidation'
import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage'
export default {
  components: { ModemFullControlMessage },
  setup() {
    const { validateSms, getSmsCharacters } = useMessageValidation()
    return { validateSms, getSmsCharacters }
  },
  data() {
    return {
      form: {
        modem: '',
        number: '',
        message: ''
      },
      modems: [],
      modemsStatus: [],
      errorStatuses: {
        1: this.$t("Messages might not be visible on recipient's device"),
        2: this.$t('Failed to send message'),
        6: this.$t('Failed to send message, because SMS limit was reached'),
        7: this.$t('Failed to send message. SIM card is not inserted'),
        default: this.$t('An unexpected error occurred')
      },
      fullControl: false
    }
  },
  computed: {
    currentModem() {
      return this.modemsStatus.find(m => m.id === this.form.modem)
    }
  },
  created() {
    return this.loadModems()
  },
  methods: {
    loadModems() {
      this.$spin()
      return this.$axios
        .get('/api/modems/status')
        .then(({ data }) => {
          this.modemsStatus = data
          this.modems = this.$mobile.modemsOptions(data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem data'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    resetMessage() {
      this.form.number = ''
      this.form.message = ''
      this.$nextTick(() => {
        return this.$refs.tltForm.setValid(true)
      })
    },
    async sendMessage() {
      const { valid } = await this.$refs.tltForm.validate()
      if (!valid) {
        return this.$message.error(this.$t('Some fields are invalid'))
      }

      this.$spin('Sending message(s)...')
      const timeout = setTimeout(() => {
        this.$spin(false)
        this.$spin(this.$t('Waiting for response from the modem...'))
      }, 20000)
      const message = {
        data: {
          ...this.form,
          modem: this.modems.length > 1 ? this.form.modem : this.modems[0][0]
        }
      }

      return this.$axios
        .post('/api/messages/actions/send', message)
        .then(() => {
          this.form.message = ''
          this.$message.success(this.$t('Message was sent successfully'))
        })
        .catch(err => {
          const res = err.response.data.errors
          let wasInvoked = false
          res.forEach(r => {
            if (this.errorStatuses[r.code]) {
              wasInvoked = true
              this.$message.error(this.errorStatuses[r.code])
            }
          })
          if (!wasInvoked) {
            this.$message.error(this.errorStatuses.default)
          }
        })
        .finally(() => {
          clearTimeout(timeout)
          this.$refs.tltForm.setValid(true)
          this.$spin(false)
        })
    }
  }
}
</script>
