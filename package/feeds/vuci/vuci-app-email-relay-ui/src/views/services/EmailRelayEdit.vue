<template>
  <vuci-form
    v-slot="{ uciData }"
    config="emailrelay"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('email relay'), section.name)"
      :help="$t(`This section is used to configure the settings of the %s instance.`).format(section.name)"
      :endpoints="[{ endpoint: 'email_relay/config' }]"
      :uci-data="uciData"
      data-key="emailrelay"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable instance.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        :help="$t('Name of the email relay configuration.')"
        name="name"
        maxlength="64"
        required
        :rules="['uciname', () => $utils.validateNoDuplicates(uciData.emailrelay, 'name', s.name, $t('Name'))]"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="mode"
        :label="$t('Mode')"
        :help="$t('Instance mode.')"
        :options="modeOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="smtp_port"
        :label="$t('SMTP port')"
        placeholder="25"
        :rules="['uinteger', 'range(1,65535)', validatePorts]"
        required
        :help="$t('SMTP Port to listen incoming connections.')"
        :depend="s.mode !== 'cmdline'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="pop_port"
        :label="$t('POP port')"
        placeholder="110"
        :rules="['uinteger', 'range(1,65535)', validatePorts]"
        required
        :help="$t('POP Port to listen incoming connections.')"
        :depend="s.mode === 'server'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Remote clients')"
        :help="$t('To allow connections from anywhere. By default only local allowed.')"
        name="remote_clients"
        :depend="s.mode !== 'cmdline'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="address_verifier"
        :label="$t('Address verifier')"
        :help="$t('Runs the specified external program to verify a message recipient\'s e-mail address.')"
        :depend="s.mode !== 'cmdline'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="domain"
        :label="$t('Domain')"
        rules="hostname"
        placeholder="smtp.example.com"
        :help="$t('Specifies the network name that is used in SMTP EHLO. The default is derived from a DNS lookup of the local hostname.')"
        :depend="s.mode !== 'cmdline'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Anonymous')"
        :help="$t('Disables the server\'s SMTP VRFY command.')"
        name="anonymous"
        :depend="s.mode !== 'cmdline'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Server TLS')"
        :help="$t('Enables TLS for incoming SMTP and POP connections.')"
        name="server_tls"
        :depend="s.mode !== 'cmdline'"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="server_tls_certificate"
        :label="$t('TLS certificate')"
        :help="$t('Specifies a PEM-format file containing a X.509 certificate and private key.')"
        :depend="s.mode !== 'cmdline' && s.server_tls === '1'"
        max-size="16MB"
        required
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('SMTP authentication')"
        :help="$t('Enables SMTP server authentication of remote SMTP clients.')"
        name="server_auth"
        :depend="s.mode !== 'cmdline'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="server_username"
        :label="$t('SMTP Username')"
        :help="$t('Username for authentication with the SMTP server.')"
        :depend="s.mode !== 'cmdline' && s.server_auth === '1'"
        rules="credentials_validate"
        maxlength="512"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="server_password"
        :label="$t('SMTP Password')"
        :help="$t('Password for authentication with the SMTP server.')"
        :depend="s.mode !== 'cmdline' && s.server_auth === '1'"
        rules="credentials_validate"
        maxlength="512"
        password
        sensitive
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="pop_username"
        :label="$t('POP Username')"
        :help="$t('Username for authentication with the POP server.')"
        :depend="s.mode === 'server'"
        rules="credentials_validate"
        maxlength="512"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="pop_password"
        :label="$t('POP Password')"
        :help="$t('Password for authentication with the POP server.')"
        :depend="s.mode === 'server'"
        rules="credentials_validate"
        maxlength="512"
        password
        sensitive
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="smarthost"
        :label="$t('Smarthost')"
        rules="hostipport"
        required
        :help="$t('Specify the SMTP to forward emails.')"
        :depend="s.mode === 'proxy'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Client TLS')"
        :help="$t('Enables negotiated TLS for outgoing SMTP connections.')"
        name="client_tls"
        :depend="s.mode === 'proxy'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Client authentication')"
        :help="$t('Enables SMTP client authentication with the remote server.')"
        name="client_auth"
        :depend="s.mode === 'proxy'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="client_username"
        :label="$t('Username')"
        :help="$t('Username for authentication with the remote server.')"
        :depend="s.mode === 'proxy' && s.client_auth === '1'"
        rules="credentials_validate"
        maxlength="512"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="client_password"
        :label="$t('Password')"
        :help="$t('Password for authentication with the remote server.')"
        :depend="s.mode === 'proxy' && s.client_auth === '1'"
        rules="credentials_validate"
        maxlength="512"
        password
        sensitive
        required
      />
      <vuci-form-item-list
        :uci-section="s"
        name="extra_cmdline"
        :label="$t('Extra command line')"
        :help="$t('Extra command line options.')"
        rules="fieldvalidation('^[a-zA-Z0-9!@#$%&*+-/=?^_`{|}:~. ]+$')"
        :depend="s.mode === 'cmdline'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { normalizeFileName } from '@/plugins/certificates'

export default {
  inject: ['validatePorts'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      modeOptions: [
        ['server', this.$t('Server')],
        ['proxy', this.$t('Proxy')],
        ['cmdline', this.$t('Command line')]
      ]
    }
  },
  methods: {
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    }
  }
}
</script>
