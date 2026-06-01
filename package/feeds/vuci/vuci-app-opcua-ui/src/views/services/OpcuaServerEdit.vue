<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="opcua_client"
    editing
    :before-save="handleMultiFileSaving"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('OPC UA server'), section.name)"
      data-key="server"
      :endpoints="[{ endpoint: 'opcua/server/config' }]"
      :after-save="fixTCLValue"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Whether the server is enabled.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="name"
        :label="$t('Name')"
        :help="$t('Name of the server (no functional use).')"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="url"
        :label="$t('URL')"
        :help="$t('OPC UA endpoint URL.')"
        :rules="validateOpcUrl"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="timeout"
        :label="$t('Timeout')"
        :help="$t('Server timeout (ms).')"
        placeholder="5000"
        initial="5000"
        rules="irange(10,3600000)"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="identity"
        :label="$t('Identity')"
        :help="$t('Client identity.')"
        :options="identityOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Username')"
        :help="$t('Client username.')"
        name="username"
        :depend="s.identity === '1'"
        rules="credentials_validate"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Password')"
        :help="$t('Client password.')"
        name="password"
        :depend="s.identity === '1'"
        rules="credentials_validate"
        password
        sensitive
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="security_mode"
        :label="$t('Security mode')"
        :help="$t('OPC UA security mode.')"
        :options="securityOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="application_uri"
        :label="$t('Application URI')"
        placeholder="urn:unconfigured:application"
        rules="string"
        :required="s.security_mode !== '0' || s.certificate !== '' || s.key !== ''"
        :help="$t('Should match SubjectAlternativeName in client certificate.')"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="certificate"
        :label="$t('Certificate')"
        :help="$t('Client certificate.')"
        max-size="16MB"
        :required="s.security_mode !== '0' || s.application_uri !== '' || s.key !== ''"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="key"
        :label="$t('Key')"
        :help="$t('Client key.')"
        max-size="16MB"
        :required="s.security_mode !== '0' || s.application_uri !== '' || s.certificate !== ''"
      />
      <vuci-form-item-custom
        name="tcl"
        inputs="input"
        :uci-section="s"
        :label="$t('TCL')"
        :input-props="[{ type: 'file' }]"
        :maxlines="10"
        :help="$t('Trusted certificate list.')"
        allow-create
      >
        <template #input-input="{ row, setValue }">
          <vuci-form-item-upload
            :ref="`tcl_${row}`"
            :uci-section="returnSection(s, row)"
            :name="`tcl_${row}`"
            use-option-as-separator
            option="tcl"
            @reset="res => reset(res)"
            @uploaded="
              res => {
                setValue(res.data.path)
                mergeData(res, row)
              }
            "
          />
        </template>
      </vuci-form-item-custom>
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      :type="'server_node_' + section.id"
      :title="$t('OPC UA server nodes')"
      data-key="serverNodes"
      :table-actions="['column-list', 'search']"
      :endpoints="[{ endpoint: `opcua/server/${section.id}/nodes/config` }]"
      :columns="serverNodeColumns"
      :form-methods="['get', 'delete', 'create']"
      :edit-form="editServerNodeModal"
      :after-delete="onServerNodeDelete"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #test="{ s }">
        <tlt-hint :hints="getServerNodeTestHint(s)">
          <opcua-test
            :uci-section="s"
            :get-data="getServerNodeTestData"
            endpoint="/api/opcua/actions/test_server_node"
            :readonly="getServerNodeTestHint(s).length > 0"
          />
        </tlt-hint>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Server node name')"
          prop="name"
          :rules="['uciname', v => serverNodeExists(v), nodeLimit]"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import ServerNodeEdit from './OpcuaServerNodeEdit'
import OpcuaTest from './OpcuaTest'
import * as opcuaUtils from './opcuaUtils'

const MAX_NODES_PER_SERVER = 50

