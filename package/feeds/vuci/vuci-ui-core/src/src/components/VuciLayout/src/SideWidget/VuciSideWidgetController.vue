<template>
  <div :inert="$store.modalsOpen > 1">
    <tlt-overlay
      :open="opened"
      @click="closeWidget"
    />
    <aside
      v-if="!firstLogin && visible"
      :class="['side-widget text-xs', { opened, 'z-20!': isTransitioning || opened }]"
      @transitionstart.self="isTransitioning = true"
      @transitionend.self="isTransitioning = false"
    >
      <div class="side-btn-container">
        <button
          :class="['side-btn', { closed: opened === false, selected: opened && widgetComponent === 'vuci-side-widget' }]"
          test-id="side-btn-service-settings"
          @click="buttonClick('vuci-side-widget')"
        >
          <tlt-icon
            icon="chevron"
            class="size-5"
            :class="{
              'rotate-180': !opened,
              'text-theme-text-primary': opened && widgetComponent === 'vuci-side-widget',
              'text-theme-text-on-primary': !opened || widgetComponent !== 'vuci-side-widget'
            }"
          />
        </button>
        <button
          v-if="$route.path === '/status/overview' && $store.hasPackages(['overview-ui'])"
          :class="['side-btn', { selected: opened && widgetComponent === 'tlt-overview-side-widget' }]"
          test-id="side-btn-overview-card-settings"
          @click="buttonClick('tlt-overview-side-widget')"
        >
          <tlt-icon
            icon="gear"
            class="size-5"
            :class="{
              'text-theme-text-primary': opened && widgetComponent === 'tlt-overview-side-widget',
              'text-theme-text-on-primary': !opened || widgetComponent !== 'tlt-overview-side-widget'
            }"
          />
        </button>
      </div>
      <div class="side-container-wrapper">
        <div class="side-container">
          <keep-alive>
            <component
              :is="widgetComponent"
              :opened="opened"
              @close="closeWidget"
            />
          </keep-alive>
        </div>
      </div>
    </aside>
  </div>
</template>

<script>
import { loadComponent } from '@/components/package_components/conditional.js'
import TltOverviewSideWidget from '@ui-core/tlt-design/overview/TltOverviewSideWidget.vue'

export default {
  components: {
    TltOverviewSideWidget,
    VuciSideWidget: loadComponent('vuci-app-side-widget-ui', 'VuciSideWidget')
  },
  data() {
    return {
      opened: false,
      widgetComponent: null,
      isTransitioning: false
    }
  },
  computed: {
    visible() {
      return this.$store.hasPackages(['side-widget-ui', 'side-widget-api']) && this.$session.hasAccess('status/widget', 'read')
    },
    firstLogin() {
      return this.$store.firstLogin
    }
  },
  watch: {
    opened(val) {
      this.$store.openModal(val)
    }
  },
  methods: {
    buttonClick(component) {
      this.opened = !(this.widgetComponent === component && this.opened)
      this.widgetComponent = component
    },
    closeWidget() {
      this.opened = false
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.side-widget {
  --widget-width: 22rem;
  --widget-top: calc(var(--header-height) + 1rem);
  --widget-height: calc(100dvh - var(--widget-top) * 2);
  --side-btn-width: 2.25rem;
  --side-btn-height: 3rem;

  @media not all and (min-width: theme(--breakpoint-md)) {
    --widget-height: calc(100dvh - var(--widget-top) - 1rem);
  }

  display: flex;
  position: fixed;
  right: 0px;
  top: var(--widget-top);
  z-index: 10;
  overflow: hidden;
  pointer-events: none;
  max-width: calc(var(--widget-width) + var(--side-btn-width));
  width: 100%;
  transform: translateX(calc(100% - var(--side-btn-width)));
  transition: transform 500ms;
  &.opened {
    transform: translateX(0px);
  }
}

.side-btn-container {
  display: flex;
  flex-direction: column;
}

.side-btn {
  background: var(--color-theme-bg-primary-1);
  width: var(--side-btn-width);
  height: var(--side-btn-height);
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--color-theme-border-base);
  border-right: none;
  border-top-left-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
  border-color: var(--color-theme-border-primary);
  margin-bottom: 0.125rem;
  pointer-events: all;
  &.selected {
    background: var(--color-theme-bg-surface);
    border-color: var(--color-theme-bg-surface);
  }
}

.side-container-wrapper {
  flex-grow: 1;
  width: 0;
  height: var(--widget-height);
  min-height: 8rem;
  border: 1px solid var(--color-theme-border-base);
  border-left: none;
  border-bottom-left-radius: 0.5rem;
  background-color: var(--color-theme-bg-page);
  pointer-events: all;
}

.side-container {
  width: 100%;
  height: 100%;
  pointer-events: all;
}
</style>
