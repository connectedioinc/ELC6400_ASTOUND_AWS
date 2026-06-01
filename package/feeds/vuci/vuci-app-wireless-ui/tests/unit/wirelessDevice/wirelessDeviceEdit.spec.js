import { ref } from 'vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'
import WirelessDeviceEdit from '../../../src/views/network/wirelessDevice/WirelessDeviceEdit.vue'
import { FormOptionKey } from '../../../src/views/network/wirelessDevice/WirelessDeviceCommon'
describe('WirelessDevice.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      shallow: true,
      props: {
        section: {
          id: 'radio0'
        }
      },
      global: {
        provide: {
          [FormOptionKey]: {
            deviceOptions: ref([]),
            deviceStatus: ref([{ id: 'radio0' }]),
            wifiInterfaces: ref([])
          }
        }
      }
    }
    wrapper = createWrapper(WirelessDeviceEdit, wrapperOptions)
  })
  it.each`
    hwmodelist                                     | expectedResult
    ${{ b: false, g: false, n: false, ac: false }} | ${[]}
    ${{ b: true, g: false, n: true, ac: true }}    | ${[['', 'Legacy'], ['n', 'N'], ['ac', 'AC']]}
    ${{ b: false, g: true, n: true, ac: true }}    | ${[['', 'Legacy'], ['n', 'N'], ['ac', 'AC']]}
  `('returns  $expectedResult when  hwmodelist: $hwmodelist', async ({ hwmodelist, expectedResult }) => {
    wrapper = createWrapper(
      WirelessDeviceEdit,
      combineDeep(wrapperOptions, {
        global: {
          provide: {
            [FormOptionKey]: {
              deviceOptions: ref([{ id: 'radio0', options: { hwmodelist } }])
            }
          }
        }
      })
    )
    expect(wrapper.vm.hwModeOptions).toEqual(expectedResult)
  })
  it.each`
    hwmode  | htmodelist                                                     | expectedResult
    ${'ac'} | ${{ HT20: true, HT40: true }}                                  | ${[]}
    ${'n'}  | ${{ HT20: true, HT40: true }}                                  | ${[['HT20', '20 MHz'], ['HT40', '40 MHz']]}
    ${'n'}  | ${{ HT20: false, HT40: false }}                                | ${[]}
    ${'n'}  | ${{ HT20: true, HT40: true }}                                  | ${[['HT20', '20 MHz'], ['HT40', '40 MHz']]}
    ${'n'}  | ${{ HT20: false, HT40: false }}                                | ${[]}
    ${'ac'} | ${{ VHT20: true, VHT40: true, VHT80: true, VHT160: true }}     | ${[['VHT20', '20 MHz'], ['VHT40', '40 MHz'], ['VHT80', '80 MHz'], ['VHT160', '160 MHz']]}
    ${'ac'} | ${{ VHT20: false, VHT40: false, VHT80: false, VHT160: false }} | ${[]}
    ${'ax'} | ${{ HE20: true, VHT40: true, VHT80: false, VHT160: false }}    | ${[['HE20', '20 MHz']]}
  `('returns  $expectedResult when band: $band, hwmode: $hwmode, htmodeList: $htmodeList', async ({ hwmode, htmodelist, expectedResult }) => {
    wrapper = createWrapper(
      WirelessDeviceEdit,
      combineDeep(wrapperOptions, {
        props: {
          section: { hwmode }
        },
        global: {
          provide: {
            [FormOptionKey]: {
              deviceOptions: ref([{ id: 'radio0', options: { htmodelist } }])
            }
          }
        }
      })
    )
    wrapper.vm.formData = { wifiDevice: [{ hwmode }] }
    wrapper.vm.htmodelist = htmodelist
    expect(wrapper.vm.htModeOptions).toEqual(expectedResult)
  })

  it.each`
    band        | htmode     | expectedResult
    ${'2.4GHz'} | ${'HT20'}  | ${0}
    ${'5GHz'}   | ${''}      | ${0}
    ${'5GHz'}   | ${'VHT20'} | ${165}
    ${'5GHz'}   | ${'VHT40'} | ${161}
    ${'5GHz'}   | ${'VHT80'} | ${161}
    ${'5GHz'}   | ${'HE80'}  | ${161}
    ${'5GHz'}   | ${'HE160'} | ${128}
  `('returns $expectedResult when band: $band, htmode: $htmode', async ({ band, htmode, expectedResult }) => {
    wrapper = createWrapper(
      WirelessDeviceEdit,
      combineDeep(wrapperOptions, {
        props: {
          section: { id: 'radio0', htmode }
        },
        global: {
          provide: {
            [FormOptionKey]: {
              deviceStatus: ref([{ id: 'radio0', band }])
            }
          }
        }
      })
    )
    expect(wrapper.vm.max5gChannel).toEqual(expectedResult)
  })
  it.each`
    channel   | wifiInterface                               | expectedResult
    ${'auto'} | ${{ mode: 'sta', device: ['radio0'] }}      | ${undefined}
    ${'123'}  | ${{ mode: 'sta', device: ['radio1'] }}      | ${undefined}
    ${'123'}  | ${{ mode: 'ap', device: ['radio0'] }}       | ${undefined}
    ${'123'}  | ${{ mode: 'mesh', device: ['radio0'] }}     | ${undefined}
    ${'123'}  | ${{ mode: 'sta', device: ['radio0'] }}      | ${'Client configuration detected on the 2.4Ghz radio. When establishing a connection, it will take control of the channel selection, and this setting will be ignored.'}
    ${'123'}  | ${{ mode: 'multi_ap', device: ['radio0'] }} | ${'Client configuration detected on the 2.4Ghz radio. When establishing a connection, it will take control of the channel selection, and this setting will be ignored.'}
  `('returns channel warning #%#', async ({ channel, wifiInterface, expectedResult }) => {
    wrapper = createWrapper(
      WirelessDeviceEdit,
      combineDeep(wrapperOptions, {
        props: {
          section: { id: 'radio0', channel }
        },
        global: {
          provide: {
            [FormOptionKey]: {
              wifiInterfaces: ref([wifiInterface]),
              deviceStatus: ref([{ id: 'radio0', band: '2.4Ghz' }])
            }
          }
        }
      })
    )
    expect(wrapper.vm.channelWarning()).toEqual(expectedResult)
  })
  it.each`
    freqlist                                                               | global                    | result
    ${[{ restricted: false, mhz: 5180, indoor_only: false, channel: 36 }]} | ${{ location: 'any' }}    | ${[['auto', 'Auto'], ['36', '36 (5180 MHz)']]}
    ${[{ restricted: false, mhz: 5180, indoor_only: false, channel: 36 }]} | ${{ location: 'indoor' }} | ${[['auto', 'Auto'], ['36', '36 (5180 MHz)']]}
    ${[{ restricted: false, mhz: 5180, indoor_only: true, channel: 36 }]}  | ${{ location: 'any' }}    | ${[['auto', 'Auto'], ['36', '36 (5180 MHz)']]}
    ${[{ restricted: false, mhz: 5180, indoor_only: true, channel: 36 }]}  | ${{ location: 'indoor' }} | ${[['auto', 'Auto']]}
    ${[{ restricted: false, mhz: 5180, indoor_only: false, channel: 52 }]} | ${{ location: 'any' }}    | ${[['auto', 'Auto'], ['52', '52 (5180 MHz) DFS']]}
  `('returns channel warning #%#', ({ freqlist, global, result }) => {
    wrapper.vm.deviceOptions = [{ id: 'radio0', options: { freqlist } }]
    wrapper.vm.formData.wifiGlobal[0] = global
    expect(wrapper.vm.freqOptions).toEqual(result)
  })
})
