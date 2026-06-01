import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import utilsPlugin, { utils } from '@/plugins/utils'
import { useMessages } from '@/stores/messages'
import '@ui-core/utils/string-format'
import i18n from '@ui-core/plugins/i18n'

describe('utils.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
    utilsPlugin.install(app)
    vi.clearAllMocks()
  })
  it.each`
    path                        | expectedResult
    ${'/status'}                | ${'navigation-status-end'}
    ${'/status/network'}        | ${'navigation-status-network-end'}
    ${'/status/network/mobile'} | ${'navigation-status-network-mobile-end'}
  `('returns $expectedResult when path: $path', ({ path, expectedResult }) => {
    const result = utils.getNavTestId(path)
    expect(result).toEqual(expectedResult)
  })

  it('generates unique id', () => {
    const ids = new Set()
    for (let i = 0; i < 1000; i++) {
      const id = utils.getUniqueId()
      expect(ids.has(id)).toBeFalsy()
      ids.add(id)
    }
  })

  it.each([
    [0, 0, 0, 0],
    [1, 2, 3, 2],
    [100, -10, 50, 50],
    [-999, 1, 2, 1],
    [50, 0, 100, 50]
  ])('clamps value between min and max', (value, min, max, res) => {
    expect(utils.clamp(value, min, max)).toBe(res)
  })

  it.each([
    [0.5, 0, 1, 0, 100, 50],
    [0.5, 0, 1, 0, 50, 25],
    [0.5, 0, 1, 50, 100, 75],
    [0.5, 0, 1, 50, 150, 100],
    [0.5, 0, 1, -50, 50, 0],
    [0.5, 0, 1, -50, 150, 50],
    [1, 0, 1, 0, 100, 100],
    [0.8, 0, 1, 0, 100, 80],
    [0, 0, 1, 0, 100, 0],
    [0, -1, 1, 0, 100, 50],
    [0, -1, 1, -50, 50, 0],
    [0, -1, 1, -50, 150, 50]
  ])('maps value from one range to another', (value, x1, x2, y3, y4, res) => {
    expect(utils.mapRange(value, x1, x2, y3, y4)).toBe(res)
  })

  it.each`
    error                                    | expectedResult
    ${'string error'}                        | ${'string error'}
    ${new Error('proper error')}             | ${'proper error'}
    ${new TypeError('your types are wrong')} | ${'An unexpected error occurred'}
  `('converts thrown error into message #%#', ({ error, expectedResult }) => {
    const message = useMessages()
    utils.showThrownError(error)
    expect(message.error).toBeCalledWith(expectedResult)
  })

  it.each`
    relativeTimestamp  | expectedResult
    ${0}               | ${'just now'}
    ${60000 * 2 * -1}  | ${'2 minutes ago'}
    ${60000 * 2}       | ${'in 2 minutes'}
    ${3600000 * 2}     | ${'in 2 hours'}
    ${86399999}        | ${'in 23 hours'}
    ${86400000 * 2}    | ${'in 2 days'}
    ${604800000 * 2}   | ${'in 2 weeks'}
    ${2628000000 * 2}  | ${'in 2 months'}
    ${31536000000 * 2} | ${'in 2 years'}
  `('converts relative timestamp to pretty string #%#', ({ relativeTimestamp, expectedResult }) => {
    expect(utils.parseRelativeTime(relativeTimestamp)).toEqual(expectedResult)
  })

  it.each`
    relativeTimestamp           | expectedResult
    ${608400000}                | ${'1 week, 1 hour'}
    ${2714400000}               | ${'1 month, 1 day'}
    ${34164000000}              | ${'1 year, 1 month'}
    ${172800000}                | ${'2 days'}
    ${176400000}                | ${'2 days, 1 hour'}
    ${262800000}                | ${'3 days, 1 hour'}
    ${7200000}                  | ${'2 hours'}
    ${9000000}                  | ${'2 hours, 30 minutes'}
    ${12600000}                 | ${'3 hours, 30 minutes'}
    ${86399000}                 | ${'23 hours, 59 minutes'}
    ${86400000 * 7 + 3600000}   | ${'1 week, 1 hour'}
    ${2628000000 + 86400000}    | ${'1 month, 1 day'}
    ${31536000000 + 2628000000} | ${'1 year, 1 month'}
  `('converts two unit relative timestamp $relativeTimestamp to "$expectedResult"', ({ relativeTimestamp, expectedResult }) => {
    expect(utils.parseTwoUnitRelativeTime(relativeTimestamp)).toEqual(expectedResult)
  })

  it.each`
    sections                                      | value         | optionKey | prettyKey | caseInsensitive | addValidation | response
    ${[{ mac: '00:00:00' }, { mac: '00:00:00' }]} | ${'00:00:00'} | ${'mac'}  | ${'MAC'}  | ${undefined}    | ${undefined}  | ${{ isValid: false, message: "Instance with MAC '00:00:00' already exists" }}
    ${[{ ip: '1.1.1.1' }, { ip: '1.1.1.1' }]}     | ${'1.1.1.1'}  | ${'ip'}   | ${'IP'}   | ${undefined}    | ${undefined}  | ${{ isValid: false, message: "Instance with IP '1.1.1.1' already exists" }}
    ${[{ ip: '1.1.1.1' }, { ip: '2.2.2.2' }]}     | ${'2.2.2.2'}  | ${'ip'}   | ${'IP'}   | ${undefined}    | ${undefined}  | ${{ isValid: true }}
    ${[{ ip: '1.1.1.1' }, { ip: '1.1.1.1' }]}     | ${'2.2.2.2'}  | ${'ip'}   | ${'IP'}   | ${undefined}    | ${undefined}  | ${{ isValid: true }}
    ${[{ name: 'Section' }, { name: 'section' }]} | ${'Section'}  | ${'name'} | ${'Name'} | ${true}         | ${undefined}  | ${{ isValid: false, message: "Instance with Name 'Section' already exists" }}
    ${[{ name: 'Section' }, { name: 'section' }]} | ${'Section'}  | ${'name'} | ${'Name'} | ${undefined}    | ${undefined}  | ${{ isValid: true }}
    ${[{ ip: '1.1.1.1' }]}                        | ${'1.1.1.1'}  | ${'ip'}   | ${'IP'}   | ${undefined}    | ${undefined}  | ${{ isValid: true }}
    ${[]}                                         | ${'1.1.1.1'}  | ${'ip'}   | ${'IP'}   | ${undefined}    | ${undefined}  | ${{ isValid: true }}
    ${[{ ip: '1.1.1.1' }]}                        | ${'1.1.1.1'}  | ${'ip'}   | ${'IP'}   | ${undefined}    | ${true}       | ${{ isValid: false, message: "Instance with IP '1.1.1.1' already exists" }}
  `('check if validateNoDuplicates validates correctly #%#', ({ sections, value, optionKey, prettyKey, caseInsensitive, addValidation, response }) => {
    expect(utils.validateNoDuplicates(sections, optionKey, value, prettyKey, caseInsensitive, addValidation)).toEqual(response)
  })

  it.each`
    val         | warningMessages                                  | formData                                       | certificateWarnings                                                           | expectedResult
    ${'value1'} | ${[{ source: 'instance1:fieldName1', code: 1 }]} | ${[{ id: 'instance1', fieldName1: 'value1' }]} | ${{ 1: 'Warning message 1', 2: 'Warning message 2', 3: 'Warning message 3' }} | ${'Warning message 1'}
    ${'value2'} | ${[{ source: 'instance2:fieldName2', code: 2 }]} | ${[{ id: 'instance2', fieldName2: 'value2' }]} | ${{ 1: 'Warning message 1', 2: 'Warning message 2', 3: 'Warning message 3' }} | ${'Warning message 2'}
    ${'value3'} | ${[{ source: 'instance3:fieldName3', code: 3 }]} | ${[{ id: 'instance3', fieldName3: 'value3' }]} | ${{ 1: 'Warning message 1', 2: 'Warning message 2', 3: 'Warning message 3' }} | ${'Warning message 3'}
    ${'value4'} | ${[]}                                            | ${[{ id: 'instance4', fieldName4: 'value4' }]} | ${{ 1: 'Warning message 1', 2: 'Warning message 2', 3: 'Warning message 3' }} | ${undefined}
  `('returns $expectedResult when val is $val', ({ val, warningMessages, formData, certificateWarnings, expectedResult }) => {
    const result = utils.certificateWarnings(val, warningMessages, formData, certificateWarnings)
    expect(result).toEqual(expectedResult)
  })

  it.each`
    section                             | key        | aloneValue | sectionAfterUpdate
    ${{ proto: undefined }}             | ${'proto'} | ${'all'}   | ${{ proto: undefined }}
    ${{ proto: [] }}                    | ${'proto'} | ${'all'}   | ${{ proto: [] }}
    ${{ proto: ['all'] }}               | ${'proto'} | ${'all'}   | ${{ proto: ['all'] }}
    ${{ proto: ['udp', 'all'] }}        | ${'proto'} | ${'all'}   | ${{ proto: ['all'] }}
    ${{ proto: ['udp', 'all', 'tcl'] }} | ${'proto'} | ${'all'}   | ${{ proto: ['udp', 'tcl'] }}
    ${{ proto: ['udp', 'tcl'] }}        | ${'proto'} | ${'all'}   | ${{ proto: ['udp', 'tcl'] }}
    ${{ proto: ['udp'] }}               | ${'proto'} | ${'all'}   | ${{ proto: ['udp'] }}
  `('ensures that value is mutually exclusive #%#', ({ section, key, aloneValue, sectionAfterUpdate }) => {
    utils.mutuallyExclusiveValue(section, key, aloneValue)
    expect(section).toEqual(sectionAfterUpdate)
  })
  it.each`
    value         | expectedResult
    ${'10.01 '}   | ${'10.01 '}
    ${'10.10 '}   | ${'10.10 '}
    ${'21.00 '}   | ${'21 '}
    ${'21.00'}    | ${'21'}
    ${'21.00 MB'} | ${'21 MB'}
  `('removes leading zeros #%#', ({ value, expectedResult }) => {
    expect(utils.removeOverPrecision(value)).toEqual(expectedResult)
  })

  it.each`
    configType        | configName           | expectedResult
    ${'DHCP'}         | ${''}                | ${'DHCP configuration'}
    ${'DHCP'}         | ${undefined}         | ${'DHCP configuration'}
    ${'traffic rule'} | ${undefined}         | ${'Traffic rule configuration'}
    ${'DHCP'}         | ${'lan'}             | ${'"lan" DHCP configuration'}
    ${'traffic rule'} | ${'allow-something'} | ${'"allow-something" traffic rule configuration'}
  `('generates modal title #%#', ({ configType, configName, expectedResult }) => {
    expect(utils.getModalTitle(configType, configName)).toEqual(expectedResult)
  })
})
