import Interfaces from '../../src/views/network/WanInterfaces.vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'
import commonFunctions from '@/components/network/commonFunctions'

describe('WanInterfaces.vue', () => {
  let wrapper
  const defaultOptions = {
    global: { stubs: { InterfaceSection: { template: '<div />' } } },
    computed: {
      ...Interfaces.computed,
      ifaceSection: () => ({
        formOptions: {
          modemList: [],
          apns: []
        },
        formData: {
          interfaces: []
        }
      })
    }
  }
  beforeEach(() => {
    wrapper = createWrapper(Interfaces, defaultOptions)
  })

  describe('additionalExtraLoad()', () => {
    it('Everything is success false', () => {
      const bulkSize = 3
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.additionalExtraLoad(
        {},
        {},
        Array.from({ length: bulkSize }, () => ({ success: false }))
      )
      expect(spy).toBeCalledTimes(bulkSize)
    })
    it('Successfully loads data', () => {
      const formOptions = {
        modemList: [{ id: '1-1' }]
      }
      const mwan3 = [
        { id: 'wan', enabled: '1' },
        { id: 'static', enabled: '0' }
      ]
      const mwan3Global = {
        mode: 'mwan'
      }
      const formOptionMock = {}
      const formMock = {
        interfaces: [{ id: 'wan' }, { id: 'static' }, { id: 'wan6' }]
      }
      wrapper.vm.additionalExtraLoad(formMock, formOptionMock, [
        { success: true, data: formOptions.modemList },
        { success: true, data: mwan3 },
        { success: true, data: mwan3Global }
      ])
      expect(wrapper.vm.mwan3Global).toEqual(mwan3Global)
      expect(formOptionMock).toEqual(formOptions)
      expect(formMock.interfaces).toEqual([{ id: 'wan' }, { id: 'static' }, { id: 'wan6' }])
    })
  })

  describe('additionalAfterLoad()', () => {
    it('Everything is success false', () => {
      const bulkSize = 3
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.additionalAfterLoad(
        { interfaces: [] },
        {},
        Array.from({ length: bulkSize }, () => ({ success: false }))
      )
      expect(spy).toBeCalledTimes(bulkSize)
    })
    it('Successfully loads data', () => {
      const formOptions = {
        simcards: [{ sim: '1', modem: '1-1' }],
        ntpInfo: { id: 'general', enabled: '1' },
        apns: [{ modem: '1-1', apns: [{ id: 123 }] }]
      }
      const formOptionMock = {}
      const formMock = {
        interfaces: [{ id: 'wan' }, { id: 'static' }, { id: 'wan6', metric: '7' }]
      }
      wrapper.vm.additionalAfterLoad(formMock, formOptionMock, [
        { success: true, data: formOptions.simcards },
        { success: true, data: [formOptions.ntpInfo] },
        { success: true, data: formOptions.apns }
      ])
      expect(formOptionMock).toEqual(formOptions)
      expect(formMock.interfaces).toEqual([
        { id: 'wan', metric: '1' },
        { id: 'static', metric: '2' },
        { id: 'wan6', metric: '7' }
      ])
    })
  })

  describe('additionalUpdateLoad()', () => {
    it('Everything is success false', () => {
      const bulkSize = 3
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.additionalUpdateLoad(
        {},
        Array.from({ length: bulkSize }, () => [{ success: false }, { success: false }, { success: false }])
      )
      expect(spy).toBeCalledTimes(bulkSize)
    })
    it('Successfully loads data', () => {
      const formOptions = {
        apns: [{ modem: '1-1', apns: [{ id: 123 }] }],
        modemList: [{ id: '1-1' }],
        dataLimit: [{ id: 'mob1s1a1' }]
      }
      const formOptionMock = {}
      wrapper.vm.additionalUpdateLoad(formOptionMock, [
        { success: true, data: formOptions.apns },
        { success: true, data: formOptions.modemList },
        { success: true, data: formOptions.dataLimit }
      ])
      expect(formOptionMock).toEqual(formOptions)
    })
  })

  describe('afterSave()', () => {
    it('Shows error', async () => {
      wrapper = createWrapper(
        Interfaces,
        combineDeep(defaultOptions, {
          computed: {
            isFailover: () => true
          }
        })
      )
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$axios.put = vi.fn().mockRejectedValue({})
      await wrapper.vm.afterSave()
      expect(spy).toBeCalled()
    })
    it('Successfully saves data', () => {
      wrapper = createWrapper(
        Interfaces,
        combineDeep(defaultOptions, {
          computed: {
            isFailover: () => true,
            ifaceSection: () => ({
              formOptions: {
                modemList: []
              },
              formData: {
                interfaces: [{ id: 'wan' }, { id: 'static' }, { id: 'dhcpv6' }]
              }
            })
          }
        })
      )
      wrapper.vm.mwan3 = {
        wan: '1',
        static: '0',
        dhcpv6: '0',
        deletedIface: '1'
      }
      wrapper.vm.excludedMwan3Configs = ['dhcpv6']
      const spy = (wrapper.vm.$axios.put = vi.fn().mockRejectedValue({}))
      wrapper.vm.afterSave()
      return expect(spy).toBeCalledWith(expect.any(String), {
        data: [
          { id: 'wan', enabled: '1' },
          { id: 'static', enabled: '0' }
        ]
      })
    })
    it('does not save data when device is not in failover mode', async () => {
      wrapper = createWrapper(
        Interfaces,
        combineDeep(defaultOptions, {
          computed: {
            isFailover: () => false
          }
        })
      )
      const spy = (wrapper.vm.$axios.put = vi.fn())
      await wrapper.vm.afterSave()
      expect(spy).not.toBeCalled()
    })
  })

  it('check if beforeSave resolves when simApnOff is empty', () => {
    wrapper.vm.simApnOff = []
    const result = wrapper.vm.beforeSave()
    expect(result).resolves.toEqual(true)
  })

  it('check if prompt is shown in beforeSave', () => {
    wrapper = createWrapper(
      Interfaces,
      combineDeep(defaultOptions, {
        computed: {
          modemOptions: () => [{ modem: '3-1' }]
        }
      })
    )
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: [] })
    wrapper.vm.simApnOff = ['3-1_1_undefined']
    wrapper.vm.beforeSave()
    expect(spy).toBeCalledTimes(0)
  })

  it('check if error message is shown in beforeSave', async () => {
    wrapper = createWrapper(
      Interfaces,
      combineDeep(defaultOptions, {
        computed: {
          modemOptions: () => [{ modem: '3-1' }]
        }
      })
    )
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce()
    wrapper.vm.simApnOff = ['3-1_1_undefined']
    expect(wrapper.vm.beforeSave()).rejects.toEqual('Failed to load modem data')
  })

  it.each`
    ifaceStatus                     | ifaceConfig                           | apnList                              | modemInUse | response        | condition
    ${{ sim: '1', apn: 'wap' }}     | ${{ auto_apn: '1' }}                  | ${[]}                                | ${false}   | ${'Auto (wap)'} | ${'auto_apn = "1" and apn set'}
    ${{ sim: '1' }}                 | ${{ auto_apn: '1' }}                  | ${[]}                                | ${false}   | ${'Auto'}       | ${'auto_apn = "1" and apn null'}
    ${{ sim: '1' }}                 | ${{ force_apn: 479 }}                 | ${[{ id: 479, apn: 'testWap' }]}     | ${false}   | ${'testWap'}    | ${'force_apn from list'}
    ${{ sim: '1', apn: 'testWap' }} | ${{ force_apn: 479, apn: 'testWap' }} | ${[{ id: 450, apn: 'testOmnitel' }]} | ${false}   | ${'testWap'}    | ${'force_apn from list before SIM change'}
    ${{ sim: '1', apn: 'wap' }}     | ${{}}                                 | ${[]}                                | ${false}   | ${'wap'}        | ${'custom apn'}
    ${undefined}                    | ${{ auto_apn: '1' }}                  | ${[]}                                | ${false}   | ${'-'}          | ${'no status'}
    ${{ sim: '1' }}                 | ${{ force_apn: -1, auto_apn: '0' }}   | ${[]}                                | ${false}   | ${'-'}          | ${'without apn set'}
    ${{ sim: '1', apn: 'wap' }}     | ${{ apn: 'wap', auto_apn: '1' }}      | ${[]}                                | ${true}    | ${'-'}          | ${'auto_apn = "1" and apn set but modem in use'}
    ${{}}                           | ${{ auto_apn: '1' }}                  | ${[]}                                | ${false}   | ${'-'}          | ${'no sim'}
  `('display APN when $condition', async ({ ifaceStatus, ifaceConfig, apnList, modemInUse, response }) => {
    wrapper.vm.modemInUse = vi.fn().mockReturnValueOnce(modemInUse)
    wrapper.vm.getModemApnList = vi.fn().mockReturnValueOnce(apnList)
    expect(await wrapper.vm.getApn(ifaceConfig, ifaceStatus)).toEqual(response)
  })

  it('returns correct apns from list', () => {
    const apns = [{ id: 10, apn: 'telx' }]
    wrapper = createWrapper(
      Interfaces,
      combineDeep(defaultOptions, {
        computed: {
          ifaceSection: () => ({
            formOptions: {
              apns: [
                {
                  modem: '1-2',
                  apns: [{ id: 11, apn: 'tely' }]
                },
                {
                  modem: '1-1',
                  apns
                }
              ]
            }
          })
        }
      })
    )
    expect(wrapper.vm.getModemApnList('1-1')).toEqual(apns)
  })

  it.each`
    section                | isValid  | activated
    ${{ proto: 'none' }}   | ${true}  | ${false}
    ${{ proto: 'wwan' }}   | ${true}  | ${false}
    ${{ proto: 'wwan' }}   | ${false} | ${true}
    ${{ proto: 'connm' }}  | ${false} | ${true}
    ${{ proto: 'static' }} | ${false} | ${false}
  `('model changed and message called: $activated', ({ section, isValid, activated }) => {
    vi.spyOn(commonFunctions, 'checkForSingleInterfaceModem').mockReturnValue({ isValid })
    vi.spyOn(commonFunctions, 'validateDuplicateApns').mockReturnValue({ isValid: true })
    vi.spyOn(wrapper.vm, 'sameSimModemSections').mockReturnValue([])
    const self = {
      model: '1'
    }
    wrapper.vm.enableChange(self, section, {})
    expect(self.model).toEqual(activated ? '0' : '1')
  })

  it.each`
    interfaces | section | response
    ${[
  { id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' },
  {
    id: 'test2',
    enabled: '1',
    auto_apn: '1',
    modem: '1-1',
    sim: '1'
  }
]} | ${{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }} | ${[
  {
    auto_apn: '1',
    enabled: '1',
    id: 'test',
    modem: '1-1',
    sim: '1'
  },
  { auto_apn: '1', enabled: '1', id: 'test2', modem: '1-1', sim: '1' }
]}
    ${[
  { id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' },
  {
    id: 'test2',
    enabled: '1',
    auto_apn: '1',
    modem: '1-1',
    sim: '2'
  }
]} | ${{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }} | ${[
  {
    auto_apn: '1',
    enabled: '1',
    id: 'test',
    modem: '1-1',
    sim: '1'
  }
]}
    ${[
  { id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' },
  {
    id: 'test2',
    enabled: '1',
    auto_apn: '0',
    modem: '1-2',
    sim: '1'
  }
]} | ${{ id: 'test', enabled: '1', auto_apn: '1', modem: '1-1', sim: '1' }} | ${[
  {
    auto_apn: '1',
    enabled: '1',
    id: 'test',
    modem: '1-1',
    sim: '1'
  }
]}
  `('checks sameSimModemSections validation - $response', ({ interfaces, section, response }) => {
    wrapper.vm.formData = { interfaces }
    wrapper = createWrapper(
      Interfaces,
      combineDeep(defaultOptions, {
        computed: {
          ifaceSection: () => ({
            formData: { interfaces }
          })
        }
      })
    )
    expect(wrapper.vm.sameSimModemSections(section)).toEqual(response)
  })

  it.each`
    title               | modemMock | returns
    ${'undefined'}      | ${true}   | ${undefined}
    ${'enabled option'} | ${false}  | ${'1'}
  `('returns $title when modem in use is $modemMock', ({ modemMock, returns }) => {
    wrapper.vm.modemInUse = vi.fn().mockReturnValueOnce(modemMock)
    const data = { enabled: '1' }
    expect(wrapper.vm.saveData(this, data)).toEqual(returns)
  })

  it.each`
    title             | modemMock | section             | returns
    ${'hint message'} | ${true}   | ${{}}               | ${[{ info: "This instance can't be edited because modem is blocked or disabled" }]}
    ${'empty array'}  | ${false}  | ${{ modem: '3-1' }} | ${[]}
  `('returns $title when modem in use is $modemMock', ({ modemMock, section, returns }) => {
    wrapper.vm.modemInUse = vi.fn().mockReturnValueOnce(modemMock)
    expect(wrapper.vm.editHints(section)).toEqual(returns)
  })

  it.each`
    mode         | expectedReturn
    ${'mwan'}    | ${true}
    ${undefined} | ${false}
    ${'balance'} | ${false}
  `('returns true device is in failover mode #%#', async ({ mode, expectedReturn }) => {
    wrapper = createWrapper(Interfaces, defaultOptions)
    await wrapper.setData({ mwan3Global: { mode } })
    expect(wrapper.vm.isFailover).toEqual(expectedReturn)
  })

  describe('updateAutoApn()', () => {
    it('check if updateAutoApn update other interfaces auto_apn value', () => {
      const sectionRef = {
        formData: {
          interfaces: [
            { id: 'test', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '1' },
            { id: 'test1', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '1' },
            { id: 'test2', enabled: '1', modem: '1-1', sim: '2', proto: 'wwan', auto_apn: '1' },
            { id: 'test3', enabled: '1', modem: '1-1', sim: '1', esim_profile: '1', proto: 'wwan', auto_apn: '1' }
          ]
        },
        formOptions: {
          interfaceStatus: []
        }
      }
      wrapper = createWrapper(
        Interfaces,
        combineDeep(defaultOptions, {
          computed: {
            ifaceSection: () => sectionRef
          }
        })
      )
      vi.spyOn(commonFunctions, 'validateDuplicateApns').mockReturnValue({ isValid: true })
      wrapper.vm.simApnOff = ['1-1_1_undefined']
      wrapper.vm.updateAutoApn()
      expect(sectionRef.formData.interfaces).toEqual([
        { id: 'test', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '0' },
        { id: 'test1', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '0' },
        { id: 'test2', enabled: '1', modem: '1-1', sim: '2', proto: 'wwan', auto_apn: '1' },
        { id: 'test3', enabled: '1', modem: '1-1', sim: '1', esim_profile: '1', proto: 'wwan', auto_apn: '1' }
      ])
    })
    it('check if updateAutoApn returns false when validation passes', () => {
      wrapper = createWrapper(
        Interfaces,
        combineDeep(defaultOptions, {
          computed: {
            ifaceSection: () => ({
              formData: {
                interfaces: [
                  { id: 'test', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '1' },
                  { id: 'test1', enabled: '1', modem: '1-1', sim: '1', proto: 'wwan', auto_apn: '1' },
                  { id: 'test2', enabled: '1', modem: '1-1', sim: '2', proto: 'wwan', auto_apn: '1' }
                ]
              },
              formOptions: {
                interfaceStatus: []
              }
            })
          }
        })
      )
      vi.spyOn(commonFunctions, 'validateDuplicateApns').mockReturnValue({ isValid: true })
      wrapper.vm.simApnOff = ['1-1_1_undefined']
      wrapper.vm.updateAutoApn()
      expect(wrapper.vm.updateAutoApn()).toBe(false)
    })
  })
})
