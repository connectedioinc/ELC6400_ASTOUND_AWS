<template>
  <div
    :class="{ disabled }"
    class="h-full bg-theme-bg-surface rounded border card"
  >
    <div
      class="card-title uppercase text-base font-semibold p-4 pb-1"
      :class="{ 'draggable cursor-grab': !disabled }"
      v-bind="draggable ? events : {}"
      @mousedown="draggable && $emit('startDrag', $event)"
    >
      <span class="flex gap-1 justify-between">
        <tlt-overflow-hint>
          <h3 class="truncate leading-5">
            {{ props.title }}
          </h3>
        </tlt-overflow-hint>
        <div v-if="$session.hasAccess(trimPath(path), 'read')">
          <router-link
            :to="path || '/'"
            @click="$emit('close')"
          >
            <tlt-icon
              icon="settings"
              class="size-5 text-theme-text-subtle!"
            />
          </router-link>
        </div>
      </span>
    </div>
    <div class="mx-4 mb-4 pt-2 border-t border-theme-border-strong">
      <template v-if="type === 'ports'">
        <div class="w-full flex justify-center">
          <ports
            :get-port-data="content.getPortData"
            :custom-ports="$ports.getRutosBoardPorts()"
            class="max-w-64 mt-6"
            port-size="max-w-6"
            borderless
            :legend="false"
          />
        </div>
      </template>
      <template v-if="type === 'mobile'">
        <div
          class="status"
          :class="content.connection.startsWith('Connected') ? 'box-success' : 'box-error'"
        >
          {{ content.connection }}
        </div>
        <div class="details-row">
          <div class="details-column inline">
            <div
              v-for="(sim, idx) in content.simArr"
              :key="sim"
              class="sim"
            >
              <tlt-icon
                icon="sim-solid"
                class="pointer-events-none size-12"
                :class="getSimIconClass(idx + 1)"
              />
              <span class="sim-card">{{ sim }}</span>
            </div>
            <div
              id="connection"
              class="flex flex-col"
            >
              <tlt-signal-bar
                class="grow"
                :signal="parseInt(content.signal)"
                icon-class="h-8 grow"
                :showtext="false"
                :disabled="content.offline"
              />
              <span>{{ (typeof content.signal === 'number' ? content.signal : '-') + ' dBm' }}</span>
            </div>
          </div>
        </div>
        <div class="details-row">
          <div class="details-column">
            <span class="title">{{ $t('Flight mode') }}</span>
            <span class="param">{{ $t('Status: %s').format(content.flightMode) }}</span>
          </div>
        </div>
        <div class="details-row">
          <div class="details-column">
            <span class="title">{{ $t('NETWORK') }}</span>
            <span class="param">{{ content.state }}</span>
          </div>
        </div>
        <div class="details-row">
          <div class="details-column">
            <span class="title">{{ $t('SIM CARD INFO') }}</span>
            <span class="param">{{ content.pinstate }}</span>
          </div>
        </div>
      </template>
      <template v-if="type === 'system'">
        <div class="details-row grid! grid-cols-[min-content_1fr_min-content] auto-rows-auto gap-1 mb-1">
          <span class="title mb-0!">{{ $t('CPU') }}</span>
          <div class="meter-container">
            <tlt-progress-bar
              :progress="+(content.loadavg * 100).toFixed(2)"
              no-header
              class="w-full"
            />
          </div>
          <span class="title mb-0!">{{ (content.loadavg * 100).toFixed(2) + '%' }}</span>
          <span class="title mb-0!"> {{ $t('RAM') }}</span>
          <div class="meter-container">
            <tlt-progress-bar
              :progress="parseFloat(content.memory.ram_percentage)"
              no-header
              class="w-full"
            />
          </div>
          <span class="title mb-0!">{{ content.memory.ram_percentage + '%' }}</span>
          <span class="title mb-0!"> {{ $t('FLASH') }}</span>
          <div class="meter-container">
            <tlt-progress-bar
              :progress="parseFloat(content.memory.flash_percentage)"
              no-header
              class="w-full"
            />
          </div>
          <span class="title mb-0!">{{ content.memory.flash_percentage + '%' }}</span>
        </div>
        <div class="details-row">
          <div class="details-column">
            <span class="title">{{ $t('Router uptime') }}</span>
            <span class="param">{{ content.uptime }}</span>
          </div>
        </div>
      </template>
      <template v-if="type === 'rms'">
        <div
          class="status"
          :class="`box-${content.connectionStateColor}`"
        >
          {{ content.connectionStateText }}
        </div>
        <div class="details-row">
          <div class="details-column">
            <span class="title"> {{ $t('CONNECTION TYPE') }}</span>
            <span class="param">{{ content.status }}</span>
          </div>
        </div>
      </template>
      <template v-if="type === 'wifi'">
        <div
          class="status"
          :class="content.up ? 'box-success' : 'box-error'"
        >
          {{ content.up ? $t('Enabled') : $t('Disabled') }}
        </div>
        <div class="details-row">
          <div class="details-column inline">
            <div class="details-column">
              <span class="title">SSID</span>
              <span class="param">{{ content.ssid }}</span>
            </div>
            <div class="details-column">
              <span class="title">{{ $t('Clients') }}</span>
              <span class="param">{{ content.num_assoc }}</span>
            </div>
            <div class="connection flex flex-col text-center min-w-24">
              <tlt-signal-bar
                :signal="Math.max(...(content.quality?.map(([signal]: [number, string]) => signal) ?? [0]))"
                :showtext="false"
                wireless
              />
              <span
                :id="`${content?.device?.device}-signal-strength`"
                class="ml-2"
              >
                {{
                  content.quality?.length > 1
                    ? content.quality.map(([signal, band]: [number, string]) => `${signal}% (${band})`).join(', ')
                    : content.quality?.map(([signal]: [number, string]) => `${signal}%`).join() || '0%'
                }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { useTouchDrag } from '@ui-core/composables/useTouchDrag'

export type CardType = 'ports' | 'mobile' | 'system' | 'rms' | 'wifi'

export interface Props<T> {
  type: CardType
  content: T
  title: string
  disabled?: boolean
  path?: string
  draggable?: boolean
}

const props = withDefaults(defineProps<Props<T>>(), {
  path: ''
})

const emit = defineEmits<{
  startDrag: [MouseEvent | TouchEvent]
  close: []
}>()

function getSimIconClass(targetSim: number) {
  return props.content.sim !== targetSim && props.content.sim_count !== 1 ? 'text-theme-text-subtle' : 'text-theme-text-success'
}

/**
 * Trims path so it can be used to check ACL access
 */
function trimPath(path: string) {
  const startIndex = path[0] === '/' ? 1 : 0
  let endIndex = path.length
  const idIndex = path.indexOf('#')
  if (idIndex !== -1) endIndex = idIndex
  const cfgIndex = path.indexOf('cfg')
  if (cfgIndex !== -1) endIndex = cfgIndex - 1
  const queryIndex = path.indexOf('?')
  if (queryIndex !== -1) endIndex = path.lastIndexOf('/')
  return path.substring(startIndex, endIndex)
}

const { events } = useTouchDrag({
  callback: event => emit('startDrag', event)
})
</script>

<style scoped>
.status {
  box-sizing: border-box;
  text-align: center;
  margin-bottom: 10px;
  border-radius: 10px;
}

.box-success {
  border: 0.5px solid var(--color-theme-text-success);
  color: var(--color-theme-text-success);
}

.box-error {
  border: 0.5px solid var(--color-theme-text-danger);
  color: var(--color-theme-text-danger);
}

.box-pending {
  border: 0.5px solid var(--color-theme-border-primary);
  color: var(--color-theme-text-primary);
}

.details-row.block .details-column span.title {
  width: 12%;
  display: inline-block;
}

.details-row.block .details-column .meter-container {
  width: 72%;
  margin: 0;
  top: -2px;
}

.details-row.block .details-column .meter-container .meter-gauge {
  position: static;
  width: 100%;
}

.details-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.details-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-theme-border-base);
  padding: 0.5em 0;
}
.details-row.hoverable span {
  position: relative;
}

