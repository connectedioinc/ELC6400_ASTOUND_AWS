import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'

const $t = useTranslate()
const $message = useMessages()

export const cosemList = [
  ['1', $t('DATA (ID: %s)').format('1')],
  ['3', $t('REGISTER (ID: %s)').format('3')],
  ['4', $t('EXTENDED REGISTER (ID: %s)').format('4')],
  ['5', $t('DEMAND REGISTER (ID: %s)').format('5')],
  ['6', $t('REGISTER ACTIVATION (ID: %s)').format('6')],
  ['7', $t('PROFILE GENERIC (ID: %s)').format('7')],
  ['8', $t('CLOCK (ID: %s)').format('8')],
  ['9', $t('SCRIPT TABLE (ID: %s)').format('9')],
  ['11', $t('SPECIAL DAYS TABLE (ID: %s)').format('11')],
  ['17', $t('SAP ASSIGNMENT (ID: %s)').format('17')],
  ['18', $t('IMAGE TRANSFER (ID: %s)').format('18')],
  ['19', $t('IEC LOCAL PORT SETUP (ID: %s)').format('19')],
  ['20', $t('ACTIVITY CALENDAR (ID: %s)').format('20')],
  ['21', $t('REGISTER MONITOR (ID: %s)').format('21')],
  ['22', $t('ACTION SCHEDULE (ID: %s)').format('22')],
  ['23', $t('IEC HDLC SETUP (ID: %s)').format('23')],
  ['24', $t('IEC TWISTED PAIR SETUP (ID: %s)').format('24')],
  ['26', $t('UTILITY TABLES (ID: %s)').format('26')],
  ['27', $t('MODEM CONFIGURATION (ID: %s)').format('27')],
  ['28', $t('AUTO ANSWER (ID: %s)').format('28')],
  ['29', $t('AUTO CONNECT (ID: %s)').format('29')],
  ['40', $t('PUSH SETUP (ID: %s)').format('40')],
  ['41', $t('TCP UDP SETUP (ID: %s)').format('41')],
  ['42', $t('IP4 SETUP (ID: %s)').format('42')],
  ['43', $t('MAC ADDRESS SETUP (ID: %s)').format('43')],
  ['45', $t('GPRS SETUP (ID: %s)').format('45')],
  ['47', $t('GSM DIAGNOSTIC (ID: %s)').format('47')],
  ['48', $t('IP6 SETUP (ID: %s)').format('48')],
  ['62', $t('COMPACT DATA (ID: %s)').format('62')],
  ['64', $t('SECURITY SETUP (ID: %s)').format('64')],
  ['68', $t('ARBITRATOR (ID: %s)').format('68')],
  ['70', $t('DISCONNECT CONTROL (ID: %s)').format('70')],
  ['71', $t('LIMITER (ID: %s)').format('71')]
]

