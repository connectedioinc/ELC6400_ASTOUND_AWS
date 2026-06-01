import PackageTable from '../../src/views/services/PackageTable.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('../../src/views/services/composables/actions/usePackageTableActions', () => {
  return {
    usePackageTableActions: () => ({
      testAction: () => ({
        options: {
          filterTypes: [2],
          allowException: pkg => pkg.package !== 'pkg2',
          filterException: pkg => pkg.package === 'pkg3'
        }
      })
    })
  }
})

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: '/test/path' }))
  }
})

vi.mock('@ui-core/composables/useI18n', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useTranslate: vi.fn(() => t => t)
  }
})

describe('PackageManager.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PackageTable, {
      props: {
        packages: [
          { package: 'pkg1', type: 1 },
          { package: 'pkg2', type: 2 },
          { package: 'pkg3', type: 3 }
        ],
        selectedPackages: [],
        isLoading: false,
        isPromptVisible: false,
        promptContext: {}
      }
    })
  })

  it.each([
    {
      input: { type: 1 },
      expected: [
        {
          id: 'remove_pending',
          buttonProps: { color: 'error' },
          callback: expect.any(Function),
          label: 'Remove'
        }
      ]
    },
    {
      input: { type: 2 },
      expected: [
        {
          id: 'add',
          buttonProps: { readonly: false },
          callback: expect.any(Function),
          label: 'Install'
        }
      ]
    },
    {
      input: { type: 3 },
      expected: [
        {
          id: 'remove',
          buttonProps: { color: 'error', readonly: false },
          callback: expect.any(Function),
          label: 'Remove'
        }
      ]
    },
    {
      input: { type: 4 },
      expected: [
        {
          id: 'remove_pending',
          buttonProps: { color: 'error' },
          callback: expect.any(Function),
          label: 'Remove'
        },
        {
          id: 'install',
          callback: expect.any(Function),
          label: 'Retry'
        }
      ]
    },
    {
      input: { type: 8, errors: [{ code: 15 }] },
      expected: [
        {
          id: 'remove_retry',
          callback: expect.any(Function),
          label: 'Retry'
        }
      ]
    },
    {
      input: { type: 3, upgrade: true },
      expected: [
        {
          id: 'upgrade',
          callback: expect.any(Function),
          label: 'Upgrade'
        },
        {
          id: 'remove',
          buttonProps: { color: 'error', readonly: false },
          callback: expect.any(Function),
          label: 'Remove'
        }
      ]
    }
  ])('should return correct row actions for %#', ({ input, expected }) => {
    const actions = wrapper.vm.getRowActions(input)
    expect(actions).toEqual(expected)
  })

  it('should return status data', () => {
    expect(wrapper.vm.getStatus(1)).toEqual({ text: 'In queue', color: 'bg-gray-400' })
  })

  it.each([
    {
      args: ['upload'],
      expected: [{ actionName: 'upload' }]
    },
    {
      args: ['install', { tlt_name: 'testPackage' }],
      expected: [{ actionName: 'install', packageName: 'testPackage', packageData: [{ tlt_name: 'testPackage' }] }]
    },
    {
      args: ['install', { type: 1 }],
      expected: [{ actionName: 'install', packageName: '', packageData: [{ type: 1 }] }]
    },
    {
      args: ['install'],
      expected: [{ actionName: 'install', packageName: '', packageData: [] }]
    }
  ])('should emit open-prompt with correct payload for %#', ({ args, expected }) => {
    wrapper.vm.setPackagePrompt(...args)
    expect(wrapper.emitted()).toHaveProperty('open-prompt', [expected])
  })

  it('should filter selected packages according to filterTypes, allowException, and filterException', () => {
    wrapper.vm.currentlySelected = ['pkg1', 'pkg2', 'pkg3']
    wrapper.vm.runningPackageTypes = [3]

    const result = wrapper.vm.getFilteredPackages('testAction')
    expect(result).toEqual([
      { package: 'pkg1', status: 'In queue', type: 1 },
      { package: 'pkg2', status: 'Available', type: 2 },
      { package: 'pkg3', status: 'Installed', type: 3 }
    ])
  })
})
