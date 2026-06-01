import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import commonFunctions from '@/components/network/commonFunctions'
import { mobile } from '@/plugins/mobile'
import i18n from '@ui-core/plugins/i18n'
import '@ui-core/utils/string-format'

describe('commonFunctions.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  afterEach(() => [vi.restoreAllMocks()])
  it.each`
    proto      | expectedResult
    ${'connm'} | ${true}
    ${'wwan'}  | ${true}
    ${'dhcp'}  | ${false}
  `('returns $expectedResult, when proto: $proto', ({ proto, expectedResult }) => {
    const result = commonFunctions._isSectionMobile({ proto })
    expect(result).toEqual(expectedResult)
  })

  it.each`
    mobile   | enabled | expectedResult
    ${false} | ${'0'}  | ${false}
    ${true}  | ${'0'}  | ${false}
    ${false} | ${'1'}  | ${false}
    ${true}  | ${'1'}  | ${true}
  `('returns $expectedResult, when mobile: $mobile, enabled: $enabled', ({ mobile, enabled, expectedResult }) => {
    vi.spyOn(commonFunctions, '_isSectionMobile').mockReturnValue(mobile)
    const result = commonFunctions._isValidSection({ enabled })
    expect(result).toEqual(expectedResult)
  })
  it.each`
    thisSection                                                                                | expectedResult                                                                                                  | simCount
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'dhcp' }}                    | ${"The auto APN feature is disabled due to multiple enabled interfaces for the same Unknown modem's SIM slot."} | ${0}
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }}                    | ${"The auto APN feature is disabled due to multiple enabled interfaces for the same -'s SIM1 slot."}            | ${2}
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }}                    | ${"The auto APN feature is disabled due to multiple enabled interfaces for the same -'s SIM slot."}             | ${1}
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan', esim_profile: '1' }} | ${"The auto APN feature is disabled due to multiple enabled interfaces for the same -'s SIM (eSIM1) slot."}     | ${1}
  `('returns _getErrorMessage error message when simCount is $simCount', ({ thisSection, expectedResult, simCount }) => {
    mobile.getSimLabel = vi.fn().mockReturnValueOnce(simCount > 1 ? thisSection.sim : '')
    const result = commonFunctions._getErrorMessage(thisSection, '-', simCount)
    expect(result).toEqual(expectedResult)
  })
  it.each`
    thisSection                                                                      | otherSection                                                                     | res      | help
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }}          | ${{ modem: '1-2', sim: 1, enabled: '1', proto: 'wwan' }}                         | ${true}  | ${'other section has different modem'}
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }}          | ${{ modem: '1-1', sim: 2, enabled: '1', proto: 'wwan' }}                         | ${true}  | ${'other section has different sim'}
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }}          | ${{ modem: '1-1', sim: 1, enabled: '0', proto: 'wwan' }}                         | ${true}  | ${'other section is disabled'}
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }}          | ${{ modem: '1-1', sim: 1, enabled: '1', proto: 'dhcp' }}                         | ${true}  | ${'other section is not mobile'}
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '0', proto: 'wwan' }}          | ${{ modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                         | ${true}  | ${'this section is disabled'}
    ${{ modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'dhcp' }}          | ${{ modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                         | ${true}  | ${'this section is not mobile'}
    ${{ modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan' }}          | ${{ modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                         | ${true}  | ${'this section has no auto_apn enabled'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, enabled: '1', auto_apn: '1', proto: 'wwan' }} | ${false} | ${'this section has no auto_apn enabled'}
  `('returns validation isValid $res when $help', ({ thisSection, otherSection, res }) => {
    mobile.getSimLabel = vi.fn().mockReturnValueOnce('')
    const sections = [thisSection, otherSection]
    const result = commonFunctions.validateApn(thisSection, sections)
    expect(result.isValid).toEqual(res)
  })
  it.each`
    thisSection                                                                                                            | otherSection                                                                                                  | interfaceStatus                       | apnList                      | res      | help
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }}                                    | ${{ id: 'mob2', modem: '1-2', sim: 1, enabled: '1', proto: 'wwan' }}                                          | ${[]}                                 | ${[]}                        | ${true}  | ${'section has auto APN enabled'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan', apn: 'wap', pdptype: 'ip' }}         | ${{ id: 'mob2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan', apn: 'wap', pdptype: 'ip' }}               | ${[]}                                 | ${[]}                        | ${false} | ${'other section has same APN and PDP type IPv4'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan', apn: 'wap', pdptype: 'ip' }}         | ${{ id: 'mob2', modem: '1-1', sim: 2, enabled: '0', proto: 'wwan', apn: 'wap', pdptype: 'ip' }}               | ${[]}                                 | ${[]}                        | ${true}  | ${'other section has different SIM'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan', apn: 'wap', pdptype: 'ip' }}         | ${{ id: 'mob2', modem: '1-1', sim: 1, enabled: '0', proto: 'dhcp', apn: 'wap', pdptype: 'ip' }}               | ${[]}                                 | ${[]}                        | ${true}  | ${'other section is disabled'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '0', proto: 'wwan' }}                                    | ${{ id: 'mob2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                                          | ${[]}                                 | ${[]}                        | ${true}  | ${'this section is disabled'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, esim_profile: '1', auto_apn: '0', enabled: '1', proto: 'wwan' }}                 | ${{ id: 'dhcp', enabled: '1', proto: 'dhcp' }}                                                                | ${[]}                                 | ${[]}                        | ${true}  | ${'other section is not mobile'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan', force_apn: '479', pdptype: 'ipv6' }} | ${{ id: 'mob2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan', force_apn: '479', pdptype: 'ipv6' }}       | ${[]}                                 | ${[]}                        | ${false} | ${'other section has same force_apn'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan', apn: 'wap', pdptype: 'ipv6' }}       | ${{ id: 'mob2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan', force_apn: '479', pdptype: 'ipv6' }}       | ${[{ id: 'mob2', apn: 'wap' }]}       | ${[]}                        | ${false} | ${'this section has apn and other section has force_apn both apns same'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan', apn: 'wap', pdptype: 'ipv6' }}       | ${{ id: 'mob2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan', force_apn: '479', pdptype: 'ipv6' }}       | ${[{ id: 'mob2', force_apn: '479' }]} | ${[{ id: 479, apn: 'wap' }]} | ${false} | ${'this section has apn and other section has force_apn both apns same 2'}
    ${{ id: 'mob1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan', force_apn: '479', pdptype: 'ipv6' }} | ${{ id: 'mob2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan', apn: 'wap', pdptype: 'ipv6' }}             | ${[]}                                 | ${[{ id: 479, apn: 'wap' }]} | ${false} | ${'this section has force_apn and other section has apn both apns same'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan', apn: 'wap', pdptype: 'ipv4v6' }}        | ${{ id: '2', modem: '1-1', sim: 1, enabled: '1', auto_apn: '0', proto: 'wwan', apn: 'wap', pdptype: 'ipv6' }} | ${[]}                                 | ${[]}                        | ${false} | ${'this section has PDP type as IPv4/IPv6'}
  `('returns duplicate APN validation isValid $res when $help', ({ thisSection, otherSection, interfaceStatus, apnList, res }) => {
    const sections = [thisSection, otherSection]
    const result = commonFunctions.validateDuplicateApns(thisSection, sections, interfaceStatus, apnList)
    expect(result.isValid).toEqual(res)
  })
  it.each`
    thisSection                                                                      | otherSection                                                                         | modemList                                               | res      | help
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-2', sim: 1, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'UC10', multi_apn: true, id: '1-1' }]}    | ${true}  | ${'other section has different modem'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 2, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'UC20', multi_apn: false, id: '1-1' }]}   | ${true}  | ${'other section has different sim'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'UC20', multi_apn: false, id: '1-1' }]}   | ${false} | ${'other section has same sim'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'EC200A', multi_apn: false, id: '1-1' }]} | ${false} | ${'other section has same sim'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-2', sim: 1, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'EC200A', multi_apn: false, id: '1-1' }]} | ${true}  | ${'other section has different modem'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '0', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'UC200A', multi_apn: true, id: '1-1' }]}  | ${true}  | ${'this section is disabled'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, enabled: '1', proto: 'dhcp' }}                    | ${[{ version: 'UC200A', multi_apn: true, id: '1-1' }]}  | ${true}  | ${'other section is not mobile'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 2, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'SLM770', multi_apn: false, id: '1-1' }]} | ${true}  | ${'other section has different sim'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'SLM770', multi_apn: false, id: '1-1' }]} | ${false} | ${'other section has same sim'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 2, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'RG500U', multi_apn: false, id: '1-1' }]} | ${true}  | ${'other section has different sim'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, esim_profile: '1', enabled: '1', proto: 'wwan' }} | ${[{ version: 'RG500U', multi_apn: false, id: '1-1' }]} | ${true}  | ${'other section has same sim but uses esim'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '1', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, enabled: '1', proto: 'wwan' }}                    | ${[{ version: 'RG500U', multi_apn: false, id: '1-1' }]} | ${false} | ${'other section has same sim'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan' }}     | ${[{ version: 'UC10', multi_apn: false, id: '1-1' }]}   | ${false} | ${'other section has same sim and device is TRB1'}
    ${{ id: '1', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan' }} | ${{ id: '2', modem: '1-1', sim: 1, auto_apn: '0', enabled: '1', proto: 'wwan' }}     | ${[{ version: 'UC10', multi_apn: false, id: '1-1' }]}   | ${false} | ${'other section has same sim and device is TRB5'}
  `('returns checkForSingleInterfaceModem validation $res when $help', ({ thisSection, otherSection, modemList, res }) => {
    const sections = [thisSection, otherSection]
    const result = commonFunctions.checkForSingleInterfaceModem(thisSection, sections, modemList)
    expect(result.isValid).toEqual(res)
  })
  it.each`
    title                    | modemList                        | res
    ${'modem is offline'}    | ${[]}                            | ${true}
    ${'modem is not in use'} | ${[{ id: '3-1' }]}               | ${false}
    ${'modem is offline 2'}  | ${[{ id: '3-1', offline: '1' }]} | ${true}
  `('returns $res if $title', ({ modemList, res }) => {
    const current = { modem: '3-1' }
    expect(commonFunctions.modemInUse(current, modemList)).toEqual(res)
  })
})
