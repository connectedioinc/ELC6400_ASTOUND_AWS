<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="ddns"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      :title="$utils.getModalTitle($t('dynamic DNS details'), section.id)"
      :endpoints="[{ endpoint: 'ddns/config' }]"
      data-key="service"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        :help="$t('Turns the DDNS instance on or off.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="use_https"
        :label="$t('Use HTTP secure')"
        :depend="hasSSL"
      >
        <template #help>
          {{ $t('Configure Root CA certificates in') }}
          <router-link to="/system/admin/certificates/generation">
            {{ $t('System -> Administration -> Certificates.') }}
          </router-link>
        </template>
      </vuci-form-item-switch>
      <vuci-form-item-switch
        :uci-section="s"
        name="use_ipv6"
        :label="$t('Use DDNS IPv6 support')"
        :help="$t('Turns the DDNS IPv6 support on or off.')"
        @change="urlToDetect(s)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="lookup_host"
        :label="$t('Lookup hostname')"
        :help="
          $t(
            'Fully qualified domain name (FQDN) of your defined host.\
        This is required to verify what the hostname\'s current IP address at DNS is (using nslookup/host command).'
          )
        "
        placeholder="myhost.example.com"
        rules="hostname"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="service_name"
        :label="$t('DDNS service provider')"
        :help="$t('Third party DNS service provider.')"
        :options="serviceProviders"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="update_url"
        :label="$t('Custom update-URL')"
        :help="$t('Update URL to be used for updating your DDNS Provider. %sFollow instructions you will find on their WEB page.').format('<br>')"
        placeholder="myhost.example.com"
        :depend="!s.service_name"
        :rules="validateCustomUpdateUrl"
        required
        rawhtml
      />
      <vuci-form-item-input
        :uci-section="s"
        name="domain"
        :label="$t('Domain')"
        :help="$t('Hostname that will be linked with the router\'s IP address.')"
        placeholder="myhost.example.com"
        :rules="validateCustomUpdateUrl"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="cloudflare_authentication_type"
        :label="$t('Authentication type')"
        :options="authenticationType"
        :depend="s.service_name === 'cloudflare.com-v4'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="dns_server"
        :label="$t('DNS server')"
        rules="ipaddr"
        :required="s.service_name === 'bind-nsupdate'"
        :help="$t('DNS server to use for looking up lookup host. If bind-nsupdate service is used this is the DNS server that will be updated.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="username"
        :label="s.service_name === 'cloudflare.com-v4' ? $t('Email') : $t('Username')"
        :help="
          $t(
            'Username required to login to the third party DNS service;\
        used to periodically login to your DNS service account and make necessary updates.'
          )
        "
        :rules="[s.service_name === 'cloudflare.com-v4' ? 'email' : 'credentials_validate']"
        maxlength="64"
        :placeholder="s.service_name === 'cloudflare.com-v4' ? 'mail@domain.com' : ''"
        :depend="s.cloudflare_authentication_type !== 'bearer'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="passwordLabel"
        :help="
          $t(
            'Password required to login to the third party DNS service;\
        used to periodically login to your DNS service account and make necessary updates.\
        all characters are allowed except \` and space'
          )
        "
        password
        sensitive
        maxlength="88"
        rules="credentials_validate"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="ip_source"
        :label="$t('IP address source')"
        :help="
          $t(
            'Defines the source to read the system\'s IPv4 Address from,\
        which will be sent to the DNS provider.\
        For example, if your router has a \
        Private IP (i.e., 10.140.56.57) on its WAN interface,\
        then you can send this exact IP to DDNS server by selecting Private.'
          )
        "
        initial="network"
        :options="ipv4Sources"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="interface"
        :label="$t('Event network')"
        :help="$t('Network on which the DDNS updater scripts will be started.')"
        initial="wan"
        :options="interfaces"
        :depend="s.ip_source === 'script'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="interface"
        :label="$t('Network')"
        :help="$t('Specifies which interface\'s IP address should be bound to the hostname.')"
        initial="wan"
        :options="interfacesAndOpenVPN"
        :depend="s.ip_source === 'network'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="ip_url"
        :label="$t('URL to detect')"
        :help="$t('Defines the Web page to read the system\'s IPv4 address from.')"
        initial="http://checkip.dyndns.com"
        rules="protourl"
        required
        :depend="s.ip_source === 'web'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="ip_script"
        :label="$t('Script')"
        :help="$t('User defined script that will read the system\'s IPv4 address.')"
        placeholder="/path/to/script.sh"
        rules="string"
        maxlength="64"
        :depend="s.ip_source === 'script'"
      />
      <vuci-form-item-custom
        name="check_interval"
        inputs="input,select"
        :input-props="[inputCheckProps, selectCheckProps]"
        :uci-section="s"
        :label="$t('Check interval')"
        :help="$t('Frequency at which the device will check whether it\'s IP address has changed.')"
        @change="validateField"
      />
      <vuci-form-item-custom
        name="force_interval"
        inputs="input,select"
        :input-props="[inputForceProps, selectForceProps]"
        :uci-section="s"
        :label="$t('Force interval')"
        :help="$t('Frequency at which IP update requests are sent to the DNS provider.')"
        @change="validateField"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
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
      authenticationType: [
        ['emailAPI', this.$t('Email / API token')],
        ['bearer', this.$t('Bearer token')]
      ],
      ipv4Sources: [
        ['network', this.$t('Custom')],
        ['web', this.$t('Public')],
        ['interface', this.$t('Private')],
        ['script', this.$t('Script')]
      ],
      formData: { service: [] },
      inputForceProps: {
        prop: 'dyndns_force_interval_input',
        placeholder: '10',
        initial: '10',
        rules: this.checkTime,
        required: true
      },
      selectCheckProps: {
        prop: 'dyndns_check_interval_select',
        options: [
          ['seconds', this.$t('Seconds')],
          ['minutes', this.$t('Minutes')],
          ['hours', this.$t('Hours')]
        ],
        initial: 'minutes'
      },
      selectForceProps: {
        prop: 'dyndns_force_interval_select',
        options: [
          ['minutes', this.$t('Minutes')],
          ['hours', this.$t('Hours')],
          ['days', this.$t('Days')]
        ],
        initial: 'hours'
      },
      checkRules: {
        seconds: 'range(300,600000)',
        minutes: 'range(5,600000)',
        hours: 'range(1,600000)',
        default: 'range(0,600000)'
      },
      forceRules: {
        minutes: 'range(5,600000)',
        hours: 'range(1,600000)',
        days: 'range(1,600000)',
        default: 'range(0,600000)'
      }
    }
  },
  computed: {
    hasSSL() {
      return this.formOptions().hasSsl
    },
    serviceProviders() {
      if (this.section.use_ipv6 === '0') return [['', `-- ${this.$t('Custom')} --`], ...Object.keys(this.formOptions().providerData)]
      return [['', `-- ${this.$t('Custom')} --`], ...Object.keys(this.formOptions().providerDataIPv6)]
    },
    interfaces() {
      return this.formOptions()
        .interfaceData.filter(o => o.id !== 'loopback')
        .map(this.$network.getName)
    },
    interfacesAndOpenVPN() {
      const openVpnData = this.formOptions()
        .openVpnData?.filter(vpn => vpn.type === 'client')
        .map(vpn => [`openvpn_${vpn.id}`, `${vpn.name} (OpenVPN)`])
      return this.interfaces.concat(openVpnData)
    },
    passwordLabel() {
      if (this.section.cloudflare_authentication_type === 'emailAPI' && this.section.service_name === 'cloudflare.com-v4') return this.$t('API token')
      if (this.section.cloudflare_authentication_type === 'bearer' && this.section.service_name === 'cloudflare.com-v4') return this.$t('Bearer token')
      return this.$t('Password')
    },
    inputCheckProps() {
      const props = {
        prop: 'dyndns_check_interval_input',
        placeholder: '10',
        initial: '10',
        rules: ['uinteger', 'range(5,600000)'],
        required: true
      }
      if (!this.section.check_interval) return props
      const format = this.section.check_interval.split(',')[1]
      props.rules[1] = this.getRule(format, this.checkRules)
      return props
    },
    forceRule() {
      const intervalFormat = this.section.force_interval.split(',')[1]
      return this.getRule(intervalFormat, this.forceRules)
    }
  },
  methods: {
    urlToDetect(s) {
      s.ip_url = s.use_ipv6 === '1' ? 'http://checkipv6.dyndns.com' : 'http://checkip.dyndns.com'
    },
    validateField(self) {
      const id = self.uciSection.id
      self.vuciSection.forms[id].forEach(x => x.validate())
    },
    checkTime(val) {
      this.$VuciValidator.value = val
      const res1 = this.$VuciValidator.uinteger()
      if (!res1.isValid) return res1
      const validator = this.$VuciValidator.compile(this.forceRule)
      const res2 = validator(val)
      if (!res2.isValid) return res2

      const [cInterval, cUnit] = this.section.check_interval.split(',')
      const [fInterval, fUnit] = this.section.force_interval.split(',')
      const check = this.calculateSeconds(cInterval, cUnit)
      const force = this.calculateSeconds(fInterval, fUnit)
      if (force < check) return { isValid: false, message: this.$t('Force interval value must be greater than or equal to check interval') }
      return { isValid: true }
    },
    calculateSeconds(interval, unit) {
      const calculations = {
        days: val => parseInt(val) * 86400,
        hours: val => parseInt(val) * 3600,
        minutes: val => parseInt(val) * 60,
        seconds: val => parseInt(val)
      }
      if (calculations[unit]) return calculations[unit](interval)
      return null
    },
    getRule(value, rules) {
      return rules[value] || rules.default
    },
    validateCustomUpdateUrl(val) {
      if (/^[a-zA-Z0-9!@#$%&*+\-/=?^_`{|}~:.[\]]+$/.test(val)) {
        return { isValid: true }
      }
      return {
        isValid: false,
        message: this.$t('Following characters are accepted: %s').format('a-zA-Z0-9!@#$%&*+-/=?^_`{|}~:.[]')
      }
    }
  }
}
</script>
