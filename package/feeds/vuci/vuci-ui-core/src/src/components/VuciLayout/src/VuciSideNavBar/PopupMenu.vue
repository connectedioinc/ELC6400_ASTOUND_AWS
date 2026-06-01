<template>
  <div
    v-if="objectWithDelay"
    class="popup-menu"
    :style="{ left: leftStyle, top: topStyle }"
    @mouseenter="_onMouseEnter"
    @mouseleave="_onMouseLeave"
  >
    <div class="popup-menu-inner">
      <div class="items">
        <pop-menu-item
          v-for="child in objectWithDelay.children"
          :key="child.path"
          :name="$t(child.title)"
          :path="child.path"
          :children="showChildren ? child.children : []"
          @click="navigate => $emit('click', child, navigate, true)"
          @mouseenter="prop => $emit('mouseenter', prop)"
          @mouseleave="$emit('mouseleave')"
          @active-change="_onChildrenSelect"
        />
      </div>
    </div>
  </div>
</template>
<script>
import popMenuItem from './PopupMenuItem.vue'
export default {
  components: {
    popMenuItem
  },
  props: {
    showChildren: {
      type: Boolean
    },
    parent: {
      type: Function,
      required: true
    }
  },
  emits: ['click', 'mouseenter', 'mouseleave'],
  data() {
    return {
      objectWithDelay: null,
      objectNoDelay: null,
      delay: 100,
      timeout: null,
      hover: false,
      popupElement: null
    }
  },
  computed: {
    leftStyle() {
      const elementParentPosition = this.parent().$el.getBoundingClientRect()
      const left = elementParentPosition.right - window.scrollX
      return `${left}px`
    },
    topStyle() {
      if (!this.popupElement) return
      const rootElementPosition = this.$parent.$el.getBoundingClientRect()
      const element = this.objectWithDelay.element.element ?? this.objectWithDelay.element.$el
      const elementPosition = element.getBoundingClientRect()
      const popupPosition = this.popupElement.getBoundingClientRect()
      const top = this.$utils.clamp(elementPosition.top - rootElementPosition.top, 0, rootElementPosition.height - popupPosition.height - 16)
      return `${top}px`
    }
  },
  watch: {
    objectNoDelay(newObject, oldElement) {
      this._applyWithDelay(newObject)
      this._applyChildrenSelected(newObject, oldElement)
    },
    objectWithDelay(element) {
      this.popupElement = null
      if (!element) return
      this.$nextTick(() => (this.popupElement = this.$el))
    },
    $route(to, from) {
      if (to?.path !== from?.path) this.objectWithDelay = null
    }
  },
  methods: {
    display(object) {
      this.objectNoDelay = object
    },
    hide() {
      this.objectNoDelay = null
    },
    _displayFinal(element) {
      this.objectWithDelay = element
    },
    _applyWithDelay(newObject) {
      clearTimeout(this.timeout)
      if (!this.objectWithDelay) {
        this.objectWithDelay = newObject
        return
      }
      if (this.objectWithDelay === newObject) return
      if (newObject) {
        this.timeout = setTimeout(this._displayFinal, this.delay, newObject)
      } else {
        this.timeout = setTimeout(this._displayFinal, this.delay, null)
      }
    },
    _applyChildrenSelected(newObject, oldObject) {
      if (newObject && newObject.element) {
        newObject.element.setSelected(true)
      }
      if (oldObject && oldObject.element) {
        oldObject.element.setSelected(false)
      }
    },
    _onChildrenSelect(newValue) {
      if (newValue) {
        this.display(this.objectWithDelay)
      } else if (!this.hover) {
        this.hide()
      }
    },
    _onMouseEnter() {
      this.hover = true
      this.display(this.objectWithDelay)
    },
    _onMouseLeave() {
      this.hover = false
      this.hide()
    }
  }
}
</script>

<style scoped>
.popup-menu {
  position: absolute;
  z-index: 11;
  width: 210px;
  .popup-menu-inner {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;
    &:after {
      z-index: 11;
      content: '';
      box-shadow: 0px 8px 24px 0px #959da533;
      position: absolute;
      top: -8px;
      bottom: -8px;
      left: 0.5rem;
      right: 0px;
      border-radius: 5px;
      background-color: var(--color-theme-bg-floating);
    }
    .items {
      position: relative;
      z-index: 12;
      max-height: 500px;
      overflow: auto;
      width: 100%;
    }
  }
}
</style>
