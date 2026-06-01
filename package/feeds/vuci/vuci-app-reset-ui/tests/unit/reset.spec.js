import Reset from '../../src/views/system/Reset.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Reset.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Reset)
  })
  describe('removeDefaultConfiguration()', () => {
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.removeDefaultConfiguration()
      expect(spy).toHaveBeenCalled()
    })
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.removeDefaultConfiguration()
      expect(spy).not.toHaveBeenCalled()
    })
    it("removes backup date when request doesn't throw error", async () => {
      wrapper.vm.backupStatus.date = '04/28/2022 11:52'
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce()
      wrapper.vm.selectedFrom = 'user'
      await wrapper.vm.removeDefaultConfiguration()
      expect(wrapper.vm.selectedFrom).toBe('system')
      expect(wrapper.vm.backupStatus.date).toBe('-')
    })
  })
  describe('createDefaultConfiguration()', () => {
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.createDefaultConfiguration()
      expect(spy).toHaveBeenCalled()
    })
    it("loads backup stau when request doesn't throw error", async () => {
      wrapper.vm.backupStatus.date = '-'
      const newDate = '04/28/2022 11:52'
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ data: { date: newDate } })
      await wrapper.vm.createDefaultConfiguration()
      expect(wrapper.vm.backupStatus.date).toBe(newDate)
    })
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ data: { date: '-' } })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.createDefaultConfiguration()
      expect(spy).not.toHaveBeenCalled()
    })
  })
  describe('onPromptOk()', () => {
    it.each([
      ['and restore user defaults', '0'],
      ['', '']
    ])("doesn't show error when request doesn't throw error %s", async (value, userDefaults) => {
      const wrapper = createWrapper(Reset, {
        mocks: {
          $reconnect: vi.fn()
        }
      })
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ data: { lan_ip: '192.168.1.1' } })
      const spyError = vi.spyOn(wrapper.vm.$message, 'error')
      const spyReconnect = vi.spyOn(wrapper.vm, '$reconnect')
      await wrapper.vm.onPromptOk(userDefaults)
      expect(spyError).not.toHaveBeenCalled()
      expect(spyReconnect).toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      const wrapper = createWrapper(Reset, {
        mocks: {
          $reconnect: vi.fn()
        }
      })
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce()
      const spyError = vi.spyOn(wrapper.vm.$message, 'error')
      const spyReconnect = vi.spyOn(wrapper.vm, '$reconnect')
      await wrapper.vm.onPromptOk()
      expect(spyError).toHaveBeenCalled()
      expect(spyReconnect).not.toHaveBeenCalled()
    })
  })
  describe('prompt function tests', () => {
    it('restoreDefault prompt', async () => {
      const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
      wrapper.vm.restoreDefault()
      expect(spy).toHaveBeenCalled()
    })
    it('showErrorPrompt prompt', async () => {
      const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
      wrapper.vm.showErrorPrompt()
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('Tests computed props', () => {
    it.each`
      date                  | expectedResult
      ${'-'}                | ${false}
      ${'05/26/2022 08:05'} | ${true}
    `('returns $expectedResult when date: $date', async ({ date, expectedResult }) => {
      wrapper.vm.backupStatus = { date }
      const result = wrapper.vm.userDefaultExist
      expect(result).toBe(expectedResult)
    })
  })
  describe('Other tests', () => {
    it.each`
      selectedFrom | message
      ${'system'}  | ${"This will reset all changes to 'System settings'."}
      ${'factory'} | ${"This will reset all changes to 'Factory defaults'."}
      ${'user'}    | ${"This will reset all changes to 'User's default configuration'."}
    `('returns "$message" when selectedResetType: $selectedResetType', async ({ selectedFrom, message }) => {
      const wrapper = createWrapper(Reset, {
        computed: {
          fromOptions: () => [
            { name: 'System settings', value: 'system' },
            { name: 'Factory defaults', value: 'factory' },
            { name: "User's default configuration", value: 'user' }
          ]
        }
      })
      await wrapper.setData({ selectedFrom })
      const result = wrapper.vm.promptMessage()
      expect(result).toBe(message)
    })
  })
})
