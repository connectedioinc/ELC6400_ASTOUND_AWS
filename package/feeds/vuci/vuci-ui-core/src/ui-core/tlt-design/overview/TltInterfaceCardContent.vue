<template>
  <tlt-interface-card :id="item.id">
    <div class="row">
      <div class="title-cell title-wrapper cell with-borders">
        <div
          v-if="draggable"
          class="drag-anywhere-wrapper"
          @mousedown="handleStart($event, dragObject)"
          @touchstart="handleStart($event, dragObject)"
        >
          <tlt-icon
            icon="drag-anywhere"
            class="size-3"
          />
        </div>
        <div
          v-if="draggable"
          class="sort-wrapper"
        >
          <div
            v-show="index !== cardCount - 1"
            class="mini-drag-wrapper"
            @click="handleSwap(index)"
          >
            <div class="icon-size arrow" />
          </div>
          <div
            v-show="index !== 0"
            class="mini-drag-wrapper"
            @click="handleSwap(index, true)"
          >
            <div class="icon-size arrow up" />
          </div>
        </div>
        <div class="name-wrapper">
          <span class="row-number">
            {{ index + 1 }}
          </span>
          <div class="text-wrapper">
            {{ item.id }}
          </div>
        </div>
        <div class="action-wrapper">
          <div
            v-show="showEnable"
            class="switch-wrapper"
          >
            <slot name="switch" />
          </div>
          <slot name="actions" />
        </div>
      </div>
      <div
        class="cell"
        style="width: 28%"
      >
        <div class="info-wrapper">
          <div :class="activityStatusClass">
            <strong> {{ cols[1].label }}: </strong>
            <div class="text-with-overflow">
              {{ activityStatus }}
            </div>
          </div>
          <div>
            <strong> {{ cols[2].label }}: </strong>
            <div class="text-with-overflow">
              {{ mwanStatus }}
            </div>
          </div>
          <div>
            <strong> {{ cols[3].label }}: </strong>
            <div class="text-with-overflow">
              {{ getNetworkType(content.network_type || content.type) }}
            </div>
          </div>
        </div>
      </div>
      <div
        class="cell"
        style="width: 28%"
      >
        <div class="info-wrapper">
          <div v-if="content.ipaddrs && content.ipaddrs.length !== 0 && content.ip6addrs && content.ip6addrs.length !== 0">
            <strong> {{ cols[4].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.ipaddrs[0] }}
            </div>
            <tlt-hint
              :hints="[
                { title: 'IPV4', info: content.ipaddrs[0] },
                { title: 'IPV6', info: content.ip6addrs[0] }
              ]"
            >
              <tlt-icon
                icon="info"
                class="text-theme-text-info size-5 inline"
              />
            </tlt-hint>
          </div>
          <div v-else-if="content.ipaddrs && content.ipaddrs.length !== 0">
            <strong> {{ cols[4].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.ipaddrs[0] }}
            </div>
          </div>
          <div v-else-if="content.ip6addrs && content.ip6addrs.length !== 0">
            <strong> {{ cols[4].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.ip6addrs[0] }}
            </div>
          </div>
          <div v-else-if="content.data && content.data.bridge_ipaddr && (content.data.method === 'bridge' || content.data.method === 'passthrough')">
            <strong> {{ cols[4].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.data.bridge_ipaddr }}
            </div>
          </div>
          <div v-else>
            <strong> {{ cols[4].label }}: </strong>-
          </div>
          <div v-if="content.sim && (content.proto === 'wwan' || content.proto === 'connm')">
            <strong> {{ cols[12].label }}: </strong>{{ item.apnText ? item.apnText : '-' }}
          </div>
          <div
            v-else
            style="display: flex"
          >
            <strong> {{ cols[5].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.proto ? $t(content.proto) : '-' }}
            </div>
          </div>
          <div v-if="content.macaddr && content.macaddr !== '00:00:00:00:00:00' && content.network_type !== 'mobile'">
            <strong> {{ cols[6].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.macaddr }}
            </div>
          </div>
          <div v-if="content.sim && (content.proto === 'wwan' || content.proto === 'connm')">
            <strong> {{ cols[7].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.sim }}
            </div>
          </div>
        </div>
      </div>
      <div
        class="cell"
        style="width: 28%"
      >
        <div class="info-wrapper">
          <div>
            <strong> {{ cols[8].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.is_up ? '%t'.format(content.uptime) : '-' }}
            </div>
          </div>
          <div v-if="!$store.hasPackages('mdcollectd.control')">
            <strong> {{ cols[9].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.rx_bytes ? '%MB'.format(content.rx_bytes) : '-' }}
            </div>
          </div>
          <div v-if="!$store.hasPackages('mdcollectd.control')">
            <strong> {{ cols[10].label }}: </strong>
            <div class="text-with-overflow">
              {{ content.tx_bytes ? '%MB'.format(content.tx_bytes) : '-' }}
            </div>
          </div>
        </div>
      </div>
      <div
        class="cell hidden-field action-buttons"
        style="width: 10%"
      >
        <slot name="actions" />
      </div>
      <div
        v-show="showEnable"
        class="cell hidden-field action-buttons"
        style="width: 10%"
      >
        <div class="switch-wrapper">
          <slot name="switch" />
        </div>
      </div>
    </div>
  </tlt-interface-card>
</template>
<script>
export default {
  inject: ['formOptions'],
  props: {
    cols: {
      type: Array,
      default: () => []
    },
    item: {
      type: Object,
      default: () => {}
    },
    index: {
      type: Number,
      default: 0
    },
    showEnable: {
      type: Boolean,
      default: true
    },
    dragAndDrop: {
      type: Object,
      default: () => {}
    },
    draggable: {
      type: Boolean,
      default: true
    },
    cardCount: {
      type: Number,
      default: 0
    }
  },
  emits: ['state-change', 'drag-change', 'data-change'],
  data() {
    return {
      dragging: true
    }
  },
  computed: {
    dragObject() {
      return {
        targetData: this.$el.parentNode,
        handleData: this.handleDataChange
      }
    },
    enabled() {
      return this.item.enabled === '1' || false
    },
    content() {
      return this.formOptions().interfaceStatus?.find(s => s.interface === this.item.id) || {}
    },
    activityStatus() {
      return typeof this.content.up === 'undefined'
        ? Object.keys(this.content).length === 0
          ? '-'
          : this.$t('Disabled')
        : Object.keys(this.content).length === 0
          ? '-'
          : this.content.is_up
            ? this.$t('Up')
            : this.$t('Down')
    },
    activityStatusClass() {
      return typeof this.content.up === 'undefined' ? '' : Object.keys(this.content).length === 0 ? '' : this.content.is_up ? 'success' : 'error'
    },
    mwanStatus() {
      return Object.keys(this.content).length !== 0 ? (this.content.mwan_enabled === '1' || this.content.mwan_enabled === true ? this.$t('Enabled') : this.$t('Disabled')) : '-'
    }
  },
  methods: {
    toggleDrag(value) {
      this.dragging = value
      this.$emit('state-change', value)
    },

    getNetworkType(type) {
      type = type ?? '-'
      return this.$t(type[0].toUpperCase() + type.slice(1))
    },

    handleDataChange(card, oldIndex) {
      this.$emit('drag-change', { card, oldIndex })
    },
    handleStart(evt, parameters) {
      this.dragAndDrop.handleStart(evt, parameters)
    },
    handleSwap(oldIndex, isBackwards = false) {
      this.$emit('data-change', { oldIndex, isBackwards })
    }
  }
}
</script>
