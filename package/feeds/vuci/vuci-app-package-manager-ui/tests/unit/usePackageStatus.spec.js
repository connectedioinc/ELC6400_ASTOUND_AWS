import createWrapper from '@tests/unit/mockFactory'
import { usePackageStatus } from '../../src/components/services/composables/usePackageStatus'
import { defineComponent } from 'vue'
import { axios } from '@ui-core/plugins/axios'

describe('usePackageStatus', () => {
  let wrapper
  const TestComponent = defineComponent({
    setup() {
      return {
        ...usePackageStatus()
      }
    }
  })

  beforeEach(() => {
    wrapper = createWrapper(TestComponent)
  })

  it('should update existing packages and remove packages not in newData', () => {
    wrapper.vm.packages = [
      { tlt_name: 'pkg1', package: 'pkg1', type: 1, version: '1.0' },
      { tlt_name: 'pkg2', package: 'pkg2', type: 2, version: '2.0' }
    ]
    const newData = [
      { tlt_name: 'pkg1', package: 'pkg1', type: 3, version: '1.1' },
      { tlt_name: 'pkg3', package: 'pkg3', type: 4, version: '3.0' }
    ]
    wrapper.vm.setStatusData(newData)

    expect(wrapper.vm.packages).toEqual([
      { tlt_name: 'pkg1', package: 'pkg1', type: 3, version: '1.1' },
      { tlt_name: 'pkg3', package: 'pkg3', type: 4, version: '3.0' }
    ])
  })

  it('should update package type for packages in packagesToUpdate', () => {
    wrapper.vm.packages = [
      { package: 'pkg1', type: 1, version: '1.0' },
      { package: 'pkg2', type: 5, version: '2.0' }
    ]
    wrapper.vm.setPackageTypes(['pkg1'], { packageType: 2 })

    expect(wrapper.vm.packages[0].type).toBe(2)
    expect(wrapper.vm.packages[1].type).toBe(5)
    expect(wrapper.vm.isActionRunning).toBe(true)
  })

  it('should not change type if package already has running type', () => {
    wrapper.vm.packages = [{ package: 'pkg2', type: 5, version: '2.0' }]
    wrapper.vm.setPackageTypes(['pkg2'], { packageType: 2 })

    expect(wrapper.vm.packages[0].type).toBe(5)
    expect(wrapper.vm.isActionRunning).toBe(true)
  })

  it('should load flash and package status, update packages and loading state', async () => {
    const flashMock = Promise.resolve()
    const packagesMock = [{ tlt_name: 'pkg1', package: 'pkg1', type: 1, version: '1.0' }]
    wrapper.vm.handleFlashLoad = vi.fn(() => flashMock)
    axios.get = vi.fn().mockResolvedValueOnce(packagesMock)

    wrapper.vm.arePackagesLoading = true
    await wrapper.vm.handleStatusLoad(false)

    expect(wrapper.vm.isActionRunning).toBe(false)
  })

  it('should update existing package if installed event matches', () => {
    wrapper.vm.packages = [{ package: 'pkg1', type: 1, version: '1.0' }]
    const newData = { package: 'pkg1', type: 2, version: '2.0' }
    wrapper.vm.handlePackageInstalledEvent(newData)
    expect(wrapper.vm.packages[0]).toEqual({ package: 'pkg1', type: 2, version: '2.0' })
  })

  it('should add new package if installed event does not match any', () => {
    wrapper.vm.packages = [{ package: 'pkg1', type: 1, version: '1.0' }]
    const newData = { package: 'pkg2', type: 3, version: '3.0' }
    wrapper.vm.handlePackageInstalledEvent(newData)
    expect(wrapper.vm.packages).toContainEqual({ package: 'pkg2', type: 3, version: '3.0' })
  })

  it('should update flash and packages if package and memory are present', () => {
    wrapper.vm.packages = [{ package: 'pkg1', type: 1, version: '1.0', upgrade: true }]
    const packageData = { package: 'pkg1', type: 2, version: '2.0' }
    const memoryData = { flash_used: 10, flash_total: 100, flash_free: 90, flash_percentage: 10 }
    wrapper.vm.handlePackageEvent({ package: packageData, memory: memoryData })

    expect(wrapper.vm.flash.flash_used).toBe(10)
    expect(wrapper.vm.flash.flash_total).toBe(100)

    expect(wrapper.vm.packages[0]).toEqual({
      installed_version: undefined,
      package: 'pkg1',
      type: 2,
      upgrade: false,
      version: '2.0'
    })
  })

  it('should return true if there are running packages', () => {
    wrapper.vm.packages = [{ type: 5 }]
    expect(wrapper.vm.isActionRunning).toBeTruthy()
  })
})
