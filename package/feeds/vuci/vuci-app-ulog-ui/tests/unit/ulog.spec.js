import createWrapper from '@tests/unit/mockFactory'
import Ulog from '../../src/views/services/Ulog.vue'

describe('Ulog.vue', () => {
  const form = { ulog: [{ password: 'set' }] }
  it('loads network options', async () => {
    const wrapper = createWrapper(Ulog)
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ data: { network: ['lan', 'wan'] } })
    const res = await wrapper.vm.loadNetworks(form)
    expect(wrapper.vm.networkOptions).toEqual(['lan', 'wan'])
    expect(res).toEqual({ ulog: [{ password: 'set' }] })
  })
  it('invokes error message when option loading fails', async () => {
    const wrapper = createWrapper(Ulog)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadNetworks(form)
    expect(spy).toHaveBeenCalledWith('Failed to load network options')
  })
  it.each([
    [false, 'Only one type of slash ("/" or "\\") can be used in a value.', '/test\\'],
    [false, 'Only one type of slash ("/" or "\\") can be used in a value.', '\\test/'],
    [false, 'Value should end with a slash ("/" or "\\").', '/test'],
    [false, 'Value can not contain more than one consecutive slash.', '/test//'],
    [false, 'Value can not contain more than one consecutive slash.', '\\test\\\\'],
    [false, 'Value should end with a slash ("/" or "\\").', '//test'],
    [false, 'Value can not contain more than one consecutive slash.', '\\\\test\\'],
    [true, null, '/test/'],
    [true, null, '\\test\\'],
    [true, null, 'test/'],
    [true, null, 'test\\']
  ])('returns isValid: "%s" when path: %s', (isValid, message, path) => {
    const wrapper = createWrapper(Ulog)
    const result = wrapper.vm.validatePath(path)
    expect(result.isValid).toEqual(isValid)
    if (message != null) {
      expect(result.message).toEqual(message)
    }
  })
})
