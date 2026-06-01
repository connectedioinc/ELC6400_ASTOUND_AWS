import ReadMessages from '../../src/views/services/ReadMessages.vue'
import createWrapper from '@tests/unit/mockFactory'

const oneModem = [{ id: '3-1', name: 'Internal' }]
const fullModems = [
  { id: '3-1', name: 'Internal' },
  { id: '3-2', name: 'External' }
]
const expectedMessages = [
  {
    date: '2022-01-01',
    timestamp: 1640995200000,
    sender: '+3706969699',
    status: 'read',
    message: 'test1',
    id: '1',
    modemID: '3-1',
    checked: false
  },
  {
    date: '2022-01-01',
    timestamp: 1640995200000,
    sender: '+3706969699',
    status: 'read',
    message: 'test2',
    id: '2',
    modemID: '3-1',
    checked: false
  },
  {
    date: '2022-01-01',
    timestamp: 1640995200000,
    sender: '+3706969699',
    status: 'read',
    message: 'test3',
    id: '3',
    modemID: '3-1',
    checked: false
  }
]
const successGet = {
  success: true,
  data: [
    {
      date: '2022-01-01',
      sender: '+3706969699',
      status: 'read',
      message: 'test1',
      id: '1',
      modem_id: '3-1'
    },
    {
      date: '2022-01-01',
      sender: '+3706969699',
      status: 'read',
      message: 'test2',
      id: '2',
      modem_id: '3-1'
    },
    {
      date: '2022-01-01',
      sender: '+3706969699',
      status: 'read',
      message: 'test3',
      id: '3',
      modem_id: '3-1'
    }
  ]
}

describe('ReadMessages.vue', () => {
  beforeEach(() => {
    vi.spyOn(ReadMessages, 'created').mockImplementation(function () {})
  })
  it('returns modem options when modem array has instances', () => {
    const wrapper = createWrapper(ReadMessages, {
      global: {
        mocks: {
          $mobile: {
            modemsOptions: () => [
              ['3-1', 'Internal'],
              ['3-2', 'External']
            ]
          }
        }
      }
    })
    expect(wrapper.vm.modemOptions).toEqual([
      ['3-1', 'Internal'],
      ['3-2', 'External']
    ])
  })
  it('returns selected modem when multiple modems are given', () => {
    const wrapper = createWrapper(ReadMessages)
    expect(wrapper.vm.selectedModem).toBe('')
  })
  it('returns selected modem when single modem is given', () => {
    const wrapper = createWrapper(ReadMessages, {
      global: {
        mocks: {
          $mobile: {
            modemsOptions: () => [['3.1', 'Internal']]
          }
        }
      }
    })
    expect(wrapper.vm.selectedModem).toBe('3.1')
  })
  it('returns selected modem when none modems are given', () => {
    const wrapper = createWrapper(ReadMessages, {
      global: {
        mocks: {
          $mobile: {
            modemsOptions: () => []
          }
        }
      }
    })
    expect(wrapper.vm.selectedModem).toBe('')
  })
  it('returns filtered shown messages by non-existant modem id', async () => {
    const wrapper = createWrapper(ReadMessages, {
      data: () => ({ modem: '3-2' }),
      global: {
        mocks: {
          $mobile: {
            modemsOptions: () => []
          }
        }
      }
    })
    wrapper.vm.allMessages = [
      {
        date: '2022-01-01',
        sender: '+3706969699',
        status: 'read',
        message: 'test1',
        id: '1',
        modem_id: '3-1'
      },
      {
        date: '2022-01-01',
        sender: '+3706969699',
        status: 'read',
        message: 'test2',
        id: '2',
        modem_id: '3-1'
      },
      {
        date: '2022-01-01',
        sender: '+3706969699',
        status: 'read',
        message: 'test3',
        id: '3',
        modem_id: '3-1'
      }
    ]
    expect(wrapper.vm.showingMessages).toEqual([])
  })
  it('returns filtered shown messages by existant modem id', async () => {
    const wrapper = createWrapper(ReadMessages, {
      data: () => ({ modem: '3-1', allMessages: expectedMessages }),
      global: {
        mocks: {
          $mobile: {
            modemsOptions: () => [['3-1', 'a']]
          }
        }
      }
    })
    expect(wrapper.vm.showingMessages).toEqual(expectedMessages)
  })
  it('returns multiple modems', async () => {
    const wrapper = createWrapper(ReadMessages)
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      success: true,
      data: fullModems
    })
    const spy = vi.spyOn(wrapper.vm, '$spin')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalled()
    expect(wrapper.vm.modems).toEqual(fullModems)
  })
  it('invokes modem loading error', async () => {
    const wrapper = createWrapper(ReadMessages)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load modem data')
    expect(wrapper.vm.modems).toEqual([])
  })
  it('loads messages correctly', async () => {
    const wrapper = createWrapper(ReadMessages)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(successGet)
    await wrapper.vm.loadMessages()
    expect(wrapper.vm.allMessages).toEqual(expectedMessages)
  })
  it('invokes error message when messages loading fails', async () => {
    const wrapper = createWrapper(ReadMessages)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadMessages()
    expect(spy).toHaveBeenCalledWith('Failed to load SMS messages')
  })
  it('deletes selected messages correctly', async () => {
    const wrapper = createWrapper(ReadMessages, {
      computed: {
        modemOptions: () => [],
        showingMessages() {
          const msgs = expectedMessages
          msgs[0].checked = true
          return msgs
        },
        selectedModem: () => '3-1'
      }
    })
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      success: true,
      data: oneModem
    })
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({})
    wrapper.vm.loadMessages = vi.fn()
    wrapper.vm.loadMessages.mockResolvedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.deleteMessages(true)
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('deletes messages', async () => {
    const wrapper = createWrapper(ReadMessages, {
      computed: {
        modemOptions: () => [],
        showingMessages() {
          const msgs = expectedMessages
          msgs[0].checked = true
          return msgs
        },
        selectedModem: () => '3-1'
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValue({})
    wrapper.vm.loadMessages = vi.fn()
    wrapper.vm.loadMessages.mockResolvedValue({})
    const result = await wrapper.vm.deleteMessages(false)
    const exp = await wrapper.vm.loadMessages()
    expect(exp).toEqual(result)
    expect(spy).toHaveBeenCalledWith('Message(s) deleted successfully')
  })
  it('invokes error message when deleting sms and there are no messages selected', async () => {
    const wrapper = createWrapper(ReadMessages, {
      computed: {
        modemOptions: () => [],
        showingMessages() {
          const msgs = expectedMessages
          msgs[0].checked = false
          return msgs
        },
        selectedModem: () => '3-1'
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.deleteMessages([])
    expect(spy).toHaveBeenCalledWith('Please select messages to delete')
  })
  it('invokes error message when deleting sms and there are no messages', async () => {
    const wrapper = createWrapper(ReadMessages, {
      computed: {
        modemOptions: () => [],
        showingMessages: () => [],
        selectedModem: () => '3-1'
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.deleteMessages(false)
    expect(spy).toHaveBeenCalledWith('There are no messages to delete')
  })
  it.each`
    title                  | all
    ${'selected messages'} | ${false}
    ${'all messages'}      | ${true}
  `('invokes prompt message when deleting $title', async ({ all }) => {
    const wrapper = createWrapper(ReadMessages, {
      computed: {
        modemOptions: () => [],
        showingMessages: () => [],
        selectedModem: () => '3-1'
      }
    })
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.deletePrompt(all)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
