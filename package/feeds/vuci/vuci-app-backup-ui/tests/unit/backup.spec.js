import Backup from '../../src/views/system/Backup.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Backup.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Backup)
    wrapper.vm.$refs['encrypt-password'].validate = () => Promise.resolve(true)
    wrapper.vm.$refs['restore-password'].validate = () => Promise.resolve(true)
  })
  describe('getStatus()', () => {
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ data: {} })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getStatus()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getStatus()
      expect(spy).toHaveBeenCalled()
    })
    it("sets data when request doesn't throw error", async () => {
      wrapper.vm.$axios.get = vi.fn()
      const data = {
        date: '05/09/2022 05:23',
        sha256: '-',
        md5: '-'
      }
      wrapper.vm.$axios.get.mockResolvedValueOnce({ data })
      await wrapper.vm.getStatus()
      expect(wrapper.vm.backupStatus).toEqual(data)
    })
  })
  describe('generateBackup()', () => {
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ data: {} })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.generateBackup()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.generateBackup()
      expect(spy).toHaveBeenCalled()
    })
    it('fails validation', async () => {
      wrapper.vm.$refs['encrypt-password'].validate = () => Promise.resolve(false)
      wrapper.vm.$axios.post = vi.fn()
      await wrapper.vm.generateBackup()
      expect(wrapper.vm.$axios.post).not.toHaveBeenCalled()
    })
    it("sets data when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn()
      const data = {
        sha256: '-',
        md5: '-'
      }
      wrapper.vm.$axios.post.mockResolvedValueOnce({ data })
      await wrapper.vm.generateBackup()
      expect(wrapper.vm.backupStatus).toEqual(data)
    })
  })
  describe('downloadBackup()', () => {
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$utils.downloadFileApi = vi.fn()
      wrapper.vm.$utils.downloadFileApi.mockResolvedValueOnce({ data: {} })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.downloadBackup()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$utils.downloadFileApi = vi.fn()
      wrapper.vm.$utils.downloadFileApi.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.downloadBackup()
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('applyBackup()', () => {
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ data: {} })
      wrapper.vm.$VuciValidator.ip4addr = vi.fn().mockReturnValueOnce({ isValid: true })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.applyBackup()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.applyBackup()
      expect(spy).toHaveBeenCalled()
    })
    it("tries to reconnect when request doesn't throw error", async () => {
      wrapper.vm.$utils.downloadFileApi = vi.fn()
      wrapper.vm.$utils.downloadFileApi.mockResolvedValueOnce({ data: {} })
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ data: '192.168.1.1' })
      wrapper.vm.$VuciValidator.ip4addr = vi.fn().mockReturnValueOnce({ isValid: true })
      const spy = vi.spyOn(wrapper.vm, '$reconnect')
      await wrapper.vm.applyBackup()
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('onUploadSuccess()', () => {
    it('fails validation', async () => {
      wrapper.vm.uploadedBackup = null
      wrapper.vm.$refs['restore-password'].validate = () => Promise.resolve(false)
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.onUploadSuccess()
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('Password is invalid')
      expect(wrapper.vm.uploadedBackup).toEqual(null)
    })
    it('passes validation', async () => {
      wrapper.vm.uploadedBackup = null
      wrapper.vm.$refs['restore-password'].validate = () => Promise.resolve(true)
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.onUploadSuccess({ test: 'test' })
      expect(spy).toHaveBeenCalledTimes(0)
    })
    it('fails validation with success false', async () => {
      wrapper.vm.uploadedBackup = null
      wrapper.vm.$refs['restore-password'].validate = () => Promise.resolve(true)
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.onUploadSuccess({ test: 'test' })
      expect(spy).toHaveBeenCalledTimes(0)
      expect(wrapper.vm.uploadedBackup).toEqual({ test: 'test' })
    })
  })
  describe('cancelBackup()', () => {
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ data: {} })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.cancelBackup()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.cancelBackup()
      expect(spy).toHaveBeenCalled()
    })
    it('deletes backup data', async () => {
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({})
      await wrapper.vm.cancelBackup()
      expect(wrapper.vm.uploadedBackup).toBe(null)
    })
  })
})
