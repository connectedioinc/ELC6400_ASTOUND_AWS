<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { rules } from '@/validation-rules'
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'
import { useTranslate } from '@ui-core/composables/useI18n'

const FC_READ_COILS = '1'
const FC_READ_INPUT_COILS = '2'
const FC_READ_HOLDING_REGISTERS = '3'
const FC_READ_INPUT_REGISTERS = '4'
const FC_WRITE_SINGLE_COIL = '5'
const FC_WRITE_SINGLE_REGISTER = '6'
const FC_WRITE_MULTIPLE_COILS = '15'
const FC_WRITE_MULTIPLE_REGISTERS = '16'

function createDataType(bitSize = undefined, numberType = undefined) {
  return {
    numberType,
    bitSize
  }
}

// When adding new data types to `DATA_TYPES_METADATA`, dont' forget to update `dataTypeNamesTable` in `convertDataTypesToTuples`
const DATA_TYPES_METADATA = {
  '8bit_int': createDataType(8, 'int'),
  '8bit_uint': createDataType(8, 'uint'),

  '16bit_int_hi_first': createDataType(16, 'int'),
  '16bit_int_low_first': createDataType(16, 'int'),
  '16bit_uint_hi_first': createDataType(16, 'uint'),
  '16bit_uint_low_first': createDataType(16, 'uint'),

  '32bit_float1234': createDataType(32, 'float'),
  '32bit_float4321': createDataType(32, 'float'),
  '32bit_float2143': createDataType(32, 'float'),
  '32bit_float3412': createDataType(32, 'float'),

  '32bit_int1234': createDataType(32, 'int'),
  '32bit_int4321': createDataType(32, 'int'),
  '32bit_int2143': createDataType(32, 'int'),
  '32bit_int3412': createDataType(32, 'int'),

  '32bit_uint1234': createDataType(32, 'uint'),
  '32bit_uint4321': createDataType(32, 'uint'),
  '32bit_uint2143': createDataType(32, 'uint'),
  '32bit_uint3412': createDataType(32, 'uint'),

  '64bit_int12345678': createDataType(64, 'int'),
  '64bit_int87654321': createDataType(64, 'int'),
  '64bit_int21436587': createDataType(64, 'int'),
  '64bit_int78563412': createDataType(64, 'int'),

  '64bit_uint12345678': createDataType(64, 'uint'),
  '64bit_uint87654321': createDataType(64, 'uint'),
  '64bit_uint21436587': createDataType(64, 'uint'),
  '64bit_uint78563412': createDataType(64, 'uint'),

  '64bit_double12345678': createDataType(64, 'float'),
  '64bit_double87654321': createDataType(64, 'float'),
  '64bit_double21436587': createDataType(64, 'float'),
  '64bit_double78563412': createDataType(64, 'float'),

  ascii: createDataType(8),
  hex: createDataType(8),
  bool: createDataType(1),
  pdu: createDataType()
}

function isModbusReadFunction(functionCode) {
  return [FC_READ_COILS, FC_READ_INPUT_COILS, FC_READ_HOLDING_REGISTERS, FC_READ_INPUT_REGISTERS].includes(functionCode)
}

function isModbusWriteFunction(functionCode) {
  return [FC_WRITE_SINGLE_COIL, FC_WRITE_SINGLE_REGISTER, FC_WRITE_MULTIPLE_COILS, FC_WRITE_MULTIPLE_REGISTERS].includes(functionCode)
}

/** @typedef {import('@/types/tagTypes').ModbusServerTagConfig} ModbusServerTagConfig */
/** @typedef {import('@/types/modbusTypes').ModbusReadFunctionType} ModbusReadFunctionType */
/** @typedef {import('./ModbusServerCommon').ModbusTcpServerConfig} ModbusTcpServerConfig */
/** @typedef {import('./ModbusServerCommon').ModbusSerialServerConfig} ModbusSerialServerConfig */

