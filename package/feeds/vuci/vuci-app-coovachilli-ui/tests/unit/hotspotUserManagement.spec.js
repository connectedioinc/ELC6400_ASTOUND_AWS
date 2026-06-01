import HotspotCurrent from '../../src/views/services/HotspotCurrentUsers.vue'
import HotspotRegistered from '../../src/views/services/HotspotRegisteredUsers.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('HotspotUserManagement.vue', () => {
  const badApiData = { success: false }
  const goodApiData = {
    success: true,
    data: [
      {
        clientState: true,
        ipAddress: '192.168.1.1',
        session: {
          userName: 'test3',
          startTime: 5242543
        },
        accounting: {
          inputOctets: '500',
          outputOctets: '1000',
          sessionTime: '50'
        }
      }
    ]
  }
  const falseApiData = {
    success: true,
    data: [{ clientState: true, session: {}, accounting: {} }]
  }
  const correctResponse = [
    {
      clientState: true,
      inputOctets: '500 B',
      ipAddress: '192.168.1.1',
      macAddress: '-',
      outputOctets: '1000 B',
      sessionTime: '50 s',
      startTime: '1970-03-02 16:15:43',
      userName: 'test3'
    }
  ]
  const falseResponse = [
    {
      clientState: true,
      inputOctets: '0 B',
      ipAddress: '-',
      macAddress: '-',
      outputOctets: '0 B',
      sessionTime: '-',
      startTime: '-',
      userName: '-'
    }
  ]
  const registeredData = {
    success: true,
    data: {
      users: [
        {
          id: '1',
          username: 'test',
          expiration: 43,
          phone: 45,
          email: 'test@gmail.com',
          created: 5243654
        }
      ],
      sms_users: [
        {
          id: '2',
          username: 'test',
          phone: 45,
          email: 'test@gmail.com'
        }
      ]
    }
  }
  const registeredDataBad = {
    success: true,
    data: [
      {
        users: [{}],
        sms_users: [{}]
      }
    ]
  }
  const registeredResponseBad = []

  it.each([
    [false, badApiData, []],
    [true, goodApiData, correctResponse],
    ['incorrect', falseApiData, falseResponse]
  ])('Checks if data is loaded correctly with response is %s', async (value, text, result) => {
    const wrapper = createWrapper(HotspotCurrent)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(text)

    await wrapper.vm.loadCurrentUsers()
    expect(wrapper.vm.users).toEqual(result)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(HotspotCurrent)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadCurrentUsers()
    expect(spy).toHaveBeenCalledWith('Failed to load current user data')
  })
  it('invokes error message when logout fails', async () => {
    const wrapper = createWrapper(HotspotCurrent)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.logoutUser({ macAddress: 'test' })
    expect(spy).toHaveBeenCalledWith('Failed to logout a user')
  })
  it('invokes success message when logout succeeds', async () => {
    const wrapper = createWrapper(HotspotCurrent)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.logoutUser({ macAddress: 'test' })
    expect(spy).toHaveBeenCalledWith('User logout successful')
  })
  it('Checks if registered users are loaded', async () => {
    const wrapper = createWrapper(HotspotRegistered)
    wrapper.vm.$axios.bulk = vi.fn()
    wrapper.vm.$axios.bulk.mockResolvedValueOnce(registeredData)
    await wrapper.vm.loadRegisteredUsers()
    expect(wrapper.vm.users).toEqual([])
  })
  it('Checks if registered users are loaded when data is bad', async () => {
    const wrapper = createWrapper(HotspotRegistered)
    wrapper.vm.$axios.bulk = vi.fn()
    wrapper.vm.$axios.bulk.mockResolvedValueOnce(registeredDataBad)
    await wrapper.vm.loadRegisteredUsers()
    expect(wrapper.vm.users).toEqual(registeredResponseBad)
  })
  it('calls prompt on theme delete', async () => {
    const wrapper = createWrapper(HotspotRegistered)
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.deleteUser()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
