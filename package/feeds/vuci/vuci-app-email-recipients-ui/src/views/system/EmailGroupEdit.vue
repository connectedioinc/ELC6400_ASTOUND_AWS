<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="user_groups"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('email account'), section.name)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'recipients/email_users/config' }]"
      data-key="users"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="secure_conn"
        :label="$t('Secure connection')"
        :help="$t('Use only if server supports SSL or TLS.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="smtp_ip"
        :label="$t('SMTP server')"
        :hint="$t('SMTP (Simple Mail Transfer Protocol) server. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
        rules="host"
        maxlength="64"
        placeholder="smtp.domain.com"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="smtp_port"
        :label="$t('SMTP server port')"
        :help="$t('SMTP (Simple Mail Transfer Protocol) server port.')"
        rules="port"
        placeholder="465"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="credentials"
        :label="$t('Credentials')"
        :help="$t('This options allows you to set username and password of email account.')"
        initial="1"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="username"
        :label="$t('Username')"
        :help="$t('Username for authentication on SMTP (Simple Mail Transfer Protocol) server. All characters are allowed except `\' and space.')"
        :placeholder="$t('Username')"
        :validator-hint="$t('All characters are allowed except `\' and space.')"
        :rules="['credentials_validate', 'fieldvalidation(\'^[^\']*$\')']"
        maxlength="64"
        :depend="s.credentials === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="$t('Password')"
        :help="$t('Password for authentication on SMTP (Simple Mail Transfer Protocol) server. All characters are allowed except `\' and space.')"
        :placeholder="$t('Password')"
        :validator-hint="$t('All characters are allowed except ` \' and space.')"
        :rules="['credentials_validate', 'fieldvalidation(\'^[^\']*$\')']"
        maxlength="128"
        :depend="s.credentials === '1'"
        password
        sensitive
      />
      <vuci-form-item-input
        :uci-section="s"
        name="senderemail"
        :label="$t('Sender\'s email address')"
        :help="$t('An address that will be used to send your email from. Allowed characters: &quot;a-zA-Z0-9._%+-@&quot;.')"
        :placeholder="$t('email@domain.com')"
        rules="email"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="do_not_verify"
        :label="$t('Do not verify authenticity')"
        :help="$t('When enabled peer\'s certificate authenticity will not be verified.')"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="ca_file"
        :label="$t('Server\'s CA file')"
        :help="$t('Upload server\'s CA file.')"
        max-size="16MB"
        force-write
        :depend="s.do_not_verify === '0'"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-button
        :uci-section="s"
        :text="$t('Send')"
        :label="$t('Send test email')"
        name="sendtest"
        :readonly="disableButton"
        @click="sendEmail"
      />
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
      testEmailErrors: {
        invalid: this.$t('Some fields are invalid'),
        smtp: this.$t('SMTP server is missing'),
        username: this.$t('Username is required'),
        password: this.$t('Password is required'),
        default: this.$t('Failed to send test email')
      },
      disableButton: false
    }
  },
  methods: {
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    },
    sendEmail(self) {
      this.disableButton = true
      const { secure_conn: secureConn, smtp_ip: smtpIp, smtp_port: smtpPort, credentials, username, password, senderemail } = this.section
      return new Promise((resolve, reject) => {
        if (smtpIp === '') return reject(new Error('smtp'))
        if (credentials === '1' && username === '') return reject(new Error('username'))
        if (credentials === '1' && password === '') return reject(new Error('password'))
        resolve()
      })
        .then(() => {
          return self.vuciForm.validate()
        })
        .then(valid => {
          if (!valid) throw new Error('invalid')
          const data = {
            smtp_ip: smtpIp,
            smtp_port: smtpPort || '465',
            senderemail: senderemail || 'email@domain.com',
            secure_conn: secureConn
          }
          if (credentials === '1') {
            data.username = username
            data.password = password
          }
          return this.$axios.post('/api/recipients/email_users/actions/send_email', { data })
        })
        .then(() => {
          this.$message.success(this.$t('Email sent successfully'))
        })
        .catch(err => {
          if (err.message && this.testEmailErrors[err.message]) {
            this.$message.error(this.testEmailErrors[err.message])
            return
          }
          this.$message.error(this.testEmailErrors.default)
        })
        .finally(() => {
          this.disableButton = false
        })
    }
  }
}
</script>