const $t = useTranslate()
const { getTagSize } = useUniversalGatewayUtils()
/**
 * @type {Record<ModbusReadFunctionType, number>}
 */
const MODBUS_DATA_BYTES = {
  1: 0.125,
  2: 0.125,
  3: 2,
  4: 2,
  5: 0.125,
  6: 2,
  15: 0.125,
  16: 2
}

/**
 * @param {ModbusReadFunctionType | undefined} modbusType
 * @return {number}
 */
export function getModbusDataBytes(modbusType) {
  return MODBUS_DATA_BYTES[modbusType]
}
/**
 * @param {string | undefined} modbusRegNum
 * @param {ModbusReadFunctionType | undefined} modbusType
 * @param {number | undefined} tagSize
 * @return {[number, number] | undefined}
 */
export function getOccupiedRegisterRange(modbusRegNum, modbusType, tagSize) {
  if (!modbusRegNum || !modbusType || !tagSize) return undefined

  const regNumbers = Math.ceil(tagSize / MODBUS_DATA_BYTES[modbusType]) - 1
  const regStart = Number(modbusRegNum)
  if (isNaN(regStart)) return undefined

  const regEnd = regStart + regNumbers
  return [regStart, regEnd]
}

function isRegistersOverlapping(registerRange, otherRegisterRange) {
  return registerRange[0] <= otherRegisterRange[1] && otherRegisterRange[0] <= registerRange[1]
}

/**
 * @param {{tag_permissions: 'r' | 'w' | 'rw', modbus_type: string, modbus_reg_num: string, [key: string]: any} | undefined} section
 * @param {{tags: ModbusServerTagConfig[]; [key: string]: any }} uciData
 * @param {[number, number] | undefined} registerRange
 * @param {boolean} checkItself
 * @return {ModbusServerTagConfig | undefined}
 */
function findOverlappedRegister(section, uciData, registerRange, checkItself) {
  const definedKeys = ['tag_permissions', 'modbus_type', 'modbus_reg_num']
  if (!section || definedKeys.some(key => !section[key]) || !registerRange) return

  return uciData.tags.find(otherTag => {
    const skipSelf = !checkItself && otherTag.id === section.id
    if (skipSelf) return
    const isPermsNonOverlapping = otherTag.tag_permissions && otherTag.tag_permissions === section.tag_permissions
    if (otherTag.enabled === '1' && otherTag.modbus_type === section.modbus_type && isPermsNonOverlapping) {
      const otherRegisterRange = getOccupiedRegisterRange(otherTag.modbus_reg_num, otherTag.modbus_type, getTagSize(otherTag))
      return !!otherRegisterRange && isRegistersOverlapping(registerRange, otherRegisterRange)
    }
  })
}

/**
 * @param {ModbusServerTagConfig} section
 * @param {{tags: ModbusServerTagConfig[]; [key: string]: any }} uciData
 * @param {boolean} isTcp
 * @param {ModbusTcpServerConfig[] | ModbusSerialServerConfig[]} servers
 * @return {{isValid: boolean, message: string}}
 */
export function validateRegisterOverlap(section, uciData, isTcp, servers) {
  const newRegisterRange = getOccupiedRegisterRange(section.modbus_reg_num, section.modbus_type, getTagSize(section))
  if (!newRegisterRange) return { isValid: true }

  if (section.modbus_type === '3' || section.modbus_type === '4') {
    const modbusDevConfig = isTcp ? 'modbus' : section.modbus_dev_config
    const overlappedServerRegister = servers.find(server => {
      if (server.id === modbusDevConfig && server.enabled === '1' && server.clientregs === '1') {
        const serverRegisterRange = [Number(server.regfilestart), Number(server.regfilestart) + Number(server.regfilesize) - 1]
        return isRegistersOverlapping(newRegisterRange, serverRegisterRange)
      }
    })
    if (overlappedServerRegister) return { isValid: false, message: $t("Register range overlaps with server's custom register block") }
  }
  const overlappedRegister = findOverlappedRegister(section, uciData, newRegisterRange, false)
  if (overlappedRegister) return { isValid: false, message: $t("Register range overlaps with register '%s'").format(overlappedRegister.tag_name) }

  return { isValid: true }
}