export const cosemAttributePairs = {
  1: [
    ['1', $t('Logical name')],
    ['2', $t('Value')]
  ],
  3: [
    ['1', $t('Logical name')],
    ['2', $t('Value')],
    ['3', $t('Scaler and unit')]
  ],
  4: [
    ['1', $t('Logical name')],
    ['2', $t('Value')],
    ['3', $t('Scaler and unit')],
    ['4', $t('Status')],
    ['5', $t('Capture time')]
  ],
  5: [
    ['1', $t('Logical name')],
    ['2', $t('Current average value')],
    ['3', $t('Scaler and unit')],
    ['4', $t('Status')],
    ['5', $t('Capture time')],
    ['6', $t('Start time current')],
    ['7', $t('Period')],
    ['8', $t('Number of periods')]
  ],
  6: [
    ['1', $t('Logical name')],
    ['2', $t('Register assignment')],
    ['3', $t('Masks list')],
    ['4', $t('Active mask')]
  ],
  7: [
    ['1', $t('Logical name')],
    ['2', $t('Buffer')],
    ['3', $t('Capture objects')],
    ['4', $t('Capture period')],
    ['5', $t('Sort method')],
    ['6', $t('Sort object')],
    ['7', $t('Entries in use')],
    ['8', $t('Profile entries')]
  ],
  8: [
    ['1', $t('Logical name')],
    ['2', $t('Time')],
    ['3', $t('Time zone')],
    ['4', $t('Status')],
    ['5', $t('Begin')],
    ['6', $t('End')],
    ['7', $t('Deviation')],
    ['8', $t('Enabled')],
    ['9', $t('Clock base')]
  ],
  9: [
    ['1', $t('Logical name')],
    ['2', $t('Scripts')]
  ],
  11: [
    ['1', $t('Logical name')],
    ['2', $t('Entries')]
  ],
  17: [
    ['1', $t('Logical name')],
    ['2', $t('SAP assignment list')]
  ],
  18: [
    ['1', $t('Logical name')],
    ['2', $t('Image block size')],
    ['3', $t('Image transferred blocks status')],
    ['4', $t('The image first not transferred block number')],
    ['5', $t('Image transfer enabled')],
    ['6', $t('Image transfer status')],
    ['7', $t('Image to active info')]
  ],
  19: [
    ['1', $t('Logical name')],
    ['2', $t('Default mode')],
    ['3', $t('Default baudrate')],
    ['4', $t('Proposed baudrate')],
    ['5', $t('Response time')],
    ['6', $t('Device address')],
    ['7', $t('Password 1')],
    ['8', $t('Password 2')],
    ['9', $t('Password 5')]
  ],
  20: [
    ['1', $t('Logical name')],
    ['2', $t('Calendar name active')],
    ['3', $t('Season profile active')],
    ['4', $t('Week profile table active')],
    ['5', $t('Day probile table active')],
    ['6', $t('Calendar name passive')],
    ['7', $t('Season profile passive')],
    ['8', $t('Week profile table passive')],
    ['9', $t('Day profile table passive')],
    ['10', $t('Time')]
  ],
  21: [
    ['1', $t('Logical name')],
    ['2', $t('Thresholds')],
    ['3', $t('Monitored value')],
    ['4', $t('Actions')]
  ],
  22: [
    ['1', $t('Logical name')],
    ['2', $t('Executed script')],
    ['3', $t('Type')],
    ['4', $t('Execution time')]
  ],
  23: [
    ['1', $t('Logical name')],
    ['2', $t('Communication speed')],
    ['3', $t('Window size transmit')],
    ['4', $t('Window size receive')],
    ['5', $t('Maximum info field length transmit')],
    ['6', $t('Maximum info field length receive')],
    ['7', $t('Inter octet timeout')],
    ['8', $t('Inactivity timeout')],
    ['9', $t('Device address')]
  ],
  24: [
    ['1', $t('Logical name')],
    ['2', $t('Working mode')],
    ['3', $t('Communication speed')],
    ['4', $t('Primary addresses')],
    ['5', $t('TABS')]
  ],
  26: [
    ['1', $t('Logical name')],
    ['2', $t('Table id')],
    ['3', $t('Length')],
    ['4', $t('Buffer')]
  ],
  27: [
    ['1', $t('Logical name')],
    ['2', $t('Communication speed')],
    ['3', $t('Initialisation strings')],
    ['4', $t('Modem profile')]
  ],
  28: [
    ['1', $t('Logical name')],
    ['2', $t('Mode')],
    ['3', $t('Listening window')],
    ['4', $t('Status')],
    ['5', $t('Number of calls')],
    ['6', $t('Number of rings')]
  ],
  29: [
    ['1', $t('Logical name')],
    ['2', $t('Mode')],
    ['3', $t('Repetitions')],
    ['4', $t('Repetition delay')],
    ['5', $t('Calling window')],
    ['6', $t('Destination list')]
  ],
  40: [
    ['1', $t('Logical name')],
    ['2', $t('Push object list')],
    ['3', $t('Send destination and message')],
    ['4', $t('Communication window')],
    ['5', $t('Randomisation start interval')],
    ['6', $t('Number of retries')],
    ['7', $t('Repetition delay')]
  ],
  41: [
    ['1', $t('Logical name')],
    ['2', $t('Port')],
    ['3', $t('IP reference')],
    ['4', $t('Maximum segment size')],
    ['5', $t('Maximum simultaneous connections')],
    ['6', $t('Inactivity timeout')]
  ],
  42: [
    ['1', $t('Logical name')],
    ['2', $t('Data link layer reference')],
    ['3', $t('IP address')],
    ['4', $t('Multicast IP addresses')],
    ['5', $t('IP options')],
    ['6', $t('Subnet mask')],
    ['7', $t('Gateway IP address')],
    ['8', $t('Use DHCP flag')],
    ['9', $t('Primary DNS address')],
    ['10', $t('Secondary DNS address')]
  ],
  43: [
    ['1', $t('Logical name')],
    ['2', $t('MAC address')]
  ],
  45: [
    ['1', $t('Logical name')],
    ['2', $t('APN')],
    ['3', $t('PIN code')],
    ['4', $t('Quality of service')]
  ],
  47: [
    ['1', $t('Logical name')],
    ['2', $t('Operator')],
    ['3', $t('Status')],
    ['4', $t('Circuit switch status')],
    ['5', $t('Packet switch status')],
    ['6', $t('Cell information')],
    ['7', $t('Adjacent cells')],
    ['8', $t('Capture time')]
  ],
  48: [
    ['1', $t('Logical name')],
    ['2', $t('Data link layer reference')],
    ['3', $t('Address config mode')],
    ['4', $t('Unicast IPv6 addresses')],
    ['5', $t('Multicast IPv6 addresses')],
    ['6', $t('Gateway IPv6 addresses')],
    ['7', $t('Primary DNS address')],
    ['8', $t('Secondary DNS address')],
    ['9', $t('Traffic class')],
    ['10', $t('Neighbor discovery setup')]
  ],
  62: [
    ['1', $t('Logical name')],
    ['2', $t('Compact buffer')],
    ['3', $t('Capture objects')],
    ['4', $t('Template id')],
    ['5', $t('Template description')],
    ['6', $t('Capture method')]
  ],
  64: [
    ['1', $t('Logical name')],
    ['2', $t('Security policy')],
    ['3', $t('Security suite')],
    ['4', $t('Client system title')],
    ['5', $t('Server system title')]
  ],
  68: [
    ['1', $t('Logical name')],
    ['2', $t('Actions')],
    ['3', $t('Permissions table')]
  ],
  70: [
    ['1', $t('Logical name')],
    ['2', $t('Output state')],
    ['3', $t('Control state')],
    ['4', $t('Control mode')]
  ],
  71: [
    ['1', $t('Logical name')],
    ['2', $t('Monitored value')],
    ['3', $t('Threshold active')],
    ['4', $t('Threshold normal')],
    ['5', $t('Threshold emergency')],
    ['6', $t('Minimal over threshold duration')],
    ['7', $t('Minimal under threshold duration')],
    ['8', $t('Emergency profile')],
    ['9', $t('Emergency profile group ID list')],
    ['10', $t('Emergency profile active')],
    ['11', $t('Actions')]
  ]
}

