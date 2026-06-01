import { Comment, computed, defineComponent, Fragment, h, type Component, type PropType, type VNode, type VNodeChild } from 'vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

export default defineComponent({
  props: {
    /** Element to use for columns that will recieve evenly split elements from slot  */
    columnElement: {
      type: Object as PropType<Component>,
      required: true
    },
    /** Key value pairs containing screen size breakpoints and number of columns for each of them. */
    breakpoints: {
      type: Object as PropType<Partial<Record<keyof typeof breakpointsTailwind, number>>>,
      required: true
    }
  },
  setup(props, { slots }) {
    const windowBreakpoints = useBreakpoints(breakpointsTailwind)
    const activeBreakpot = windowBreakpoints.active()
    const breakpointValues = computed<Record<string, number>>(() => {
      const breakpoints = props.breakpoints as Record<string, number>
      const sortedKeys = Object.entries(breakpointsTailwind)
        .sort((a, b) => a[1] - b[1])
        .map(e => e[0])
      const firstValue = sortedKeys.reduce<number>((prev, curr) => (prev ? prev : breakpoints[curr]), 0)
      const result: Record<string, number> = {}
      sortedKeys.forEach((e, i, arr) => (result[e] = breakpoints[e] ? breakpoints[e] : (result[arr[i - 1]] ?? firstValue)))
      return result
    })

    const colCount = computed(() => (activeBreakpot.value ? breakpointValues.value[activeBreakpot.value] : breakpointValues.value.sm))

    function render() {
      const displayElements =
        slots.default?.().reduce<VNodeChild[]>((prev, curr) => {
          if (curr.type === Fragment && Array.isArray(curr.children)) {
            prev.push(...curr.children)
          } else if (curr.type !== Comment) prev.push(curr)
          return prev
        }, []) ?? []

      const split = Math.floor(displayElements.length / colCount.value)
      const remainder = displayElements.length % colCount.value
      const elementBag = [...displayElements]

      return Array.from({ length: colCount.value }).reduce<VNode[]>((prev, _, i) => {
        const rowElements = elementBag.splice(0, split + (i < remainder ? 1 : 0))
        if (rowElements.length > 0) {
          prev.push(h(props.columnElement, () => rowElements))
        }
        return prev
      }, [])
    }

    return render
  }
})
