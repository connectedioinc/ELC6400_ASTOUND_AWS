import RutFota from '../../src/views/system/RutFota.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('RutFota.vue', () => {
  it('updates fota info state in store after saving', async () => {
    const wrapper = createWrapper(RutFota, {
      data: () => ({ formData: { rutFota: [{ enabled: '1' }] } }),
      global: {
        mocks: {
          $store: {
            fotaInfo: {
              enabled: '0',
              notify: '0',
              notify_modem: '0'
            }
          }
        }
      }
    })
    const data = {
      success: true,
      data: {
        '.type': 'rut_fota',
        enabled: '1',
        notify: '1',
        id: 'general'
      }
    }
    wrapper.vm.afterSave(null, data)
    const data2 = {
      success: true,
      data: {
        '.type': 'dfota',
        notify: '1'
      }
    }
    wrapper.vm.afterSaveDfota(null, data2)
    expect(wrapper.vm.$store.fotaInfo).toEqual({
      enabled: '1',
      notify: '1',
      notify_modem: '1'
    })
  })
  it('fails to update fota info state in store after saving', async () => {
    const wrapper = createWrapper(RutFota, {
      data: () => ({ formData: { rutFota: [{ enabled: '1' }] } }),
      global: {
        mocks: {
          $store: {
            fotaInfo: {
              enabled: '0',
              notify: '0',
              notify_modem: '0'
            }
          }
        }
      }
    })
    const data = {
      success: false,
      data: {
        enabled: '1',
        notify: '1',
        id: 'general'
      }
    }
    wrapper.vm.afterSave(null, data)
    const data2 = {
      success: false,
      data: {
        notify: '1'
      }
    }
    wrapper.vm.afterSaveDfota(null, data2)
    expect(wrapper.vm.$store.fotaInfo).toEqual({
      enabled: '0',
      notify: '0',
      notify_modem: '0'
    })
  })
})
