<script>
export default {
  props: {
    children: {
      type: [Array],
      default: () => null
    },
    active: {
      type: Boolean
    },
    currentPath: {
      type: Boolean
    },
    openOnActive: {
      type: Boolean,
      default: () => false
    }
  },
  emits: ['activeChange', 'mouseenter', 'mouseleave'],
  data() {
    return {
      selected: false
    }
  },
  watch: {
    selected(newValue, oldValue) {
      this.$emit('activeChange', newValue, oldValue)
    }
  },
  methods: {
    $_PopupParentMixin_onMouseEnter() {
      if ((this.active && !this.openOnActive) || !this.children) return
      this.$emit('mouseenter', { element: this, children: this.children })
    },
    $_PopupParentMixin_onMouseLeave() {
      // needs guard case to not refresh timeout that hides popup
      if ((this.active && !this.openOnActive) || !this.children) return
      this.$emit('mouseleave')
    },
    setSelected(value) {
      this.selected = value
    }
  }
}
</script>
