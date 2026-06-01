<template>
  <router-link
    v-slot="{ href, navigate }"
    :to="path"
    custom
  >
    <a
      ref="link"
      :href="href"
      :test-id="`${$utils.getNavTestId(path)}${active ? ' active' : ''}`"
      class="tertiary-menu-item no-underline"
      :class="{ active: active }"
      @click.prevent="$emit('click', navigate)"
      @mouseenter="_setSelected"
      @focusin="_setSelected"
    >
      <div
        class="name"
        v-text="$t(name)"
      />
    </a>
  </router-link>
</template>

<script>
export default {
  props: {
    name: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      required: true
    },
    menuExports: {
      type: Object,
      required: true
    },
    path: {
      type: String,
      required: true
    }
  },
  emits: ['click'],
  watch: {
    active(val) {
      if (val) this.menuExports.setActive(this.$refs.link, this.path)
    }
  },
  mounted() {
    if (this.active) this.menuExports.setActive(this.$refs.link, this.path)
  },
  methods: {
    _setSelected() {
      this.menuExports.setSelected(this.$refs.link)
    }
  }
}
</script>

<style scoped>
.tertiary-menu-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  padding: 0.375rem calc(1rem + 0.5rem);
  opacity: 0.6;
  cursor: pointer;
  .name {
    color: var(--color-theme-text-on-primary);
    font-size: var(--text-body-secondary);
    position: relative;
    padding-right: 2px;
    padding-left: 0.75rem;
    letter-spacing: 0.5px;
    overflow-wrap: break-word;
    hyphens: auto;
    width: 100%;
  }
  &.active,
  &:hover,
  &:focus {
    opacity: unset;
    .name {
      -webkit-text-stroke-width: 0.04rem;
    }
  }
}
</style>
