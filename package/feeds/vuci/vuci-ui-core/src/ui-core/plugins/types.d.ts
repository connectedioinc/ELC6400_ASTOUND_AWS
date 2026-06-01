import { brand } from './brand'
import { axios } from './axios'
import { createEventBus, type GlobalEvents } from './event-bus'
import { reconnect, promptReboot, capitalize, uncapitalize, copyToClipboard } from './helper'
import { TimerController } from '@ui-core/utils/timer'
import { i18n } from './i18n'
import { ChilliMD5 } from './md5'
import { observer } from './resize-observer'
import { session } from './session'
import { VuciValidator } from './vuci-validator'
import { log } from './log'
import { useMessages, useAlerts, usePrompt, useNotifications } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import dayjs from 'dayjs'
import { localDate } from './date'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: typeof axios
    $brand: typeof brand.text
    $bus: ReturnType<typeof createEventBus<GlobalEvents>>
    $timer: InstanceType<typeof TimerController>
    $spin: ReturnType<typeof useMainStore>['spin']
    $reconnect: typeof reconnect
    $reboot: typeof promptReboot
    $capitalize: typeof capitalize
    $uncapitalize: typeof uncapitalize
    $copyToClipboard: typeof copyToClipboard
    $i18n: typeof i18n
    $t: (typeof i18n)['t']
    $MD5: typeof ChilliMD5
    $resizeObserver: typeof observer
    $session: typeof session
    $VuciValidator: typeof VuciValidator
    $xss: (html: string) => string
    $log: typeof log
    $message: ReturnType<typeof useMessages>
    $alert: ReturnType<typeof useAlerts>
    $prompt: ReturnType<typeof usePrompt>
    $notification: ReturnType<typeof useNotifications>
    $date: typeof dayjs
    $localDate: typeof localDate
  }
}

export {}
