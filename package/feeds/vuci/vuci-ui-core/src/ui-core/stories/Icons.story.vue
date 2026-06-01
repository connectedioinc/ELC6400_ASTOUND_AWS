<template>
  <section>
    <div class="mb-10 w-full flex items-center">
      <label
        for="Search"
        class="mr-4 font-semibold text-lg"
        >Search</label
      >
      <input
        id="search"
        v-model="search"
        class="px-4 py-2 border-theme-border-base border rounded-md w-full"
      />
    </div>
    <div class="grid grid-cols grid-cols-fill-24 gap-x-6 gap-y-8 pb-10">
      <div
        v-for="iconName in iconComponents"
        :key="iconName"
      >
        <div
          class="p-8 rounded-[1.25rem] border-theme-border-secondary border flex justify-center grow relative group"
          :style="{ 'background-color': bgColor }"
        >
          <tlt-icon
            class="w-10 h-10 shrink-0"
            :class="{ [selectValue]: selectValue !== '' || selectValue !== 'none' }"
            :style="{ color: selectValue === '' ? color : '' }"
            :icon="iconName"
          />
          <button
            class="block absolute bottom-1 font-semibold left-1/2 bg-theme-bg-secondary-2/25 hover:bg-theme-bg-secondary-2/75 transition-all text-center w-[95%] backdrop-blur-md -translate-x-1/2 h-12 rounded-2xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
            @click="copyIcon(iconName)"
          >
            Copy
          </button>
        </div>
        <p class="text-sm truncate text-center">
          {{ iconName }}
        </p>
      </div>
    </div>
  </section>
  <!-- <template #aside>
    <div class="mt-12 flex flex-col gap-4 text-base">
      <div class="grid grid-cols-2 gap-4 items-center">
        <label
          class="justify-self-end"
          for="color"
          >Color</label
        >
        <select
          id="color"
          v-model="selectValue"
        >
          <option
            v-for="opt in colorOptions"
            :key="opt[0]"
            :value="opt[0]"
          >
            {{ opt[1] }}
          </option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-4 items-center">
        <label
          class="justify-self-end"
          for="color"
          >Color</label
        >
        <input
          id="color"
          v-model="color"
          type="color"
          :disabled="selectValue !== ''"
        />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 items-center">
      <label
        class="justify-self-end"
        for="color"
        >Background color</label
      >
      <input
        id="color"
        v-model="bgColor"
        type="color"
        :disabled="selectValue !== ''"
      />
    </div>
  </template> -->
</template>

<script>
import { copyToClipboard } from '@ui-core/plugins/helper'
export default {
  data() {
    return {
      bgColor: '#FFFFFF',
      color: '#000000',
      selectValue: '',
      search: '',
      iconNames: this.getIcons(),
      colorOptions: [
        ['text-theme-text-primary', 'Primary'],
        ['text-theme-text-danger', 'Error'],
        ['', 'Custom'],
        ['none', 'None']
      ]
    }
  },
  computed: {
    iconComponents() {
      return this.iconNames.filter(name => name.includes(this.search))
    }
  },
  methods: {
    /**
     * copies to clipboard selected icon.
     * @param {string} iconName
     */
    copyIcon(iconName) {
      if (this.selectValue === 'none') copyToClipboard(`<tlt-icon icon="${iconName}" />`)
      else {
        const color = this.selectValue === '' ? `style="{ color: ${this.color} }"` : `class="${this.selectValue}"`
        copyToClipboard(`<tlt-icon icon="${iconName}" ${color} />`)
      }
    },
    getIcons() {
      const icons = import.meta.glob('../tlt-design/icons/Icon*.vue', { eager: false })
      return Object.keys(icons).map(name => {
        const componentName = name.split('/').pop().replace('.vue', '').slice(4)
        return componentName
          .replace(/([A-Z])/g, '-$1')
          .slice(1)
          .toLowerCase(0)
      })
    }
  }
}
</script>
