<template>
  <tlt-form-model-item>
    <tlt-hint :hints="hints">
      <tlt-button
        type="button"
        button-id="test"
        :readonly="isRunning || hints.length > 0"
        @click="onClicked"
      >
        {{ $t('Test') }}
      </tlt-button>
    </tlt-hint>
  </tlt-form-model-item>

  <tlt-form-model-item
    v-if="response.length > 0"
    inline
    :label="$t('Test response')"
  >
    <tlt-text-area
      :model-value="response"
      custom-id="test-output"
      rows="6"
      resize
      readonly
    />
  </tlt-form-model-item>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import * as opcuaUtils from './opcuaUtils'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

const $t = useTranslate()
const message = useMessages()

const response = ref('')
const isRunning = ref(false)
const props = defineProps<{
  uciData: object
  uciSection: object
}>()

const hints = computed(() => {
  const uciData = props.uciData
  const group = props.uciSection
  const groupValues = uciData.groupValue || []
  const serverNodes = uciData.serverNodes || []
  const servers = uciData.server || []

  const [isValid, reason] = opcuaUtils.isGroupDeeplyValid(group, groupValues, serverNodes, servers)
  if (!isValid) {
    const reasonLookup = {
      group: $t('group'),
      groupValue: $t('group value'),
      serverNode: $t('server node'),
      server: $t('server')
    }

    return [{ info: $t('Cannot test group when required values in %s are missing. Navigate to edit modal to fill the missing values').format(reasonLookup[reason]) }]
  }

  return []
})

async function onClicked() {
  const data = getTestPayload()

  isRunning.value = true
  return axios
    .post('/api/opcua/actions/test_group', { data })
    .then(({ data }) => {
      message.success($t('Test is successful'))
      response.value = data.response
    })
    .catch(e => {
      const errorData = e.response.data.errors[0]
      message.error(opcuaUtils.translateErrorCode(errorData.code))
      response.value = ''
    })
    .finally(() => {
      isRunning.value = false
    })
}

function getTestPayload() {
  const section = props.uciSection

  const groupValues = []
  const serverNodes = []
  const servers = []

  const groupId = section.id
  for (const groupValue of props.uciData.groupValue) {
    if (groupValue['.type'] !== `value_${groupId}`) continue
    if (groupValue.enabled !== '1') continue

    const serverNode = props.uciData.serverNodes.find(serverNode => serverNode.id === groupValue.server_node)
    if (!serverNode) continue

    const server = props.uciData.server.find(server => `server_node_${server.id}` === serverNode['.type'])
    if (!server) continue
    if (server.enabled !== '1') continue

    if (!serverNodes.includes(serverNode)) {
      serverNodes.push(serverNode)
    }

    if (!servers.includes(server)) {
      servers.push(server)
    }

    groupValues.push(groupValue)
  }

  return {
    group: opcuaUtils.getGroupTestData(section),
    group_values: groupValues.map(value => opcuaUtils.getGroupValueTestData(value, ['server_node'])),
    server_nodes: serverNodes.map(serverNode => ({
      ...opcuaUtils.getServerNodeTestData(serverNode, ['id']),
      server_id: serverNode['.type'].split('_')[2]
    })),
    servers: servers.map(server => opcuaUtils.getServerTestData(server, ['id']))
  }
}
</script>
