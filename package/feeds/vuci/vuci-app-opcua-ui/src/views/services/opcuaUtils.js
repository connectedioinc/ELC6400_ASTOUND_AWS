import { useTranslate } from '@ui-core/composables/useI18n'

const $t = useTranslate()

function copyFields(obj, fields) {
  return Object.fromEntries(Object.entries(obj).filter(key_value => fields.includes(key_value[0])))
}

export function getServerTestData(server, additionalFields = []) {
  return copyFields(server, ['url', 'application_uri', 'identity', 'timeout', 'security_mode', 'username', 'password', 'certificate', 'key', 'tcl', ...additionalFields])
}

export function getServerNodeTestData(serverNode, additionalFields = []) {
  return copyFields(serverNode, ['ns', 'type', 'node_id', ...additionalFields])
}

export function getGroupValueTestData(groupValue, additionalFields = []) {
  return copyFields(groupValue, ['prefix', 'postfix', 'replacement', ...additionalFields])
}

export function getGroupTestData(group) {
  return copyFields(group, ['fail_mode', 'prefix', 'postfix', 'midfix', 'replacement'])
}

export function isServerNodeValid(serverNode) {
  return serverNode.name && serverNode.ns && serverNode.node_id
}

export function isServerValid(server) {
  return server.name && server.url && server.timeout
}

export function isGroupValueValid(groupValue) {
  return groupValue.name && groupValue.server_node
}

export function isGroupValid(group) {
  return group.name && group.scheduling_type && group.fail_mode
}

// "DeeplyValid" means is whatever group values, servers and server nodes this group uses must also be valid.
export function isGroupDeeplyValid(group, formGroupValues, formServerNodes, formServers) {
  if (!isGroupValid(group)) {
    return [false, 'group']
  }

  const groupValues = formGroupValues.filter(node => node['.type'] === `value_${group.id}` && node.enabled === '1')
  for (const groupValue of groupValues) {
    const [isValid, reason] = isGroupValueDeeplyValid(groupValue, formServerNodes, formServers)
    if (!isValid) {
      return [false, reason]
    }
  }

  return [true, '']
}

export function isGroupValueDeeplyValid(groupValue, formServerNodes, formServers) {
  if (!isGroupValueValid(groupValue)) {
    return [false, 'groupValue']
  }

  const serverNode = formServerNodes.find(serverNode => serverNode.id === groupValue.server_node)
  if (!serverNode) {
    return [false, 'groupValue']
  }

  return isServerNodeDeeplyValid(serverNode, formServers)
}

export function isServerNodeDeeplyValid(serverNode, formServers) {
  const server = formServers.find(server => `server_node_${server.id}` === serverNode['.type'])
  if (!server) {
    return [false, 'serverNode']
  }

  if (server.enabled === '1') {
    if (!isServerNodeValid(serverNode)) {
      return [false, 'serverNode']
    }

    if (!isServerValid(server)) {
      return [false, 'server']
    }
  }

  return [true, '']
}

export function translateErrorCode(code) {
  const errors = {
    1: $t('An unexpected error occurred'),
    2: $t('Test failed'),
    103: $t('Tested section has invalid fields')
  }

  return errors[code] || $t('An unexpected error occurred')
}
