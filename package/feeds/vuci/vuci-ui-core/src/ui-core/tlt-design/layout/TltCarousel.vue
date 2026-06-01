<template>
  <div>
    <div class="flex justify-between">
      <header class="ml-6 lg:ml-0">
        <slot name="header" />
      </header>
      <div class="mr-6 xl:mr-12 flex">
        <button
          class="size-6 flex justify-center items-center rounded-xs hover:bg-theme-bg-secondary-subtle-hover disabled:hover:bg-transparent"
          :disabled="shownIndex.first <= 0 || source.length === 0"
          @click="scrollBy(-1)"
        >
          <tlt-icon
            icon="chevron"
            class="rotate-180 size-5"
            :class="`${shownIndex.first <= 0 || source.length === 0 ? 'text-theme-text-secondary/50' : 'text-theme-text-secondary'}`"
          />
        </button>
        <button
          class="size-6 flex justify-center items-center rounded-xs hover:bg-theme-bg-secondary-subtle-hover disabled:hover:bg-transparent"
          :disabled="source.length === 0 || (shownIndex.last !== -1 && shownIndex.last >= source.length - 1)"
          @click="scrollBy(1)"
        >
          <tlt-icon
            icon="chevron"
            :class="`${source.length === 0 || (shownIndex.last !== -1 && shownIndex.last >= source.length - 1) ? 'text-theme-text-secondary/50' : 'text-theme-text-secondary'}`"
            class="size-5"
          />
        </button>
      </div>
    </div>
    <div
      ref="carousel"
      class="flex row flex-nowrap overflow-x-hidden relative gap-4 py-4 -my-4 scroll-smooth"
    >
      <div
        v-for="(item, index) in source"
        ref="elements"
        :key="index"
        :data-index="index"
        class="first:ml-6 last:mr-6 lg:first:ml-0 xl:first:ml-0 xl:last:mr-12"
        :test-id="`carousel-item-${index}`"
      >
        <slot :item="item" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    source: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      observer: null,
      shownIndex: {
        first: -1,
        last: -1
      }
    }
  },
  watch: {
    source: {
      handler() {
        if (this.$refs.elements) {
          this.$refs.elements.forEach(el => this.observer.observe(el))
        }
      },
      deep: true
    }
  },
  mounted() {
    this.observer = new IntersectionObserver(this.getInView, {
      root: this.$refs.carousel,
      threshold: [0.9, 1]
    })
  },
  beforeUnmount() {
    this.$refs?.elements?.forEach(el => this.observer.disconnect(el))
  },
  methods: {
    getInView() {
      const getIndex = el => parseInt(el.getAttribute('data-index'))
      /** @type {HTMLDivElement} */
      const container = this.$refs.carousel
      const { offsetWidth: viewportWidth, scrollLeft } = container
      /** @type {HTMLDivElement[]} */
      const elements = this.$refs.elements
      const onScreen = elements
        .filter(el => {
          const { offsetWidth: divWidth, offsetLeft } = el
          return offsetLeft >= scrollLeft && offsetLeft + divWidth <= scrollLeft + viewportWidth
        })
        .map(el => getIndex(el))
      if (onScreen.length < 1) return false
      this.shownIndex.first = onScreen[0]
      this.shownIndex.last = onScreen.at(-1)
      return true
    },
    scrollBy(delta) {
      if (!this.getInView()) {
        this.shownIndex.first += delta
      }
      this.shownIndex.last += delta
      /** @type {HTMLElement[]} */
      const elements = this.$refs?.elements
      const nextIndex = this.rangeToggle(this.shownIndex.first + delta, [0, this.source.length - 1])
      const marginLeft = parseInt(window.getComputedStyle(elements[0]).marginLeft) || 0
      this.$refs.carousel.scroll({
        left: elements[nextIndex].offsetLeft - marginLeft,
        behavior: 'smooth'
      })
    },
    /**
     * @param {number} number - number that is trying to be set
     * @param {[number, number]} range - indicating [start, end] range in which the value should be toggled
     */
    rangeToggle(number, range) {
      const [start, end] = range
      if (number < start) return start
      if (number > end) return end
      return number
    }
  }
}
</script>
