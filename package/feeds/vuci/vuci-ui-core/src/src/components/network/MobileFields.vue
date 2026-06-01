<template>
  <vuci-form-item-switch
    id="auto_apn"
    ref="autoApn"
    :uci-section="s"
    name="auto_apn"
    :label="$t('Auto APN')"
    initial="1"
    force-write
    :depend="extraCondition"
    :readonly="readonly"
    @change="onApnChange"
  >
    <template #help>
      {{
        $t(
          "Auto APN scans an internal APN database and selects an APN based on the SIM card's operator and country. If the first automatically selected APN doesn't work, it attempts to use the next existing APN from the"
        )
      }}
      <router-link :to="apnDatabaseLink"> {{ $t('APN database') }} </router-link>.
    </template>
  </vuci-form-item-switch>
  <vuci-form-item-select
    id="apn_select"
    ref="apnSelect"
    :uci-section="customForm"
    name="apnSelect"
    label="APN"
    :help="$t('APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.')"
    :depend="s.auto_apn !== '1' && extraCondition"
    :options="apnList"
    :rules="showAuth ? 'apn' : 'string'"
    :maxlength="showAuth ? '62' : null"
    :readonly="readonly"
    allow-create
    no-write
    @change="onApnSelected"
  />
  <tlt-inline-message
    v-show="extraCondition && s.auto_apn === '1'"
    id="apn"
    type="info"
    :message="$t('Functional APN will be detected automatically.')"
  />
  <vuci-form-item-select
    id="auth"
    :uci-section="s"
    name="auth"
    :label="$t('Authentication type')"
    :help="$t('Authentication method that your carrier uses to authenticate new connections on it\'s network.')"
    :depend="s.auto_apn !== '1' && showAuth && extraCondition"
    :options="authOptions"
    :readonly="readonly"
  />
  <vuci-form-item-input
    id="username"
    :uci-section="s"
    name="username"
    :label="$t('Username')"
    :help="$t('Username provided by your carrier.')"
    rules="string"
    maxlength="64"
    :depend="s.auto_apn !== '1' && showAuth && (s.auth === 'pap' || s.auth === 'chap') && extraCondition"
    :required="!!s.password"
    :readonly="readonly"
  />
  <vuci-form-item-input
    id="password"
    :uci-section="s"
    name="password"
    :label="$t('Password')"
    :help="$t('Password provided by your carrier.')"
    rules="string"
    maxlength="64"
    :depend="s.auto_apn !== '1' && showAuth && (s.auth === 'pap' || s.auth === 'chap') && extraCondition"
    :required="!!s.username"
    :readonly="readonly"
    password
    sensitive
  />
  <template v-if="readonly">
    <template
      v-for="field in fields"
      :key="field"
    >
      <tlt-tooltip
        :target="`#${field}`"
        :content="$t(`No '%s' write access`).format(`${$t('Network')} > ${$t('WAN')}`)"
        placement="bottom"
      />
    </template>
  </template>
</template>
<script>
import { nextTick } from 'vue'
import commonFunctions from './commonFunctions'
import { isArray } from '@ui-core/utils/inspect.ts'

export default {
  inject: {
    setSection: {
      default: () => {}
    }
  },
  props: {
    uciData: {
      type: Object,
      required: true
    },
    s: {
      type: Object,
      required: true
    },
    extraCondition: {
      type: Boolean,
      default: true
    },
    initialApn: {
      type: String,
      required: true
    },
    simCards: {
      type: Array,
      required: true
    },
    modemOptions: {
      type: Array,
      required: true
    },
    interfaceApns: {
      type: Array,
      required: true
    },
    initialInterfaces: {
      type: Array,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    },
    mobileGeneral: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      authOptions: [
        ['none', this.$t('None')],
        ['pap', 'PAP'],
        ['chap', 'CHAP']
      ],
      showAuth: this.s.force_apn ? false : true,
      customForm: {
        apnSelect: this.s.force_apn || this.s.apn || this.initialApn
      },
      fields: ['auto_apn', 'apn_select', 'auth', 'username', 'password']
    }
  },
  computed: {
    apnDatabaseLink() {
      return this.$store.hasPackages('vuci-app-apn-database-ui') ? '/network/mobile/apn_database' : '/system/package_manager?search=APN Database webui'
    },
    initialSection() {
      return this.initialInterfaces.find(i => i.id === this.s.id) || {}
    },
    apnList() {
      const receivedList = this.interfaceApns
      const list = [['', this.$t('-- Empty --')]]
      if (this.initialSection.force_apn && !receivedList.find(apn => apn.id === Number(this.initialSection.force_apn))) {
        list.push([this.initialSection.force_apn, `${this.s.apn || this.initialApn || this.$t('N/A')}`])
      }
      if (!isArray(receivedList) || receivedList.length === 0) return list

      list.push(...receivedList.map(({ id, carrier, apn }) => [id.toString(), `${carrier} (${apn})`]))
      return list
    }
  },
  watch: {
    initialSection: {
      handler() {
        this.updateValues()
      },
      immediate: true
    },
    's.modem'() {
      this.resetApnSelection()
      this.onApnChange(this.$refs.autoApn)
    },
    's.sim'() {
      this.resetApnSelection()
      this.onApnChange(this.$refs.autoApn)
    },
    's.esim_profile'() {
      this.resetApnSelection()
      this.onApnChange(this.$refs.autoApn)
    }
  },
  methods: {
    onApnChange(self) {
      if (this.s.enabled === '0' || !self.model) return
      const modem = this.$mobile.getModemById(this.s.modem || this.modemOptions[0][0])
      const modemMessage = this.$mobile.shouldShowModemName(modem) ? modem.name : ''
      const simCount = this.simCards.filter(e => e.modem === this.s.modem).length
      const validation = commonFunctions.validateApn(this.s, this.initialInterfaces, modemMessage, simCount)
      if (!validation.isValid) {
        this.$message.error(validation.message)
        self.model = '0'
      }
    },
    onApnSelected(self) {
      const val = self.model
      if (val && this.apnList.find(apn => apn[0] === val)) {
        this.showAuth = false
        this.setSection(section => {
          section.force_apn = val
          section.apn = undefined
        })
      } else if (this.$utils.notEmpty(val)) {
        this.showAuth = true
        this.setSection(section => {
          section.apn = val
          section.force_apn = undefined
        })
      }
    },
    updateValues() {
      if (this.initialSection.modem === this.s.modem && this.initialSection.sim === this.s.sim && this.initialSection.esim_profile === this.s.esim_profile) {
        let tempVal = this.initialApn
        if (this.initialSection.force_apn) {
          tempVal = this.initialSection.force_apn
          this.customForm.apnSelect = tempVal
          this.showAuth = false
        } else {
          this.customForm.apnSelect = tempVal
          this.showAuth = true
        }
        if (this.mobileGeneral && this.$refs.apnSelect) {
          nextTick(() => {
            this.$refs.apnSelect.setInitialValue(tempVal)
          })
        }
      }
    },
    resetApnSelection() {
      this.customForm.apnSelect = ''
      if (!this.mobileGeneral) this.updateValues()
    }
  }
}
</script>
