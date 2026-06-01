import HotspotUsers from '../../src/views/services/HotspotUsers.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('HotspotUsers.vue', () => {
  const apiData = { success: false, data: [] }
  const goodApiData = { success: true, data: [{ name: 'test' }, { name: 'test2' }] }
  it.each([
    [false, goodApiData, [{ name: 'test' }, { name: 'test2' }]],
    [true, apiData, []]
  ])('Checks if data is loaded correctly with success %s', async (value, text, result) => {
    const wrapper = createWrapper(HotspotUsers)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(text)
    wrapper.vm.groupOptionsMapping = vi.fn()
    wrapper.vm.groupOptionsMapping.mockReturnValue([])
    const spy = vi.spyOn(wrapper.vm, 'groupOptionsMapping')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith(result)
  })
  it.each([
    ['groups exists', [{ name: 'test' }], ['test']],
    ['groups dont exist', [], ['', 'No groups available']]
  ])('returns group options', (text, data, response) => {
    const wrapper = createWrapper(HotspotUsers)
    expect(wrapper.vm.groupOptionsMapping(data)).toEqual(response)
  })
  it('returns group options', () => {
    const wrapper = createWrapper(HotspotUsers)
    wrapper.vm.groups = []
    expect(wrapper.vm.getGroups()).toEqual([])
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(HotspotUsers)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load user group data')
  })
  it.each([
    ['incorrect', { username: 'test' }, { message: 'User with username test already exists', valid: false }],
    ['correct', { username: 't' }, { valid: true }]
  ])('Checks if form validation fails when username is %s ', async (value, text, result) => {
    const wrapper = createWrapper(HotspotUsers)
    wrapper.vm.formData = { users: [{ username: 'test' }] }
    const val = await wrapper.vm.addSection(text)
    expect(val).toEqual(result)
  })
})
