<template>
  <div class="relative w-full h-full text-body-secondary">
    <div class="font-semibold text-xl my-4">Popovers</div>
    <div class="font-semibold text-lg my-4">Try it out</div>
    <button
      id="test"
      class="px-4 py-1.5 hover:bg-theme-bg-secondary-subtle-hover rounded-md bg-theme-bg-secondary-3"
    >
      popover {{ form['Expand to'].value }}
    </button>
    <tlt-popover
      target="#test"
      :placement="form['Expand to'].value"
      :content="form['Text'].value"
      :title="form['Title'].value"
      :force-show="form['Force show?'].value"
    />
    <div class="font-semibold text-lg my-4">Possible variations</div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] px-6 py-8">
      <div
        v-for="location in locations"
        :key="location"
      >
        <button
          :id="location"
          class="px-4 py-1.5 hover:bg-theme-bg-secondary-subtle-hover rounded-md bg-theme-bg-secondary-3 m-2"
        >
          popover {{ location }}
        </button>
        <tlt-popover
          :target="`#${location}`"
          :placement="location"
          :title="title"
          :force-show="false"
          >{{ text }}<button class="bg-theme-bg-primary-1 rounded-xs px-1 py-0.5 text-theme-text-on-primary">Focusable button</button>
          <button class="bg-theme-bg-primary-1 rounded-xs px-1 py-0.5 text-theme-text-on-primary ml-4">Focusable button2</button></tlt-popover
        >
      </div>
    </div>
  </div>
</template>

<script>
import TltPopover from '@ui-core/components/tooltip/TltPopover.vue'
export default {
  components: { TltPopover },
  data() {
    return {
      form: {
        Title: { value: 'Virtual Network IP address', type: 'text' },
        Text: { value: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam adipisci eius autem perspiciatis illo quod a rem quis recusandae fuga?', type: 'textarea' },
        'Force show?': { value: false, type: 'checkbox' },
        'Expand to': {
          options: ['bottom', 'left', 'right', 'top'],
          type: 'select',
          value: 'bottom'
        }
      },
      title: 'Virtual Network IP address',
      text: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam adipisci eius autem perspiciatis illo quod a rem quis recusandae fuga?',
      locations: ['bottom-start', 'bottom-end', 'bottom', 'left-start', 'left-end', 'left', 'right-start', 'right-end', 'right', 'top-start', 'top-end', 'top']
    }
  }
}
</script>
