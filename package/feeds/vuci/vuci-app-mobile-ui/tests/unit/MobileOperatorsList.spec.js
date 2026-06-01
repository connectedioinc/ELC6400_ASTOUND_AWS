import MobileOperatorsList from '../../src/views/network/MobileOperatorsList.vue'
import MobileOperatorsListEdit from '../../src/views/network/MobileOperatorsListEdit.vue'
import { mobile } from '@/plugins/mobile'
import { axios } from '@ui-core/plugins/axios'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn()
    })
  }
})

const operatorList = [
  {
    id: 'cfg0123d7',
    name: 'test',
    mcc_mnc: ['24601']
  }
]

describe('MobileOperatorsList.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileOperatorsList)
  })

  it('returns if operator scan supported', () => {
    wrapper.vm.modemList = [{ id: '3-1', operators_scan: true }]
    expect(wrapper.vm.opScanSupported).toBe(true)
    wrapper.vm.modemList = [
      { id: '3-1', operators_scan: true },
      { id: '1-1.2', operators_scan: false }
    ]
    expect(wrapper.vm.opScanSupported).toBe(false)
  })

  it('returns received operator and countries lists', () => {
    wrapper.vm.apnList = [
      { mcc: '246', mnc: '01', carrier: 'Telia' },
      { mcc: '246', mnc: '02', carrier: 'Bite' }
    ]
    wrapper.vm.countries = [
      ['247', '247 - Latvia'],
      ['246', '246 - Lithuania']
    ]
    expect(wrapper.vm.operatorLists).toEqual([
      ['246', '246 - Lithuania'],
      ['24601', '24601 - Telia'],
      ['24602', '24602 - Bite'],
      ['247', '247 - Latvia']
    ])
  })

  it('returns carrier or country name with code when provided operator code exists in the list', () => {
    wrapper.vm.apnList = [
      { mcc: '246', mnc: '01', carrier: 'Telia' },
      { mcc: '246', mnc: '02', carrier: 'Bite' }
    ]
    wrapper.vm.countries = [
      ['247', '247 - Latvia'],
      ['246', '246 - Lithuania']
    ]
    expect(wrapper.vm.getTranslatedCode('24601')).toBe('24601 - Telia')
  })

  it('returns updated operator code list', () => {
    wrapper.vm.formData.operators = [{ id: 'cfg0223d7', name: 'list1', mcc_mnc: ['24601', '24602'] }]
    wrapper.vm.updateOpCodeList()
    expect(wrapper.vm.opCodeList).toEqual({
      cfg0223d7: [
        { code: '24601', pos: 1 },
        { code: '24602', pos: 2 }
      ]
    })
  })

  it('returns updated operator code list after new code added', () => {
    wrapper.vm.opCodeList = {
      cfg0223d7: [
        { code: '24601', pos: 1 },
        { code: '24602', pos: 2 }
      ]
    }
    wrapper.vm.addNewCode('cfg0223d7')
    expect(wrapper.vm.opCodeList).toEqual({
      cfg0223d7: [
        { code: '24601', pos: 1 },
        { code: '24602', pos: 2 },
        { code: '', pos: 3, edit: true }
      ]
    })
  })

  it('checks if delete prompt is shown when trying to remove operator code', async () => {
    wrapper.vm.opCodeList = {
      cfg0223d7: [
        { code: '24601', pos: 1 },
        { code: '24602', pos: 2 }
      ]
    }
    const spy = vi.spyOn(wrapper.vm.prompt, 'show')
    await wrapper.vm.removeCode('24602', 'cfg0223d7')
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockClear()
  })

  it('check if operatorExists method validates new operator add to list', () => {
    wrapper.vm.formData = { operators: operatorList }
    expect(wrapper.vm.operatorExists('test')).toEqual({ message: "Operator's list 'test' already exists", isValid: false })
    expect(wrapper.vm.operatorExists('test2')).toEqual({ isValid: true })
  })

  it('check if afterLoad method shows error when request throws error', async () => {
    axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    wrapper.vm.formData.operators = operatorList
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    spy.mockClear()
  })

  it('check if afterLoad method shows error messages when all requests are unsuccessful', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    wrapper.vm.formData.operators = operatorList
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load country list')
    expect(spy).toHaveBeenCalledWith('Failed to load modem status')
    expect(spy).toHaveBeenCalledWith('Failed to load APN data')
    expect(spy).toHaveBeenCalledWith('Failed to load scanned operator list')
    spy.mockClear()
  })

  it('check if afterLoad sets data when request is successful', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      {
        success: true,
        data: [
          { mcc: '246', country: 'Lithuania' },
          { mcc: '247', country: 'Latvia' }
        ]
      },
      { success: true, data: [{ id: '3-1', active_sim: 1, name: 'Internal modem' }] },
      { success: true, data: [{ id: '1', apn: 'phone', mcc: '001', mnc: '01' }] },
      { success: true, data: [{ operators: [], last_scan: 'N/A', modem: '3-1' }] }
    ])
    wrapper.vm.formData.operators = operatorList
    wrapper.vm.loadApns = vi.fn()
    mobile.parseModems = vi.fn().mockReturnValueOnce([{ id: '3-1', active_sim: 1, name: 'Internal modem' }])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.countries).toEqual([
      ['246', '246 - Lithuania'],
      ['247', '247 - Latvia']
    ])
    expect(wrapper.vm.modemList).toEqual([{ id: '3-1', active_sim: 1, name: 'Internal modem' }])
    expect(wrapper.vm.apnList).toEqual([{ id: '1', apn: 'phone', mcc: '001', mnc: '01' }])
    expect(wrapper.vm.scanList).toEqual([{ operators: [], last_scan: 'N/A', modem: '3-1' }])
  })

  it('check if loadApns shows error when request is unsuccessful', async () => {
    axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.loadApns()
    expect(spy).toHaveBeenCalledWith('Failed to load APN data')
    spy.mockClear()
  })

  it('check if loadApns sets data when request is successful', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: [
        { mcc: '246', country: 'Lithuania' },
        { mcc: '247', country: 'Latvia' }
      ]
    })
    await wrapper.vm.loadApns(2)
    expect(wrapper.vm.apnList).toEqual([
      { mcc: '246', country: 'Lithuania' },
      { mcc: '247', country: 'Latvia' }
    ])
  })

  it('check if updateModems method shows error when request throws error', async () => {
    axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.updateModems()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    spy.mockClear()
  })

  it('check if updateModems sets data when request is successful', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [{ id: '3-1', active_sim: 1, name: 'Internal modem' }] },
      { success: true, data: [{ operators: [], last_scan: 'N/A', modem: '3-1' }] }
    ])
    wrapper.vm.loadApns = vi.fn()
    mobile.parseModems = vi.fn().mockReturnValueOnce([{ id: '3-1', active_sim: 1, name: 'Internal modem' }])
    await wrapper.vm.updateModems()
    expect(wrapper.vm.modemList).toEqual([{ id: '3-1', active_sim: 1, name: 'Internal modem' }])
    expect(wrapper.vm.scanList).toEqual([{ operators: [], last_scan: 'N/A', modem: '3-1' }])
  })

  it('checks if error message is shown when duplicate operator code available and trying to save changes', async () => {
    wrapper.vm.opCodeList = {
      cfg0223d7: [
        { code: '24601', pos: 1 },
        { code: '24602', pos: 2 },
        { code: '24602', pos: 3 }
      ],
      cfg0223d8: [{ code: '24602', pos: 1 }]
    }
    await expect(wrapper.vm.beforeSave()).rejects.toEqual('Configuration could not be saved. Some fields are invalid')
  })

  it('returns last operator list', () => {
    wrapper.vm.formData.operators = operatorList
    expect(wrapper.vm.lastList).toEqual(operatorList[0])
  })

  it('returns error message when trying to add operator code from scan list but code already exists in the list', async () => {
    wrapper.vm.opCodeList = { cfg0223d7: [{ code: '24601', pos: 1 }] }
    wrapper.vm.showModal = 'cfg0223d7'
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.addToList({ numName: '24601' })
    expect(spy).toHaveBeenCalledWith('Operator already exists in the list')
  })

  it('returns success message and adds operator code to list from scan list', async () => {
    wrapper.vm.opCodeList = { cfg0223d7: [{ code: '24601', pos: 1 }] }
    wrapper.vm.showModal = 'cfg0223d7'
    const spy = vi.spyOn(wrapper.vm.message, 'success')
    await wrapper.vm.addToList({ numName: '24602' })
    expect(spy).toHaveBeenCalledWith('Operator added to the list')
    expect(wrapper.vm.opCodeList).toEqual({
      cfg0223d7: [
        { code: '24601', pos: 1 },
        { code: '24602', pos: 2 }
      ]
    })
  })
})

describe('MobileOperatorsListEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileOperatorsListEdit, {
      props: {
        section: {
          id: 'cfg0223d7',
          name: 'list1'
        }
      }
    })
  })
  it.each([
    ['list with same name exists', [{ name: 'list1', id: 'cfg0223d8' }], { isValid: false, message: "Operator's list 'list1' already exists" }],
    ['list with same name doesnt exists', [{ name: 'list2', id: 'cfg0223d7' }], { isValid: true }]
  ])('validates list name when %s', (text, operators, res) => {
    wrapper.vm.formData.operators = operators
    expect(wrapper.vm.validateName('list1')).toEqual(res)
  })
})
