import { renderSlotFragments } from '@ui-core/utils/vue-helpers'
import { cloneVNode, Comment, defineComponent, mergeProps } from 'vue'

export const Slot = defineComponent({
  name: 'PrimitiveSlot',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => {
      if (!slots.default) return null

      const childrens = renderSlotFragments(slots.default())
      const firstNonCommentChildIndex = childrens.findIndex(child => child.type !== Comment)
      if (firstNonCommentChildIndex === -1) return childrens

      const firstChild = childrens[firstNonCommentChildIndex]

      // Remove props ref from being inferred
      delete firstChild.props?.ref
      const mergedProps = firstChild.props ? mergeProps(attrs, firstChild.props) : attrs
      // Remove class to prevent duplicates
      if (attrs.class && firstChild.props?.class) delete firstChild.props.class
      const cloned = cloneVNode(firstChild, mergedProps)

      // Explicitly override props starting with `on`.
      // It seems cloneVNode from Vue doesn't like overriding `onXXX` props.
      // So we have to do it manually.
      for (const prop in mergedProps) {
        if (prop.startsWith('on')) {
          cloned.props ||= {}
          cloned.props[prop] = mergedProps[prop]
        }
      }

      if (childrens.length === 1) return cloned

      childrens[firstNonCommentChildIndex] = cloned
      return childrens
    }
  }
})
