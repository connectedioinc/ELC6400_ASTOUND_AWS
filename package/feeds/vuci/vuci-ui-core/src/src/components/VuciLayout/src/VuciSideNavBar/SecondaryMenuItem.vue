<template>
  <div
    :test-id="`${$utils.getNavTestId(path)}${currentPath ? ' active' : ''}${children && !active ? ' collapsed' : ''}${children ? ' collapsible' : ''}`"
    class="secondary-menu-item"
    @mouseenter="$_PopupParentMixin_onMouseEnter"
    @mouseleave="$_PopupParentMixin_onMouseLeave"
  >
    <router-link
      v-slot="{ href, navigate }"
      :to="path"
      custom
    >
      <a
        :href="href"
        class="secondary-menu-item-inner no-underline"
        :class="{ active: active, selected: selected, 'current-path': currentPath }"
        @click.prevent="$emit('click', navigate)"
      >
        <div
          class="name-block"
          :class="{ 'pr-8': !!children }"
        >
          <span
            class="name"
            :class="{ 'current-path': currentPath }"
          >
            {{ $t(name) }}
          </span>
        </div>
        <button
          v-if="children"
          class="expand-arrow-outter"
          @click.prevent.stop="$emit('click', null, true)"
        >
          <tlt-icon
            class="expand-arrow transition-transform text-theme-text-on-primary size-5"
            icon="arrow-thin"
          />
        </button>
      </a>
    </router-link>
    <slot />
  </div>
</template>

<script>
import PopupParentMixin from './PopupParentMixin.vue'
export default {
  mixins: [PopupParentMixin],
  props: {
    name: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    }
  },
  emits: ['click']
}
</script>

<style scoped>
.secondary-menu-item {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  &:last-child {
    margin-bottom: 100px;
  }
  .secondary-menu-item-inner {
    position: relative;
    margin: 0 0.5rem;
    width: calc(100% - 0.5rem * 2);
    min-height: 2rem;
    border-radius: 9999px;
    cursor: pointer;
    &.current-path {
      background-color: rgba(242, 247, 255, 0.2);
      & .name {
        -webkit-text-stroke-width: 0.04rem;
      }
    }
    &.active {
      .expand-arrow {
        transform: rotate(90deg);
      }
    }
    .name-block {
      border-radius: 1.75rem;
      width: 100%;
      padding: 0.125rem 1rem;
      &:hover,
      &:focus {
        > .name:not(.current-path) {
          cursor: pointer;
          width: auto;
          border-bottom: 1px solid white;
        }
      }
    }
    .name {
      color: var(--color-theme-text-on-primary);
      font-size: var(--text-body-secondary);
      text-transform: none;
      letter-spacing: 0.5px;
      overflow-wrap: break-word;
      hyphens: auto;
      border-bottom: 1px solid transparent;
    }
    .expand-arrow-outter {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translate(0, -50%);
      z-index: 0;
      height: 2rem;
      width: 2rem;
      border-radius: 1.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      &:hover,
      &:focus {
        cursor: pointer;
        background-color: rgba(217, 217, 217, 0.47);
      }
    }
  }
}
</style>
