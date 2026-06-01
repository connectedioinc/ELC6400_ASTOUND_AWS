import { useMainStore } from '@/stores/main'
import TltModal from '@ui-core/tlt-design/layout/TltModal.vue'
import createWrapper from '../mockFactory'
import TltBreadcrumbs from '@/components/VuciLayout/src/TltBreadcrumbs.vue'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test', meta: { title: 'Test' } }))
  }
})

describe('TltModal.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders modal when open is set to true', async () => {
    const wrapper = createWrapper(TltModal, { props: { open: false } })
    expect(wrapper.find('[test-id="modal-container"]').exists()).toBe(false)
    await wrapper.setProps({ open: true })
    expect(wrapper.find('[test-id="modal-container"]').exists()).toBe(true)
  })

  it('renders title when modal is open', () => {
    const wrapper = createWrapper(TltModal, { props: { open: true, title: 'Test Title' } })
    expect(wrapper.text()).toContain('Test Title')
  })
  it('does not render title when modal is not open', () => {
    const wrapper = createWrapper(TltModal, { props: { open: false, title: 'Test Title' } })
    expect(wrapper.text()).not.toContain('Test Title')
  })

  it.each([
    { prop: 'small', className: 'small' },
    { prop: 'medium', className: 'medium' },
    { prop: 'big', className: 'big' }
  ])('adds class $className when size prop is $prop', ({ prop, className }) => {
    const wrapper = createWrapper(TltModal, { props: { open: true, size: prop } })
    expect(wrapper.get('[test-id="modal-container"]').classes()).toContain(className)
  })

  it('adds custom container class', () => {
    const wrapper = createWrapper(TltModal, { props: { open: true, containerClass: 'custom-class1 custom-class2' } })
    expect(wrapper.get('[test-id="modal-container"]').classes()).toContain('custom-class1')
    expect(wrapper.get('[test-id="modal-container"]').classes()).toContain('custom-class2')
  })

  it('renders breadcrumb component when there is at least one crumb', async () => {
    const wrapper = createWrapper(TltModal, { props: { open: true, navBar: ['Test Label'] } })
    expect(wrapper.findComponent(TltBreadcrumbs).exists()).toBe(true)
    await wrapper.setProps({ navBar: ['Test Label', 'Test Label 2'] })
    expect(wrapper.findComponent(TltBreadcrumbs).exists()).toBe(true)
  })

  it('calls store modal open action when modal opens', async () => {
    const wrapper = createWrapper(TltModal, { props: { open: false } })
    const store = useMainStore()
    expect(store.openModal).not.toHaveBeenCalled()
    await wrapper.setProps({ open: true })
    expect(store.openModal).toHaveBeenCalled()
  })

  it('emits close event when backdrop is clicked', () => {
    const wrapper = createWrapper(TltModal, { props: { open: true } })
    wrapper.get('[test-id="modal-backdrop"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
  it('emits close event when close button is clicked', () => {
    const wrapper = createWrapper(TltModal, { props: { open: true }, global: { stubs: { 'tlt-button': false } } })
    wrapper.get('button[test-id="button-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('renders default slot', () => {
    const wrapper = createWrapper(TltModal, { props: { open: true }, slots: { default: 'Test Content' } })
    expect(wrapper.text()).toContain('Test Content')
  })
  it('renders custom slot', () => {
    const wrapper = createWrapper(TltModal, { props: { open: true }, slots: { custom: 'Test Content' } })
    expect(wrapper.text()).toContain('Test Content')
  })
  it('custom slot replaces default slot', () => {
    const wrapper = createWrapper(TltModal, { props: { open: true }, slots: { default: 'Default Content', custom: 'Custom Content' } })
    expect(wrapper.text()).not.toContain('Default Content')
    expect(wrapper.text()).toContain('Custom Content')
  })
  it('actions slot is rendered', () => {
    const wrapper = createWrapper(TltModal, { props: { open: true }, slots: { actions: 'Test Actions' } })
    expect(wrapper.text()).toContain('Test Actions')
  })
})
