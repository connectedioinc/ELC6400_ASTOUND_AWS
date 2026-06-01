<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="afterLoad"
    config="iojuggler"
  >
    <vuci-typed-section
      :uci-data="uciData"
      data-key="iojuggler_actions"
      type="action"
      :title="$t('Actions')"
      :add-validate="addValidate"
      :columns="inputColumns"
      :edit-form="editModal"
      :table-actions="['column-list', 'search']"
      :form-methods="['get', 'create', 'delete']"
      :endpoints="[{ endpoint: 'io/juggler/operations/config' }]"
    >
      <template #ui_name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="ui_name"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="ui_name"
          :display-value="displayType"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './IoJugglerActionsEdit'
import { withCertificatesLoaded } from '@/plugins/certificates'

export default {
  provide() {
    return {
      typeOptions: () => this.typeOptions(this.hasWifi, this.$mobile.simCount(this.modemList), this.modemList),
      modemList: () => this.modemList.map(modem => [modem.id, modem.name]),
      emailList: () => this.emailSections.map(email => [email.name, email.name]),
      ioData: () => this.$io.getFilteredPinsInfo(this.ioData),
      profileList: () => this.profileSections.map(profile => [profile.id, profile.id]),
      simList: () => this.simcardSections.map(simcard => [simcard.position, 'SIM' + simcard.position]),
      phoneGroups: () => this.phoneSections.map(phone => [phone.name, phone.name]),
      optionData: () => this.optionData,
      certificates: () => this.certificates,
      conditionsList: () => this.conditionsData
    }
  },
  data() {
    return {
      formData: {},
      editModal: markRaw(EditForm),
      inputColumns: [
        { name: 'ui_name', label: this.$t('Name') },
        { name: 'type', label: this.$t('Type') }
      ],
      availableTypes: {
        email: this.$t('Email'),
        dout: this.$t('Output'),
        http: this.$t('HTTP'),
        script: this.$t('Script'),
        reboot: this.$t('Reboot'),
        profile: this.$t('Profile'),
        rms: this.$t('RMS'),
        sim_switch: this.$t('Change SIM to SIM1'),
        sms: this.$t('SMS'),
        wifi: this.$t('WiFi'),
        mqtt: this.$t('MQTT')
      },
      modemList: [],
      emailSections: [],
      ioData: [],
      profileSections: [],
      simcardSections: [],
      phoneSections: [],
      conditionsData: [],
      optionData: [],
      hasWifi: this.$store.board?.hwinfo?.wifi
    }
  },
  computed: {
    isATRM50() {
      return this.$store.device.startsWith('ATRM50')
    }
  },
  methods: {
    simCount(modemList) {
      if (modemList.length > 0) {
        return Math.max.apply(
          Math,
          modemList.map(modem => modem.sim_count)
        )
      }
      return 0
    },
    typeOptions(hasWifi, simCount, modemList) {
      const options = [
        ['email', this.$t('Email')],
        ['dout', this.$t('Output')],
        ['http', this.$t('HTTP')],
        ['script', this.$t('Script')],
        ['reboot', this.$t('Reboot')],
        ['profile', this.$t('Profile')],
        ['rms', this.$t('RMS')],
        ['mqtt', this.$t('MQTT')]
      ]
      if (hasWifi) options.push(['wifi', this.$t('WiFi')])
      if (simCount > 1) options.push(['sim_switch', this.$t('SIM Switch')])
      if (modemList.length > 0) options.push(['sms', this.$t('SMS')])
      return options
    },
    afterLoad() {
      const requests = [
        '/api/io/juggler/conditions/config',
        '/api/io/status',
        '/api/recipients/email_users/config',
        { endpoint: '/api/recipients/phone_groups/config', condition: this.$store.board.hwinfo.mobile },
        { endpoint: '/api/sim_switch/config', condition: 'sim_switch.control' },
        { endpoint: '/api/modems/status', condition: 'mobifd.control' },
        '/api/profiles/config',
        '/api/io/juggler/operations/options',
        '/api/basic/network/devices/status'
      ]
      return withCertificatesLoaded(
        this.$axios
          .bulkGet(requests)
          .then(([conditions, ioInfo, emailResponse, phoneResponse, simcardResponse, modemsResponse, profilesResponse, optionResponse, devicesResponse]) => {
            this.modemList = modemsResponse.success ? this.$mobile.parseModems(modemsResponse.data) : []
            this.simcardSections = simcardResponse.success ? simcardResponse.data : []
            this.profileSections = profilesResponse.success ? profilesResponse.data : []
            this.emailSections = emailResponse.success ? emailResponse.data : []
            this.phoneSections = phoneResponse.success ? phoneResponse.data : []

            // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
            this.ioData = ioInfo.success && ioInfo.data ? ioInfo.data : []
            if (!ioInfo.data)
              this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))

            this.conditionsData = conditions.success ? conditions.data : []
            if (!profilesResponse.success) this.$message.error(this.$t('Failed to load profiles data'))
            if (!modemsResponse.success) this.$message.error(this.$t('Failed to load modems data'))
            if (!simcardResponse.success) this.$message.error(this.$t('Failed to load SIM cards data'))
            if (!ioInfo.success) this.$message.error(this.$t('Failed to load I/O data'))
            if (!emailResponse.success) this.$message.error(this.$t('Failed to load email groups data'))
            if (!phoneResponse.success) this.$message.error(this.$t('Failed to load phone groups data'))
            if (!conditions.success) this.$message.error(this.$t('Failed to load I/O juggler conditions data'))
            if (optionResponse.success) this.optionData = optionResponse.data.params
            else this.$message.error(this.$t('Failed to load I/O Juggler action parameters'))
            if (!devicesResponse.success) this.$message.error(this.$t('Failed to load network device data'))
          })
          .catch(() => {
            this.$message.error(this.$t('An unexpected error occurred'))
          })
      )
    },
    /**
     * @description Function check if no more than 10 section are created.
     * @return {{valid: boolean}|{valid: boolean, message: (*)}} - Is it possible to add section
     * @param section - section that is being added
     * @param sections - sections list
     */
    addValidate(section, sections) {
      if (sections.length >= 10) return { valid: false, message: this.$t('Action limit reached, no more than 10 can be created') }
      if (sections.some(sec => sec.ui_name === section.ui_name)) return { valid: false, message: this.$t('Action with the same name already exists') }
      return { valid: true }
    },
    /**
     * @description Function return formatted type value
     * @param {String} value TYpe value that comes from API
     * @return {String} Function return formatted type value
     */
    displayType(value) {
      const section = this.formData.iojuggler_actions.filter(s => s.ui_name === value)[0]
      if (section.target) return this.$t('Change SIM to SIM%s').format(section.target)
      return this.availableTypes[section.type] || this.$t('N/A')
    }
  }
}
</script>
