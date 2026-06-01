import { setActivePinia, createPinia } from 'pinia'
import { useMessages, useAlerts, usePrompt, useNotifications } from '@/stores/messages'
import { nextTick, reactive } from 'vue'
import { useMainStore } from '@/stores/main'

vi.mock('@ui-core/utils/vue-helpers', () => ({
  debounce: vi.fn(() => vi.fn())
}))

vi.mock('@ui-core/composables/useI18n', () => ({
  useTranslate: () => vi.fn((text: string) => text)
}))

const route = reactive({ path: '', meta: { title: '' } })

vi.mock('vue-router', async importOriginal => ({
  ...((await importOriginal()) as {}),
  useRoute: vi.fn(() => route)
}))

describe('messages.js', () => {
  beforeEach(() => {
    route.path = ''
    setActivePinia(createPinia())
  })

  describe('useMessages', () => {
    let messageStore: ReturnType<typeof useMessages>
    beforeEach(() => {
      messageStore = useMessages()
    })

    it('adds a new custom message with options', () => {
      const options = {
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      messageStore.message(options)
      expect(messageStore.messages[0].id).toBeDefined()
      expect(messageStore.messages[0].text).toBe('Hello world')
      expect(messageStore.messages[0].title).toBe('Title')
    })

    it('message with same text and title does not get added', () => {
      const options = {
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      messageStore.message(options)
      messageStore.message(options)
      expect(messageStore.messages).toHaveLength(1)
    })

    it('existing message timer gets restarted', () => {
      const options = {
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      messageStore.message(options)
      const spy = vi.spyOn(messageStore.messages[0].timer!, 'restart')
      expect(messageStore.messages[0].timer!.restart).toBeTypeOf('function')
      messageStore.message(options)
      expect(spy).toBeCalled()
    })

    it('removes a message', () => {
      const options = {
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      const message = messageStore.message(options)
      messageStore.remove(message!)
      expect(messageStore.messages).toHaveLength(0)
    })

    it.each`
      method       | type
      ${'info'}    | ${'info'}
      ${'success'} | ${'success'}
      ${'error'}   | ${'error'}
      ${'warning'} | ${'warning'}
    `('adds a new $type message', ({ method, type }: { method: 'info' | 'success' | 'error' | 'warning'; type: string }) => {
      const options = {
        text: 'Hello world',
        title: 'Title'
      } as const
      messageStore[method](options)
      expect(messageStore.messages[0].type).toBe(type)
    })
  })

  describe('useAlerts', () => {
    let alertsStore: ReturnType<typeof useAlerts>
    beforeEach(() => {
      alertsStore = useAlerts()
      alertsStore.enabled = true
    })

    it('adds a new alert', () => {
      const options = {
        id: 'test',
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      alertsStore.alert(options)
      expect(alertsStore.alerts[0].id).toBeDefined()
      expect(alertsStore.alerts[0].text).toBe('Hello world')
      expect(alertsStore.alerts[0].title).toBe('Title')
    })

    it('removes non-global alerts after page changes', async () => {
      const options = {
        id: 'test',
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      alertsStore.alert(options)
      expect(alertsStore.alerts).toHaveLength(1)
      route.path = '/new-path'
      await nextTick()
      expect(alertsStore.alerts).toHaveLength(0)
    })

    it('removes alert by id', () => {
      const options = {
        id: 'id',
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      alertsStore.alert(options)
      expect(alertsStore.alerts).toHaveLength(1)
      alertsStore.remove('id')
      expect(alertsStore.alerts).toHaveLength(0)
    })

    it('removes alert by options', () => {
      const options = {
        id: 'test',
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      alertsStore.alert(options)
      expect(alertsStore.alerts).toHaveLength(1)
      alertsStore.remove(options)
      expect(alertsStore.alerts).toHaveLength(0)
    })

    it.each`
      method     | type
      ${'info'}  | ${'info'}
      ${'error'} | ${'error'}
    `('adds a new $type alert', ({ method, type }: { method: 'info' | 'error'; type: string }) => {
      const options = {
        id: 'test',
        text: 'Hello world',
        title: 'Title'
      } as const
      alertsStore[method](options)
      expect(alertsStore.alerts[0].type).toBe(type)
    })
  })

  describe('useNotifications', () => {
    let notificationsStore: ReturnType<typeof useNotifications>
    beforeEach(() => {
      notificationsStore = useNotifications()
      notificationsStore.enabled = true
    })

    it('adds a new notification', () => {
      const options = {
        id: 'test',
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      notificationsStore.notify(options)
      expect(notificationsStore.notifications[0].id).toBeDefined()
      expect(notificationsStore.notifications[0].text).toBe('Hello world')
      expect(notificationsStore.notifications[0].title).toBe('Title')
    })

    it('adds a new modal notification', async () => {
      const store = useMainStore()
      store.modalsOpen = 1

      await nextTick()

      const options = {
        id: 'test',
        text: 'Hello world',
        title: 'Title',
        type: 'info',
        modal: true
      } as const
      notificationsStore.notify(options)

      expect(notificationsStore.modalNotifications).toHaveLength(1)
    })

    it('removes notification by id', () => {
      const options = {
        id: 'id',
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      notificationsStore.notify(options)
      expect(notificationsStore.notifications).toHaveLength(1)
      notificationsStore.remove('id')
      expect(notificationsStore.notifications).toHaveLength(0)
    })

    it('removes notification by options', () => {
      const options = {
        id: 'test',
        text: 'Hello world',
        title: 'Title',
        type: 'info'
      } as const
      notificationsStore.notify(options)
      expect(notificationsStore.notifications).toHaveLength(1)
      notificationsStore.remove(options)
      expect(notificationsStore.notifications).toHaveLength(0)
    })

    it.each`
      method     | type
      ${'info'}  | ${'info'}
      ${'error'} | ${'error'}
    `('adds a new $type notification', ({ method, type }: { method: 'info' | 'error'; type: string }) => {
      const options = {
        id: 'test',
        text: 'Hello world',
        title: 'Title'
      } as const
      notificationsStore[method](options)
      expect(notificationsStore.notifications[0].type).toBe(type)
    })
  })

  describe('usePrompt', () => {
    let promptStore: ReturnType<typeof usePrompt>
    beforeEach(() => {
      promptStore = usePrompt()
    })

    it('sets prompt options', () => {
      const options = {
        title: 'Title',
        content: 'Content',
        okText: 'Yes',
        cancelText: 'No',
        okDisplay: true
      }
      promptStore.show(options)
      expect(promptStore.promptOptions).toEqual({ ...options, onOk: expect.any(Function), onCancel: expect.any(Function) })
      expect(promptStore.promptShown).toBe(true)
    })

    it('sets prompt options with default values', () => {
      const options = {
        title: 'Title',
        content: 'Content'
      }
      promptStore.show(options)
      expect(promptStore.promptOptions).toEqual({
        title: 'Title',
        content: 'Content',
        okText: 'Yes',
        cancelText: 'No',
        okDisplay: true,
        onOk: expect.any(Function),
        onCancel: expect.any(Function)
      })
    })

    it('hides prompt', () => {
      promptStore.show({ title: 'Title', content: 'Content' })
      expect(promptStore.promptShown).toBe(true)
      promptStore.hide()
      expect(promptStore.promptShown).toBe(false)
    })

    it('hides prompt on route change', async () => {
      promptStore.show({ title: 'Title', content: 'Content' })
      expect(promptStore.promptShown).toBe(true)
      route.path = '/new-path'
      await nextTick()
      expect(promptStore.promptShown).toBe(false)
    })
  })
})
