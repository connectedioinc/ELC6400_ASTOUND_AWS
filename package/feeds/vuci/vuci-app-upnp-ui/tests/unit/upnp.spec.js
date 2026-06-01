import createWrapper from '@tests/unit/mockFactory'
import Upnp from '../../src/views/services/Upnp.vue'

const expectedRedirects = [
  {
    proto: 'udp',
    extport: '8666',
    intaddr: '192.168.1.1',
    intport: '8000',
    num: 1
  },
  {
    proto: 'tcp',
    extport: '8888',
    intaddr: '192.168.1.1',
    intport: '8080',
    num: 2
  }
]

describe('Upnp.vue', () => {
  it('loads redirects after successful request', async () => {
    const successGet = {
      success: true,
      data: expectedRedirects
    }
    const wrapper = createWrapper(Upnp, {
      global: {
        mocks: {
          $axios: {
            get: () => new Promise(resolve => resolve(successGet))
          }
        }
      }
    })
    await wrapper.vm.loadRedirectData()
    expect(wrapper.vm.redirectsData).toEqual(expectedRedirects)
  })
  it.each([
    [{ data: { errors: [{ code: 2 }] } }, 'Unable to read UPNP lease file.'],
    [{ data: { errors: [{ code: 1 }] } }, 'Provided UPNP lease file path is a directory.'],
    [{ data: { errors: [{ code: 3 }] } }, 'File selected as UPNP lease file is already in use.'],
    [{ data: { errors: [{ code: 4 }] } }, 'Provided UPNP lease file path is invalid, must start with "/" and must exist.'],
    [{ data: { errors: [{ code: 5 }] } }, 'UPNP lease file path must not contain a space.'],
    [{ data: { errors: [{ code: 6 }] } }, 'An unexpected error occurred']
  ])('returns device edit error messages', (error, response) => {
    const wrapper = createWrapper(Upnp)
    expect(wrapper.vm.returnErrorMessage(error)).toEqual(response)
  })
  it('invokes error message when redirect request fails', async () => {
    const wrapper = createWrapper(Upnp)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadRedirectData()
    expect(wrapper.vm.redirectsData).toEqual([])
    expect(spy).toHaveBeenCalledWith('Failed to load UPnP redirects')
  })
  it('invokes error message when remove bulk request fails', async () => {
    const wrapper = createWrapper(Upnp)
    wrapper.vm.$axios.bulk = vi.fn()
    wrapper.vm.$axios.bulk.mockRejectedValueOnce()
    wrapper.vm.redirectsData = [{ num: 1 }]
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.removeRedirect(1)
    expect(wrapper.vm.redirectsData).toEqual([{ num: 1 }])
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('loads upnpn redirects after successful upnp redirect remove ', async () => {
    const wrapper = createWrapper(Upnp, {
      global: {
        mocks: {
          $axios: {
            bulk: () => new Promise(resolve => resolve([{ success: true }, { success: true, data: [{ num: 2 }] }]))
          }
        }
      }
    })
    wrapper.vm.redirectsData = [{ num: 1 }]
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.removeRedirect(1)
    expect(wrapper.vm.redirectsData).toEqual([{ num: 2 }])
    expect(spy).toHaveBeenCalledWith('Upnp redirect removed successfully')
  })
  it('invokes error messages when upnp delete and get bulk requests are unsuccessful', async () => {
    const wrapper = createWrapper(Upnp, {
      global: {
        mocks: {
          $axios: {
            bulk: () => new Promise(resolve => resolve([{ success: false }, { success: false }]))
          }
        }
      }
    })
    wrapper.vm.redirectsData = [{ num: 1 }]
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.removeRedirect(1)
    expect(wrapper.vm.redirectsData).toEqual([{ num: 1 }])
    expect(spy).toHaveBeenCalledWith('Failed to remove UPnP redirect')
    expect(spy).toHaveBeenCalledWith('Failed to load UPnP redirects')
  })
})
