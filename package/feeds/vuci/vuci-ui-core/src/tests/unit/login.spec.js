import { reactive } from 'vue'
import { useRoute } from 'vue-router'
import Login from '@/views/Login.vue'
import createWrapper from '@tests/unit/mockFactory'
import TltFormItemInput from '@ui-core/tlt-design/form/tltFormItemInput.vue'
import TltFormItemPassword from '@ui-core/tlt-design/form/tltFormItemPassword.vue'
import { session } from '@ui-core/plugins/session'
import { axios } from '@ui-core/plugins/axios'

vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal()
  const route = reactive({ route: 'test' })
  return {
    ...actual,
    useRoute: vi.fn(() => route),
    useRouter: vi.fn(() => ({ push: vi.fn() }))
  }
})
vi.mock('@ui-core/composables/useI18n', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useTranslate: vi.fn(() => t => t)
  }
})
vi.mock('@ui-core/plugins/session')
vi.mock('@/plugins/menu')
vi.mock('@ui-core/plugins/axios')
vi.mock('@/plugins/analytics')

describe('Login.vue', () => {
  beforeEach(() => {
    session._logout.mockResolvedValue()
    session.loginError = ''
  })
  it('renders username and password fields', () => {
    const wrapper = createWrapper(Login)
    expect(wrapper.findComponent(TltFormItemInput).exists()).toBe(true)
    expect(wrapper.findComponent(TltFormItemPassword).exists()).toBe(true)
  })

  it('renders error when ip address changes', async () => {
    const route = useRoute()
    route.query = { ipChanged: true }
    const wrapper = createWrapper(Login)
    expect(wrapper.html()).toContain("Device's IP address was changed - you need to log in again.")
  })

  it.each`
    text                                  | username                                            | password
    ${'no username and password'}         | ${''}                                               | ${''}
    ${'no username'}                      | ${''}                                               | ${'test'}
    ${'no password'}                      | ${'test'}                                           | ${''}
    ${'username is over 4096 characters'} | ${Array.from({ length: 4097 }, () => 'a').join('')} | ${'test'}
    ${'password is over 4096 characters'} | ${'test'}                                           | ${Array.from({ length: 4097 }, () => 'a').join('')}
  `('renders invalid username/password message when $text', async ({ username, password }) => {
    const wrapper = createWrapper(Login)
    await wrapper.findComponent(TltFormItemInput).setValue(username)
    await wrapper.findComponent(TltFormItemPassword).setValue(password)
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.html()).toContain('Invalid username and/or password! Please try again.')
  })

  it('successfully logs in', async () => {
    const route = useRoute()
    route.query = { ipChanged: false }
    axios.get.mockResolvedValue()
    session.login.mockResolvedValue(true)
    const wrapper = createWrapper(Login)
    await wrapper.findComponent(TltFormItemInput).setValue('test')
    await wrapper.findComponent(TltFormItemPassword).setValue('test')
    await wrapper.find('form').trigger('submit.prevent')
    expect(session.login).toHaveBeenCalledWith('test', 'test')
    expect(wrapper.find('[test-id="login-error"]').exists()).toBe(false)
  })
})
