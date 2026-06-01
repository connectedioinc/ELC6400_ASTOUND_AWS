import Profiles from '../../src/views/system/Profiles.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Profiles.vue', () => {
  it('returns if current profile is not same as applied', () => {
    const profile = 'default'
    const wrapper = createWrapper(Profiles)
    wrapper.vm.reloadCurrentProfile = true
    wrapper.vm.appliedProfile = profile
    expect(wrapper.vm.canApply({ id: profile })).not.toEqual(profile)
  })
  it('displays error message when applyProfile API post call is not successful', async () => {
    const wrapper = createWrapper(Profiles)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({ response: { data: { errors: [{ code: 1 }] } } })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.applyProfile()
    expect(spy).toHaveBeenCalledWith('Unable to apply profile. Scheduler is enabled.')
    spy.mockClear()
  })
  it('displays error message when applyProfile API post call is not successful', async () => {
    const wrapper = createWrapper(Profiles)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.applyProfile()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    spy.mockClear()
  })
  it('displays success message after successful API post call and check if profile applied', async () => {
    const profile = 'default'
    const wrapper = createWrapper(Profiles)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true, data: {} })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.applyProfile(profile)
    expect(spy).toHaveBeenCalledWith('Profile applied')
    expect(wrapper.vm.appliedProfile).toEqual(profile)
    spy.mockClear()
  })
  it.each`
    text                                  | ip4addrValidator | mockData                                                                                                               | ipAddrRedirect                                | port
    ${'ipv4 address with http port 80'}   | ${true}          | ${{ success: true, data: { lan_ipv4: '192.168.1.1', http_port: '80' } }}                                               | ${'192.168.1.1'}                              | ${'80'}
    ${'ipv4 address with http port 80'}   | ${true}          | ${{ success: true, data: { lan_ipv4: '192.168.1.1', https_port: '443', http_port: '80' } }}                            | ${'192.168.1.1'}                              | ${'80'}
    ${'ipv4 address with https port 443'} | ${true}          | ${{ success: true, data: { lan_ipv4: '192.168.1.1', https_port: '443' } }}                                             | ${'192.168.1.1'}                              | ${'443'}
    ${'ipv6 address with http port 80'}   | ${true}          | ${{ success: true, data: { lan_ipv6: '2001:db8:3333:4444:5555:6666:7777:8888', http_port: '80' } }}                    | ${'[2001:db8:3333:4444:5555:6666:7777:8888]'} | ${'80'}
    ${'ipv6 address with http port 80'}   | ${true}          | ${{ success: true, data: { lan_ipv6: '2001:db8:3333:4444:5555:6666:7777:8888', https_port: '443', http_port: '80' } }} | ${'[2001:db8:3333:4444:5555:6666:7777:8888]'} | ${'80'}
    ${'ipv6 address with https port 443'} | ${true}          | ${{ success: true, data: { lan_ipv6: '2001:db8:3333:4444:5555:6666:7777:8888', https_port: '443' } }}                  | ${'[2001:db8:3333:4444:5555:6666:7777:8888]'} | ${'443'}
  `('displays success message and reconnects to $text after successful applyProfile API call', async ({ ip4addrValidator, mockData, ipAddrRedirect, port }) => {
    const profile = 'default'
    const wrapper = createWrapper(Profiles)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce(mockData)
    wrapper.vm.$VuciValidator.ip4addr = vi.fn().mockReturnValueOnce({ isValid: ip4addrValidator })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    const spy2 = vi.spyOn(wrapper.vm, '$reconnect')
    await wrapper.vm.applyProfile(profile)
    expect(spy).toHaveBeenCalledWith('Profile applied')
    expect(spy2).toHaveBeenCalledWith('Applying profile', { address: ipAddrRedirect, port })
    expect(wrapper.vm.appliedProfile).toEqual(profile)
    spy.mockClear()
  })

  it.each`
    section                               | appliedProfile | scheduler                                                    | hint
    ${{ id: 'default', profile_id: '0' }} | ${'default'}   | ${[]}                                                        | ${[{ info: 'Default profile cannot be deleted' }]}
    ${{ id: '1', profile_id: '1' }}       | ${'1'}         | ${[{ id: '0', profile_id: 'default' }, { profile_id: '1' }]} | ${[{ info: 'This profile cannot be deleted because it is currently applied' }]}
    ${{ id: '1', profile_id: '1' }}       | ${'default'}   | ${[{ id: '0', profile_id: 'default' }, { profile_id: '1' }]} | ${[{ info: 'This profile cannot be deleted because it is used by the scheduler' }]}
  `('tests deleteHint', async ({ section, appliedProfile, scheduler, hint }) => {
    const wrapper = createWrapper(Profiles)
    wrapper.vm.scheduler = scheduler
    await wrapper.vm.applyProfile(appliedProfile)
    expect(wrapper.vm.deleteHint(section)).toEqual(hint)
  })

  const failRes = { valid: false, message: "Can't create more instances. Only 10 profile instances are allowed" }
  const failData = Array(10).fill({ '.type': 'profile' })
  it.each`
    title                                 | returns            | dataSource
    ${'passes'}                           | ${{ valid: true }} | ${[{ '.type': 'profile' }]}
    ${'fails and displays error message'} | ${failRes}         | ${failData}
  `('validation $title when adding instance', async ({ returns, dataSource }) => {
    const wrapper = createWrapper(Profiles)
    const result = wrapper.vm.onAdd([], dataSource)
    expect(result).toEqual(returns)
  })
  it('does not update applied profile after adding', () => {
    const form = { from_current_profile: '0' }
    const data = {
      newSection: {
        id: 'test',
        updated: 1
      },
      uciData: {
        profile: [
          {
            id: 'default',
            updated: 0
          }
        ]
      }
    }
    const wrapper = createWrapper(Profiles, {
      data: () => ({
        appliedProfile: 'default'
      })
    })
    wrapper.vm.afterAdd(form, data)
    expect(data.uciData.profile[0].updated).toBe(0)
  })
  it('updates applied profile updated timestamp after adding', () => {
    const form = { from_current_profile: '1' }
    const data = {
      newSection: {
        id: 'test',
        updated: 1
      },
      uciData: {
        profile: [
          {
            id: 'default',
            updated: 0
          }
        ]
      }
    }
    const wrapper = createWrapper(Profiles, {
      data: () => ({
        appliedProfile: 'default'
      })
    })
    wrapper.vm.afterAdd(form, data)
    expect(data.uciData.profile[0].updated).toBe(1)
  })
  it('logout user on profile change', async () => {
    const profile = 'default'
    const wrapper = createWrapper(Profiles)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true, data: { lan_ip: '192.168.1.1' } })
    wrapper.vm.$VuciValidator.ip4addr = vi.fn().mockReturnValueOnce({ isValid: true })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.applyProfile(profile)
    expect(spy).toHaveBeenCalledWith('Profile applied')
  })
})
