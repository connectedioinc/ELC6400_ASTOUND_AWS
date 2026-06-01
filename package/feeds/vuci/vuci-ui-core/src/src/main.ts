import * as Vue from 'vue'

import './style.css'
import '@ui-core/utils/string-format'
import './utils/polyfills'

import App from './App.vue'
import router from './router'
import pinia from './stores'

import xss from '@ui-core/plugins/xss'
import eventBus from '@ui-core/plugins/event-bus'
import i18n from '@ui-core/plugins/i18n'
import messages from '@ui-core/plugins/messages'
import helper from '@ui-core/plugins/helper'
import session from '@ui-core/plugins/session'
import vuciValidator from '@ui-core/plugins/vuci-validator'
import brandPlugin, { brand } from '@ui-core/plugins/brand'
import axios from '@ui-core/plugins/axios'
import MD5 from '@ui-core/plugins/MD5'
import resizeObserver from '@ui-core/plugins/resize-observer'
import log from '@ui-core/plugins/log'
import date from '@ui-core/plugins/date'
import globals from '@ui-core/plugins/globals'

import menu from './plugins/menu'
import network from './plugins/network'
import mobile from './plugins/mobile'
import wireless from './plugins/wireless'
import { rules } from './validation-rules'
import io from './plugins/io'
import utils from './plugins/utils'
import serial from './plugins/serial'
import scheduler from './plugins/scheduler'
import eventsOptions from './plugins/events-options'
import dataSenderOptions from './plugins/sender-parameters'
import analytics from './plugins/analytics'
import ports from './plugins/ports'
import networkDevices from './plugins/networkDevices'

import timer from '@ui-core/mixins/timer'

window.Vue = Vue

const app = Vue.createApp(App)
app.use(pinia)
app.use(router)
app.use(eventBus)
app.mixin(timer)
app.use(xss, {
  whiteList: {
    var: ['title'],
    samp: [],
    a: ['href', 'id', 'target']
  },
  onIgnoreTagAttr: (_, name, value) => {
    if (name === 'class' && /[a-zA-Z0-9_\- ]/.test(value)) {
      return `${name}="${value}"`
    }
  },
  stripIgnoreTag: true
})
app.use(vuciValidator, { rules: Object.values(rules) })
app.use(messages)
app.use(menu)
app.use(session)
app.use(helper)
app.use(network)
app.use(wireless)
app.use(mobile)
app.use(i18n)
app.use(io)
app.use(brandPlugin)
app.use(axios)
app.use(MD5)
app.use(scheduler)
app.use(eventsOptions)
app.use(dataSenderOptions)
app.use(utils)
app.use(serial)
app.use(log)
app.use(resizeObserver)
app.use(analytics)
app.use(date)
app.use(ports)
app.use(networkDevices)
app.use(globals)

brand.load().then(() => {
  app.mount('#app')
})
