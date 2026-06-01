<template>
  <tlt-overview-card
    v-bind="$props"
    :status-path="widget.statusPath"
    :services-path="widget.servicesPath"
  >
    <template #header>
      {{ widget.title }}
    </template>
    <template #header-item>
      <tlt-signal-bar
        class="h-4"
        :signal="parseInt(widget.signal)"
        float="right"
        :disabled="widget.servicesPath.readonly"
      />
    </template>
    <tlt-overview-card-item
      v-for="(info, index) in widget.content"
      :key="index"
      :test-id="info.name"
    >
      {{ info.title }}
      <template #content>
        {{ info.info }}
        <tlt-hint
          v-if="widget.hints.length !== 0 && index === 0"
          :show-icon="false"
        >
          <tlt-icon
            icon="info"
            class="text-theme-text-info size-5 inline"
          />
          <template #hintBox>
            <ul class="list-disc pl-4">
              <li
                v-for="(hint, id) in widget.hints"
                :key="id"
              >
                {{ hint.info }}
                <router-link
                  v-if="hint.to"
                  :to="hint.to"
                >
                  {{ hint.toText }}
                </router-link>
              </li>
            </ul>
          </template>
        </tlt-hint>
        <tlt-hint
          v-if="info.simSwitch"
          :show-icon="false"
        >
          <tlt-icon
            icon="info"
            class="text-theme-text-info size-5 inline"
          />
          <template #hintBox>
            <span>
              {{ info.simSwitch.hint }}
              <router-link :to="info.simSwitch.path">
                {{ $t('SIM switch configuration') }}
              </router-link>
            </span>
          </template>
        </tlt-hint>
        <button
          v-if="info.unblock"
          button-id="unblock"
          class="text-theme-text-primary font-bold"
          @click="$emit('showModal', { id: widget.modemId, type: 2 })"
        >
          {{ $t('Unblock') }}
        </button>
        <button
          v-if="info.unlock"
          button-id="unlock"
          class="text-theme-text-primary font-bold"
          @click="$emit('showModal', { id: widget.modemId, type: 1 })"
        >
          {{ $t('Unlock') }}
        </button>
      </template>
    </tlt-overview-card-item>
  </tlt-overview-card>
</template>

<script>
export default {
  props: {
    widget: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['showModal']
}
</script>

<style scoped></style>
