<template>
  <transition-group
    ref="container"
    move-class="dnd__swap"
    :tag="tag"
    :css="false"
    @transitionend="swapping = false"
  >
    <slot name="before" />
    <slot
      :items="items"
      :dragging="dragging"
      :target-index="targetIndex"
      :start-drag="startWrapper"
      :swap-next="swapNext"
      :swap-prev="swapPrev"
    />
    <slot name="after" />
  </transition-group>
</template>

<script>
export default {
  model: {
    prop: 'items',
    event: 'drag-end'
  },
  props: {
    items: {
      type: Array,
      required: true
    },
    tag: {
      type: String,
      default: 'div'
    },
    teleportTo: {
      type: [Element, null],
      default: () => document.body
    },
    dragClass: {
      type: String,
      default: ''
    },
    placeholderClass: {
      type: String,
      default: 'opacity-0'
    },
    restrictToContainer: {
      type: Boolean,
      default: false
    },
    direction: {
      type: String,
      default: 'vertical',
      validator: value => ['vertical', 'horizontal', 'both'].includes(value)
    },
    disabled: {
      type: Boolean,
      default: undefined
    }
  },
  emits: ['drag-end'],
  data() {
    return {
      isMounted: false,
      dragging: false,
      dragElement: null,
      targetElement: null,
      targetIndex: null,
      swapIndex: null,
      rect: { x: 0, y: 0, height: 0, width: 0 },
      elementRects: [],
      mousePosition: { x: 0, y: 0 },
      mouseOffset: { x: 0, y: 0 },
      documentScroll: null,
      containerScroll: null,
      scrollDelta: { x: 0, y: 0 },
      animation: null,
      scrollInterval: null,
      nearestScrollContainer: null,
      swapping: false
    }
  },
  computed: {
    vertical() {
      return this.direction === 'vertical' || this.direction === 'both'
    },
    horizontal() {
      return this.direction === 'horizontal' || this.direction === 'both'
    },
    readOnly() {
      return this.disabled ?? this.$store.readOnlyPage
    },
    /** Style to be applied to drag element */
    style() {
      return `
        position: fixed;
        top: ${this.rect.y}px;
        left: ${this.rect.x}px;
        width: ${this.rect.width}px;
        height: ${this.rect.height}px;
        transform: translate(${this.position.x}px, ${this.position.y}px);
        z-index: 1000;
      `
    },
    beforeSlotChildrenCount() {
      if (!this.isMounted || !this.$slots.before) return 0
      return this.$slots.before().length
    },
    /** All elements in the container
     * @returns {HTMLElement[]}
     */
    elements() {
      if (!this.items) return []
      return Array.from(this.$refs.container.$el.children).slice(this.beforeSlotChildrenCount, this.items.length + 1)
    },
    /** Position of the drag element */
    position() {
      if (!this.isMounted) return ''
      let x = this.mousePosition.x - this.rect.x - this.mouseOffset.x
      let y = this.mousePosition.y - this.rect.y - this.mouseOffset.y
      if (this.restrictToContainer) {
        const containerRect = this.$refs.container.$el.getBoundingClientRect()
        x = this.$utils.clamp(x, containerRect.x - this.rect.x, containerRect.right - this.rect.x - this.rect.width)
        y = this.$utils.clamp(y, containerRect.y - this.rect.y, containerRect.bottom - this.rect.y - this.rect.height)
      }
      return { x: this.horizontal ? x : 0, y: this.vertical ? y : 0 }
    },
    /** Classes to be applied to the drag element */
    dragClasses() {
      return this.dragClass.split(' ')
    },
    /** Classes to be applied to the placeholder element */
    placeholderClasses() {
      return this.placeholderClass.split(' ')
    }
  },
  watch: {
    style() {
      if (!this.dragElement) return
      this.dragElement.style = this.style
    },
    dragElement() {
      if (!this.dragElement) return
      this.dragElement.style = this.style
    },
    documentScroll(newValue, oldValue) {
      if (!oldValue || !newValue) return
      this.scrollDelta.x += newValue.x - oldValue.x
      this.scrollDelta.y += newValue.y - oldValue.y
    },
    containerScroll(newValue, oldValue) {
      if (!oldValue || !newValue) return
      this.scrollDelta.x += newValue.x - oldValue.x
      this.scrollDelta.y += newValue.y - oldValue.y
    }
  },
  mounted() {
    this.isMounted = true
  },
  updated() {
    // Workaround for transition-group removing imperatively added classes on update
    // Probably some internal behaviour as this does not happen without transition-group
    if (this.dragElement) this.targetElement.classList.add(...this.placeholderClasses)
  },
  methods: {
    /**
     * @param {MouseEvent|TouchEvent} event
     * @param {number} index - Index of the item to be dragged
     */
    startWrapper(event, index) {
      if (this.readOnly) return
      event.preventDefault()
      const x = event.clientX || event.touches?.[0]?.clientX
      const y = event.clientY || event.touches?.[0]?.clientY
      this.handleStart(x, y, index)
    },
    /** @param {MouseEvent|TouchEvent} event */
    moveWrapper(event) {
      const x = event.clientX || event.touches?.[0]?.clientX
      const y = event.clientY || event.touches?.[0]?.clientY
      if (!x || !y) return
      this.handleMove(x, y)
    },
    /**
     * Starts dragging an item
     * @param {number} x - X coordinate of the mouse
     * @param {number} y - Y coordinate of the mouse
     * @param {number} index - Index of the item to be dragged
     */
    handleStart(x, y, index) {
      if (this.dragElement) {
        this.animation?.cancel()
        this.reset()
        return
      }
      this.dragging = true
      this.mousePosition = { x, y }
      this.elementRects = this.elements.map(element => element.getBoundingClientRect())
      this.nearestScrollContainer = this.getNearestScrollContainer(this.$refs.container.$el)
      this.documentScroll = { x: window.scrollX, y: window.scrollY }
      this.containerScroll = { x: this.nearestScrollContainer.scrollLeft, y: this.nearestScrollContainer.scrollTop }
      this.targetIndex = index
      this.targetElement = this.elements[index]
      const rect = this.elementRects[index]
      this.rect = { x: rect.x, y: rect.y, height: rect.height, width: rect.width }
      this.mouseOffset = { x: x - this.rect.x, y: y - this.rect.y }
      this.addListeners()
      document.body.classList.add('**:cursor-grabbing!', 'select-none')
    },
    /**
     * Handles mouse movement while dragging an item
     * @param {number} x - X coordinate of the mouse
     * @param {number} y - Y coordinate of the mouse
     */
    handleMove(x, y) {
      if (!this.dragging) return
      if (!this.dragElement) {
        this.dragElement = this.teleportElement(this.targetElement, this.teleportTo ?? this.$el)
        this.targetElement.classList.add(...this.placeholderClasses)
      }
      this.mousePosition = { x, y }
      this.swapIndex = this.findClosestElementIndex()
      this.applyElementTransforms()
      this.scrollContainer(x, y, this.nearestScrollContainer)
    },
    /** Handles mouse release and cleans up variables */
    handleEnd() {
      document.body.classList.remove('**:cursor-grabbing!', 'select-none')
      this.dragging = false
      if (!this.position.x && !this.position.y && !this.scrollDelta.x && !this.scrollDelta.y) {
        this.reset()
        return
      }
      const items = this.moveItem(this.items, this.targetIndex, this.swapIndex)
      if (this.scrollInterval) this.stopScroll()
      this.animation = this.animateDragElement()
      this.animation.onfinish = () => {
        this.dragging = false
        this.$emit('drag-end', items)
        this.reset()
      }
      this.animation.oncancel = () => {
        this.$emit('drag-end', items)
      }
    },
    /**
     * Scrolls the container if the mouse is near the top or bottom
     * @param {number} x - X coordinate of the mouse
     * @param {number} y - Y coordinate of the mouse
     * @param {HTMLElement} container - The container to scroll
     * @todo Implement horizontal scrolling
     */
    scrollContainer(x, y, container) {
      if (this.scrollInterval) return
      const rect = container === document.scrollingElement ? { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight } : container.getBoundingClientRect()
      const topRatio = (y - rect.y) / rect.height
      if (topRatio < 0.1) {
        this.scrollInterval = setInterval(() => {
          container.scrollBy({ top: this.$utils.mapRange(topRatio, 0, 0.1, -20, -1) })
          this.stopScroll()
        }, 10)
      } else if (topRatio > 0.9) {
        this.scrollInterval = setInterval(() => {
          container.scrollBy({ top: this.$utils.mapRange(topRatio, 0.9, 1, 1, 20) })
          this.stopScroll()
        }, 10)
      }
    },
    /**
     * @param {HTMLElement} element - The element to check
     * @returns {HTMLElement} The nearest parent element that scrolls
     */
    getNearestScrollContainer(element) {
      if (!element) return
      const css = getComputedStyle(element)
      if (css.position === 'fixed') return element
      // Checking with .includes() because value could have !important
      const isScrollable = !(css.overflowY.includes('hidden') || css.overflowY.includes('visible'))
      if (element instanceof HTMLElement && isScrollable && element.scrollHeight > element.clientHeight) return element
      return this.getNearestScrollContainer(element.parentElement) || document.scrollingElement || document.body
    },
    stopScroll() {
      if (!this.scrollInterval) return
      clearInterval(this.scrollInterval)
      this.scrollInterval = null
    },
    /**
     * Animates the drag element to its final position
     */
    animateDragElement() {
      const swapRect = this.elementRects[this.swapIndex]
      this.rect.x = swapRect.x
      this.rect.y = swapRect.y
      if (this.targetIndex < this.swapIndex) {
        this.rect.x += swapRect.width - this.rect.width
        this.rect.y += swapRect.height - this.rect.height
      }
      return this.dragElement?.animate({ transform: `translate(${-this.scrollDelta.x}px, ${-this.scrollDelta.y}px)` }, { duration: 200, fill: 'forwards', easing: 'ease' })
    },
    /**
     * Creates a clone of the element to be dragged and appends it to the teleport target
     * If the element is a table row, the cell widths are preserved
     * @param {HTMLElement} element - The element to be dragged
     * @param {HTMLElement} target - The element to be teleported to
     * @returns {HTMLElement} The cloned element
     */
    teleportElement(element, target) {
      const clone = element.cloneNode(true)
      // Preserve table row cell widths
      const trElements = element.tagName === 'TR' ? [element] : element.querySelectorAll('tr')
      const cloneTrElements = element.tagName === 'TR' ? [clone] : clone.querySelectorAll('tr')
      for (let i = 0; i < trElements.length; i++) {
        for (let j = 0; j < trElements[i].children.length; j++) {
          cloneTrElements[i].children[j].style.width = `${trElements[i].children[j].offsetWidth}px`
        }
      }
      clone.classList.remove(...this.placeholderClasses)
      clone.classList.add('dnd__dragging-element')
      if (this.dragClass) clone.classList.add(...this.dragClasses)
      target.appendChild(clone)
      return clone
    },
    /**
     * Calculates distances of each element from the drag element and returns the index of the closest element
     * @returns {number} The index of the closest element
     */
    findClosestElementIndex() {
      const dragCenter = { x: this.rect.x + this.position.x + this.rect.width / 2, y: this.rect.y + this.position.y + this.rect.height / 2 }
      const distances = []
      for (const rect of this.elementRects) {
        const center = { x: rect.x + rect.width / 2 - this.scrollDelta.x, y: rect.y + rect.height / 2 - this.scrollDelta.y }
        const distance = Math.sqrt(Math.pow(dragCenter.x - center.x, 2) + Math.pow(dragCenter.y - center.y, 2))
        distances.push(distance)
      }
      return distances.indexOf(Math.min(...distances))
    },
    /**
     * @param {number} x - X coordinate of the final position of the drag element
     * @param {number} y - Y coordinate of the final position of the drag element
     * @returns {string} The style to be applied to an element
     */
    getElementStyle(x, y) {
      return `
        transition: transform 0.2s;
        transform: translate(${x}px, ${y}px);
      `
    },
    /** Applies transforms to all elements after swapping */
    applyElementTransforms() {
      const swapRect = this.elementRects[this.swapIndex]
      const targetRect = this.elementRects[this.targetIndex]
      const targetY = swapRect.y - targetRect.y
      const targetX = swapRect.x - targetRect.x
      let targetStyle = this.getElementStyle(0, 0)
      let elementStyle = this.getElementStyle(0, 0)
      for (let i = 0; i < this.elements.length; i++) {
        const prevRect = this.elementRects[i - 1]
        const currRect = this.elementRects[i]
        const nextRect = this.elementRects[i + 1]
        if (i > this.targetIndex && i <= this.swapIndex) {
          targetStyle = this.getElementStyle(targetX + swapRect.width - targetRect.width, targetY + swapRect.height - targetRect.height)
          elementStyle = this.getElementStyle(prevRect.x - currRect.x + prevRect.width - targetRect.width, prevRect.y - currRect.y + prevRect.height - targetRect.height)
        } else if (i < this.targetIndex && i >= this.swapIndex) {
          targetStyle = this.getElementStyle(targetX, targetY)
          elementStyle = this.getElementStyle(nextRect.x - currRect.x - currRect.width + targetRect.width, nextRect.y - currRect.y - currRect.height + targetRect.height)
        } else {
          elementStyle = this.getElementStyle(0, 0)
        }
        this.elements[i].style = elementStyle
      }
      this.elements[this.targetIndex].style = targetStyle
    },
    clearElementTransforms() {
      for (const element of this.elements) {
        element.style.transform = ''
        element.style.transition = ''
      }
    },
    /**
     * @param {any[]} arr - The array of items
     * @param {number} from - The index of the item to be moved
     * @param {number} to - The index to move the item to
     * @returns {any[]} The copied array with the item moved
     */
    moveItem(arr, from, to) {
      const items = [...arr]
      items.splice(to < 0 ? items.length + to : to, 0, items.splice(from, 1)[0])
      return items
    },
    /**
     * @param {number} index1 - The index of the first item
     * @param {number} index2 - The index of the second item
     */
    swapElements(index1, index2) {
      if (!this.items[index1] || !this.items[index2]) return
      this.swapping = true
      const items = [...this.items]
      ;[items[index1], items[index2]] = [items[index2], items[index1]]
      return items
    },
    swapNext(index) {
      const items = this.swapElements(index, index + 1)
      this.$emit('drag-end', items)
      this.$nextTick(() => {
        this.elements[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      })
    },
    swapPrev(index) {
      const items = this.swapElements(index, index - 1)
      this.$emit('drag-end', items)
      this.$nextTick(() => {
        this.elements[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      })
    },
    reset() {
      this.dragElement?.remove()
      this.dragElement = null
      if (this.targetElement) {
        this.targetElement.classList.remove(...this.placeholderClasses)
        this.targetElement.style = ``
        this.targetElement = null
      }
      this.targetIndex = null
      this.documentScroll = null
      this.containerScroll = null
      this.scrollDelta = { x: 0, y: 0 }
      this.animation = null
      this.stopScroll()
      this.clearElementTransforms()
      this.removeListeners()
    },
    handleDocumentScroll() {
      this.documentScroll = { x: window.scrollX, y: window.scrollY }
      this.handleMove(this.mousePosition.x, this.mousePosition.y)
    },
    handleScroll() {
      this.containerScroll = { x: this.nearestScrollContainer.scrollLeft, y: this.nearestScrollContainer.scrollTop }
      this.handleMove(this.mousePosition.x, this.mousePosition.y)
    },
    addListeners() {
      document.addEventListener('mousemove', this.moveWrapper)
      document.addEventListener('touchmove', this.moveWrapper)
      document.addEventListener('mouseup', this.handleEnd)
      document.addEventListener('touchend', this.handleEnd)
      document.addEventListener('scroll', this.handleDocumentScroll)
      this.nearestScrollContainer.addEventListener('scroll', this.handleScroll)
    },
    removeListeners() {
      document.removeEventListener('mousemove', this.moveWrapper)
      document.removeEventListener('touchmove', this.moveWrapper)
      document.removeEventListener('mouseup', this.handleEnd)
      document.removeEventListener('touchend', this.handleEnd)
      document.removeEventListener('scroll', this.handleDocumentScroll)
      this.nearestScrollContainer.removeEventListener('scroll', this.handleScroll)
    }
  }
}
</script>

<style>
.dnd__swap {
  transition: transform v-bind("swapping ? '0.2s' : '0s'");
}
</style>
