import createWrapper from '@tests/unit/mockFactory'
import Pamd from '../../src/views/services/Pamd.vue'
import PamdEdit from '../../src/views/services/PamdEdit.vue'

const pamdModules = [
  {
    success: true,
    data: {
      modules: ['tacplus', 'radius_auth', 'unix']
    }
  }
]

describe('Pamd.vue', () => {
  describe('loadData check', () => {
    it('resolve', async () => {
      const wrapper = createWrapper(Pamd)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce(pamdModules[0])
      await wrapper.vm.loadData()
      expect(wrapper.vm.formOptions).toEqual({ modules: ['tacplus', 'radius_auth', 'unix'] })
    })
    it('reject', async () => {
      const wrapper = createWrapper(Pamd)
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValueOnce([])
      await wrapper.vm.loadData()
      expect(spy).toHaveBeenCalledWith('Failed to load modules')
    })
  })
  it('returns getFormOptions', () => {
    const wrapper = createWrapper(Pamd)
    wrapper.vm.formOptions = pamdModules[0].data
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual(pamdModules[0].data)
  })
  it.each`
    modules                                            | moduleOptions
    ${{ modules: ['tacplus', 'radius_auth', 'unix'] }} | ${[{ name: 'TACACS+', value: 'tacplus' }, { name: 'RADIUS', value: 'radius_auth' }, { name: 'Local', value: 'unix' }]}
    ${{ modules: ['tacplus', 'radius_auth'] }}         | ${[{ name: 'TACACS+', value: 'tacplus' }, { name: 'RADIUS', value: 'radius_auth' }]}
    ${{ modules: ['radius_auth', 'unix'] }}            | ${[{ name: 'RADIUS', value: 'radius_auth' }, { name: 'Local', value: 'unix' }]}
    ${{ modules: ['tacplus', 'unix'] }}                | ${[{ name: 'TACACS+', value: 'tacplus' }, { name: 'Local', value: 'unix' }]}
    ${{ modules: ['unix'] }}                           | ${[{ name: 'Local', value: 'unix' }]}
    ${{ modules: ['radius_auth'] }}                    | ${[{ name: 'RADIUS', value: 'radius_auth' }]}
    ${{ modules: ['tacplus'] }}                        | ${[{ name: 'TACACS+', value: 'tacplus' }]}
  `('loadInitial check', ({ modules, moduleOptions }) => {
    const wrapper = createWrapper(PamdEdit, { props: { section: {} }, global: { provide: { formOptions: () => modules } } })
    const result = wrapper.vm.filterModules
    expect(result).toEqual(moduleOptions)
  })
  it.each`
    module           | result
    ${'tacplus'}     | ${'TACACS+'}
    ${'radius_auth'} | ${'RADIUS'}
  `('gets name of $module module', ({ module, result }) => {
    const wrapper = createWrapper(PamdEdit, {
      props: {
        section: { module }
      },
      data() {
        return {
          modules: [
            ['tacplus', 'TACACS+'],
            ['radius_auth', 'RADIUS']
          ]
        }
      },
      global: {
        provide: {
          formOptions: () => ({ modules: [] })
        }
      }
    })
    expect(wrapper.vm.selectedModuleName).toEqual(result)
  })
  it.each`
    module           | serverHint                                 | secretHint                 | secretName
    ${'radius_auth'} | ${'The IP address of the RADIUS server.'}  | ${'RADIUS shared secret.'} | ${'Secret'}
    ${'tacplus'}     | ${'The IP address of the TACACS+ server.'} | ${'TACACS+ server key.'}   | ${'Key'}
  `('sets hint and name for $module', ({ module, serverHint, secretHint, secretName }) => {
    const wrapper = createWrapper(PamdEdit, {
      props: {
        section: { module }
      },
      data() {
        return {
          modules: [
            ['tacplus', 'TACACS+'],
            ['radius_auth', 'RADIUS']
          ]
        }
      },
      global: {
        provide: {
          formOptions: () => ({ modules: [] })
        }
      }
    })
    expect(wrapper.vm.serverHint).toEqual(serverHint)
    expect(wrapper.vm.secretHint).toEqual(secretHint)
    expect(wrapper.vm.secretName).toEqual(secretName)
  })
  it.each([
    ['user list', [{ success: false }, { success: true, data: [] }], 'Failed to load user list'],
    ['group list', [{ success: true, data: [] }, { success: false }], 'Failed to load group list']
  ])('shows error when %s request fails', async (_, data, error) => {
    const wrapper = createWrapper(PamdEdit, {
      props: {
        section: {
          module: ''
        }
      },
      global: {
        provide: {
          formOptions: () => ({ modules: [] })
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce(data)
    await wrapper.vm.loadUsers()
    expect(spy).toHaveBeenCalledWith(error)
  })
  it('shows error when request fails', async () => {
    const wrapper = createWrapper(PamdEdit, {
      props: {
        section: {
          module: ''
        }
      },
      global: {
        provide: {
          formOptions: () => ({ modules: [] })
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    await wrapper.vm.loadUsers()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('userOptions', async () => {
    const wrapper = createWrapper(PamdEdit, {
      props: {
        section: {}
      },
      global: {
        provide: {
          formOptions: () => ({ modules: [] })
        }
      }
    })
    await wrapper.setData({ userList: [{ id: '123test', username: 'testname' }] })
    const result = wrapper.vm.userOptions

    expect(result).toEqual([['123test', 'testname']])
  })
  it('groupOptions', async () => {
    const wrapper = createWrapper(PamdEdit, {
      props: {
        section: {}
      },
      global: {
        provide: {
          formOptions: () => ({ modules: [] })
        }
      }
    })
    await wrapper.setData({ userList: [] })
    wrapper.vm.groupList = [{ id: 'root' }]
    const result = wrapper.vm.groupOptions

    expect(result).toEqual([
      ['none', 'None'],
      ['root', 'root']
    ])
  })
})
