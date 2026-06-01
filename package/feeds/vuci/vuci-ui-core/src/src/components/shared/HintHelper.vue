<template>
  <div class="flex flex-col gap-4">
    <string-with-links
      v-if="mainHint"
      :text="mainHint"
      class="inline"
    />
    <div class="flex flex-col gap-2">
      <div class="font-bold">{{ props.choiceHint ?? $t('Possible variants') }}:</div>
      <div
        v-for="hint in hints"
        :key="isRuleHelp(hint) ? hint.name : hint.option"
      >
        <span class="font-bold">{{ isRuleHelp(hint) ? hint.name : hint.option }}</span>
        <span class="mr-1">:</span>
        <slot :name="hint.slot">
          <template v-if="isRuleHelp(hint)">{{ $t('e.g., %s').format(hint.example) }}</template>
          <string-with-links
            :text="hint.hint"
            class="inline"
          />
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed, toValue, type MaybeRef } from 'vue'
import StringWithLinks from './StringWithLinks.vue'

export type OptionHint = OptionHintSloted | OptionHintSlotless

export type OptionHintSloted = {
  option: string
  slot: string
  hint?: never
  name?: never
  example?: never
  reverse?: never
}

export type OptionHintSlotless = {
  option: string
  hint: string
  slot?: never
  name?: never
  example?: never
  reverse?: never
}

export type RuleHintSloted = {
  name: string
  slot: string
  example?: never
  option?: never
  hint?: never
  reverse?: never
}

export type RuleHintSlotless = {
  name: string
  example: string
  slot?: never
  option?: never
  hint?: never
  reverse?: never
}

export type RuleHint = RuleHintSloted | RuleHintSlotless

export type SlotlessHint = RuleHintSlotless | OptionHintSlotless

export type GenericHint = OptionHint | RuleHint

export type DeepArray<T> = Array<DeepArray<T> | T>

export type Helpers = typeof _helpers

export interface Props {
  mainHint?: string
  hints: ((arg: Helpers) => DeepArray<GenericHint>) | MaybeRef<GenericHint[]>
  choiceHint?: string
}

const $t = useTranslate()
const props = withDefaults(defineProps<Props>(), { mainHint: undefined, choiceHint: undefined })

function isRuleHelp(help: GenericHint): help is RuleHint {
  return !!help.name
}

const hints = computed<GenericHint[]>(() => {
  return typeof props.hints === 'function'
    ? // @ts-expect-error seems like TS limitation
      (props.hints(_helpers).flat(Infinity) as GenericHint[])
    : toValue(props.hints)
})

const _helpers = {
  any() {
    return { hint: $t('Match everything.'), option: $t('Any') }
  },
  noRewrite(keepName: string) {
    return { hint: $t('Keep %s.').format(keepName), option: $t('No rewrite') }
  },
  neg() {
    return { name: $t('All except value'), example: $t('!value') }
  },
  ip4addr() {
    return { name: $t('IP address'), example: '192.168.1.1' }
  },
  subnet4() {
    return { name: $t('Subnet'), example: '192.168.1.0/24' }
  },
  ipmask4() {
    return [this.ip4addr(), this.subnet4()]
  },
  ip6addr() {
    return { name: $t('IPv6 address'), example: '123:1::5:6:7' }
  },
  ipaddr() {
    return [this.ip4addr(), this.ip6addr()]
  },
  subnet6() {
    return { name: $t('IPv6 Subnet'), example: '123:1:5:6::0/64' }
  },
  ipmask6() {
    return [this.ip6addr(), this.subnet6()]
  },
  ipmask() {
    return [this.ipmask4(), this.ipmask6()]
  },
  port() {
    return { name: $t('Port'), example: '422' }
  },
  portrangeAlone() {
    return { name: $t('Port range'), example: '1000-2000' }
  },
  macaddr() {
    return { name: $t('MAC address'), example: '01:23:45:56:78:9a' }
  },
  portrange() {
    return [this.port(), this.portrangeAlone()]
  },
  macaddrrangeAlone() {
    return { name: $t('Port range'), example: '01:23:45:56:78:9a-01:23:45:56:00:00' }
  },
  macaddrrange() {
    return [this.macaddr(), this.macaddrrangeAlone()]
  }
} satisfies Record<string, (...arg: any[]) => DeepArray<SlotlessHint> | SlotlessHint>
</script>
