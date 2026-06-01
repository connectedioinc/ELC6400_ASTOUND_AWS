import ModbusServerMixin from '../../src/views/services/ModbusCommonFunctionMixin.vue'
import ModbusServer from '../../src/views/services/ModbusServer.vue'
import createWrapper from '@tests/unit/mockFactory'
import { faker } from '@faker-js/faker'

const stubs = {
  'tlt-horizontal-card': { template: '<div />' }
}

it('should detect duplicate register file paths in serial servers', () => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })

  const section = { id: '1', regfile: '/tmp/regfile.json' }
  const serialServers = [{ id: '2', regfile: '/tmp/regfile.json', name: 'Serial Server 1' }]

  expect(wrapper.vm.regFileValidate('', section, serialServers)).toEqual({
    isValid: false,
    message: wrapper.vm.$t("Register file path is already used in '%s' Modbus TCP/Serial server instance").format('Serial Server 1')
  })
})

it('should detect duplicate register file paths in TCP servers', () => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })

  const section = { id: '1', regfile: '/var/regfile.json' }
  const serialServers = []
  const tcpServers = [{ id: '2', regfile: '/tmp/regfile.json', name: 'TCP Server 1' }]

  expect(wrapper.vm.regFileValidate('', section, serialServers, tcpServers)).toEqual({
    isValid: false,
    message: wrapper.vm.$t("Register file path is already used in '%s' Modbus TCP/Serial server instance").format('TCP Server 1')
  })
})

it('should normalize paths when checking for duplicates', () => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })

  const section = { id: '1', regfile: '/var/regfile.json' }
  const serialServers = []
  const tcpServers = [{ id: '2', regfile: '/tmp/regfile.json', name: 'TCP Server 1' }]

  expect(wrapper.vm.regFileValidate('', section, serialServers, tcpServers)).toEqual({
    isValid: false,
    message: wrapper.vm.$t("Register file path is already used in '%s' Modbus TCP/Serial server instance").format('TCP Server 1')
  })
})

it('should allow valid paths with no duplicates', () => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })

  const section = { id: '1', regfile: '/var/unique-file.json' }
  const serialServers = [{ id: '2', regfile: '/tmp/other-file.json', name: 'Serial Server 1' }]
  const tcpServers = [{ id: '3', regfile: '/tmp/another-file.json', name: 'TCP Server 1' }]

  expect(wrapper.vm.regFileValidate('', section, serialServers, tcpServers)).toEqual({ isValid: true })
})

it.each([
  ['', { isValid: false, message: 'Path must be a non-empty string.' }],
  [`/mnt/${faker.string.alphanumeric(255)}/test`, { isValid: false, message: 'Path contains a filename component that exceeds 254 characters.' }],
  ['/path/with/', { isValid: false, message: "Path cannot end with a forward slash unless it's a directory." }],
  ['/path/with\\backslash', { isValid: false, message: 'Path contains escape sequences.' }],
  ['/path//with/cons', { isValid: false, message: 'Path contains consecutive slashes.' }],
  ['/path/ending/with/.', { isValid: false, message: 'Path cannot end with a single or double period.' }],
  ['../../../etc/passwd', { isValid: false, message: 'Path contains path traversal sequences.' }],
  ['/path/with/control\x01char', { isValid: false, message: 'Path contains null bytes or control characters.' }]
])('should validate paths for various issues (%s)', (value, result) => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })
  expect(wrapper.vm.regFileValidate('', { regfile: value }, [])).toEqual(result)
})

it('should not detect the same instance as a duplicate', () => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })

  const section = { id: '1', regfile: '/tmp/regfile.json' }
  const serialServers = [
    { id: '1', regfile: '/tmp/regfile.json', name: 'Serial Server 1' } // Same ID as section
  ]

  expect(wrapper.vm.regFileValidate('', section, serialServers)).toEqual({ isValid: true })
})

it('should provide correct first register number for switches and non-switches', () => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })

  wrapper.vm.$store.isSwitch = true
  expect(wrapper.vm.getRegFileFirstRegister({})).toBe('10000')

  wrapper.vm.$store.isSwitch = false
  expect(wrapper.vm.getRegFileFirstRegister({})).toBe('1025')
})

it('should validate first register number based on device type', () => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })

  wrapper.vm.$store.isSwitch = true
  expect(wrapper.vm.validateRegFileFirstRegister('9999')).toEqual({
    isValid: false,
    message: wrapper.vm.$t('Value must be an integer and range of the value must be from %s to %s.').format('10000', '65536')
  })
  expect(wrapper.vm.validateRegFileFirstRegister('10000')).toEqual({ isValid: true })

  wrapper.vm.$store.isSwitch = false
  expect(wrapper.vm.validateRegFileFirstRegister('1024')).toEqual({
    isValid: false,
    message: wrapper.vm.$t('Value must be an integer and range of the value must be from %s to %s.').format('1025', '65536')
  })
  expect(wrapper.vm.validateRegFileFirstRegister('1025')).toEqual({ isValid: true })
})

it('should skip overlap warning for switches', () => {
  const wrapper = createWrapper(ModbusServer, { global: { stubs, mixins: [ModbusServerMixin] } })
  const warnSpy = vi.spyOn(wrapper.vm.$notification, 'warning')
  const removeSpy = vi.spyOn(wrapper.vm.$notification, 'remove')

  wrapper.vm.$store.isSwitch = true
  wrapper.vm.showOverlapWarning({ clientregs: '1', enabled: '1' })
  expect(warnSpy).not.toHaveBeenCalled()

  wrapper.vm.$store.isSwitch = false
  wrapper.vm.showOverlapWarning({ clientregs: '1', enabled: '1' })
  expect(warnSpy).toHaveBeenCalled()

  wrapper.vm.showOverlapWarning({ clientregs: '0', enabled: '1' })
  expect(removeSpy).toHaveBeenCalled()
})
