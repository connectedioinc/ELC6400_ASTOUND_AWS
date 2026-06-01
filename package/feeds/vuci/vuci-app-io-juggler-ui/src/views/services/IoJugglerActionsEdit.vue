<template>
  <vuci-form
    v-slot="{ uciData }"
    config="iojuggler"
    editing
    :before-save="onBeforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="iojuggler_actions"
      :name="section.id"
      :title="$utils.getModalTitle($t('action'), section.ui_name)"
      :endpoints="[{ endpoint: 'io/juggler/operations/config' }]"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="ui_name"
        :label="$t('Name')"
        rules="uciname"
        maxlength="16"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="type"
        :label="$t('Type')"
        :help="$t('Type of action.')"
        :options="typeOptions()"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="subject"
        :label="$t('Subject')"
        :help="$t('Subject of an email. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
        rules="subject_rule"
        :depend="s.type === 'email'"
        maxlength="256"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="post"
        :label="$t('Method')"
        :help="$t('Http request type.')"
        :options="methodOptions"
        :depend="s.type === 'http'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="url"
        :label="$t('URL')"
        :help="$t('URL to send parameters to.')"
        rules="url"
        :depend="s.type === 'http'"
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="verify"
        :label="$t('Verify')"
        :help="$t('Verifies the validity of certificates, only works for https.')"
        :depend="s.type === 'http'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ui_params"
        :label="$t('Alt. parameter mode')"
        :help="$t('Choose a different way to pass parameters. If method is POST parameters are passed in request body. If method is GET parameters are passed through the URL.')"
        :depend="s.type === 'http'"
      />
      <vuci-form-item-text-area
        :uci-section="s"
        name="text"
        :label="$t('Text message')"
        :help="$t('Message to send.')"
        :depend="['email', 'sms', 'mqtt'].includes(s.type) || (s.type === 'http' && s.ui_params === '1')"
        force-write
        initial="Router name - %rn; Time stamp - %ts"
        placeholder="Router name - %rn; Time stamp - %ts"
        maxlength="4096"
        required
      />
      <template v-if="['email', 'sms', 'mqtt'].includes(s.type) || (s.type === 'http' && s.ui_params === '1')">
        <tlt-form-accordion
          name="text-parameters"
          :title="$t('text message parameter list')"
        >
          <tlt-form-model-item>
            <t-parameters class="w-full">
              <strong>{{ $t('Text message parameter list') }}:</strong>
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
      </template>
      <vuci-form-item-input
        :uci-section="s"
        name="topic"
        :label="$t('Topic')"
        :help="$t('Topic to publish to.')"
        :depend="s.type === 'mqtt'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="client_id"
        :label="$t('Client ID')"
        :help="$t('Client ID to send with the data. If empty, a random client ID will be generated.')"
        :placeholder="$t('Client ID')"
        rules="mqtt_client_id"
        :depend="s.type === 'mqtt'"
        maxlength="64"
      />
      <vuci-form-item-custom
        :uci-section="s"
        name="params"
        :label="$t('Parameters')"
        :help="$t('Parameters and their value for usage for Post or Get methods.')"
        placeholder="variable"
        :depend="s.type === 'http' && s.ui_params === '0'"
        :input-props="parameterInputProps"
        allow-create
        :write-parse="saveParameters"
        inputs="input,select"
        separator="="
        :maxlines="100"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="headers"
        :label="$t('Custom headers')"
        :help="$t('Allows to add custom headers to the HTTP requests.')"
        placeholder="Content-Type: application/json"
        rules="string"
        :depend="s.type === 'http'"
        :maxlines="100"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="delay"
        :label="$t('Execution delay')"
        :help="
          $t(
            'How many seconds will pass before the action is executed after it\'s triggered. Trigger interval and action\'s Execution delay values are summed up when calculating total interval between I/O triggers.'
          )
        "
        placeholder="0"
        rules="uinteger"
        maxlength="8"
        :depend="s.type !== 'mqtt'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="info_modem_id"
        :label="$t('Modem')"
        :help="$t('Modem, which is used to get information from.')"
        :options="modems"
        :depend="modems.length > 1 && ['email', 'sms', 'http', 'script'].includes(s.type)"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="send_modem_id"
        :label="$t('Gateway modem')"
        :help="$t('Modem, which is used to send information from.')"
        :options="modems"
        :depend="modems.length > 1 && s.type === 'sms'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="ui_recipient_format"
        :label="$t('Recipients')"
        :help="$t('You can choose to add single numbers in a list or use a phone group list.')"
        :options="recipientFormatOptions"
        :depend="s.type === 'sms'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="phone"
        :label="$t('Recipient\'s phone number')"
        :help="$t('For whom you want to send a SMS to (e.g., +37000000000).')"
        placeholder="+37000000000"
        rules="phonedigit"
        :depend="s.ui_recipient_format === 'single' && s.type === 'sms'"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="phone_group"
        :label="$t('Phone group')"
        :options="phoneGroups()"
        :placeholder="$t('No phone groups created')"
        :depend="s.ui_recipient_format === 'group' && s.type === 'sms'"
        required
      >
        <template #help>
          {{ $t("Recipient's phone number users group.") }}
          {{ $t('Configure it') }}
          <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <vuci-form-item-switch
        :uci-section="s"
        name="rms_on"
        :label="$t('Enable RMS')"
        :help="$t('Enable/Disable RMS functionality.')"
        :depend="s.type === 'rms'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="wifi_on"
        :label="$t('Enable WiFi')"
        :help="$t('Enable/Disable all WiFi interfaces.')"
        :depend="s.type === 'wifi'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="dest"
        :label="$t('Control')"
        :help="$t('Specifies the output/relay of which the state will be changed.')"
        :options="destList(ioData())"
        :depend="s.type === 'dout'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="revert"
        :label="$t('Revert')"
        :help="$t('After how many seconds the state will revert. If left 0 or empty the state will not revert.')"
        placeholder="0"
        rules="uinteger"
        :depend="s.type === 'dout'"
        initial="0"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="maintain"
        :label="$t('Maintain')"
        :help="$t('Maintain this IO state after reboot.')"
        :depend="s.type === 'dout'"
        initial="1"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="invert"
        :label="$t('Invert')"
        :help="$t('On action inverts pin state.')"
        :depend="s.type === 'dout'"
        @change="setInvertMirroring"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ui_mirroring"
        :label="$t('State copying')"
        :help="$t('Copies the state from selected input to selected output.')"
        :depend="s.type === 'dout'"
        @change="setInvertMirroring"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="state"
        :label="$t('State')"
        :help="$t('Specifies what state the output pin will be set to.')"
        :options="states(s)"
        :depend="s.type === 'dout' && s.invert === '0' && s.ui_mirroring === '0'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="copy"
        :label="$t('Source')"
        :help="$t('Specifies the input/relay from which state is copied.')"
        :options="copyList(ioData())"
        :depend="s.type === 'dout' && s.ui_mirroring === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="email_group"
        :label="$t('Sender\'s email account')"
        :options="emailList()"
        :depend="s.type === 'email'"
        :placeholder="$t('No email accounts created')"
        required
      >
        <template #help>
          {{ $t("Sender's email configuration.") }}
          {{ $t('Configure it') }}
          <router-link to="/system/admin/group/email"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <vuci-form-item-list
        :uci-section="s"
        name="recipients"
        :label="$t('Recipient\'s email address')"
        :help="$t('For whom you want to send an email to. Allowed characters: &quot;a-zA-Z0-9._%+@-&quot;.')"
        placeholder="mail@domain.com"
        rules="email"
        :depend="s.type === 'email'"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="ui_file_path"
        :label="$t('Specify path')"
        :help="$t('Choose to upload a script or specify its absolute path in router.')"
        :options="filePathOptions"
        :depend="s.type === 'script'"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="upload"
        :label="$t('Custom script')"
        :help="$t('A script which is run when pin triggers, can accept arguments (limit 100Kb).')"
        :depend="s.type === 'script' && s.ui_file_path === 'upload'"
        :max-size="102400"
        :readonly="$session.group !== 'root'"
        required
      >
        <template
          v-if="$session.group !== 'root'"
          #after-content="{ controlRef }"
        >
          <tlt-tooltip
            :target="() => controlRef"
            placement="bottom-start"
            fallback-placements="top-start"
            :content="$t('Current user is unauthorized to edit scripts.')"
          />
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-input
        :uci-section="s"
        name="path"
        :label="$t('Script file')"
        :help="$t('A script path in router.')"
        placeholder="/etc/script.sh"
        rules="string"
        :depend="s.type === 'script' && s.ui_file_path === 'path'"
        :readonly="$session.group !== 'root'"
        force-write
        required
      >
        <template
          v-if="$session.group !== 'root'"
          #after-content="{ controlRef }"
        >
          <tlt-tooltip
            :target="() => controlRef"
            placement="bottom-start"
            fallback-placements="top-start"
            :content="$t('Current user is unauthorized to edit scripts.')"
          />
        </template>
      </vuci-form-item-input>
      <vuci-form-item-text-area
        :uci-section="s"
        name="arguments"
        :label="$t('Arguments')"
        :help="$t('Optional arguments which can be provided for the script.')"
        placeholder="-T %ut -i %si"
        :depend="s.type === 'script'"
      />
      <template v-if="s.type === 'script'">
        <tlt-form-accordion
          name="text-arguments"
          :title="$t('arguments')"
        >
          <tlt-form-model-item>
            <t-parameters class="w-full">
              <strong>{{ $t('Arguments') }}:</strong>
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
      </template>
      <vuci-form-item-select
        :uci-section="s"
        name="profile"
        :label="$t('Profile')"
        :help="$t('Choose a profile that will be applied when the action triggers.')"
        :options="profileList()"
        :depend="s.type === 'profile'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="flip"
        :label="$t('Flip')"
        :help="$t('Switches to a different inserted SIM card.')"
        :depend="s.type === 'sim_switch'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="write_to_config"
        :label="$t('Enable primary option transfer')"
        :help="$t('Enables simd service to change primary card while switching sims.')"
        :depend="s.type === 'sim_switch'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="target"
        :label="$t('Target')"
        :help="$t('A SIM to switch to.')"
        :options="simList()"
        :depend="s.type === 'sim_switch' && s.flip === '0'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="conditions"
        :label="$t('Add conditions')"
        :help="$t('Specifies global conditions for this pin. Actions will trigger only if the conditions are met. Conditions are optional.')"
        :options="conditionsListMap()"
        :placeholder="conditionsListMap().length > 0 ? $t('-- Please select --') : $t('No conditions available')"
        multiple
        :depend="s.type !== 'mqtt'"
      />
      <mqtt-fields
        :s="s"
        :form-options="{ certificates: certificates() }"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { getAllParameters } from '@/utils/message-parameters'
