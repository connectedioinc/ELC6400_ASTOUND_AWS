<template>
  <tlt-overview-card
    v-bind="$props"
    :status-path="widget.statusPath"
    :services-path="widget.servicesPath"
  >
    <template #header>
      <div class="flex w-full items-center truncate">
        <tlt-overflow-hint>{{ widget.title }}</tlt-overflow-hint>
        <tlt-signal-bar
          v-if="widget.showSignal"
          class="ml-2"
          :signal="parseInt(widget.signal)"
          :showtext="false"
          float="left"
          wireless
        />
        <tlt-overflow-hint
          v-if="widget.text"
          class="mx-2 text-sm normal-case text-theme-text-primary font-normal shrink-5"
        >
          {{ widget.text }}
        </tlt-overflow-hint>
      </div>
    </template>
    <template #header-item>
      <tlt-wifi-status
        :signal="widget.signal"
        :up="widget.up"
      />
    </template>
    <tlt-overview-card-item
      v-for="(info, index) in widget.content"
      :key="index"
      :test-id="info.name"
    >
      <div class="flex flex-row justify-between items-between w-full">
        <div class="flex items-center">
          {{ info.title }}
          <tlt-icon
            v-if="typeof info.locked === 'boolean'"
            :icon="info.locked ? 'lock' : 'unlock'"
            class="size-5 text-theme-text-primary"
          />
        </div>
        <div @click.stop>
          <wifi-qr-code
            v-if="info.config && !info.status"
            :content="info.config"
          />
        </div>
      </div>
      <template #content>
        <wireless-status
          v-if="info.status"
          :status="info.status"
          :config="info.config"
          :network-status="info.networkStatus"
          small
        />
        <template v-else>{{ info.info }}</template>
      </template>
    </tlt-overview-card-item>
  </tlt-overview-card>
</template>

<script>
import WifiQrCode from '@/components/network/WifiQrCode.vue'
import WirelessStatus from '@/components/shared/WirelessStatus.vue'
export default {
  components: { WirelessStatus, WifiQrCode },
  props: {
    widget: {
      type: Object,
      default: () => ({})
    }
  }
}
</script>

<style scoped></style>
