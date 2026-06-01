<template>
  <transition
    :name="name"
    @before-enter="transitioning = true"
    @enter="(el, done) => _animatingCollapse(el, done, true)"
    @after-enter="_unsetStyles"
    @before-leave="transitioning = true"
    @leave="(el, done) => _animatingCollapse(el, done)"
    @after-leave="_unsetStyles"
  >
    <slot />
  </transition>
</template>

<script>
import { computed } from 'vue'

export const collapseTransitioning = Symbol('collapseTransition')

export default {
  provide() {
    return {
      [collapseTransitioning]: computed(() => this.transitioning)
    }
  },
  props: {
    name: {
      type: String,
      default: 'collapse'
    },
    collapseProperty: {
      type: String,
      default: 'height',
      validator: value => ['height', 'width'].includes(value)
    },
    duration: {
      type: Number,
      default: 400
    },
    easing: {
      type: String,
      default: 'ease-in-out'
    }
  },
  data() {
    return {
      currentStyles: null,
      transitioning: false
    }
  },
  computed: {
    transition() {
      const transitions = []
      Object.keys(this.currentStyles).forEach(key => {
        transitions.push(`${key} ${this.duration}ms ${this.easing}`)
      })
      return transitions.join(', ')
    }
  },
  methods: {
    /**
     * Animates section collapsing.
     * @param {HTMLDivElement} el - element to animate.
     * @param {function} done - callback function, which is called after specified duration.
     * @param {boolean} collapse - flag that determines whether the section should collapse or expand.
     */
    _animatingCollapse(el, done, collapse = false) {
      this._getCurrentStyles(el)
      this._setDimensions(el, collapse ? '0' : this.currentStyles)
      this._setOverflow(el, 'hidden')
      this._forceRepaint(el)
      this._setTransition(el, this.transition)
      this._setDimensions(el, collapse ? this.currentStyles : '0')
      setTimeout(done, this.duration)
    },
    /** Unsets styles after collapsing and expanding
     * @param {HTMLDivElement} el - element, which styles will be unset.
     */
    _unsetStyles(el) {
      this._setOverflow(el, '')
      this._setTransition(el, '')
      this._setDimensions(el, '')
      this.currentStyles = null
      this.transitioning = false
    },
    /**
     * Updates element's display and visibility styles.
     * @param {HTMLDivElement} el - element.
     */
    _getCurrentStyles(el) {
      if (this.currentStyles) return
      const visibility = el.style.visibility
      const display = el.style.display

      el.style.visibility = 'hidden'
      el.style.display = ''
      this.currentStyles = this._getDimensions(el)

      el.style.visibility = visibility
      el.style.display = display
    },
    /**
     * Gets dimensions of element's height or width based on collapse property,
     * @param {HTMLDivElement} el - element.
     * @returns {{height: string, padding: string}} element's dimension properties.
     */
    _getDimensions(el) {
      if (this.collapseProperty === 'height') {
        return {
          height: el.offsetHeight + 'px',
          'padding-top': el.style.paddingTop || this._getStyleValue(el, 'padding-top'),
          'padding-bottom': el.style.paddingBottom || this._getStyleValue(el, 'padding-bottom')
        }
      }
      if (this.collapseProperty === 'width') {
        return {
          width: el.offsetWidth + 'px',
          'padding-left': el.style.paddingLeft || this._getStyleValue(el, 'padding-left'),
          'padding-right': el.style.paddingRight || this._getStyleValue(el, 'padding-right')
        }
      }
      return {}
    },
    /**
     * Sets element's transition style.
     * @param {HTMLDivElement} el - element.
     * @param {string} value - transition style to set.
     */
    _setTransition(el, value) {
      el.style.transition = value
    },
    /**
     * Sets element's overflow style.
     * @param {HTMLDivElement} el - element.
     * @param {string} value - overflow style to set.
     */
    _setOverflow(el, value) {
      el.style.overflow = value
    },
    /**
     * Sets element's dimensions.
     * @param {HTMLDivElement} el - element.
     * @param {{height: string, padding: string} | string} value - dimension values that will be set.
     */
    _setDimensions(el, value) {
      if (!this.currentStyles) return
      Object.keys(this.currentStyles).forEach(key => {
        el.style[key] = typeof value === 'object' ? value[key] : value
      })
    },
    /**
     * Gets element's height or width based on collapse property.
     * @param {HTMLDivElement} el - element.
     * @returns {string} height or width property value.
     */
    _forceRepaint(el) {
      return getComputedStyle(el)[this.collapseProperty]
    },
    /**
     * Gets style of an element's provided property.
     * @param {HTMLDivElement} el - element.
     * @param {string} style - style to retrieve.
     * @returns {string} style value.
     */
    _getStyleValue(el, style) {
      return getComputedStyle(el, null).getPropertyValue(style)
    }
  }
}
</script>
