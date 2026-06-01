<template>
  <button
    :test-id="path ? `${$utils.getNavTestId(path)}${active ? ' active' : ''}` : undefined"
    class="primary-menu-item transition-[opacity,background-color]"
    :class="{ active: active, selected: selected, 'current-path': currentPath }"
    @mouseenter="$_PopupParentMixin_onMouseEnter"
    @mouseleave="$_PopupParentMixin_onMouseLeave"
  >
    <div class="primary-menu-inner">
      <tlt-icon
        :icon="menuIcon"
        class="text-theme-text-on-primary size-6"
      />
      <template v-if="name && name.toLowerCase() === 'site manager'">
        <div class="name">
          {{ $t('Site Manager') }}
        </div>
      </template>
      <overflow-container
        v-else-if="name"
        :text="$t(name)"
        class="name"
      />
    </div>
    <slot />
  </button>
</template>

<script>
import OverflowContainer from './OverflowContainer.vue'
import PopupParentMixin from './PopupParentMixin.vue'
export default {
  components: { OverflowContainer },
  mixins: [PopupParentMixin],
  props: {
    name: {
      type: String,
      default: ''
    },
    path: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    }
  },
  computed: {
    menuIcon() {
      const name = this.name.toLowerCase()
      const icons = {
        status: 'status',
        network: 'network',
        'site manager': 'link',
        services: 'gear',
        system: 'system',
        wireless: 'wifi'
      }
      return icons[name] || this.icon
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.primary-menu-item {
  width: 100%;
  min-width: 4.5rem;
  padding: 1.25rem 0.3125rem;
  &.current-path,
  &:hover,
  &:focus {
    & .primary-menu-inner {
      opacity: unset;
      & .name {
        -webkit-text-stroke-width: 0.04rem;
      }
    }
  }
  &.active,
  .current-path {
    background-color: var(--color-theme-bg-primary-active);
  }
  .primary-menu-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    width: 100%;
    height: 100%;
    opacity: 0.6;
    gap: 0.375rem;
    .name {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      color: var(--color-theme-text-on-primary);
      font-size: var(--text-body-secondary);
      letter-spacing: 0.5px;
      width: 100%;
    }
  }
}
</style>
