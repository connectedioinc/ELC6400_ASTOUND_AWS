import NMEAForwarding from '../../src/views/services/NMEAForwarding.vue'
import createWrapper from '@tests/unit/mockFactory'
import { faker } from '@faker-js/faker'

describe('NMEAFowarding.vue', () => {
  it.each([
    { value: 'string', result: { isValid: false, message: 'Location must be prefixed with "/mnt/" to avoid wear out of device flash' } },
    { value: '/mnt/', result: { isValid: false, message: 'Specify file name' } },
    { value: `/mnt/${faker.string.alphanumeric(5000)}`, result: { isValid: false, message: 'Path exceeds maximum length (4095 characters).' } },
    { value: '/mnt/../etc/password', result: { isValid: false, message: 'Path contains path traversal sequences.' } },
    { value: `/mnt/${faker.string.alphanumeric(255)}`, result: { isValid: false, message: 'Path contains a filename component that exceeds 254 characters.' } },
    { value: '/mnt/testas1000', result: { isValid: false, message: 'Cache and collecting file locations must be different' } },
    { value: '/tmp/file.txt', result: { isValid: false, message: 'Location must be prefixed with "/mnt/" to avoid wear out of device flash' } },
    { value: '/var/log/data.log', result: { isValid: false, message: 'Location must be prefixed with "/mnt/" to avoid wear out of device flash' } },
    { value: '/mnt/file//with-double-slash', result: { isValid: false, message: 'Path contains consecutive slashes.' } },
    { value: '/mnt/file/.', result: { isValid: false, message: 'Path cannot end with a single or double period.' } },
    { value: '/mnt/file/..', result: { isValid: false, message: 'Path cannot end with a single or double period.' } },
    { value: '/mnt/folder/', result: { isValid: false, message: "Path cannot end with a forward slash unless it's a directory." } },
    { value: '/mnt/file\u0000hidden', result: { isValid: false, message: 'Path contains null bytes or control characters.' } },
    { value: '/mnt/file\tname', result: { isValid: false, message: 'Path contains null bytes or control characters.' } },
    { value: '/mnt/file\\backslash', result: { isValid: false, message: 'Path contains escape sequences.' } },
    { value: '/mnt/file', result: { isValid: true } },
    { value: '/mnt/test/test/test', result: { isValid: true } },
    { value: '/mnt/234 as{}df', result: { isValid: true } },
    { value: '/mnt/data-123_456', result: { isValid: true } },
    { value: '/mnt/special!@#$%^&()_+', result: { isValid: true } }
  ])('checks location validation rule', ({ value, result }) => {
    const wrapper = createWrapper(NMEAForwarding)
    wrapper.vm.formData = { nmeaGeneral: [{ collecting_location: value, location: '/mnt/testas1000' }] }
    wrapper.vm.$VuciValidator.fieldvalidation = vi.fn()
    wrapper.vm.$VuciValidator.fieldvalidation.mockReturnValueOnce(result)
    expect(wrapper.vm.validateLocation(value)).toEqual(result)
  })
  it.each([
    { value: ['test', 'test'], result: 'test;test' },
    { value: [], result: '' }
  ])('checks if value is saved correctly', ({ value, result }) => {
    const wrapper = createWrapper(NMEAForwarding)
    expect(wrapper.vm.saveHosts(value)).toEqual(result)
  })
  it.each([
    ['Location must be prefixed with /mnt/', { data: { errors: [{ code: 3 }] } }, 'Location must be prefixed with "/mnt/" to avoid wear out of device flash'],
    ['Cache file is same as collecting file', { data: { errors: [{ code: 4 }] } }, 'NMEA forwarding cache file cannot be the same as collecting file'],
    ['Path contains consecutive slashes.', { data: { errors: [{ code: 209 }] } }, 'Path contains consecutive slashes.'],
    ['Unknown error code', { data: { errors: [{ code: 999 }] } }, 'Unknown validation error.'],
    ['No error code', { data: { errors: [{}] } }, 'Unknown validation error.'],
    ['No errors array', { data: {} }, 'Unknown validation error.'],
    ['No data object', {}, 'Unknown validation error.'],
    ['Null input', null, 'Unknown validation error.']
  ])('returnErrorMessage handles %s correctly', (_, errorData, expectedMessage) => {
    const wrapper = createWrapper(NMEAForwarding)
    const result = wrapper.vm.returnErrorMessage(errorData)
    expect(result).toEqual(expectedMessage)
  })
})
