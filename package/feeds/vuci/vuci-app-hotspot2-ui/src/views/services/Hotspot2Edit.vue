<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    bulk-request
    config="wireless"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('Hotspot 2.0'), section.ssid)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'hotspot2/config' }]"
      data-key="hotspot2"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            name="interworking"
            :label="$t('Enable')"
            :help="$t('Enable Hotspot 2.0.')"
          />
          <tlt-inline-message
            v-if="displayWpa2Message"
            id="wpa2-config"
            type="info"
          >
            <router-link :to="`/network/wireless/ssids?edit=${section.id}`">{{ $t('WPA2-EAP configuration') }}</router-link>
            {{ $t('is required for Hotspot 2.0 functionality') }}
          </tlt-inline-message>
          <vuci-form-item-switch
            :uci-section="s"
            name="internet"
            :label="$t('Internet access')"
            :help="$t('Is used to inform the client device whether internet access is available.')"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="access_network_type"
            :label="$t('Access network type')"
            :help="
              $t(
                'The access network type present in beacon and probe response frames. \
              Mobile devices can use this information when selecting a hotspot.'
              )
            "
            :options="accessTypeOptions"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="hessid"
            :label="$t('HESSID')"
            :help="$t('Homogeneous ESS identifier (optional). This shall be identifical to one of the BSSIDs in the homogeneous ESS.')"
            rules="macaddr"
            :placeholder="section.bssid"
          />
          <vuci-form-item-list
            :uci-section="s"
            name="roaming_consortium"
            :label="$t('Roaming consortium OI')"
            :help="$t('3 or 5 octets hexstring. Only first three entries are available through Beacon and Probe Response frames.')"
            :rules="['hexstring', roamingConsortiumValidation]"
            placeholder="021122"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="network_auth_type"
            :label="$t('Network authentication type')"
            :help="$t('Indicates what type of network authentication is used in the network.')"
            :options="authTypeOptions"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="redirect_url"
            :label="$t('Redirect URL')"
            :help="$t('Http/https redirection link.')"
            rules="protourl"
            :depend="s.network_auth_type === '02'"
            required
          />
          <vuci-form-item-select
            :uci-section="s"
            name="ipaddr_type_availability"
            :label="$t('IP address type availability')"
            :help="
              $t(
                'Provides information about the IP address version and type and that would be available to a mobile \
              device after it authenticates to the network.'
              )
            "
            :options="ipAddrOptions"
            initial="7"
          />
          <vuci-form-item-list
            :uci-section="s"
            name="domain_name"
            :label="$t('Domain name')"
            :help="
              $t(
                'The Domain Name ANQP-element provides a list of one or more domain names of the entity \
              operating the hotspot network'
              )
            "
            rules="hostname"
            placeholder="example.com"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="venue_group"
            :label="$t('Venue group')"
            :help="$t('Describes the venue in which the hotspot is located.')"
            :options="venueGroupOptions"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="venue_type"
            :label="$t('Venue type')"
            :help="$t('Describes the venue in which the hotspot is located.')"
            :options="venueTypeOptions"
          />
        </template>
        <template #wan>
          <vuci-form-item-select
            :uci-section="s"
            name="hs20_wan_status"
            :label="$t('Link status')"
            :help="$t('Provides information about the WAN link that connects the hotspot to the internet.')"
            :options="linkStatusOptions"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="hs20_wan_dw_speed"
            :label="$t('Downlink speed')"
            :help="$t('Downlink Speed in kbps (0-4294967295).')"
            rules="range(0,4294967295)"
            placeholder="8000"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="hs20_wan_up_speed"
            :label="$t('Uplink speed')"
            :help="$t('Uplink Speed in kbps (0-4294967295).')"
            rules="range(0,4294967295)"
            placeholder="1000"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
    <vuci-typed-section
      :title="$t('Venue name information')"
      :help="$t('Can be used to configure one or more Venue Name values for Venue Name ANQP information.')"
      type="venue"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `hotspot2/${section.id}/venues/config` }]"
      :data-key="`${section.id}_venues`"
      :columns="venueColumns"
    >
      <template #countryCode="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="country_code"
          minlength="2"
          maxlength="3"
          rules="fieldvalidation('^[a-zA-Z]+$')"
          placeholder="eng"
          initial="eng"
          required
        />
      </template>
      <template #name="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          minlength="1"
          maxlength="64"
          :placeholder="$t('Example venue')"
          force-write
          :rules="[nameValidation]"
        />
      </template>
      <template #url="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="url"
          rules="protourl"
          placeholder="http://www.example.com"
          force-write
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :title="$t('3GPP cellular network information')"
      :help="$t('These parameters are used to uniquely identify a mobile network operator.')"
      type="anqp_3gpp_cell_net"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `hotspot2/${section.id}/3gpp/config` }]"
      :data-key="`${section.id}_3gpp`"
      :columns="gppColumns"
    >
      <template #mcc="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="mobile_country_code"
          rules="number_leading_zeros"
          minlength="3"
          maxlength="3"
          placeholder="246"
          required
        />
      </template>
      <template #mnc="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="mobile_network_code"
          rules="number_leading_zeros"
          minlength="2"
          maxlength="3"
          placeholder="99"
          force-write
          required
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :title="$t('Network access identifier (NAI) realm information')"
      :help="
        $t(
          'These parameters provide information for stations using Interworking network selection to allow \
        automatic connection to a network based on credentials'
        )
      "
      type="nai-realm"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `hotspot2/${section.id}/nai/config` }]"
      :data-key="`${section.id}_nai`"
      :columns="naiColumns"
    >
      <template #hostname="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="hostname"
          rules="hostname"
          placeholder="example.com"
          required
        />
      </template>
      <template #authNum="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="auth_num"
          :options="eapOptions"
        />
      </template>
      <template #param="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="param"
          :options="authOptions"
          force-write
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :title="$t('Operator friendly name')"
      :help="$t('The client device may obtain the operator friendly name via GAS/ANQP queries to assist the user during manual hotspot selection.')"
      type="hs20_oper_friendly_name"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `hotspot2/${section.id}/names/config` }]"
      :data-key="`${section.id}_names`"
      :columns="operatorColumns"
    >
      <template #opcountryCode="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="country_code"
          minlength="2"
          maxlength="3"
          rules="fieldvalidation('^[a-zA-Z]+$')"
          placeholder="eng"
          initial="eng"
          required
        />
      </template>
      <template #opname="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          :placeholder="$t('Example operator')"
          maxlength="512"
          force-write
          :rules="[nameValidation]"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :title="$t('Connection capability')"
      :help="$t('The Connection Capability provides information on the status of commonly used communication protocols and ports.')"
      type="hs20_conn_capab"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `hotspot2/${section.id}/capabilities/config` }]"
      :data-key="`${section.id}_capabilities`"
      :columns="conCapColumns"
    >
      <template #proto="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="proto"
          :options="protoOptions"
        />
      </template>
      <template #port="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="port"
          placeholder="22"
          rules="port"
          required
        />
      </template>
      <template #state="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="state"
          :options="statusOptions"
          force-write
        />
      </template>
    </vuci-typed-section>
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
      venueColumns: [
        {
          name: 'countryCode',
          label: this.$t('Language code'),
          help: this.$t('Two or three character language code (ISO-639).')
        },
        { name: 'name', label: this.$t('Venue name'), help: this.$t('Name of the venue.') },
        {
          name: 'url',
          label: this.$t('Venue URL information'),
          help: this.$t('Venue URL to provide additional information corresponding to Venue Name information (URL should contain protocol).')
        }
      ],
      gppColumns: [
        { name: 'mcc', label: this.$t('Mobile country code'), help: this.$t('Mobile country code (3 decimal digits).') },
        {
          name: 'mnc',
          label: this.$t('Mobile network code'),
          help: this.$t('Mobile network code (2 or 3 decimal digits).')
        }
      ],
      naiColumns: [
        {
          name: 'hostname',
          label: this.$t('NAI realm'),
          help: this.$t('The NAI Realm provides a list of NAI realms corresponding to the Home SPs that can authenticate a client device.')
        },
        {
          name: 'authNum',
          label: this.$t('EAP method'),
          help: this.$t('Identifies the EAP method supported by that NAI realm for authentication.')
        },
        {
          name: 'param',
          label: this.$t('Authentication parameter'),
          help: this.$t('EAP method authentication parameter.')
        }
      ],
      operatorColumns: [
        {
          name: 'opcountryCode',
          label: this.$t('Language code'),
          help: this.$t('Two or three character language code (ISO-639).')
        },
        {
          name: 'opname',
          label: this.$t("Operator's name"),
          help: this.$t('Provides the friendly name of the Hotspot Operator.')
        }
      ],
      conCapColumns: [
        { name: 'proto', label: this.$t('Protocol') },
        { name: 'port', label: this.$t('Port number') },
        { name: 'state', label: this.$t('Status') }
      ],
      tabs: [
        { name: 'general', title: this.$t('General Setup') },
        { name: 'wan', title: this.$t('WAN metrics') }
      ],
      linkStatusOptions: [
        ['01', this.$t('Link up')],
        ['02', this.$t('Link down')],
        ['03', this.$t('Link in test state')]
      ],
      accessTypeOptions: [
        ['0', this.$t('Private network')],
        ['1', this.$t('Private network with guest access')],
        ['2', this.$t('Chargeable public network')],
        ['3', this.$t('Free public network')],
        ['4', this.$t('Personal device network')],
        ['5', this.$t('Emergency services only network')],
        ['14', this.$t('Test or experimental')]
      ],
      authTypeOptions: [
        ['', this.$t('Not configured')],
        ['00', this.$t('Acceptance of terms and conditions')],
        ['01', this.$t('On-line enrollment supported')],
        ['02', this.$t('http/https redirection')],
        ['03', this.$t('DNS redirection')]
      ],
      authOptions: [
        ['', this.$t('Undefined')],
        ['[2:1]', this.$t('Non EAP PAP')],
        ['[2:2]', this.$t('Non EAP CHAP')],
        ['[2:3]', this.$t('Non EAP MSCHAP')],
        ['[2:4]', this.$t('Non EAP MSCHAPV2')],
        ['[5:6]', this.$t('Credential certificate')],
        ['[5:7]', this.$t('Credential username/password')]
      ],
      eapOptions: [
        ['', this.$t('Undefined')],
        ['13', 'EAP-TLS'],
        ['21', 'EAP-TTLS'],
        ['25', 'PEAP'],
        ['43', 'EAP-FAST']
      ],
      statusOptions: [
        ['0', this.$t('Closed')],
        ['1', this.$t('Open')],
        ['2', this.$t('Unknown')]
      ],
      protoOptions: [
        ['1', 'ICMP'],
        ['6', 'TCP'],
        ['17', 'UDP']
      ],
      ipAddrOptions: [
        ['0', this.$t('Address type not available')],
        ['1', this.$t('Public IPv4 address available')],
        ['2', this.$t('Port-restricted IPv4 address available')],
        ['3', this.$t('Single NATed private IPv4 address available')],
        ['4', this.$t('Double NATed private IPv4 address available')],
        ['5', this.$t('Port-restricted IPv4 address and single NATed IPv4 address available')],
        ['6', this.$t('Port-restricted IPv4 address and double NATed IPv4 address available')],
        ['7', this.$t('Availability of the address type is not known')]
      ],
      venueGroupOptions: [
        ['0', this.$t('Unspecified')],
        ['1', this.$t('Assembly')],
        ['2', this.$t('Business')],
        ['3', this.$t('Educational')],
        ['4', this.$t('Factory and Industrial')],
        ['5', this.$t('Institutional')],
        ['6', this.$t('Mercantile')],
        ['7', this.$t('Residential')],
        ['8', this.$t('Storage')],
        ['9', this.$t('Utility and Miscellaneous')],
        ['10', this.$t('Vehicular')],
        ['11', this.$t('Outdoor')]
      ],
      allVenueTypeOptions: [
        [['0', this.$t('Unspecified')]],
        [
          ['0', this.$t('Unspecified Assembly')],
          ['1', this.$t('Arena')],
          ['2', this.$t('Stadium')],
          ['3', this.$t('Passenger Terminal (e.g., airport, bus, ferry, train station)')],
          ['4', this.$t('Amphitheater')],
          ['5', this.$t('Amusement Park')],
          ['6', this.$t('Place of Worship')],
          ['7', this.$t('Convention Center')],
          ['8', this.$t('Library')],
          ['9', this.$t('Museum')],
          ['10', this.$t('Restaurant')],
          ['11', this.$t('Theater')],
          ['12', this.$t('Bar')],
          ['13', this.$t('Coffee Shop')],
          ['14', this.$t('Zoo or Aquarium')],
          ['15', this.$t('Emergency Coordination Center')]
        ],
        [
          ['0', this.$t('Unspecified Business')],
          ['1', this.$t('Doctor or Dentist office')],
          ['2', this.$t('Bank')],
          ['3', this.$t('Fire Station')],
          ['4', this.$t('Police Station')],
          ['6', this.$t('Post Office')],
          ['7', this.$t('Professional Office')],
          ['8', this.$t('Research and Development Facility')],
          ['9', this.$t('Attorney Office')]
        ],
        [
          ['0', this.$t('Unspecified')],
          ['1', this.$t('School, Primary')],
          ['2', this.$t('School, Secondary')],
          ['3', this.$t('University or College')]
        ],
        [
          ['0', this.$t('Unspecified Factory and Industrial')],
          ['1', this.$t('Factory')]
        ],
        [
          ['0', this.$t('Unspecified Institutial')],
          ['1', this.$t('Hospital')],
          ['2', this.$t('Long-Term Care Facility (e.g., Nursing home, Hospice, etc.)')],
          ['3', this.$t('Alcohol and Drug Rehabilitation Center')],
          ['4', this.$t('Group Home')],
          ['5', this.$t('Prison or Jail')]
        ],
        [
          ['0', this.$t('Unspecified Mercantile')],
          ['1', this.$t('Retail Store')],
          ['2', this.$t('Grocery Market')],
          ['3', this.$t('Automotive Service Station')],
          ['4', this.$t('Shopping Mall')],
          ['5', this.$t('Gas Station')]
        ],
        [
          ['0', this.$t('Unspecified Residential')],
          ['1', this.$t('Private Residence')],
          ['2', this.$t('Hotel or Motel')],
          ['3', this.$t('Dormitory')],
          ['4', this.$t('Boarding House')]
        ],
        [['0', this.$t('Unspecified Storage')]],
        [['0', this.$t('Unspecified Utility and Miscellaneous')]],
        [
          ['0', this.$t('Unspecified Vehicular')],
          ['1', this.$t('Automobile or Truck')],
          ['2', this.$t('Airplane')],
          ['3', this.$t('Bus')],
          ['4', this.$t('Ferry')],
          ['5', this.$t('Ship or Boat')],
          ['6', this.$t('Train')],
          ['7', this.$t('Motor Bike')]
        ],
        [
          ['0', this.$t('Unspecified Outdoor')],
          ['1', this.$t('Muni-mesh Network')],
          ['2', this.$t('City Park')],
          ['3', this.$t('Rest Area')],
          ['4', this.$t('Traffic Control')],
          ['5', this.$t('Bus Stop')],
          ['6', this.$t('Kiosk')]
        ]
      ]
    }
  },
  computed: {
    displayWpa2Message() {
      return !this.wirelessInterface?.encryption?.includes('wpa2')
    },
    wirelessDevice() {
      return this.formData.wirelessDevice || {}
    },
    venueTypeOptions() {
      return this.allVenueTypeOptions[this.section.venue_group] || []
    },
    wirelessInterface() {
      return this.formOptions().wirelessInterfaces.find(({ id }) => id === this.section.id)
    }
  },
  methods: {
    nameValidation(value) {
      const regex = /^[^`'"]+$/
      const match = regex.test(value)
      if (match) return { isValid: true }
      return { isValid: false, message: this.$t(`A string of any characters is accepted except ', ", \``) }
    },
    roamingConsortiumValidation(val) {
      if (![6, 8, 10].includes(val.length)) {
        return {
          isValid: false,
          message: this.$t('Only specific length values are accepted (6,8,10)')
        }
      }
      return { isValid: true }
    }
  }
}
</script>
