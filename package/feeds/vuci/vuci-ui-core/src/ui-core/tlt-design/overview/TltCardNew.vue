<template>
  <div
    class="py-5 @container"
    :class="{ 'border w-[min(calc(100vw-3rem),20.5rem)] rounded-md px-6': !borderless }"
    :test-id="`card-${item.name ?? item.title}`"
  >
    <header
      v-if="item.title"
      class="font-semibold text-theme-text-secondary flex items-center justify-between mb-6 text-base"
    >
      <div class="flex items-center gap-3 w-full card-header">
        <slot
          name="header"
          :item="item"
        >
          <tlt-icon
            v-if="item.icon"
            class="shrink-0"
            :icon="item.icon"
            :class="item.status"
          />
          <span class="truncate">
            {{ item.title }}
          </span>
        </slot>
        <router-link
          v-if="item.config"
          :to="item.config"
          class="hover:bg-theme-bg-secondary-subtle-hover transition-colors p-1 visited:text-theme-text-subtle rounded-xs text-theme-text-subtle duration-300 hover:text-theme-text-secondary-hover inline-block ml-auto"
          :class="item.configClass || ''"
        >
          <tlt-icon icon="gear" />
        </router-link>
      </div>
    </header>
    <ul class="text-sm">
      <li
        v-for="(column, index) in item.columns"
        :key="index"
        class="mb-3 last:mb-0 text-body-secondary"
      >
        <slot
          :name="column.name ?? 'option'"
          :option="column"
        >
          <tlt-card-row
            v-bind="column"
            :row-idx="index"
          />
        </slot>
      </li>
    </ul>
  </div>
</template>

<script>
/**
 * @typedef {object} CardColumnBadge
 * @prop {StatusString} type - controls the color of the badge
 * @prop {'md'|'sm'} size - size of the badge
 * @prop {string} text - text inside the badge
 */

/**
 * @typedef {Object} CardItemColumn - single line of data
 * @property {string} [name] - name of the column used for slot name and test id
 * @property {string} label - displayed value label
 * @property {CardColumnBadge} badge
 * @property {string|number} [value] - value to display left side of the label
 * @property {CardItemColumn[]} children
 */
/**
 * @typedef {'primary'|'success'|'error'|'warning'|'disabled'} StatusString
 */
/**
 * @typedef {Object} CardItem
 * @property {string} config - URL to configuring provided item
 * @property {string} title - card item name that will be used in header
 * @property {string} [name] - name of the card used for test id
 * @property {string} [icon] - icon to render before item name
 * @property {StatusString} [status] - impacts rendered icon color
 * @property {CardItemColumn[]} columns - data columns to be displayed
 */
export default {
  props: {
    /** @type {CardItem} */
    item: {
      type: Object,
      default: () => {}
    },
    borderless: {
      type: Boolean,
      default: false
    }
  }
}
</script>
