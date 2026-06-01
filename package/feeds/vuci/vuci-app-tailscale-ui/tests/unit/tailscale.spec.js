import Tailscale from '../../src/views/services/Tailscale.vue'
import createWrapper from '@tests/unit/mockFactory'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'

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

describe('Tailscale tests', () => {
  let wrapper
  let message
  beforeEach(() => {
    wrapper = createWrapper(Tailscale)
    message = useMessages()
  })
  it('shows error if response fails', async () => {
    axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalled()
  })
  it('loads data and starts timer to update status', async () => {
    const spyTimer = vi.spyOn(wrapper.vm.timer, 'start')
    axios.get = vi.fn().mockResolvedValueOnce({ data: [{}] })
    await wrapper.vm.loadData({})
    expect(spyTimer).toHaveBeenCalled()
  })
  it.each`
    option   | expected
    ${'url'} | ${[{ value: 'url' }, { value: 'key' }]}
    ${'key'} | ${[{ value: 'url' }, { value: 'key' }]}
  `('updates auth method radio buttons when $option is selected', ({ option, expected }) => {
    wrapper.vm.authType = option
    const result = wrapper.vm.authOptions.map(opt => ({
      checked: opt.checked,
      value: opt.value
    }))
    expect(result).toEqual(expected)
  })
  it('successful logout should set status to disconnected and show success message', async () => {
    wrapper.vm.status = '1'
    axios.post = vi.fn().mockResolvedValueOnce({})
    const spy = vi.spyOn(message, 'success')
    await wrapper.vm.logout()
    expect(wrapper.vm.status).toBe('0')
    expect(spy).toHaveBeenCalled()
  })
  it('unsuccessful logout should show error message', async () => {
    axios.post = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.logout()
    expect(spy).toHaveBeenCalled()
  })
  it.each`
    messages                                                               | expected
    ${['First message']}                                                   | ${['First message']}
    ${['First message', 'Second message']}                                 | ${['First message', 'Second message']}
    ${['First', 'Second', 'Third', 'Fourth', 'Fifth']}                     | ${['First', 'Second', 'Third', 'Fourth', 'Fifth']}
    ${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth']}            | ${['First', 'Second', 'Third', 'Fourth', 'Fifth']}
    ${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh']} | ${['First', 'Second', 'Third', 'Fourth', 'Fifth']}
  `('returns up to 5 messages for displayedMessages when messages is $messages', ({ messages, expected }) => {
    wrapper.vm.messages = messages
    expect(wrapper.vm.displayedMessages).toEqual(expected)
  })
  it.each`
    description        | input                                                                                                      | expected
    ${'complete data'} | ${{ status: '1', url: 'https://example.com', ip: ['192.168.1.1', '2001:db8::1'], message: ['Connected'] }} | ${'1'}
    ${'empty arrays'}  | ${{ status: '3', url: '', ip: [], message: [] }}                                                           | ${'3'}
  `('should handle $description in updateTailscaleData', ({ input, expected }) => {
    wrapper.vm.updateTailscaleData(input)
    expect(wrapper.vm.status).toEqual(expected)
  })
  it.each([
    ['1', true],
    ['0', false],
    ['2', false],
    ['3', false]
  ])('should correctly determine if running when status is %s', (status, expected) => {
    wrapper.vm.status = status
    expect(wrapper.vm.isRunning).toBe(expected)
  })
  it('should show IP address when running and IP is available', () => {
    wrapper.vm.status = '1'
    wrapper.vm.ipAddresses = ['192.168.1.1']
    expect(wrapper.vm.showIpAddress).toBe(true)
  })
  it('should not show IP address when not running', () => {
    wrapper.vm.status = '0'
    wrapper.vm.ipAddresses = ['192.168.1.1']
    expect(wrapper.vm.showIpAddress).toBe(false)
  })
  it('should use gray color for status text when loading', () => {
    wrapper.vm.isLoading = true
    wrapper.vm.status = '1'
    expect(wrapper.vm.statusColorClass).toBe('text-theme-text-secondary-subtle')
  })
})
