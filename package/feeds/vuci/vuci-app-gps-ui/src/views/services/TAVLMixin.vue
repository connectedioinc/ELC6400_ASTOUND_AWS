<script>
export default {
  methods: {
    loadPrettyTavlName(ioInfo, name) {
      const found = ioInfo.find(entry => entry.id === name)
      return found ? found.name_with_pins : this.$capitalize(name)
    },
    getAvailableNames(tavlRules, ioInfo, includeHDOP) {
      const availableTypes = []
      if (this.$store.board.hwinfo.mobile) {
        availableTypes.push('signal')
      }
      if (this.$store.board.hwinfo.gps && includeHDOP) {
        availableTypes.push('HDOP')
      }

      if (this.$store.board.hwinfo.ios) {
        for (const io of ioInfo) {
          if (io.type === 'relay' || io.bi_dir === '1' || io.direction === 'out') continue
          availableTypes.push(io.id)
        }

        for (const rule of tavlRules) {
          const index = availableTypes.indexOf(rule.name)
          if (index !== -1) {
            availableTypes.splice(index, 1)
          }
        }
      }

      return availableTypes.map(id => [id, this.loadPrettyTavlName(ioInfo, id)])
    },
    isTavlReadonly(ioInfo, tavlRule) {
      const ioAcl = ioInfo.find(sec => sec.type === 'acl')
      if (!ioAcl) return false

      if (ioAcl.state === 'inactive') {
        return tavlRule.type === 'acl'
      } else if (ioAcl.state === 'active') {
        return tavlRule.type === 'adc'
      }
    }
  },
  render() {
    return ''
  }
}
</script>
