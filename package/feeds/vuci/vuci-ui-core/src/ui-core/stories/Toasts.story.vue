<template>
  <section>
    <div class="mt-12 flex flex-col gap-6 w-84 mx-auto">
      <tlt-toast
        v-bind="data"
        type="success"
      />
      <tlt-toast
        v-bind="data"
        type="info"
      />
      <tlt-toast
        v-bind="data"
        text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam eget nibh aliquet, tempor nulla non, vehicula ligula. Nullam quis eleifend mi, eu pulvinar nibh. Aliquam erat volutpat. Aliquam ante lorem, pharetra vel orci et, feugiat efficitur erat. Cras mattis urna in porta molestie. Nunc non scelerisque mauris. Ut quis massa porta, viverra mauris imperdiet, eleifend eros."
        type="error"
      />
      <tlt-toast
        text="message is here, no title"
        type="info"
      />
      <tlt-toast
        text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam eget nibh aliquet, tempor nulla non, vehicula ligula. Nullam quis eleifend mi, eu pulvinar nibh. Aliquam erat volutpat. Aliquam ante lorem, pharetra vel orci et, feugiat efficitur erat. Cras mattis urna in porta molestie. Nunc non scelerisque mauris. Ut quis massa porta, viverra mauris imperdiet, eleifend eros. "
        type="info"
      />
    </div>
  </section>
  <hr class="my-4" />
  <section class="flex flex-col gap-2">
    <div class="flex gap-4">
      <tlt-input
        v-model="title"
        placeholder="title"
      />
      <tlt-input
        v-model="text"
        placeholder="text"
      />
    </div>
    <div class="flex gap-4">
      <tlt-button @click="store.info(data2)">Info</tlt-button>
      <tlt-button @click="store.success(data2)">Success</tlt-button>
      <tlt-button @click="store.error(data2)">Error</tlt-button>
    </div>
    <transition-group
      name="top-messages"
      tag="div"
      class="flex flex-col gap-2 relative"
    >
      <tlt-toast
        v-for="message in store.messages"
        :key="message.id"
        class="w-full"
        v-bind="message"
        has-close
        @close="store.remove(message)"
        @mouseenter="message.timer?.stop()"
        @mouseleave="message.timer?.restart()"
      />
    </transition-group>
  </section>
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
      </div>
    </template> -->
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import TltToast from '@/components/Messenger/TltToast.vue'
import { useMessages } from '@/stores/messages'

const store = useMessages()

const data = reactive({
  title: 'Title text',
  text: 'message is here',
  hasClose: true
})

const title = ref('')
const text = ref('')
const data2 = computed(() => ({
  title: title.value,
  text: text.value,
  hasClose: true
}))
</script>

<style>
.top-messages-move,
.top-messages-enter-active,
.top-messages-leave-active {
  transition:
    transform 0.3s,
    opacity 0.3s;
  transform: translateY(0);
}
.top-messages-enter-from,
.top-messages-leave-to {
  transform: translateY(-2rem);
  opacity: 0;
}
.top-messages-leave-active {
  position: absolute;
}
</style>
