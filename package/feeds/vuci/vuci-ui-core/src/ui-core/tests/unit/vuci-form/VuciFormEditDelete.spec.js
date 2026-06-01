import { ref } from 'vue'
import VuciFormEditDelete from '@ui-core/vuci-form/src/VuciFormEditDelete.vue'
import createWrapper from '@ui-core/tests/unit/mockFactory'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: () => ({
      query: {}
    })
  }
})

vi.mock('@vueuse/router', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouteQuery: vi.fn(() => ref(''))
  }
})

describe('VuciFormEditDelete', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(VuciFormEditDelete, {
      propsData: {
        actions: {
          edit: vi.fn().mockReturnValueOnce('edit Called'),
          delete: vi.fn().mockReturnValueOnce('delete called')
        }
      }
    })
  })
  it.each([
    { action: 'edit', method: 'openEdit', arg: 124, notCalled: 'delete' },
    { action: 'delete', method: 'delSection', arg: 165, notCalled: 'edit' }
  ])('performs provided $action action with parameter $arg', ({ method, arg, action, notCalled }) => {
    wrapper.vm[method](arg)
    expect(wrapper.vm.actions[action]).toHaveBeenCalledWith(arg)
    expect(wrapper.vm.actions[notCalled]).not.toHaveBeenCalled()
  })
})
