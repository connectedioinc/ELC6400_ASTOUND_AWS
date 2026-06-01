import createWrapper from '@tests/unit/mockFactory'
import Snmp from '../../src/views/services/Snmp.vue'
import SnmpV3 from '../../src/views/services/SnmpV3.vue'
import SnmpV3Edit from '../../src/views/services/SnmpV3Edit.vue'

describe('Snmp.vue', () => {
  it('invokes download file successfully', async () => {
    const wrapper = createWrapper(Snmp)
    wrapper.vm.$utils.downloadFileApi = vi.fn().mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$utils, 'downloadFileApi')
    await wrapper.vm.downloadMib()
    expect(spy).toHaveBeenCalledWith('/api/snmp/system/actions/download_mib', 'text/plain', 'POST')
  })
  it('invokes error message when download file fails', async () => {
    const wrapper = createWrapper(Snmp)
    wrapper.vm.$utils.downloadFileApi = vi.fn().mockRejectedValueOnce({
      response: { data: { error: 'fail' } }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.downloadMib()
    expect(spy).toHaveBeenCalledWith(wrapper.vm.$t('Failed to download MIB file'))
  })
  it.each([
    [{ data: { errors: [{ code: 2 }] } }, 'At least one community configuration must exist to enable the SNMP service.'],
    [{ data: { errors: [{ code: 69420 }] } }, 'Failed to edit configuration']
  ])('returns device edit error messages', (error, response) => {
    const wrapper = createWrapper(Snmp)
    expect(wrapper.vm.returnErrorMessage(error)).toEqual(response)
  })
  it.each([
    [{ enabled: '1', v1mode: '1', v2cmode: '0', v3mode: '0' }],
    [{ enabled: '1', v1mode: '0', v2cmode: '1', v3mode: '0' }],
    [{ enabled: '1', v1mode: '0', v2cmode: '0', v3mode: '1' }],
    [{ enabled: '1', v1mode: '1', v2cmode: '1', v3mode: '1' }]
  ])('checks if onBeforeSave resolved when enable and turned on at least one mode', data => {
    const wrapper = createWrapper(Snmp)
    wrapper.vm.formData = { settings: [data] }
    expect(wrapper.vm.onBeforeSave()).resolves.toEqual()
  })
  it('rejects onBeforeSave method because without selected SNMP mode', async () => {
    const wrapper = createWrapper(Snmp)
    wrapper.vm.formData = { settings: [{ enabled: '1', v1mode: '0', v2cmode: '0', v3mode: '0' }] }
    expect(wrapper.vm.onBeforeSave()).rejects.toEqual("Can't enable SNMP, without selected SNMP mode")
  })
  it('checks if onBeforeSave resolved when enable and turned on at least one mode', async () => {
    const wrapper = createWrapper(Snmp)
    wrapper.vm.formData = { settings: [{ enabled: '1', v1mode: '0', v2cmode: '0', v3mode: '1' }] }
    expect(wrapper.vm.onBeforeSave()).resolves.toEqual()
  })
})

describe('SnmpV3.vue', () => {
  it.each([
    ['with empty rights option', 'Missing required option: Access mode', { id: 'test1', enabled: '1', seclevel: 'seclevel' }],
    ['with empty seclevel option', 'Missing required option: Security level', { id: 'test1', enabled: '1', rights: 'rights' }],
    ['with empty authpass option, when seclevevel is equal auth', 'Missing required option: Authentication passphrase', { id: 'test1', enabled: '1', rights: 'rights', seclevel: 'auth' }],
    [
      'with empty authpass, privpass options, when seclevevel is equal priv',
      'Missing required options: Authentication passphrase, Privacy passphrase',
      { id: 'test1', enabled: '1', rights: 'rights', seclevel: 'priv' }
    ]
  ])('returns error message when %s', (text, message, sectionValues) => {
    const wrapper = createWrapper(SnmpV3)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      uciSection: sectionValues
    }
    wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(message)
  })
})
describe('SnmpV3Edit.vue', () => {
  it.each`
    value    | message
    ${'DES'} | ${'This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.'}
    ${'AES'} | ${undefined}
  `('returns warning message when cipher is considered not secure', ({ value, message }) => {
    const wrapper = createWrapper(SnmpV3Edit, { props: { section: {} } })
    const res = wrapper.vm.getCipherWarning(value)
    expect(res).toEqual(message)
  })
  it.each`
    val        | isValid
    ${'test2'} | ${false}
    ${'test3'} | ${true}
  `('returns isValid $isValid when value is not found in users formdata array', ({ val, isValid }) => {
    const wrapper = createWrapper(SnmpV3Edit, { props: { section: {} } })
    wrapper.vm.formData.users = [{ username: 'test1' }, { username: 'test2' }, { username: 'test2' }]
    const res = wrapper.vm.validateUsername(val)
    expect(res.isValid).toBe(isValid)
  })
})
