import { ref, computed, watch, type RenderFunction, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { defineStore } from 'pinia'

import { isObject } from '@ui-core/utils/inspect'
import { utils } from '@/plugins/utils'
import { useMainStore } from './main'
import { Timer } from '@ui-core/utils/timer'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import type { IconConfig } from '@/components/Messenger/Confirm.vue'
import { watchArray } from '@vueuse/core'

export interface ToastMessageOptions {
  id: number | string
  /** The text of the message */
  text: string
  /** The title of the message */
  title?: string
  /** Whether the toast has a close button */
  hasClose?: boolean
  /** Type of toast message */
  type: 'success' | 'error' | 'info' | 'warning'
  timer?: Timer
  timestamp?: number
  /**
   * The maximum number of characters to display before truncating the message and showing a "Show more" button
   * @default 64
   */
  characterLimit?: number
  /** Forces to display message (used with renewPassword modal) */
  forceShow?: boolean
}

export const useMessages = defineStore('messages', () => {
  const messages = ref<ToastMessageOptions[]>([])

  function message(options: Omit<ToastMessageOptions, 'id'>) {
    const store = useMainStore()
    const existingMessage = messages.value.find(item => item.text === options.text && item.title === options.title)
    if (existingMessage) {
      existingMessage.timer?.restart()
      return existingMessage
    }
    const newMessage: ToastMessageOptions = { id: utils.getUniqueId(), timestamp: Date.now(), forceShow: false, ...options }
    newMessage.timer = new Timer({ method: () => remove(newMessage), time: 5000, autostart: true, repeat: false })

    if (store.renewPassword && !options.forceShow) return newMessage

    messages.value.unshift(newMessage)
    return newMessage
  }

  function remove(message: Partial<ToastMessageOptions>) {
    messages.value = messages.value.filter(item => item.id !== message.id)
  }

  function info(options: string | Omit<ToastMessageOptions, 'type' | 'id'>) {
    const type = 'info'
    if (!isObject(options)) return message({ text: options, type })
    return message({ ...options, type })
  }

  function success(options: string | Omit<ToastMessageOptions, 'type' | 'id'>) {
    const type = 'success'
    if (!isObject(options)) return message({ text: options, type })
    return message({ ...options, type })
  }

  function error(options: string | Omit<ToastMessageOptions, 'type' | 'id'>) {
    const type = 'error'
    if (!isObject(options)) return message({ text: options, type })
    return message({ ...options, type })
  }

  function warning(options: string | Omit<ToastMessageOptions, 'type' | 'id'>) {
    const type = 'warning'
    if (!isObject(options)) return message({ text: options, type })
    return message({ ...options, type })
  }

  function $reset() {
    messages.value = []
  }

  return { messages, message, remove, info, success, error, warning, $reset }
})

export interface AlertAction {
  type?: 'text' | 'button'
  text: string
  onClick?: () => void
  disabled?: boolean
  to?: string
  href?: string
}

export interface AlertMessageOptions {
  type: 'error' | 'info' | 'warning' | 'success'
  id: number | string
  rawHtml?: boolean
  text?: string | RenderFunction
  title?: string | RenderFunction
  action?: AlertAction | AlertAction[] | RenderFunction
  /**
   * Callback on closing the alert
   */
  onClose?: () => void
  /**
   * Whether the alert should persist across page navigations
   * @default false
   */
  global?: boolean
  /**
   * Shows the alert regardless of the `enabled` state
   */
  important?: boolean
}

export interface AlertMessage extends AlertMessageOptions {}

export const useAlerts = defineStore('alerts', () => {
  const notificationsStore = useNotifications()

  const alerts = ref<AlertMessage[]>([])

  const enabled = ref<boolean | null>(null)
  watch(enabled, value => {
    if (value === false) $reset()
  })

  const route = useRoute()
  watch(
    () => route.path,
    () => (alerts.value = alerts.value.filter(alert => alert.global)),
    { flush: 'sync' }
  )

  function alert(options: AlertMessageOptions) {
    if ((!enabled.value && !options.important) || !options.text) return

    const existingAlert = alerts.value.find(alert => alert.id === options.id)
    if (existingAlert) return

    const _options: AlertMessage = {
      ...options
    }

    alerts.value.unshift(_options)
    return () => remove(_options.id!)
  }

  /**
   * @param options The options of alert message
   * @param rawHtml Whether to allow inject html tags into the text message
   */
  function info(options: string | Omit<AlertMessageOptions, 'type' | 'rawHtml'>, rawHtml = false) {
    if (!isObject(options)) return alert({ id: utils.getUniqueId(), text: options, type: 'info', rawHtml })
    return alert({ ...options, type: 'info', rawHtml })
  }

  /**
   * @param options The options of alert message
   * @param rawHtml Whether to allow inject html tags into the text message
   */
  function error(options: string | Omit<AlertMessageOptions, 'type' | 'rawHtml'>, rawHtml = false) {
    if (!isObject(options)) return alert({ id: utils.getUniqueId(), text: options, type: 'error', rawHtml })
    return alert({ ...options, type: 'error', rawHtml })
  }

  /**
   * @param options The options of alert message
   * @param rawHtml Whether to allow inject html tags into the text message
   */
  function warning(options: string | Omit<AlertMessageOptions, 'type' | 'rawHtml'>, rawHtml = false) {
    if (!isObject(options)) return alert({ id: utils.getUniqueId(), text: options, type: 'warning', rawHtml })
    return alert({ ...options, type: 'warning', rawHtml })
  }

  /**
   * @param options The options of alert message
   * @param rawHtml Whether to allow inject html tags into the text message
   */
  function success(options: string | Omit<AlertMessageOptions, 'type' | 'rawHtml'>, rawHtml = false) {
    if (!isObject(options)) return alert({ id: utils.getUniqueId(), text: options, type: 'success', rawHtml })
    return alert({ ...options, type: 'success', rawHtml })
  }

  function remove(optionsOrId: number | string | Partial<AlertMessageOptions>) {
    const found = isObject(optionsOrId)
      ? alerts.value.find(alert => alert.id === optionsOrId.id || alert.text === optionsOrId.text)
      : alerts.value.find(alert => alert.id === optionsOrId || alert.text === optionsOrId)
    if (!found) return

    alerts.value = alerts.value.filter(alert => alert !== found)
    found.onClose?.()
  }

  function toNotification(options: AlertMessageOptions) {
    const existing = alerts.value.find(alert => alert.id === options.id)
    if (existing) remove(existing.id)

    const alert = existing || options

    notificationsStore.notify({
      id: alert.id,
      text: alert.text,
      title: alert.title,
      type: alert.type,
      rawHtml: alert.rawHtml,
      action: alert.action,
      status: 'read'
    })
  }

  function $reset() {
    alerts.value = []
  }

  return {
    enabled,
    alerts,
    alert,
    info,
    error,
    warning,
    success,
    remove,
    $reset,
    toNotification
  }
})

export interface NotificationOptions {
  type: 'error' | 'info' | 'warning' | 'success'
  id: number | string
  rawHtml?: boolean
  text?: string | RenderFunction
  title?: string | RenderFunction
  action?: AlertAction | AlertAction[] | RenderFunction
  onClose?: () => void
  /**
   * The current status of the notification
   *
   * - "new": Notification is new and has not been read yet. Appears as a toast.
   * - "unread": Notification is gone from the toast, but shows bubble in the header.
   * - "read": Notifications list has been opened and notification is read.
   *
   * @default "new"
   */
  status?: 'new' | 'unread' | 'read'
  /**
   * The origin page or component that triggered the notification
   */
  origin?: string
  /**
   * Shows the notification regardless of the `enabled` state
   */
  important?: boolean
}

export interface Notification extends NotificationOptions {
  timer?: Timer
  timestamp?: number
}

export const useNotifications = defineStore('notifications', () => {
  const route = useRoute()
  const store = useMainStore()

  const enabled = ref<boolean | null>(null)
  watch(enabled, value => {
    if (value === false) $reset()
  })

  const notifications = ref<Notification[]>([])
  const newNotifications = computed(() => notifications.value.filter(notification => notification.status === 'new'))
  watchArray(newNotifications, (...args) => {
    const [, , , removed] = args
    removed.forEach(notification => notification.timer?.stop())
  })
  const unreadNotifications = computed(() => notifications.value.filter(notification => notification.status === 'unread'))

  const modalNotifications = ref<Notification[]>([])
  const newModalNotifications = computed(() => modalNotifications.value.filter(notification => notification.status === 'new'))
  watchArray(newModalNotifications, (...args) => {
    const [, , , removed] = args
    removed.forEach(notification => notification.timer?.stop())
  })
  const unreadModalNotifications = computed(() => modalNotifications.value.filter(notification => notification.status === 'unread'))

  const hasNewOrUnreadNotifications = computed(() => newNotifications.value.length > 0 || unreadNotifications.value.length > 0)
  const hasNewOrUnreadModalNotifications = computed(() => newModalNotifications.value.length > 0 || unreadModalNotifications.value.length > 0)

  watch(
    () => store.modalOpen,
    open => {
      if (open)
        newNotifications.value.forEach(notification => {
          if (notification.status !== 'new') return
          notification.status = 'unread'
        })
      else {
        notifications.value.push(...modalNotifications.value)
        modalNotifications.value = []
      }
    }
  )

  function notify(options: NotificationOptions) {
    if ((!enabled.value && !options.important) || !options.text) return

    const store = useMainStore()
    if (store.renewPassword) return

    const existing = notifications.value.find(notification => notification.id === options.id)
    if (existing) return

    const _options: Notification = reactive({
      timestamp: Date.now(),
      status: 'new',
      origin: route.meta.title as string | undefined,
      ...options
    })
    if (_options.status === 'new') {
      _options.timer = new Timer({
        method: () => (_options.status = 'unread'),
        time: 5000,
        autostart: true,
        repeat: false
      })
    }

    if (store.modalOpen) modalNotifications.value.unshift(_options)
    else notifications.value.unshift(_options)

    return () => remove(_options.id!)
  }

  /**
   * @param options The options of the notification
   * @param rawHtml Whether to allow inject html tags into the text message
   */
  function info(options: string | Omit<NotificationOptions, 'type' | 'rawHtml'>, rawHtml = false) {
    if (!isObject(options)) return notify({ id: utils.getUniqueId(), text: options, type: 'info', rawHtml })
    return notify({ ...options, type: 'info', rawHtml })
  }

  /**
   * @param options The options of the notification
   * @param rawHtml Whether to allow inject html tags into the text message
   */
  function error(options: string | Omit<NotificationOptions, 'type' | 'rawHtml'>, rawHtml = false) {
    if (!isObject(options)) return notify({ id: utils.getUniqueId(), text: options, type: 'error', rawHtml })
    return notify({ ...options, type: 'error', rawHtml })
  }

  /**
   * @param options The options of the notification
   * @param rawHtml Whether to allow inject html tags into the text message
   */
  function warning(options: string | Omit<NotificationOptions, 'type' | 'rawHtml'>, rawHtml = false) {
    if (!isObject(options)) return notify({ id: utils.getUniqueId(), text: options, type: 'warning', rawHtml })
    return notify({ ...options, type: 'warning', rawHtml })
  }

  /**
   * @param options The options of the notification
   * @param rawHtml Whether to allow inject html tags into the text message
   */
  function success(options: string | Omit<NotificationOptions, 'type' | 'rawHtml'>, rawHtml = false) {
    if (!isObject(options)) return notify({ id: utils.getUniqueId(), text: options, type: 'success', rawHtml })
    return notify({ ...options, type: 'success', rawHtml })
  }

  function remove(optionsOrId: number | string | Partial<NotificationOptions>) {
    const condition = isObject(optionsOrId)
      ? (notification: Notification) => notification.id === optionsOrId.id || notification.text === optionsOrId.text
      : (notification: Notification) => notification.id === optionsOrId || notification.text === optionsOrId

    const found = notifications.value.find(condition) || modalNotifications.value.find(condition)
    if (!found) return

    found.timer?.stop()
    found.onClose?.()

    notifications.value = notifications.value.filter(notification => notification !== found)
    modalNotifications.value = modalNotifications.value.filter(notification => notification !== found)
  }

  function setAllStatus(status: 'new' | 'unread' | 'read') {
    notifications.value.forEach(notification => (notification.status = status))
    newNotifications.value.forEach(notification => (notification.status = status))
  }

  function $reset() {
    notifications.value = []
    modalNotifications.value = []
  }

  return {
    enabled,
    notifications,
    newNotifications,
    unreadNotifications,
    modalNotifications,
    newModalNotifications,
    unreadModalNotifications,
    hasNewOrUnreadNotifications,
    hasNewOrUnreadModalNotifications,
    notify,
    info,
    error,
    warning,
    success,
    remove,
    setAllStatus,
    $reset
  }
})

export interface PromptOptions {
  /** The title of the prompt */
  icon?: IconConfig | Icon
  /** The title of the prompt */
  title?: string
  /** The content of the prompt */
  content?: string
  /**
   * The text of onOk action performing button
   * @default 'Yes'
   */
  okText?: string
  /**
   * The text of onCancel action performing button
   * @default 'No'
   */
  cancelText?: string
  /**
   * Boolean indicating whether the ok button and action is required
   * @default true
   */
  okDisplay?: boolean
  cancelDisplay?: boolean
  /** The title of the prompt */
  onOk?: () => void
  /** The title of the prompt */
  onCancel?: () => void
}

export const usePrompt = defineStore('prompt', () => {
  const promptOptions = ref<PromptOptions | null>(null)

  const $t = useTranslate()

  const route = useRoute()
  watch(
    () => route.path,
    () => (promptOptions.value = null)
  )

  function show(options: PromptOptions) {
    return new Promise(resolve => {
      promptOptions.value = {
        okText: $t('Yes'),
        cancelText: $t('No'),
        okDisplay: true,
        ...options,
        onOk: () => resolve(options.onOk?.()),
        onCancel: () => resolve(options.onCancel?.())
      }
    })
  }

  function hide() {
    promptOptions.value = null
  }

  const promptShown = computed(() => promptOptions.value !== null)

  return { promptOptions, show, hide, promptShown }
})