export default {
  components: { OpcuaTest },
  inject: {
    modalData: {
      default: () => () => {}
    }
  },
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      editServerNodeModal: markRaw(ServerNodeEdit),
      serverNodeColumns: [
        { name: 'name', label: this.$t('Server node name') },
        { name: 'test', label: this.$t('Test node') }
      ],
      securityOptions: [
        ['0', this.$t('None')],
        ['1', this.$t('Sign')],
        ['2', this.$t('Sign & encrypt')]
      ],
      identityOptions: [
        ['0', this.$t('Anonymous')],
        ['1', this.$t('Credentials')]
      ],
      formData: {}
    }
  },
  computed: {
    sectionServerNodes() {
      return this.formData.serverNodes.filter(o => o['.type'] === `server_node_${this.section.id}`)
    }
  },
  methods: {
    reset(res) {
      const section = this.formData.server.find(sec => sec.id === this.section.id).tcl || []
      const filteredPaths = section.length > 1 ? [...section.filter(path => path !== res)] : []
      this.formData.server.find(sec => sec.id === this.section.id).tcl = filteredPaths
    },
    fixTCLValue(_, res) {
      // After full file delete TCL value is not returned, and with custom TCL implementation it needs a manual reset
      if (!res.data.tcl) {
        this.formData.server.find(sec => sec.id === this.section.id).tcl = []
      }
    },
    returnSection(s, row) {
      return {
        id: s.id,
        tcl: s.tcl,
        [`tcl_${row}`]: s.tcl?.[row] || '',
        [`tcl_${row}:file_size`]: s['tcl:file_size']?.[row] || 0
      }
    },
    handleMultiFileSaving() {
      const refFiles = Object.keys(this.$refs)
        .filter(key => key.includes('tcl_') && this.$refs[key])
        .map(val => this.$refs[val].file.name)

      // Remove all paths that are not in the current file list to handle shadow files
      const section = this.formData.server.find(sec => sec.id === this.section.id)

      // It is important to use an if here, because `section.tcl` can be an empty string
      if (section.tcl) {
        section.tcl = section.tcl.filter(path => path && refFiles.includes(path.replace(`/etc/vuci-uploads/cbid.opcua_client.${section.id}.tcl`, '')))
      }

      const duplicateFile = refFiles.find((file, index) => refFiles.indexOf(file) !== index)
      if (duplicateFile) {
        return Promise.reject(this.$t('Duplicate files are not allowed, remove %s duplicate file'.format(duplicateFile)))
      }
      refFiles.forEach(key => {
        if (key.includes('tcl_')) {
          delete section[key]
        }
      })

      return Promise.resolve()
    },
    mergeData(res) {
      const section = this.formData.server.find(sec => sec.id === this.section.id).tcl || []
      this.formData.server.find(sec => sec.id === this.section.id).tcl = [...section.filter(value => value && value !== res.data.path), res.data.path]
    },
    validateOpcUrl(value) {
      const protocols = ['http', 'https', 'opc.tcp']
      const opcUrl = value.match(/^(http[s]?|opc.tcp):\/\/[a-zA-Z0-9]{1,63}(:([0-9]+))([/?][^\s]*)*$/) // matches hostname urls with scheme and port (e.g.,: http://example:8080)
      if (opcUrl) {
        this.$VuciValidator.value = opcUrl[3]
        return this.$VuciValidator.port()
      }
      this.$VuciValidator.value = value
      return this.$VuciValidator.protourl(protocols)
    },
    onServerNodeDelete(section, uciData) {
      const groupsValues = uciData.groupValue.map(value => ({
        ...value,
        enabled: value.server_node === section.id ? '0' : value.enabled,
        server_node: value.server_node === section.id ? null : value.server_node
      }))
      this.modalData().uciData.groupValue = groupsValues
      this.modalData().vuciForm.initialForm.groupValue = groupsValues
      uciData.serverNodes = uciData.serverNodes.filter(e => e['.type'] !== `server_node_${section.id}`)
    },
    serverNodeExists(val) {
      return {
        isValid: !this.sectionServerNodes.some(o => o.name === val),
        message: this.$t("Instance '%s' already exists").format(val)
      }
    },
    serverExists(val) {
      return {
        isValid: this.formData.server.filter(o => o.name === val).length <= 1,
        message: this.$t("Instance '%s' already exists").format(val)
      }
    },
    getServerNodeTestData(section) {
      return {
        server_node: opcuaUtils.getServerNodeTestData(section),
        server: opcuaUtils.getServerTestData(this.section)
      }
    },
    nodeLimit() {
      return {
        isValid: this.sectionServerNodes.length < MAX_NODES_PER_SERVER,
        message: this.$t('Server node limit was reached (%s max)').format(MAX_NODES_PER_SERVER)
      }
    },
    getServerNodeTestHint(groupValue) {
      return !opcuaUtils.isServerNodeValid(groupValue) ? [{ info: this.$t('Cannot test server node when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    }
  }
}
</script>