export default {
  inject: ['formOptions'],

  computed: {
    ...mapState(useMainStore, ['board']),

    simCount() {
      if (!this.board.hwinfo.mobile || !this.board.modems.length) return 0
      return this.$mobile.simCount(this.$mobile.parseModems(this.$store.board.modems || []))
    },
    jsonParameters() {
      let textBoxParameters = [
        { parameter: '%ts', description: this.$t('Local time') },
        { parameter: '%ut', description: this.$t('Unix time') },
        { parameter: '%rn', description: this.$t('Router name') },
        { parameter: '%pc', description: this.$t('Device name') },
        { parameter: '%sn', description: this.$t('Serial number') },
        { parameter: '%fc', description: this.$t('Current %s version').format('FW') },
        { parameter: '%li', description: this.$t('%s address').format('LAN IP') },
        { parameter: '%ms', description: this.$t('Monitoring status') },
        { parameter: '%it', description: this.$t('%s time in %s').format('UTC', 'ISO') },
        { parameter: '%wi', description: this.$t('%s address').format('WAN IPv4') },
        { parameter: '%ws', description: this.$t('%s address').format('WAN IPv6') },
        { parameter: '%nl', description: this.$t('New line') },
        { parameter: '%id', description: this.$t('Modbus server %s').format('ID') },
        { parameter: '%ip', description: this.$t('Modbus server %s').format('IP') },
        { parameter: '%fn', description: this.$t('First register number') },
        { parameter: '%rv', description: this.$t('Register value') }
      ]
      const modemParameters = [
        { parameter: '%mi', description: this.$t('Mobile %s addresses').format('IP') },
        { parameter: '%ss', description: this.$t('Signal strength') },
        { parameter: '%on', description: this.$t('Operator name') },
        { parameter: '%ct', description: this.$t('Network type') },
        { parameter: '%cs', description: this.$t('Data connection state') },
        { parameter: '%ns', description: this.$t('Network state') },
        { parameter: '%im', description: 'IMSI' },
        { parameter: '%ie', description: 'IMEI' },
        { parameter: '%md', description: this.$t('Modem model') },
        { parameter: '%is', description: this.$t('Modem serial number') },
        { parameter: '%ps', description: this.$t('%s state').format('SIM PIN') },
        { parameter: '%st', description: this.$t('%s state').format('SIM') },
        { parameter: '%cp', description: 'RSCP' },
        { parameter: '%ec', description: 'ECIO' },
        { parameter: '%rp', description: 'RSRP' },
        { parameter: '%sr', description: 'SINR' },
        { parameter: '%rq', description: 'RSRQ' },
        { parameter: '%ic', description: 'ICCID' },
        { parameter: '%ci', description: 'CELLID' },
        { parameter: '%nb', description: this.$t('Neighbour cells') },
        { parameter: '%ni', description: this.$t('Network info') },
        { parameter: '%sv', description: this.$t('Network serving') }
      ]
      if (this.board.hwinfo.mobile) {
        if (this.simCount > 1) textBoxParameters.push({ parameter: '%su', description: this.$t('%s slot in use').format('SIM') })
        textBoxParameters = textBoxParameters.concat(modemParameters)
      }
      if (this.board.network?.wan) textBoxParameters.push({ parameter: '%wm', description: this.$t('%s address').format('WAN MAC') })
      const ifnames = this.board.network?.lan?.ifname?.split(' ')
      /** @type {import('@/types/networkDeviceTypes').DeviceStatus[]} */
      const deviceList = this.formOptions().deviceList
      const includedDevices = deviceList.some(device => ifnames?.includes(device.name))
      if ((ifnames?.length > 1 && includedDevices) || (includedDevices && this.board.hwinfo.ethernet))
        textBoxParameters.push({ parameter: '%lm', description: this.$t('%s address').format('LAN MAC') })
      const ioList = this.$io
        .getFilteredPinsInfo(this.formOptions().io)
        .filter(io => ['gpio', 'dwi', 'relay', 'adc', 'acl'].includes(io.type))
        .map(io => ({ parameter: `%${io.io_param}`, description: io.name_with_pins }))
      textBoxParameters.push(...ioList)
      return textBoxParameters
    }
  },
  methods: {
    isModbusReadFunction,
    isModbusWriteFunction,
    convertDataTypesToTuples(dataTypeNames) {
      // This funciton names like 'bool' into ['bool', $t('Bool')] tuples. Mainly used for display purposes

      // It is important that `data_type_names` is inside a method and not outside near `DATA_TYPES_METADATA`
      // So that $t() could be used
      const dataTypeNamesTable = {
        '8bit_int': this.$t('8bit INT'),
        '8bit_uint': this.$t('8bit UINT'),

        '16bit_int_hi_first': this.$t('16bit INT, high byte first'),
        '16bit_int_low_first': this.$t('16bit INT, low byte first'),
        '16bit_uint_hi_first': this.$t('16bit UINT, high byte first'),
        '16bit_uint_low_first': this.$t('16bit UINT, low byte first'),

        '32bit_float1234': this.$t('32bit float, Byte order %s').format('1,2,3,4'),
        '32bit_float4321': this.$t('32bit float, Byte order %s').format('4,3,2,1'),
        '32bit_float2143': this.$t('32bit float, Byte order %s').format('2,1,4,3'),
        '32bit_float3412': this.$t('32bit float, Byte order %s').format('3,4,1,2'),

        '32bit_int1234': this.$t('32bit INT, Byte order %s').format('1,2,3,4'),
        '32bit_int4321': this.$t('32bit INT, Byte order %s').format('4,3,2,1'),
        '32bit_int2143': this.$t('32bit INT, Byte order %s').format('2,1,4,3'),
        '32bit_int3412': this.$t('32bit INT, Byte order %s').format('3,4,1,2'),

        '32bit_uint1234': this.$t('32bit UINT, Byte order %s').format('1,2,3,4'),
        '32bit_uint4321': this.$t('32bit UINT, Byte order %s').format('4,3,2,1'),
        '32bit_uint2143': this.$t('32bit UINT, Byte order %s').format('2,1,4,3'),
        '32bit_uint3412': this.$t('32bit UINT, Byte order %s').format('3,4,1,2'),

        '64bit_int12345678': this.$t('64bit INT, Byte order %s').format('1,2,3,4,5,6,7,8'),
        '64bit_int87654321': this.$t('64bit INT, Byte order %s').format('8,7,6,5,4,3,2,1'),
        '64bit_int21436587': this.$t('64bit INT, Byte order %s').format('2,1,4,3,6,5,8,7'),
        '64bit_int78563412': this.$t('64bit INT, Byte order %s').format('7,8,5,6,3,4,1,2'),

        '64bit_uint12345678': this.$t('64bit UINT, Byte order %s').format('1,2,3,4,5,6,7,8'),
        '64bit_uint87654321': this.$t('64bit UINT, Byte order %s').format('8,7,6,5,4,3,2,1'),
        '64bit_uint21436587': this.$t('64bit UINT, Byte order %s').format('2,1,4,3,6,5,8,7'),
        '64bit_uint78563412': this.$t('64bit UINT, Byte order %s').format('7,8,5,6,3,4,1,2'),

        '64bit_double12345678': this.$t('64bit float, Byte order %s').format('1,2,3,4,5,6,7,8'),
        '64bit_double87654321': this.$t('64bit float, Byte order %s').format('8,7,6,5,4,3,2,1'),
        '64bit_double21436587': this.$t('64bit float, Byte order %s').format('2,1,4,3,6,5,8,7'),
        '64bit_double78563412': this.$t('64bit float, Byte order %s').format('7,8,5,6,3,4,1,2'),

        ascii: this.$t('ASCII'),
        hex: this.$t('Hex'),
        bool: this.$t('Bool'),
        pdu: this.$t('PDU')
      }

      return dataTypeNames.map(name => [name, this.$t(dataTypeNamesTable[name])])
    },
    listModbusDataTypes(functionCode, includePdu = false) {
      if (functionCode === FC_WRITE_SINGLE_COIL) {
        return this.convertDataTypesToTuples(['bool'])
      } else if (functionCode === FC_WRITE_SINGLE_REGISTER) {
        return this.convertDataTypesToTuples(['8bit_int', '8bit_uint', '16bit_int_hi_first', '16bit_int_low_first', '16bit_uint_hi_first', '16bit_uint_low_first', 'ascii', 'hex', 'bool'])
      } else {
        const dataTypeNames = [
          '8bit_int',
          '8bit_uint',
          '16bit_int_hi_first',
          '16bit_int_low_first',
          '16bit_uint_hi_first',
          '16bit_uint_low_first',
          '32bit_float1234',
          '32bit_float4321',
          '32bit_float2143',
          '32bit_float3412',
          '32bit_int1234',
          '32bit_int4321',
          '32bit_int2143',
          '32bit_int3412',
          '32bit_uint1234',
          '32bit_uint4321',
          '32bit_uint2143',
          '32bit_uint3412',
          '64bit_int12345678',
          '64bit_int87654321',
          '64bit_int21436587',
          '64bit_int78563412',
          '64bit_uint12345678',
          '64bit_uint87654321',
          '64bit_uint21436587',
          '64bit_uint78563412',
          '64bit_double12345678',
          '64bit_double87654321',
          '64bit_double21436587',
          '64bit_double78563412',
          'ascii',
          'hex',
          'bool'
        ]

        if (this.isModbusReadFunction(functionCode) && includePdu) {
          dataTypeNames.push('pdu')
        }

        return this.convertDataTypesToTuples(dataTypeNames)
      }
    },
    validateBigIntRange(value, min, max) {
      if (!/^((0)|(-?[1-9][0-9]*))$/.test(value)) {
        return { isValid: false, message: this.$t('Value must be a valid integer') }
      }

      const bigInt = BigInt(value)

      return {
        isValid: min <= bigInt && bigInt <= max,
        message: this.$t('Range of the value must be from %s to %s').format(min, max)
      }
    },
    validateNumberValue(value, numberType, bitSize) {
      if (numberType === 'int') {
        if (bitSize === 8) {
          return rules.irange(value, '-128', '127')
        } else if (bitSize === 16) {
          return rules.irange(value, '-32768', '32767')
        } else if (bitSize === 32) {
          return rules.irange(value, '-2147483648', '2147483647')
        } else if (bitSize === 64) {
          const minInt64 = BigInt.asIntN(64, 2n ** 63n)
          const maxInt64 = BigInt.asIntN(64, 2n ** (64n - 1n) - 1n)
          return this.validateBigIntRange(value, minInt64, maxInt64)
        }
      } else if (numberType === 'uint') {
        if (bitSize === 8) {
          return rules.irange(value, '0', '255')
        } else if (bitSize === 16) {
          return rules.irange(value, '0', '65535')
        } else if (bitSize === 32) {
          return rules.irange(value, '0', '4294967295')
        } else if (bitSize === 64) {
          const minUint64 = BigInt.asUintN(64, 0n)
          const maxUint64 = BigInt.asUintN(64, 2n ** 64n - 1n)
          return this.validateBigIntRange(value, minUint64, maxUint64)
        }
      } else if (numberType === 'float') {
        const parsed = Number(value)
        const isValid = !isNaN(parsed) && Math.abs(parsed) !== Infinity
        return {
          isValid,
          message: this.$t('Only floating point numbers are accepted')
        }
      }

      return {
        isValid: false,
        message: this.$t('Invalid number type')
      }
    },
    validateWriteSingleValue(value, dataType, maxRegisters) {
      if (dataType === 'bool') {
        return {
          isValid: ['0', '1'].includes(value),
          message: maxRegisters === 1 ? this.$t('Only a single bool value is accepted') : this.$t('Only bool values are accepted')
        }
      } else if (dataType === 'ascii') {
        const fixedValue = value.replace(/\\u00[a-fA-F0-9][a-fA-F0-9]/g, '_')
        const limit = maxRegisters === 1 ? 2 : 250
        return {
          isValid: fixedValue.length <= limit,
          message: this.$t('Only %s characters are allowed').format(limit)
        }
      } else if (dataType === 'hex') {
        const result = rules.hexstring(value)
        return {
          isValid: result.isValid && value.length === 2,
          message: this.$t('A hexadecimal byte is accepted. From 00 to FF.')
        }
      }

      const metadata = DATA_TYPES_METADATA[dataType]
      if (metadata?.numberType && metadata?.bitSize) {
        return this.validateNumberValue(value, metadata.numberType, metadata.bitSize)
      }

      return {
        isValid: false,
        message: this.$t('Invalid value data type')
      }
    },
    validateWriteMultipleValue(value, dataType, maxRegisters) {
      // Skip splitting by spaces, because in ASCII data format a space is also valid data.
      if (dataType === 'ascii') {
        return this.validateWriteSingleValue(value, dataType, maxRegisters)
      }

      const values = value.split(' ')

      const metadata = DATA_TYPES_METADATA[dataType]
      if (metadata?.bitSize) {
        const maxLength = Math.floor((maxRegisters * 16) / metadata.bitSize)
        if (values.length > maxLength) {
          return {
            isValid: false,
            message: this.$t('Only %s values are allowed').format(maxLength)
          }
        }
      }

      for (const val of values) {
        const result = this.validateWriteSingleValue(val, dataType, maxRegisters)
        if (!result.isValid) return result
      }

      return { isValid: true }
    },
    validateModbusValue(value, functionCode, dataType) {
      if ([FC_READ_COILS, FC_READ_INPUT_COILS].includes(functionCode)) {
        return rules.irange(value, '1', '2000')
      } else if ([FC_READ_HOLDING_REGISTERS, FC_READ_INPUT_REGISTERS].includes(functionCode)) {
        return rules.irange(value, '1', '125')
      } else if (functionCode === FC_WRITE_SINGLE_COIL) {
        return this.validateWriteSingleValue(value, dataType, 1)
      } else if (functionCode === FC_WRITE_SINGLE_REGISTER) {
        return this.validateWriteMultipleValue(value, dataType, 1)
      } else if ([FC_WRITE_MULTIPLE_COILS, FC_WRITE_MULTIPLE_REGISTERS].includes(functionCode)) {
        return this.validateWriteMultipleValue(value, dataType, 123)
      } else {
        return { isValid: false, message: this.$t('Unrecognized function code') }
      }
    },
    /**
     * @param {{tags: ModbusServerTagConfig[]; [key: string]: any }} uciData
     */
    isRequestOverlappingRegisters(request, uciData) {
      const reqBytes = (DATA_TYPES_METADATA[request.data_type]?.bitSize || 8) / 8
      const reqRegisterRange = getOccupiedRegisterRange(request.first_reg, request.function, reqBytes)
      const reqPermissions = (isModbusReadFunction(request.function) && 'r') || (isModbusWriteFunction(request.function) && 'w')

      const registerSection = {
        modbus_type: request.function,
        modbus_reg_num: request.first_reg,
        tag_permissions: reqPermissions
      }
      return !!findOverlappedRegister(registerSection, uciData, reqRegisterRange, true)
    }
  }
}
</script>
