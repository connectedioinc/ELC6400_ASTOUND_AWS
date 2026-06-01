<template>
  <vuci-form
    v-slot="{ uciData }"
    config="simcard;operctl;overview"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('APN database entry'), section.carrier)"
      :endpoints="[{ endpoint: 'apn_database/config' }]"
      data-key="apn"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="carrier"
        :label="$t('Carrier name')"
        :help="
          $t(
            'Carrier name - name of a company that sells wireless connectivity to customers for cellphone data and telephone calls. It may also be called a mobile network operator, a mobile carrier, cellular company or wireless service provider.'
          )
        "
        rules="string"
        maxlength="32"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="mcc"
        :label="$t('Mobile Country Code')"
        :help="
          $t(
            'Mobile Country Code (MCC) - a mobile code consisting of three digits used to identify GSM networks. MCC is also used along with the International Mobile Subscriber Identity (IMSI) to identify the region from which mobile subscriber belongs.'
          )
        "
        :options="countriesList"
        minlength="3"
        maxlength="3"
        rules="number_leading_zeros"
        allow-create
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="mnc"
        :label="$t('Mobile Network Code')"
        :help="$t('Mobile Network Code (MNC) - a unique two or three-digit number used to identify a home Public Land Mobile Network (PLMN) to. MNC is allocated by the national regulator.')"
        minlength="1"
        maxlength="3"
        rules="number_leading_zeros"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="apn"
        :label="$t('APN')"
        :help="$t('APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.')"
        rules="apn"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('PDP type')"
        :help="$t('Specifies what type of address is requested from the operator.')"
        name="pdptype"
        :options="pdpOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="authtype"
        :label="$t('Authentication type')"
        :help="$t('Authentication method that your carrier uses to authenticate new connections on it\'s network.')"
        :options="authTypeOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="user"
        :label="$t('Username')"
        :help="$t('Username provided by your carrier.')"
        rules="string"
        maxlength="64"
        :required="!!s.password"
        :depend="s.authtype === '1' || s.authtype === '2'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="$t('Password')"
        :help="$t('Password provided by your carrier.')"
        rules="string"
        maxlength="64"
        :required="!!s.user"
        :depend="s.authtype === '1' || s.authtype === '2'"
        password
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  inject: ['countriesList'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      authTypeOptions: [
        ['0', this.$t('None')],
        ['1', 'PAP'],
        ['2', 'CHAP']
      ],
      pdpOptions: [
        ['0', 'IPv4/IPv6'],
        ['1', 'IPv4'],
        ['2', 'IPv6']
      ]
    }
  }
}
</script>
