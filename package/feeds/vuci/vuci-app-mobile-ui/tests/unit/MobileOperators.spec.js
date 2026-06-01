import MobileOperators from '../../src/views/network/MobileOperators.vue'
import { useMobileOperatorUtils } from '@/composables/useMobileOperatorUtils'
import { useMessages, usePrompt } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import createWrapper from '@tests/unit/mockFactory'

const tltStub = {
  'tlt-form-model': true,
  'tlt-card': true,
  'tlt-form-model-item': true,
  'tlt-form-item-select': true,
  'tlt-button': true,
  'tlt-table': true,
  'tlt-dummy-value': true,
  'tlt-tabs': true,
  'vuci-form-item-switch': true,
  'vuci-form-item-select': true
}

const date = '2024-05-20 13:00:00'

vi.mock('@ui-core/plugins/date', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    localDate: vi.fn(() => date)
  }
})

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

describe('MobileOperators.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileOperators, {
      global: {
        stubs: tltStub,
        mocks: {
          $router: {
            push: () => {}
          },
          $mobile: {
            simCount: () => 1,
            modemOffline: () => false,
            getSimLabel: () => '1',
            getSimstate: () => 'N/A',
            getModemBusyState: () => 'N/A',
            getOperatorState: () => 'N/A',
            getDataConnState: () => 'N/A',
            getMobileStage: () => 'N/A',
            getConntype: () => 'N/A',
            getSimstateLabel: () => 'SIM card state',
            modemLowPower: () => false
          }
        }
      }
    })
    wrapper.vm.modemList = [{ id: '3-1', name: 'Internal modem' }]
  })

  it('check if afterLoad method shows error when request throws error', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    spy.mockClear()
  })
  it('check if afterLoad method shows error messages when all requests are unsuccessful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load modem status')
    expect(spy).toHaveBeenCalledWith('Failed to load operators')
    expect(spy).toHaveBeenCalledWith('Failed to load scanned operator list')
    spy.mockClear()
  })
  it('check if afterLoad sets data when request is successful', async () => {
    const modems = [{ id: '3-1', active_sim: 1, name: 'Internal modem' }]
    const operatorList = [{ id: 'cfg0223d7', name: 'test' }]
    const scanList = [{ operators: [], last_scan: 'N/A', modem: '3-1' }]
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      {
        success: true,
        data: modems
      },
      { success: true, data: operatorList },
      { success: true, data: scanList }
    ])
    wrapper.vm.loadApns = vi.fn()
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.modemList).toEqual(modems)
    expect(wrapper.vm.operatorList).toEqual(operatorList)
    expect(wrapper.vm.scanList).toEqual(scanList)
  })
  it('check if updateModems method shows error when request throws error', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.updateModems()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    spy.mockClear()
  })
  it('check if updateModems method shows error messages when all requests are unsuccessful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.updateModems()
    expect(spy).toHaveBeenCalledWith('Failed to load modem status')
    spy.mockClear()
  })
  it('check if updateModems sets data when request is successful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [{ id: '3-1', active_sim: 1, name: 'Internal modem' }] },
      { success: true, data: [{ operators: [], last_scan: 'N/A', modem: '3-1' }] }
    ])
    wrapper.vm.getPreviousScan = vi.fn().mockReturnValueOnce([])
    await wrapper.vm.updateModems()
    expect(wrapper.vm.modemList).toEqual([{ id: '3-1', active_sim: 1, name: 'Internal modem' }])
    expect(wrapper.vm.scanList).toEqual([{ operators: [], last_scan: 'N/A', modem: '3-1' }])
    expect(wrapper.vm.currentModem).toEqual({ id: '3-1', active_sim: 1, name: 'Internal modem' })
  })
  it('check if updateCode updates operatorCodes when opCode is empty', async () => {
    wrapper.vm.getPreviousScan = vi.fn().mockReturnValueOnce([])
    wrapper.vm.modemList = [{ id: '3-1', operator: 'Bite', active_sim: 1 }]
    await wrapper.vm.updateCode()
    expect(wrapper.vm.operatorCodes).toEqual([['', 'N/A']])
  })
  it('check if updateCode updates operatorCodes when opCode contains value', async () => {
    wrapper = createWrapper(MobileOperators, {
      global: {
        mocks: {
          $mobile: {
            simCount: () => 1
          }
        }
      },
      computed: {
        opCode: () => '24601',
        currentModem: () => {
          return { id: '3-1', operator: 'Bite' }
        }
      }
    })
    wrapper.vm.getPreviousScan = vi.fn().mockReturnValueOnce([])
    await wrapper.vm.updateCode()
    expect(wrapper.vm.operatorCodes).toEqual([['24601', '24601 (Bite)']])
  })
  it('check if selectOperator updates simcards data', async () => {
    wrapper = createWrapper(MobileOperators, {
      computed: {
        currentSection: () => ({ id: 'cfg01aa0e' })
      }
    })
    wrapper.vm.formData.simcards = [{ id: 'cfg01aa0e', fallback: '0', operator: 'manual-auto', opernum: '24601' }]
    await wrapper.vm.selectOperator({ numName: '24602' })
    expect(wrapper.vm.formData.simcards[0].opernum).toEqual('24602')
    expect(wrapper.vm.showOpTable).toBe(false)
  })
  it.each([
    ['whitelist', 'Allowlist - only allow operators in the selected list.'],
    ['blacklist', 'Blocklist - block all operators in the selected list.'],
    ['single', "Single operator - requires you to enter operator code and select if you want to fallback to auto if it's not possible to connect to selected operator."]
  ])('returns list mode description when mode is %s', (mode, res) => {
    wrapper = createWrapper(MobileOperators, {
      computed: {
        currentSection: () => ({ id: 'cfg01aa0e' })
      }
    })
    wrapper.vm.formData.simcards = [{ id: 'cfg01aa0e', opermode: mode }]
    expect(wrapper.vm.listModeDescription()).toEqual(res)
  })
  it('check if createNewList shows error when request throws error', async () => {
    wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce({})
    wrapper.vm.operatorList = [{ id: 'cfg01aa0e', name: 'list1' }]
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.createNewList({ model: 'list2' })
    expect(spy).toHaveBeenCalledWith('Failed to create operator list')
    spy.mockClear()
  })
  it('check if createNewList calls router push when request is successful', async () => {
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({ data: [] })
    wrapper.vm.operatorList = [{ id: 'cfg01aa0e', name: 'list1' }]
    const spy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.createNewList({ model: 'list2' })
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockClear()
  })
  it('check if onAfterSave updates values when operator equals manual-auto', async () => {
    const data = { id: 'cfg01aa0e', fallback: '0', operator: 'manual-auto' }
    await wrapper.vm.onAfterSave(undefined, { data })
    expect(data.operator_mode).toEqual('manual')
    expect(data.fallback).toEqual('1')
  })
  it.each([
    ['fallback is enabled', { id: 'cfg01aa0e', fallback: '1' }, 'manual-auto'],
    ['fallback is disabled', { id: 'cfg01aa0e', fallback: '0' }, 'manual']
  ])('check if operator value gets update when %s', async (text, section, res) => {
    await wrapper.vm.updateFallback(section)
    expect(section.operator).toEqual(res)
  })
  it('check if parseSim returns array of SIM rows', () => {
    expect(wrapper.vm.parseSim()).toEqual([
      {
        name: 'active_sim',
        label: 'Active SIM',
        value: 'N/A',
        hint: 'Shows which SIM card slot is currently in use.'
      },
      {
        name: 'sim_card_state',
        label: 'SIM card state',
        value: 'N/A',
        hint: 'The current SIM card state.'
      },
      {
        name: 'modem_state',
        label: 'Modem state',
        value: 'N/A',
        hint: 'Shows current modem state.'
      }
    ])
  })
  it('check if parseOperator returns array of operator rows', () => {
    expect(wrapper.vm.parseOperator()).toEqual([
      {
        name: 'operator',
        label: 'Current operator',
        value: 'N/A',
        hint: 'Shows the name of the operator to which the device is currently connected.'
      },
      {
        name: 'operator_state',
        label: 'Operator state',
        value: 'N/A',
        hint: 'Shows whether the network has currently indicated the registration of the mobile device.'
      },
      {
        name: 'plmn',
        label: 'PLMN',
        value: 'N/A',
        hint: 'Public Land Mobile Network (PLMN) - consisting of MCC (Mobile Country Code) and MNC (Mobile Network Code) values.'
      }
    ])
  })
  it('check if parseConnection returns array of connection rows', () => {
    expect(wrapper.vm.parseConnection()).toEqual([
      {
        hint: 'Indicates whether the device has a mobile data connection or not.',
        label: 'Data connection state',
        name: 'data_connection_state',
        value: 'N/A'
      },
      {
        hint: 'Indicates current mobile connection stage.',
        label: 'Connection stage',
        name: 'mobile_connection_stage',
        value: 'N/A'
      },
      {
        hint: 'Mobile network type.',
        label: 'Network type',
        name: 'network_type',
        value: 'N/A'
      }
    ])
  })
})