export const optionTranslations = {
  short_name: () => $t('Short name'),
  logical_name: () => $t('Logical name')
}

export const useLnRefToCosemOption = {
  0: 'short_name',
  1: 'logical_name'
}

export const scanStatuses = {
  idle: 0,
  inQueue: 1,
  inProgress: 2,
  error: 3,
  completed: 4,
  stopping: 5,
  // additional statuses for more informative status messages
  starting: 6,
  incomplete: 7,
  unavailable: 8,
  loading: 9
}

export function isScanRunning(status) {
  return status === scanStatuses.inProgress || status === scanStatuses.inQueue || status === scanStatuses.stopping
}

function copyFields(obj, fields) {
  return Object.fromEntries(Object.entries(obj).filter(key_value => fields.includes(key_value[0])))
}

export function getConnectionTestData(connection, additionalFields = []) {
  let fields = ['connection_type', ...additionalFields]
  if (connection?.connection_type === '0') {
    fields.push('address', 'port')
  } else if (connection?.connection_type === '1') {
    fields.push('device', 'baudrate', 'databits', 'stopbits', 'parity', 'flowcontrol')
  }
  return copyFields(connection, fields)
}

export function getDeviceTestData(physicalDevice, additionalFields = []) {
  return copyFields(physicalDevice, [
    // Required
    'client_addr',
    'server_addr_type',
    'server_addr',
    'log_server_addr',

    // Optional
    'transport_security',
    'interface',
    'access_security',
    'password',
    'authentication_key',
    'block_cipher_key',
    'dedicated_key',
    'invocation_counter',
    'use_ln_ref',

    ...additionalFields
  ])
}

export function getGroupValueTestData(cosemValue) {
  const copied = copyFields(cosemValue, ['cosem_id', 'obis', 'short_name', 'logical_name', 'entries', 'name', 'id', 'enabled'])
  copied.devices = cosemValue.physical_device
  if (typeof cosemValue.attributes === 'string') {
    copied.attributes = cosemValue.attributes.split(' ')
  }
  return copied
}

