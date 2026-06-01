<template>
  <div class="min-h-screen flex pt-24 border-theme-border-base">
    <div class="fixed top-0 inset-x-0 h-24 flex items-center w-full border-b z-50 bg-theme-bg-surface shadow-xs">
      <div class="mx-auto italic relative group">
        <strong class="text-2xl leading-6 tracking-wider text-theme-text-primary">TELTONIKA</strong>
        <span class="text-4xl leading-6 text-theme-text-primary transition-all">|</span>
        <span class="ml-0.5 text-xl whitespace-nowrap">Development</span>
      </div>
    </div>
    <nav class="w-64 border-r sticky top-24 xl:block hidden side-nav">
      <ul class="px-6 pt-10 w-full text-body-secondary flex flex-col gap-4">
        <li
          v-for="[groupName, values] in Object.entries(menu)"
          :key="groupName"
        >
          <div class="text-xs font-bold tracking-widest mb-2">{{ groupName }}</div>
          <ul class="pl-2 flex flex-col gap-1">
            <li
              v-for="entry in values"
              :key="entry.path"
            >
              <nav-link
                :name="entry.name"
                :path="entry.path"
              />
            </li>
          </ul>
        </li>
      </ul>
    </nav>
    <main class="2xl:max-w-6xl 3xl:max-w-7xl xl:max-w-4xl w-full text-body-main">
      <section class="py-10 3xl:max-w-6xl 2xl:max-w-5xl mx-auto p-4">
        <router-view :key="$route.path"></router-view>
      </section>
    </main>
    <!-- v-if="$slots.aside || Object.keys(args).length > 0" -->
    <aside class="pt-10 text-base border-l">
      <slot name="aside">
        <div class="flex flex-col gap-4">
          <div
            v-for="[label, arg] in Object.entries(args || {})"
            :key="label + arg.type"
            class="grid grid-cols-7 gap-4 mr-6"
          >
            <div class="justify-self-end col-span-3">
              <label :for="label + arg.type">{{ label }}</label>
            </div>
            <div class="justify-self-start col-span-4">
              <input
                v-if="!['select', 'textarea'].includes(arg.type)"
                :id="label + arg.type"
                v-model="arg.value"
                class="bg-theme-bg-surface p-1 rounded-sm"
                :type="arg.type"
              />
              <select
                v-else-if="arg.type === 'select'"
                :id="label + arg.type"
                v-model="arg.value"
              >
                <option
                  v-for="(option, index) in arg.options"
                  :key="index"
                  :value="isArray(option) ? option[0] : option"
                >
                  {{ isArray(option) ? option[1] : option }}
                </option>
              </select>
              <textarea
                v-if="arg.type === 'textarea'"
                :id="label + arg.type"
                v-model="arg.value"
                class="bg-theme-bg-surface p-1 rounded-sm"
              ></textarea>
            </div>
          </div>
        </div>
      </slot>
    </aside>
  </div>
</template>

<script>
/**
 * @typedef {object} MenuEntry
 * @prop {string} path
 * @prop {string} name
 */
/**
 * @typedef FormElement
 * @prop {'text' |'checkbox'|'radio'| 'select' | 'textarea'} type
 * @prop {any} value
 * @prop {[value:string,optionName:string][]|string[]} [options]
 */

/**
 * @typedef {Record<string, FormElement} ArgElements
 */
import NavLink from './components/NavLink.vue'
export default {
  components: { NavLink },
  props: {
    /** @type {import('vue').PropType<ArgElements>} */
    args: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      mainContainerWidth: null,
      /** @type {MenuEntry[]} */
      menu: this.groupBy(this.generateComponentsMenu(), r => r.group)
    }
  },
  methods: {
    isArray(item) {
      return Array.isArray(item)
    },
    generateComponentsMenu() {
      const baseComponents = import.meta.glob('@ui-core/stories/**/*.story.vue', { eager: false })
      const menu = Object.keys(baseComponents).map(path => {
        let _path = path
          .slice(path.indexOf('/stories/') + 9)
          .split('/')
          .filter(r => r)
        const name = _path.pop().replace('.story.vue', '')
        _path = _path.join('/')
        return {
          path: `/__dev/${name.toLowerCase()}`,
          group: (_path || 'main').toUpperCase().replace(/_/g, ' '),
          name: name.replace(/_/g, ' ')
        }
      })
      return menu
    },
    groupBy(array, callback) {
      return array.reduce((sum, r) => {
        const group = callback(r)
        if (!sum[group]) sum[group] = []
        sum[group].push(r)
        return sum
      }, {})
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.side-nav {
  --content-width: 1420px;
  padding-left: calc((100% - var(--content-width)) / 2);
  width: calc((100% - var(--content-width)) / 2 + 256px);
}

@media (min-width: theme(--breakpoint-3xl)) {
  .side-nav {
    --content-width: 1820px;
    padding-left: calc((100% - var(--content-width)) / 2);
    width: calc((100% - var(--content-width)) / 2 + 256px);
  }
}
</style>