describe('useMobileOperatorUtils.ts', () => {
  it('returns previous scan results and scan data', () => {
    const list = [{ operators: [{ status_code: 2, op_name: 'Bite', short_name: 'Bite', num_name: '24601', net_access_type: '2G/4G', country: 'Lithuania' }], last_scan: 'N/A', modem: '3-1' }]
    expect(useMobileOperatorUtils().getPreviousScan(list, { id: '3-1' })).toEqual([
      {
        netAccessType: '2G/4G',
        numName: '24601',
        opName: 'Bite',
        shortName: 'Bite',
        country: 'Lithuania',
        status: { value: 'Available', color: 'success' }
      }
    ])
    expect(useMobileOperatorUtils().scanDate.value).toEqual('')
  })
  it('returns parsed scan results', () => {
    const results = [
      { status_code: 0, op_name: 'Bite', short_name: 'Bite', num_name: '24601', country: 'Lithuania', net_access_type: '2G/4G' },
      { status_code: 1, op_name: 'Telia', short_name: 'Telia', num_name: '24602', country: 'Lithuania', net_access_type: '2G/3G/4G' },
      { status_code: 2, op_name: '246 08', short_name: '246 08', num_name: '24608', country: 'Lithuania', net_access_type: '4G' },
      { status_code: 3, op_name: 'Tele2', short_name: 'Tele2', num_name: '24603', country: 'Lithuania', net_access_type: '3G/4G' }
    ]
    const res = [
      {
        netAccessType: '2G/4G',
        numName: '24601',
        opName: 'Bite',
        shortName: 'Bite',
        country: 'Lithuania',
        status: { value: 'Unknown', color: 'disabled' }
      },
      {
        netAccessType: '2G/3G/4G',
        numName: '24602',
        opName: 'Telia',
        shortName: 'Telia',
        country: 'Lithuania',
        status: { value: 'Available', color: 'success' }
      },
      {
        netAccessType: '4G',
        numName: '24608',
        opName: '246 08',
        shortName: '246 08',
        country: 'Lithuania',
        status: { value: 'Available', color: 'success' }
      },
      {
        netAccessType: '3G/4G',
        numName: '24603',
        opName: 'Tele2',
        shortName: 'Tele2',
        country: 'Lithuania',
        status: { value: 'Forbidden', color: 'error' }
      }
    ]
    expect(useMobileOperatorUtils().parseScanResults(results)).toEqual(res)
  })
  it('check if scanOperators shows error when request throws error', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(message, 'error')
    await useMobileOperatorUtils().scanOperators({ id: '3-1' })
    expect(spy).toHaveBeenCalledWith('Failed to get scan results.')
    spy.mockRestore()
  })
  it('check if scanOperators updates values when request is successful', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({ data: [] })
    const utils = useMobileOperatorUtils()
    await utils.scanOperators({ id: '3-1' })
    expect(utils.operators.value).toEqual([])
    expect(utils.scanDate.value).toEqual(`${date} performed on SIM.`)
  })
  it('checks if showScanPrompt shows prompt', async () => {
    const prompt = usePrompt()
    const spy = vi.spyOn(prompt, 'show')
    await useMobileOperatorUtils().showScanPrompt()
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
