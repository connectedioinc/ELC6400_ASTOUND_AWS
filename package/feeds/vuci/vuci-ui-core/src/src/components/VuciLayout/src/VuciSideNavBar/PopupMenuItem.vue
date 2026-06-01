<template>
  <router-link
    v-slot="{ href, navigate }"
    :to="path"
    custom
  >
    <a
      ref="link"
      :href="href"
      class="popup-menu-item"
      :class="{ selected: selected }"
      @mouseenter="$_PopupParentMixin_onMouseEnter"
      @mouseleave="$_PopupParentMixin_onMouseLeave"
      @click.prevent="$emit('click', navigate)"
    >
      <div class="popup-item-inner">
        <div class="popup-button">
          <div
            class="name"
            v-text="$t(name)"
          />
          <tlt-icon
            v-if="children && children.length > 0"
            class="expand-arrow"
            icon="dropdown-arrow"
          />
        </div>
      </div>
    </a>
  </router-link>
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
  emits: ['click'],
  computed: {
    element() {
      return this.$refs.link
    }
  }
}
</script>

<style scoped>
.popup-menu-item {
  width: 100%;
  text-decoration: none;
  color: unset;
  .popup-item-inner {
    width: calc(100% - 0.5rem);
    margin-left: 0.5rem;
    cursor: pointer;
    .popup-button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 1rem;
      background-color: var(--color-theme-bg-floating);
      .name {
        color: var(--color-theme-text-base);
        font-size: var(--text-body-secondary);
        text-transform: none;
        letter-spacing: 0.5px;
        overflow-wrap: break-word;
        hyphens: auto;
        width: 100%;
      }
      .expand-arrow {
        filter: invert(1);
        transform: rotate(-90deg);
      }
    }
  }
  &.selected,
  &:hover {
    .popup-item-inner {
      .popup-button {
        background-color: var(--color-theme-bg-hover);
        .expand-arrow {
          transform: rotate(90deg);
        }
        .name {
          -webkit-text-stroke-width: 0.04rem;
        }
      }
    }
  }
}
</style>