.details-row.hoverable span:hover {
  color: var(--color-theme-text-primary);
}

.details-row.hoverable .title:hover .label-info {
  z-index: 100;
  left: calc(100% + 15px);
  top: 0px;
  display: block;
  font-family: 'Open Sans', sans-serif;
  font-size: 0.75rem;
  text-transform: none;
  color: rgb(68, 68, 68);
}

.details-row.hoverable .title:hover .label-info::after {
  left: -21px;
  right: unset;
  top: -13px;
  transform: scale(0.5) rotate(0deg);
}

.title.hoverable span:hover .label-info::after {
  left: -11px;
  right: unset;
}

.details-row .details-column {
  width: 50%;
  flex-grow: 1;
}

span.title {
  font-family: var(--font-sans);
  text-transform: uppercase;
  font-size: 1.1em;
  display: flex;
  align-items: center;
  margin-bottom: 0.3em;
}
.details-row .details-column span.title:first-child {
  margin-right: 5px;
}
.details-row .details-column span.title:last-child {
  margin-left: 5px;
}
.details-row .details-column span.param {
  font-size: 0.897em;
  color: var(--color-theme-text-secondary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.details-row .details-column span.param .meter-container .meter-gauge {
  right: unset;
}

.details-row .details-column span.param span:first-of-type label .meter-container {
  margin-right: 28px;
  margin-left: 0;
}

.details-row .details-column span.title img {
  height: 15px;
  width: 15px;
}

.details-row .details-column span.param .meter-container {
  margin-right: 35px;
}

.details-column.inline {
  display: flex;
  position: relative;
}

.details-column.inline .sim {
  position: relative;
}

.details-column.inline .sim span {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-theme-text-on-primary);
  font-weight: 500;
  font-size: 0.875rem;
  font-family: var(--font-sans);
}

.details-column.inline .connection {
  top: -9px;
  right: 0;
}

.details-column.inline .connection img {
  display: block;
  margin: 0 auto;
}

.details-column.inline .connection span {
  font-size: 11px;
  color: var(--color-theme-text-secondary);
}

.details-column .param.signal img {
  display: block;
}

.details-column .param.signal span {
  font-size: 0.625rem;
}

.content-title .meter-container:not(.inline) {
  font-family: 'Open Sans';
}

.meter-container {
  display: flex;
  align-items: center;
  position: relative;
}

.meter-container span {
  display: block;
  font-size: 1rem;
  color: var(--color-theme-text-primary);
}

.meter-container .meter-gauge {
  width: 94px;
  box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.2);
  border-radius: 5px;
  height: 7px;
  position: absolute;
  right: 0;
}

.meter-container .meter-gauge span {
  height: inherit;
  background-size: 100% 100%;
  display: block;
  text-indent: -9999px;
  background: none;
  background-color: var(--color-theme-bg-primary-1);
  border-radius: 5px;
}

.details-row.block {
  display: block;
}

.details-row.block .details-column {
  width: 100%;
}

@media (hover: hover) {
  .card:has(.card-title:hover) {
    border-color: var(--color-theme-border-primary);
  }
}
</style>