// FIXME import
import MqttFields from '../../components/services/MqttFields.vue'
import IoJugglerMixin from './IoJugglerMixin.vue'

export default {
  components: { MqttFields },
  mixins: [IoJugglerMixin],
  inject: ['typeOptions', 'modemList', 'emailList', 'ioData', 'profileList', 'simList', 'phoneGroups', 'conditionsList', 'optionData', 'certificates'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      filePathOptions: [
        ['upload', this.$t('Upload a script')],
        ['path', this.$t('Specify a path')]
      ],
      recipientFormatOptions: [
        ['single', this.$t('Single')],
        ['group', this.$t('Group')]
      ],
      methodOptions: [
        ['0', this.$t('Get')],
        ['1', this.$t('Post')]
      ],
      hasWan: this.$store.board.network?.wan,
      tlsTypeOpts: [
        ['cert', this.$t('Certificate based')],
        ['psk', this.$t('Pre-Shared-Key based')]
      ]
    }
  },
  computed: {
    ...mapState(useMainStore, ['board']),
    modems() {
      return this.modemList()
    },
    parameterInputProps() {
      const selectProps = {
        prop: 'ParamSelect',
        options: this.paramslist
      }
      const inputProps = {
        prop: 'ParamInput',
        rules: this.validParamInput
      }
      return [inputProps, selectProps]
    },
    paramslist() {
      return getAllParameters(this.optionData())
    },
    formattedParameters() {
      return this.paramslist.map(params => ({ parameter: `%${params[0]}`, description: params[1] }))
    }
  },
  methods: {
    saveParameters(params) {
      return params ? params.join('=') : ''
    },
    copyList(ioData) {
      return ioData.filter(io => (io.type === 'gpio' && (io.direction !== 'out' || io.bi_dir === '1')) || io.type === 'relay' || io.type === 'dwi').map(io => [io.id, io.name_with_pins])
    },
    states(section) {
      if (section?.dest?.startsWith('relay')) {
        return [
          ['1', this.$t('Closed')],
          ['0', this.$t('Open')]
        ]
      }
      return [
        ['1', this.$t('High')],
        ['0', this.$t('Low')]
      ]
    },
    destList(ioData) {
      return ioData.filter(io => (io.type === 'gpio' && (io.direction === 'out' || io.bi_dir === '1')) || io.type === 'relay').map(io => [io.id, io.name_with_pins])
    },
    /**
     * Function allows only one of 'invert` or `ui_mirroring` to be set to enable.
     * @param self
     */
    setInvertMirroring(self) {
      if (self.name === 'invert' && self.uciSection.invert === '1') {
        self.uciSection.ui_mirroring = '0'
      } else if (self.name === 'ui_mirroring' && self.uciSection.ui_mirroring === '1') {
        self.uciSection.invert = '0'
      }
    },
    conditionsListMap() {
      return this.conditionsList().map(condition => [condition.ui_name, condition.ui_name])
    },
    validParamInput(value) {
      if (/=/.test(value)) {
        return { isValid: false, message: this.$t('All characters are allowed except =.') }
      }
      return { isValid: true }
    },
    onBeforeSave() {
      return new Promise((resolve, reject) => {
        if (this.section.conditions && this.section.conditions.length > 0) {
          const messageFromConditionsValidation = this.validateConditions(this.conditionsList(), this.section.conditions)
          if (messageFromConditionsValidation) {
            return reject(messageFromConditionsValidation)
          }
        }
        resolve(true)
      })
    }
  }
}
</script>
