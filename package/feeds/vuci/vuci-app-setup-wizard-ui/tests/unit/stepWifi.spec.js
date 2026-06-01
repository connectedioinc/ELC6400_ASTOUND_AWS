import createWrapper from '@tests/unit/mockFactory'
import StepWifi from '../../src/views/system/StepWifi.vue'
import { axios } from '@ui-core/plugins/axios'

const constantForm = {
  devices: [
    { device: 'radio0', mode: 'ap' },
    { device: 'radio1', mode: 'ap' }
  ]
}

describe('StepWifi.vue', () => {
  let form
  let wrapper
  beforeEach(() => {
    form = JSON.parse(JSON.stringify(constantForm))
    wrapper = createWrapper(StepWifi)
  })
  it('loads device and modem data when requests are successful', async () => {
    const deviceOptions = { options: { countrylist: [{ ccode: '00', alpha2: '00', name: 'World' }] } }
    vi.spyOn(axios, 'get').mockResolvedValueOnce({ success: true, data: deviceOptions })
    const res = await wrapper.vm.loadData(form)
    expect(wrapper.vm.deviceOptions).toEqual(deviceOptions)
    expect(res).toEqual(form)
  })
  it('invokes device and modem error messages when requests are unsuccessful', async () => {
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    vi.spyOn(axios, 'get').mockResolvedValueOnce({ success: false })
    const res = await wrapper.vm.loadData({ devices: [] })

    expect(spy).toHaveBeenCalledWith('Failed to load device option data')
    expect(res).toEqual({ devices: [] })
  })
  it('invokes error message when bulk request fails', async () => {
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    vi.spyOn(axios, 'get').mockRejectedValueOnce({})
    const res = await wrapper.vm.loadData(form)
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    expect(res).toBe(undefined)
  })
  it('returns wifi string when no devices are present', () => {
    expect(wrapper.vm.defaultTitle).toBe('Wifi')
  })
  it('return empty string when some devices are present', () => {
    wrapper.vm.formData = form
    expect(wrapper.vm.defaultTitle).toBe('')
  })
  it('compares two wireless interfaces so when sorting interfaces with lan network would be first', () => {
    const startArr = [
      { id: '1', network: 'wan' },
      { id: '2', network: 'lan' },
      { id: '3', network: 'myNetwork1' },
      { id: '4', network: 'lan1' },
      { id: '5', network: 'lan' }
    ]
    const expectedResult = [
      { id: '2', network: 'lan' },
      { id: '5', network: 'lan' },
      { id: '1', network: 'wan' },
      { id: '3', network: 'myNetwork1' },
      { id: '4', network: 'lan1' }
    ]
    expect(startArr.sort(wrapper.vm.compareInterfaces)).toEqual(expectedResult)
  })
})
