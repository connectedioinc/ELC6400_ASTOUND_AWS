<template>
  <div
    class="tertiary-menu"
    @mouseleave="_deselect"
    @focusout="_deselect"
  >
    <div
      v-show="show"
      class="selection-line"
      :style="{ top: `${top}px`, height: `${height}px` }"
    />
    <slot
      :exports="{
        setActive,
        setSelected
      }"
    />
  </div>
</template>

<script>
export default {
  props: {
    activeMenus: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      yMargin: 7.5,
      activeElement: null,
      elementTop: 0,
      elementHeight: 0,
      show: false,
      activePath: ''
    }
  },
  computed: {
    height() {
      return this.elementHeight - this.yMargin * 2
    },
    top() {
      return this.elementTop + this.yMargin
    },
    isActiveShown() {
      return this.activeMenus.includes(this.activePath)
    }
  },
  watch: {
    isActiveShown(newVal) {
      if (!newVal) this._unsetObserver()
    }
  },
  beforeUnmount() {
    this.$resizeObserver.unobserve()
  },
  methods: {
    setActive(element, path) {
      this.activeElement = element
      this.activePath = path
      this._setObserver(element)
    },
    setSelected(element) {
      this._setObserver(element)
    },
    _setDimentions(observeredElement) {
      const element = observeredElement.target
      this.elementTop = element.offsetTop
      this.elementHeight = element.offsetHeight
      this.show = true
    },
    _deselect() {
      if (this.isActiveShown) {
        this._setObserver(this.activeElement)
      } else {
        this._unsetObserver()
      }
    },
    _setObserver(element) {
      this.$resizeObserver.unobserve(element)
      this.$resizeObserver.observe(element, this._setDimentions)
    },
    _unsetObserver() {
      this.$resizeObserver.unobserve()
      this.show = false
    }
  }
}
</script>

<style scoped>
.tertiary-menu {
  width: 100%;
  margin-top: 4px;
  margin-bottom: 8px;
  position: relative;
}
.tertiary-menu::after {
  content: '';
  left: 1.5rem;
  width: 2px;
  border-radius: 1px;
  top: 0.5rem;
  height: calc(100% - 0.5rem * 2);
  background-color: var(--color-theme-bg-floating);
  opacity: 0.4;
  position: absolute;
}
.selection-line {
  left: 1.5rem;
  width: 2px;
  border-radius: 1px;
  background-color: var(--color-theme-bg-floating);
  position: absolute;
  transition:
    height 0.2s ease-in-out,
    top 0.2s ease-in-out;
}
</style>