export function isConnectionValid(connection) {
  if (connection.connection_type === '0') {
    return connection.address && connection.port
  } else if (connection.connection_type === '1') {
    return connection.device && connection.baudrate && connection.databits && connection.stopbits && connection.parity && connection.flowcontrol
  } else {
    return false
  }
}

export function isDeviceValid(physicalDevice) {
  return physicalDevice.client_addr && physicalDevice.server_addr && physicalDevice.server_addr_type && physicalDevice.log_server_addr
}

export function isGroupValueValid(cosemValue) {
  return cosemValue.physical_device && cosemValue.cosem_id && (cosemValue.obis || cosemValue.short_name || cosemValue.logical_name)
}

export function getCosemGroupTestActionPayload(formData, groupId) {
  const deviceIds = []
  const groupValues = []
  for (const groupValue of formData[`${groupId}_cosem`] || []) {
    if (groupValue.enabled !== '1') continue

    const groupValueTestData = getGroupValueTestData(groupValue)
    groupValues.push(groupValueTestData)

    for (const device of groupValueTestData.devices) {
      if (!deviceIds.includes(device)) {
        deviceIds.push(device)
      }
    }
  }

  const connectionIds = []
  const devices = []
  for (const deviceId of deviceIds) {
    const device = formData.device?.find(device => device.id === deviceId)
    if (!device) {
      $message.error($t('Configuration test failed'))
      return
    }

    if (!connectionIds.includes(device.connection)) {
      connectionIds.push(device.connection)
    }

    devices.push(getDeviceTestData(device, ['id', 'name', 'connection']))
  }

  const connections = []
  for (const connectionId of connectionIds) {
    const connection = formData.connection?.find(conn => conn.id === connectionId)
    if (!connection) {
      $message.error($t('Configuration test failed'))
      return
    }

    connections.push(getConnectionTestData(connection, ['id']))
  }

  return { object: groupValues, devices, connections }
}

export function hasDeviceWithNameReferencing(formData, physicalDeviceIds, isLogicalName) {
  const expectedUseLnRef = isLogicalName ? '1' : '0'

  const devices = formData.device || []
  for (const deviceId of physicalDeviceIds) {
    const device = devices.find(device => device.id === deviceId)
    if (!device) {
      continue
    }

    const fixedUseLnRef = device.use_ln_ref || '1'
    if (fixedUseLnRef === expectedUseLnRef) {
      return true
    }
  }
  return false
}

export function findMissingNameReferencingOptions(formData, cosem) {
  if (!cosem.physical_device?.length || !formData.device.length) return []

  const missingOptions = {}
  for (const deviceId of cosem.physical_device) {
    const device = formData.device.find(device => device.id === deviceId)
    if (!device) {
      continue
    }

    const fixedUseLnRef = device.use_ln_ref || '1'
    if (!cosem[useLnRefToCosemOption[fixedUseLnRef]]) {
      missingOptions[useLnRefToCosemOption[fixedUseLnRef]] = true
    }
  }
  return Object.keys(missingOptions).map(opt => optionTranslations[opt]())
}

export function validateCosemGroups(formData, cosemGroupId = undefined) {
  // Validation can break deep inside a modal without the users knowledge.
  // So at least try to inform the user using the page "Save & Apply"
  for (const cosemGroup of formData['cosem_group']) {
    const groupId = cosemGroup.id
    if (cosemGroupId && groupId !== cosemGroupId) continue

    const cosems = formData[`${groupId}_cosem`] || []
    for (const cosem of cosems) {
      const physicalDeviceIds = cosem.physical_device || []
      if (hasDeviceWithNameReferencing(formData, physicalDeviceIds, true)) {
        if (!cosem.logical_name) {
          return { isValid: false, message: $t("Cosem value '%s' is missing required option: %s").format(cosem.name, optionTranslations.logical_name()) }
        }
      }
      if (hasDeviceWithNameReferencing(formData, physicalDeviceIds, false)) {
        if (!cosem.short_name) {
          return { isValid: false, message: $t("Cosem value '%s' is missing required option: %s").format(cosem.name, optionTranslations.short_name()) }
        }
      }
    }
  }

  return { isValid: true }
}
