import FwVerify from '../../src/views/system/FwVerify.vue'
import { default as _createWrapper, mergeDeep } from '@tests/unit/mockFactory'

const createWrapper = (component, options = {}) => {
  const defaultOptions = {
    global: {
      stubs: {
        VerifyModal: { template: '<div><slot :is-mobile="true" /></div>' }
      }
    }
  }

  return _createWrapper(component, mergeDeep(defaultOptions, options))
}

describe('fw verify tests', () => {
  it('invokes message when modem upgrade is rejectes', async () => {
    const wrapper = createWrapper(FwVerify)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.upgradeModem()
    expect(spy).toHaveBeenCalledWith('Failed to upgrade modem')
  })
  it('calls reconnect when modem is upgraded', async () => {
    const wrapper = createWrapper(FwVerify, { propsData: { keepSettings: true } })
    const spy = vi.spyOn(wrapper.vm, '$reconnect')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce()
    await wrapper.vm.upgradeModem()
    expect(spy).toHaveBeenCalledWith('Upgrading...')
  })
  it('calls reconnect when device is upgraded with keep settings', async () => {
    const wrapper = createWrapper(FwVerify, {
      propsData: { keepSettings: true },
      mocks: {
        $store: {
          board: {
            network: {
              lan: {
                default_ip: '192.168.1.1'
              }
            }
          }
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm, '$reconnect')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ data: { test: 'test' } })
    await wrapper.vm.upgradeFirmware()
    expect(spy).toHaveBeenCalledWith('Upgrading...', { eraseData: null, messageDelay: 100 })
  })
  it('calls reconnect when device is upgraded without keep settings', async () => {
    propsData.fwData = { newer: '0' }
    const wrapper = createWrapper(FwVerify, {
      propsData: { keepSettings: true },
      mocks: {
        $store: {
          board: {
            network: {
              lan: {
                default_ip: null
              }
            }
          }
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm, '$reconnect')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ data: { test: 'test' } })
    await wrapper.vm.upgradeFirmware()
    expect(spy).toHaveBeenCalledWith('Upgrading...', { eraseData: null, messageDelay: 100 })
  })
  it('invokes message when device upgrade is rejected', async () => {
    const wrapper = createWrapper(FwVerify)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.upgradeFirmware()
    expect(spy).toHaveBeenCalledWith('Failed to upgrade firmware')
  })
  it.each([
    ['when modem is uploaded', { fwType: 'modem' }, 0, 1],
    ['when device is uploaded', { fwType: 'device' }, 1, 0]
  ])('invokes upgrade function %s', (type, data, fw, modem) => {
    propsData.fwData = data
    const wrapper = createWrapper(FwVerify, { propsData })
    wrapper.vm.upgradeFirmware = vi.fn()
    const spy = vi.spyOn(wrapper.vm, 'upgradeFirmware')
    wrapper.vm.upgradeModem = vi.fn()
    const spy2 = vi.spyOn(wrapper.vm, 'upgradeModem')
    wrapper.vm.upgrade()
    expect(spy).toHaveBeenCalledTimes(fw)
    expect(spy2).toHaveBeenCalledTimes(modem)
  })
  it.each([
    ['with keep settings', true, { fwType: 'device', newer: '1' }, true],
    ['without keep settings', false, { fwType: 'device', newer: '0' }, false]
  ])('returns condition value %s', (type, keep, data, response) => {
    propsData.fwData = data
    propsData.keepSettings = keep
    const wrapper = createWrapper(FwVerify, { propsData })
    const val = wrapper.vm.keepSettingsValue
    expect(val).toEqual(response)
  })
  it.each([
    ['authorized', { fwType: 'device', newer: '1', authorized: '1' }, 'Authorized Firmware'],
    ['unauthorized', { fwType: 'devicae', newer: '0' }, 'Unauthorized Firmware']
  ])('returns authorization when %s', (type, data, response) => {
    propsData.fwData = data
    const wrapper = createWrapper(FwVerify, { propsData })
    const val = wrapper.vm.authorization
    expect(val).toEqual(response)
  })
  it.each([
    ['authorized', { fwType: 'device', newer: '0', authorized: '1' }, 'Uploaded firmware is digitally signed and authorized by test.'],
    ['unauthorized', { fwType: 'devicae', newer: '1' }, 'Uploaded firmware image is NOT digitally signed by test. Continue with caution.']
  ])('returns authorization when %s', (type, data, response) => {
    propsData.fwData = data
    const wrapper = createWrapper(FwVerify, { propsData })
    const val = wrapper.vm.authorizationSubText
    expect(val).toEqual(response)
  })
  it.each([
    ['modem upgrade is canceled', { fwType: 'modem' }, true],
    ['device upgrade is canceled', { fwType: 'device' }, true]
  ])('sets canceled prop when %s', async (type, data, response) => {
    propsData.fwData = data
    const wrapper = createWrapper(FwVerify, { propsData })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.cancelUpgrade()
    expect(wrapper.vm.canceled).toEqual(response)
    expect(spy).toHaveBeenCalledTimes(0)
  })
  const propsData = {
    keepSettings: true,
    fwData: {}
  }
  it.each([
    ['authorized', true, { fwType: 'device', newer: '0', authorized: '1' }, 'Files will be erased. Uploaded firmware image version is older than current firmware version.'],
    ['unauthorized', false, { fwType: 'devicae', newer: '1' }, 'Files will be kept.'],
    ['authorized with packages', true, { fwType: 'device', newer: '1', packages: ['test'] }, 'Files will be kept.<br>Installed packages from package manager will be redownloaded after installation.'],
    [
      'authorized and older version with packages',
      true,
      { fwType: 'device', newer: '0', packages: ['test'] },
      'Files will be erased. Uploaded firmware image version is older than current firmware version.<br>Installed packages from package manager will be deleted and will need to be downloaded manually.'
    ],
    ['authorized and older version with packages', false, { fwType: 'device', newer: '1', packages: ['test'] }, 'Files will be erased.<br>Installed packages from package manager will be deleted.'],
    ['authorized and older version with packages', false, { fwType: 'device', newer: '1', packages: [] }, 'Files will be erased.']
  ])('returns authorization when %s', (type, keep, data, response) => {
    propsData.fwData = data
    propsData.keepSettings = keep
    const wrapper = createWrapper(FwVerify, { propsData })
    const val = wrapper.vm.configuration
    expect(val).toEqual(response)
  })
})
