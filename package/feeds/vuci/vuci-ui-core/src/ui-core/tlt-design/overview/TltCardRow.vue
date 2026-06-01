<template>
  <div :test-id="`row-${name ?? rowIdx}`">
    <div class="flex justify-between items-start gap-x-4 flex-col @2xs:flex-row @2xs:items-center">
      <span class="min-w-0">
        <slot
          name="label"
          :label="label"
        >
          {{ label }}
        </slot>
      </span>
      <div class="min-w-0 ml-0 flex items-center">
        <slot
          :badge="badge"
          :value="value"
        >
          <tlt-badge
            v-if="badge"
            v-bind="badge"
            :test-id="badge.name"
          >
            {{ badge.text }}
            <template
              v-if="$slots.context"
              #context
            >
              <slot name="context" />
            </template>
          </tlt-badge>
          <tlt-overflow-hint
            v-else
            class="font-semibold"
          >
            {{ [null, undefined, ''].includes(value) ? '-' : value }}
          </tlt-overflow-hint>
        </slot>
        <button
          v-if="children && children.length > 0"
          type="button"
          class="ml-2"
          @click="expanded = !expanded"
        >
          <tlt-icon
            icon="chevron"
            size="sm"
            :class="{ '-rotate-90': expanded, 'rotate-90': !expanded }"
          />
        </button>
        <slot name="post-value" />
      </div>
    </div>
    <template v-if="children && children.length > 0">
      <ul
        v-show="expanded"
        class="pl-6 mt-2 block"
      >
        <li
          v-for="(child, index) in children"
          :key="index"
          class="mb-3 last:mb-0"
        >
          <slot
            name="child"
            :record="child"
          >
            <tlt-card-row v-bind="child" />
          </slot>
        </li>
      </ul>
    </template>
  </div>
</template>

<script>
export default {
  props: {
    badge: {
      type: Object,
      default: () => null
    },
    name: {
      type: String,
      default: null
    },
    rowIdx: {
      type: Number,
      default: null
    },
    label: {
      type: String,
      default: null
    },
    value: {
      type: [String, Number],
      default: null
    },
    children: {
      type: Array,
      default: null
    }
  },
  data() {
    return {
      expanded: false
    }
  }
}
</script>
