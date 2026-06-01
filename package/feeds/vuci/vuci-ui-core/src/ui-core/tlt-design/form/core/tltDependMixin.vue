<script>
export default {
  inject: {
    vuciForm: {
      default: null
    }
  },
  props: {
    /**
     * Sets dependencies on other form fields
     */
    depend: {
      type: [String, Boolean, Function],
      default: ''
    }
  },
  computed: {
    visible() {
      return this.isVisible()
    }
  },
  methods: {
    isVisible(dependRule) {
      if (typeof this.depend === 'boolean') return this.depend
      if (typeof this.depend === 'function') {
        const res = this.depend(this.vuciSection.dependForm)
        return typeof res === 'boolean' ? res : !!parseInt(res)
      }
      if (typeof dependRule === 'boolean') return dependRule
      if (typeof dependRule === 'function') return dependRule(this.uciSection)
      return true
    }
  },
  render() {
    return ''
  }
}
</script>
