<template>
  <vuci-form-item-switch
    :uci-section="s"
    name="led_red"
    :label="$t('Red LED')"
    :help="$t('Controls the red LED\'s state.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="led_green"
    :label="$t('Green LED')"
    :help="$t('Controls the green LED\'s state.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="led_blue"
    :label="$t('Blue LED')"
    :help="$t('Controls the blue LED\'s state.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="led_revert"
    :label="$t('Revert')"
    :help="$t('Specifies the time in seconds after which the LED state automatically reverts to previous state. If this option is unset, the LED state will not revert.')"
    rules="irange(1,3600)"
    placeholder="3"
    :depend="isTypeSelected"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="led_blink"
    :label="$t('Blink')"
    :help="$t('Enable blinking mode.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="led_blink_on"
    :label="$t('Blink on')"
    :help="$t('Specifies the time in milliseconds that the LED remains on during blinking.')"
    rules="irange(1,60000)"
    placeholder="500"
    required
    :depend="isTypeSelected && s?.led_blink === '1'"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="led_blink_off"
    :label="$t('Blink off')"
    :help="$t('Specifies the time in milliseconds that the LED remains off during blinking.')"
    rules="irange(1,60000)"
    placeholder="300"
    required
    :depend="isTypeSelected && s?.led_blink === '1'"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'

const props = defineProps(moduleProps)
const { isTypeSelected } = useEventsJugglerModuleData(props)
const $t = useTranslate()
</script>
