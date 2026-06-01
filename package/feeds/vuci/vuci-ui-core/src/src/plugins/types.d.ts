import type { MaybeRefOrGetter } from 'vue'
import { events } from './events-options'
import { io } from './io'
import { menu } from './menu'
import { mobile } from './mobile'
import { network } from './network'
import { scheduler } from './scheduler'
import { dataSender } from './sender-parameters'
import { serial } from './serial'
import { utils } from './utils'
import { wireless } from './wireless'
import { useMainStore } from '@/stores/main'
import * as NetworkDevices from './networkDevices'
import * as Ports from './ports'
import type { Layout } from '@ui-core/components/layout/PageWrapper.vue'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $eventsOptions: typeof events
    $io: typeof io
    $menu: typeof menu
    $mobile: typeof mobile
    $network: typeof network
    $scheduler: typeof scheduler
    $dataSenderParameters: typeof dataSender
    $serial: typeof serial
    $utils: typeof utils
    $wireless: typeof wireless
    $store: ReturnType<typeof useMainStore>
    $networkDevices: Omit<typeof NetworkDevices, 'default'>
    $ports: Omit<typeof Ports, 'default'>
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    layout?: MaybeRefOrGetter<Layout>
    route?: {
      title: string
      path: string
    }[]
  }
}

export {}
