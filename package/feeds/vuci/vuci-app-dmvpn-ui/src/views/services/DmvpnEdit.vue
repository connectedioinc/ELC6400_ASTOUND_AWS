<template>
  <vuci-form
    v-slot="{ uciData }"
    config="dmvpn"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="dmvpn"
      :endpoints="[{ endpoint: 'dmvpn/config' }]"
      :name="section.id"
    >
      <tlt-card
        :title="$utils.getModalTitle($t('DMVPN parameters'), section.id)"
        :help="
          $t(
            'This section is used to configure the settings of the %s dmvpn instance. \
                   Scroll your mouse pointer over field names in order to see helpful hints.'.format(section.id)
          )
        "
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Turns the DMVPN instance on or off.')"
          name="enabled"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Working mode')"
          :help="
            $t(
              'Selects the role of this instance \
                                Hub - the central instance of DMVPN that connects other peers (spokes) into single network. \
                                There is no need to reconfigure the hub when connecting new spokes to it. \
                                Spoke - an instance that connects to the hub.'
            )
          "
          name="config_mode"
          :options="modeOptions"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Hub address')"
          :help="$t('IP address or hostname of a DMVPN Hub.')"
          name="hub_address"
          placeholder="0.0.0.0"
          rules="host"
          :depend="s.config_mode === 'spoke'"
        />
      </tlt-card>
      <tlt-card :title="$utils.getModalTitle($t('GRE parameters'))">
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Tunnel source')"
          :help="$t('IP address of the local WAN interface.')"
          name="ipaddr_tunlink"
          allow-create
          :rules="tunnelValidation"
          maxlength="16"
          :options="tunnelOptions"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Local GRE interface IP address')"
          :help="$t('IP address of the local GRE tunnel device.')"
          name="gre_ipaddr"
          placeholder="192.168.1.115"
          rules="ip4addr"
        />
        <vuci-form-item-input
          :depend="s.config_mode === 'hub'"
          :uci-section="s"
          :label="$t('Local GRE interface netmask')"
          :help="$t('Netmask of the local GRE tunnel device.')"
          name="netmask"
          initial="255.255.255.255"
          placeholder="255.255.255.0"
          rules="netmask"
        />
        <vuci-form-item-input
          :depend="s.config_mode === 'spoke'"
          :uci-section="s"
          :label="$t('Remote GRE interface IP address')"
          :help="$t('IP address of the remote GRE tunnel device.')"
          name="gre_remote_ipaddr"
          placeholder="0.0.0.0"
          rules="ip4addr"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('GRE MTU')"
          :help="$t('MTU size of GRE Tunnel device.')"
          name="mtu"
          placeholder="1476"
          rules="irange(68,9200)"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="okey"
          :label="$t('Outbound key')"
          :help="
            $t(`Key for outgoing packets.
              This value should match the 'Inbound key' value set on the opposite GRE instance or both key values should be omitted on both sides.
              Allowed range [0-4294967295]`)
          "
          placeholder="65000"
          rules="irange(0, 4294967295)"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="ikey"
          :label="$t('Inbound key')"
          :help="
            $t(`Key for incoming packets.
              This value should match the 'Outbound key' value set on the opposite GRE instance or both key values should be omitted on both sides.
              Allowed range [0-4294967295]`)
          "
          placeholder="65000"
          rules="irange(0, 4294967295)"
        />
      </tlt-card>
      <tlt-card :title="$utils.getModalTitle($t('IPsec parameters'))">
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Local identifier')"
          :help="$t('How the left participant should be identified for authentication.')"
          name="local_identifier"
          rules="string"
          placeholder="IP, FQDN"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Remote identifier')"
          :help="$t('How the right participant should be identified for authentication.')"
          name="remote_identifier"
          rules="string"
          placeholder="IP, FQDN"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Pre-shared key')"
          :help="$t('A shared password to authenticate between the peers. All characters are allowed except ` and space.')"
          name="pre_shared_key"
          rules="credentials_validate('allow-space')"
          minlength="5"
          placeholder="key"
          password
          sensitive
          required
        />
      </tlt-card>
      <tlt-card :title="$utils.getModalTitle($t('IPsec proposal'))">
        <tlt-tabs :tabs="tabs">
          <template #phase1>
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Encryption algorithm')"
              :help="$t('The encryption algorithm must match with another incoming connection to establish IPsec.')"
              :options="encryption"
              :warnings="getCipherWarning"
              name="encryption_algorithm"
              initial="aes128"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Authentication')"
              :help="$t('The authentication algorithm must match with another incoming connection to establish IPsec.')"
              name="hash_algorithm"
              initial="sha1"
              :options="hashOptions"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('DH group')"
              :help="$t('The DH (Diffie-Hellman) group must match with another incoming connection to establish IPsec.')"
              name="dh_group"
              initial="modp1024"
              :options="dhOptions"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Force crypto proposal')"
              :help="$t('Only chosen proposals will be used.')"
              name="force_crypto_proposal"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('IKE lifetime')"
              :help="
                $t(`How long the keying channel of a connection (ISAKMP or IKE SA) should last before being
                            renegotiated. The time is specified in seconds. The s, m, h and d suffixes explicitly define the units for
                            seconds, minutes, hours and days, respectively.`)
              "
              name="ikelifetime"
              placeholder="3h"
              maxlength="7"
              rules="fieldvalidation('^[0-9]+[smhd]?$')"
            />
          </template>
          <template #phase2>
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Encryption algorithm')"
              :help="$t('The encryption algorithm must match with another incoming connection to establish IPsec.')"
              :options="encryption"
              :warnings="getCipherWarning"
              name="encryption_algorithm_2"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('Hash algorithm')"
              :help="$t('The hash algorithm must match with another incoming connection to establish IPsec.')"
              name="hash_algorithm_2"
              :options="hashOptions"
            />
            <vuci-form-item-select
              :uci-section="s"
              :label="$t('PFS group')"
              :help="$t('The DH (Diffie-Hellman) group must match with another incoming connection to establish IPsec.')"
              name="dh_group_2"
              :options="dhOptions.concat(pfs)"
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Force crypto proposal')"
              :help="$t('Only chosen proposals will be used.')"
              name="force_crypto_proposal_2"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('Lifetime')"
              :help="
                $t(`How long a particular instance of a connection (a set of encryption/authentication keys
                            for user packets) should last, from successful negotiation to expiry. The time is specified in seconds.
                            The s, m, h and d suffixes explicitly define the units for seconds, minutes, hours and days, respectively.`)
              "
              name="lifetime"
              placeholder="3h"
              rules="fieldvalidation('^[0-9]+[smhd]?$')"
              maxlength="7"
            />
          </template>
        </tlt-tabs>
      </tlt-card>
      <tlt-card
        v-if="nhrp"
        :title="$utils.getModalTitle($t('NHRP parameters'))"
      >
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('NHRP network ID')"
          :help="$t('NHRP network identifier.')"
          name="network_id"
          rules="range(1,4294967295)"
          placeholder="1"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('NHRP authentication key')"
          :help="$t('NHRP authentication key.')"
          name="auth"
          rules="credentials_validate"
          maxlength="8"
          placeholder="12346578"
          password
          sensitive
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('NHRP hold time')"
          :help="
            $t(`Specifies the holding time for NHRP Registration Requests and Resolution Replies sent from
                      this interface or shortcut-target. The holdtime is specified in seconds and defaults to two hours.`)
          "
          name="holdtime"
          rules="range(1,65000)"
          placeholder="7200"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Redirect')"
          :help="$t('Allow DMVPN traffic redirection (Phase 3).')"
          name="redirect"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('NFLOG group')"
          :help="$t('Specify NFLOG group to be used by NHRP instance.')"
          name="nflog_group"
          :rules="[nflogAndNhrpValidation, 'range(1,65535)']"
          placeholder="1-65535"
          :depend="s.config_mode === 'hub'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Multicast')"
          :help="$t('Allow use of dynamic routing protocols that use multicast.')"
          name="multicast"
          :depend="nhrp && s.config_mode === 'spoke'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('NHRP multicast NFLOG group')"
          :help="$t('Specify NFLOG group to be used by NHRP instance for multicast traffic.')"
          name="multicast_nflog_group"
          :rules="[nflogAndNhrpValidation, 'range(1,65535)']"
          placeholder="1-65535"
          :depend="nhrp && ((s.config_mode === 'spoke' && s.multicast === '1') || s.config_mode === 'hub')"
        />
      </tlt-card>
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
      formData: {},
      modeOptions: [
        ['spoke', this.$t('Spoke')],
        ['hub', this.$t('Hub')]
      ],
      encryption: [
        ['3des', '3DES'],
        ['des', 'DES'],
        ['aes128', 'AES 128'],
        ['aes192', 'AES 192'],
        ['aes256', 'AES 256'],
        ['aes128gcm8', 'AES128 GCM8'],
        ['aes192gcm8', 'AES192 GCM8'],
        ['aes256gcm8', 'AES256 GCM8'],
        ['aes128gcm12', 'AES128 GCM12'],
        ['aes192gcm12', 'AES192 GCM12'],
        ['aes256gcm12', 'AES256 GCM12'],
        ['aes128gcm16', 'AES128 GCM16'],
        ['aes192gcm16', 'AES192 GCM16'],
        ['aes256gcm16', 'AES256 GCM16']
      ],
      hashOptions: [
        ['md5', 'MD5'],
        ['sha1', 'SHA1'],
        ['sha256', 'SHA256'],
        ['sha384', 'SHA384'],
        ['sha512', 'SHA512']
      ],
      dhOptions: [
        ['modp768', 'MODP768'],
        ['modp1024', 'MODP1024'],
        ['modp1536', 'MODP1536'],
        ['modp2048', 'MODP2048'],
        ['modp3072', 'MODP3072'],
        ['modp4096', 'MODP4096'],
        ['ecp192', 'ECP192'],
        ['ecp224', 'ECP224'],
        ['ecp256', 'ECP256'],
        ['ecp384', 'ECP384'],
        ['ecp521', 'ECP521']
      ],
      pfs: [['no_pfs', this.$t('No PFS')]],
      tabs: [
        { name: 'phase1', title: this.$t('Phase 1') },
        { name: 'phase2', title: this.$t('Phase 2') }
      ],
      nhrp: this.$store.hasPackages('frr-nhrp') || this.$store.hasPackages('frr5-nhrp')
    }
  },
  computed: {
    greOptions() {
      return this.formOptions().gre.map(iface => ['%s_static'.format(iface.id), '%s_static'.format(iface.id.toUpperCase()) + '(@%s)'.format(iface.id)])
    },
    tunnelOptions() {
      const tunnelOptions = this.$network.createTunnelOptions(this.formOptions().interfaces, { addSuffix: 'ipv4' })
      return [['any', this.$t('Any')], ...tunnelOptions, ...this.greOptions]
    }
  },
  methods: {
    getCipherWarning(value) {
      if (value === 'des' || value === '3des') return this.$t('This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.')
    },
    nflogAndNhrpValidation(_, self) {
      const sectionValues = self.uciSection
      if (sectionValues.multicast_nflog_group === sectionValues.nflog_group) {
        return { isValid: false, message: this.$t("'NFLOG group' and 'NHRP multicast NFLOG group' values must differ") }
      }
      return { isValid: true }
    },
    tunnelValidation(value) {
      this.$VuciValidator.value = value
      const resIp4addr = this.$VuciValidator.ip4addr()
      const resUciname = this.$VuciValidator.uciname()
      if (resIp4addr.isValid || resUciname.isValid) {
        return { isValid: true }
      }
      return {
        isValid: false,
        message: this.$t('A string of a-Z, 0-9 and _ characters or IPv4 addresses are accepted (e.g., 192.168.1.1).')
      }
    }
  }
}
</script>
