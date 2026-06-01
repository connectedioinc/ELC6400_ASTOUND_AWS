import { nextTick, reactive } from 'vue'
import HeaderMenu from '@/components/VuciLayout/src/VuciHeader/HeaderMenu.vue'
import createWrapper from '../../mockFactory'

const route = reactive({ path: '/test' })
vi.mock('vue-router', async importOriginal => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    useRoute: () => route
  }
})

describe('HeaderMenu.vue', () => {
  it('emits update:open event after page change', async () => {
    const wrapper = createWrapper(HeaderMenu, { props: { elementId: 'test', icon: 'bell', open: true } })
    route.path = '/test2'
    await nextTick()
    expect(wrapper.vm.open).toBe(false)
  })
})
