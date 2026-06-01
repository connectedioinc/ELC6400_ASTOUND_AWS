<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="opcua_client"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('OPC UA value group'), section.name)"
      data-key="group"
      :endpoints="[{ endpoint: 'opcua/group/config' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Whether the value is enabled.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="name"
        :label="$t('Name')"
        :help="$t('Name of the server node.')"
        :rules="['uciname', v => groupExists(v)]"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="period"
        :label="$t('Period')"
        :help="$t('Time duration between data retrievals (s).')"
        placeholder="60"
        initial="60"
        rules="irange(1,86400)"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="fail_mode"
        :label="$t('Failure mode')"
        :help="$t('When to consider retrieval a failure.')"
        :options="failModeOptions"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="fail_store"
        :label="$t('Failure storage')"
        :help="$t('Whether to store results of a failure.')"
        :depend="s.fail_mode !== '0'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="replacement"
        :label="$t('Failure replacement')"
        :help="$t('String to replace results of a failure.')"
        :depend="s.fail_mode !== '0'"
        rules="string"
        placeholder="null"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="prefix"
        :label="$t('Prefix')"
        :help="$t('String going before all the values.')"
        rules="string"
        placeholder="["
      />
      <vuci-form-item-input
        :uci-section="s"
        name="midfix"
        :label="$t('Midfix')"
        :help="$t('String going between all the values.')"
        rules="string"
        placeholder=","
      />
      <vuci-form-item-input
        :uci-section="s"
        name="postfix"
        :label="$t('Postfix')"
        :help="$t('String going after all the values.')"
        rules="string"
        placeholder="]"
      />

      <opcua-group-test
        :uci-data="uciData"
        :uci-section="s"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      :type="'value_' + section.id"
      :title="$utils.getModalTitle($t('OPC UA group'))"
      :table-actions="['column-list', 'search']"
      data-key="groupValue"
      :endpoints="[{ endpoint: `opcua/group/${section.id}/values/config` }]"
      :columns="groupValueColumns"
      :edit-form="editGroupValueModal"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :readonly="getEnableHint(s).length > 0"
          :hints="getEnableHint(s)"
        />
      </template>
      <template #test="{ s }">
        <tlt-hint :hints="getGroupValueTestHint(s)">
          <opcua-test
            :uci-section="s"
            :get-data="getGroupValueTestData"
            endpoint="/api/opcua/actions/test_group_value"
            :readonly="getGroupValueTestHint(s).length > 0"
          />
        </tlt-hint>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Value name')"
          prop="name"
          :rules="['uciname', v => groupValueExists(v), groupValueLimit]"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import OpcuaGroupValueEdit from './OpcuaGroupValueEdit'
import OpcuaTest from './OpcuaTest'
import OpcuaGroupTest from './OpcuaGroupTest'
import * as opcuaUtils from './opcuaUtils'

const MAX_VALUES_PER_GROUP = 50

export default {
  components: { OpcuaTest, OpcuaGroupTest },
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      editGroupValueModal: markRaw(OpcuaGroupValueEdit),
      groupValueColumns: [
        { name: 'name', label: this.$t('Group value name') },
        { name: 'test', label: this.$t('Test group value') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      testForm: {},
      testResponse: '',
      failModeOptions: [
        ['0', this.$t('None')],
        ['1', this.$t('Any')],
        ['2', this.$t('All')]
      ]
    }
  },
  computed: {
    sectionsGroupValues() {
      return this.formData.groupValue.filter(o => o['.type'] === `value_${this.section.id}`)
    }
  },
  methods: {
    groupValueExists(val) {
      return {
        isValid: !this.sectionsGroupValues.some(o => o.name === val),
        message: this.$t("Instance '%s' already exists").format(val)
      }
    },
    groupExists(val) {
      return {
        isValid: this.formData.group.filter(o => o.name === val).length <= 1,
        message: this.$t("Instance '%s' already exists").format(val)
      }
    },
    getGroupValueTestData(section) {
      const serverNode = this.formData.serverNodes.find(serverNode => serverNode.id === section.server_node) || {}
      const server = this.formData.server.find(server => `server_node_${server.id}` === serverNode['.type'])

      return {
        group_value: opcuaUtils.getGroupValueTestData(section),
        server_node: opcuaUtils.getServerNodeTestData(serverNode),
        server: opcuaUtils.getServerTestData(server)
      }
    },
    groupValueLimit() {
      return {
        isValid: this.sectionsGroupValues.length < MAX_VALUES_PER_GROUP,
        message: this.$t('Group value limit was reached (%s max)').format(MAX_VALUES_PER_GROUP)
      }
    },

    getEnableHint(groupValue) {
      return groupValue.enabled !== '1' && !opcuaUtils.isGroupValueValid(groupValue)
        ? [{ info: this.$t('Cannot enable group value when required values are missing. Navigate to edit modal to fill the missing values') }]
        : []
    },
    getGroupValueTestHint(groupValue) {
      const serverNodes = this.formData?.serverNodes || []
      const servers = this.formData?.server || []
      const [isValid, reason] = opcuaUtils.isGroupValueDeeplyValid(groupValue, serverNodes, servers)
      if (!isValid) {
        const reasonLookup = {
          groupValue: this.$t('group value'),
          serverNode: this.$t('server node'),
          server: this.$t('server')
        }
        return [{ info: this.$t('Cannot test group value when required values in %s are missing. Navigate to edit modal to fill the missing values').format(reasonLookup[reason]) }]
      }

      return []
    }
  }
}
</script>
