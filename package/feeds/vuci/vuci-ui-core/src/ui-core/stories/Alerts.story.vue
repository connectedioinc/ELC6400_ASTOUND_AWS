<template>
  <div class="mt-12 flex flex-col gap-6">
    <h2 class="text-turtle">Flicker around</h2>
    <tlt-alert v-bind="$data" />
    <h2 class="text-turtle">Global messages</h2>
    <tlt-alert
      id="1"
      title="Title text"
      text="Lorem ipsum dolor sit amet consectetur adipiscing elit"
      type="info"
      :action="{ text: 'Click here', onClick: () => console.log('clicked') }"
      has-close
    />
    <tlt-alert
      id="2"
      title="Lorem ipsum dolor sit amet consectetur adipiscing elit"
      text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Ullam dolorem quas, quasi dolore magnam recusandae laborum maiores ipsum, culpa minima tenetur iste laudantium debitis temporibus? Itaque non deleniti repellat quis."
      type="warning"
      :action="{ text: 'Click here', onClick: () => console.log('clicked') }"
      has-close
    />
    <tlt-alert
      id="3"
      title="Lorem ipsum dolor sit amet consectetur adipiscing elit"
      text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Ullam dolorem quas, quasi dolore magnam recusandae laborum maiores ipsum, culpa minima tenetur iste laudantium debitis temporibus? Itaque non deleniti repellat quis."
      type="error"
      :action="{ text: 'Click here', onClick: () => console.log('clicked') }"
      has-close
    />
    <tlt-alert
      id="4"
      title="Title text"
      text="Lorem ipsum dolor sit amet consectetur adipiscing elit"
      type="error"
    >
      <template #actions><tlt-button>action</tlt-button></template>
    </tlt-alert>
    <h2 class="text-turtle">Inline messages</h2>
    <div class="mx-auto w-full max-w-sm flex flex-col gap-6">
      <tlt-alert
        id="4"
        title="Title text"
        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Ullam dolorem quas, quasi dolore magnam recusandae laborum maiores ipsum, culpa minima tenetur iste laudantium debitis temporibus? Itaque non deleniti repellat quis."
        type="info"
        inline
      />
      <tlt-alert
        id="5"
        title="Title text"
        text="Lorem ipsum dolor sit amet consectetur adipiscing elit"
        type="warning"
        inline
      />
      <tlt-alert
        id="6"
        title="Title text"
        text="Lorem ipsum dolor sit amet consectetur adipiscing elit"
        type="error"
        inline
        :action="{ text: 'Click here', onClick: () => console.log('clicked') }"
      />
    </div>
  </div>
  <!-- <template #aside>
      <div class="flex flex-col gap-4 grow items-center mt-6">
        <div class="grid grid-cols-2 justify-center gap-3">
          <label
            for="title"
            class="justify-self-end"
            >Title text</label
          >
          <input
            id="title"
            v-model="title"
            class="justify-self-start"
            type="text"
          />
        </div>
        <div class="grid grid-cols-2 justify-center gap-3">
          <label
            for="text"
            class="justify-self-end"
            >Body text</label
          >
          <input
            id="text"
            v-model="text"
            class="justify-self-start"
            type="text"
          />
        </div>
        <div class="grid grid-cols-2 justify-center gap-3">
          <label
            for="close"
            class="justify-self-end"
            >Has close</label
          >
          <input
            id="close"
            v-model="hasClose"
            class="justify-self-start"
            type="checkbox"
          />
        </div>
        <div class="grid grid-cols-2 justify-center gap-3">
          <label
            for="close"
            class="justify-self-end"
            >Is inline</label
          >
          <input
            id="close"
            v-model="inline"
            class="justify-self-start"
            type="checkbox"
          />
        </div>
        <div class="grid grid-cols-2 justify-center gap-3">
          <label
            for="type"
            class="justify-self-end"
            >Type</label
          >
          <select
            id="type"
            v-model="type"
          >
            <option
              v-for="opt in typeOpts"
              :key="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
      </div>
    </template> -->
</template>

<script>
import TltAlert from '@/components/Messenger/TltAlert.vue'
export default {
  components: {
    TltAlert
  },
  data() {
    return {
      id: '0',
      title: 'Alert title text',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      hasClose: true,
      inline: false,
      type: 'error'
    }
  },
  computed: {
    typeOpts() {
      return ['error', 'info']
    }
  }
}
</script>
