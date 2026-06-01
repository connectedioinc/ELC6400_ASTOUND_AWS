<template>
  <div class="pb-8 mx-auto w-max">
    <div class="grid grid-cols-3 gap-3 max-w-3xl">
      <div class="col-span-3 my-6"><h1 class="text-turtle font-semibold">Flicker around</h1></div>
      <div class="col-span-3">
        <tlt-button
          v-bind="$data"
          button-id="login"
          :icon-left="iconLeft ? 'gear' : ''"
          :icon-right="iconRight ? 'wifi' : ''"
          >{{ text }}</tlt-button
        >
      </div>
      <div class="col-span-3 my-6"><h1 class="text-turtle font-semibold">Normal buttons</h1></div>
      <tlt-button
        button-id="login"
        color="primary"
        size="lg"
      >
        {{ 'LG Primary' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        color="secondary"
        size="lg"
      >
        {{ 'LG Secondary' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        size="lg"
        color="tertiary"
      >
        {{ 'LG Tertiary' }}
      </tlt-button>
      <tlt-button button-id="login">
        {{ 'M Primary' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        color="secondary"
      >
        {{ 'M Secondary' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        color="tertiary"
      >
        {{ 'M Tertiary' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        size="sm"
      >
        {{ 'S Primary' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        size="sm"
        color="secondary"
      >
        {{ 'S Secondary' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        color="tertiary"
        size="sm"
      >
        {{ 'S Tertiary' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        size="sm"
        disabled
        color="primary"
      >
        {{ 'S Primary Disabled' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        size="sm"
        disabled
        color="secondary"
      >
        {{ 'S Secondary Disabled' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        size="sm"
        disabled
        color="tertiary"
      >
        {{ 'S Tertiary Disabled' }}
      </tlt-button>
      <div class="col-span-3 my-6"><h1 class="text-turtle font-semibold">Text buttons</h1></div>
      <tlt-button
        type="text"
        color="primary"
        size="lg"
        icon-left="gear"
        >Text Prim LG</tlt-button
      >
      <tlt-button
        type="text"
        color="secondary"
        size="lg"
        >Text Sec LG</tlt-button
      >
      <tlt-button
        type="text"
        color="secondary"
        size="lg"
        disabled
        >Text Sec LG</tlt-button
      >
      <tlt-button
        type="text"
        color="primary"
        icon-left="gear"
        >Text Prim MD</tlt-button
      >
      <tlt-button
        type="text"
        color="secondary"
        >Text Sec MD</tlt-button
      >
      <tlt-button
        type="text"
        color="secondary"
        disabled
        >Text Sec MD</tlt-button
      >
      <tlt-button
        type="text"
        color="primary"
        size="sm"
        icon-left="gear"
        >Text Prim SM</tlt-button
      >
      <tlt-button
        type="text"
        size="sm"
        color="secondary"
        >Text Sec SM</tlt-button
      ><tlt-button
        type="text"
        color="secondary"
        size="sm"
        disabled
        >Text Sec SM Disabled</tlt-button
      >
      <div class="col-span-3 my-6"><h1 class="text-turtle font-semibold">Image Only buttons</h1></div>
      <tlt-button
        type="icon"
        size="lg"
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button
        type="icon"
        color="secondary"
        size="lg"
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button
        type="icon"
        color="tertiary"
        size="lg"
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button type="icon"><tlt-icon icon="gear" /></tlt-button>
      <tlt-button
        type="icon"
        color="secondary"
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button
        type="icon"
        color="tertiary"
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button
        type="icon"
        size="sm"
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button
        type="icon"
        color="secondary"
        size="sm"
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button
        type="icon"
        color="tertiary"
        size="sm"
        ><tlt-icon icon="gear"
      /></tlt-button>
      <div class="col-span-3 my-6"><h1 class="text-turtle font-semibold">Loading Buttons</h1></div>
      <tlt-button
        button-id="login"
        color="primary"
        loading
      >
        {{ 'MD Prim Load' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        color="secondary"
        loading
      >
        {{ 'MD Sec Load' }}
      </tlt-button>
      <tlt-button
        button-id="login"
        color="tertiary"
        loading
      >
        {{ 'MD Terty Load' }}
      </tlt-button>
      <tlt-button
        type="icon"
        loading
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button
        type="icon"
        color="secondary"
        loading
        ><tlt-icon icon="gear"
      /></tlt-button>
      <tlt-button
        type="icon"
        color="tertiary"
        loading
        ><tlt-icon icon="gear"
      /></tlt-button>
    </div>
  </div>
  <!-- <template #aside>
      <div class="flex flex-col gap-4 w-full items-center mt-6">
        <div class="grid grid-cols-2 gap-3">
          <label
            class="justify-self-end"
            for="loading"
            >Text</label
          >
          <input
            id="loading"
            v-model="text"
            type="text"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="justify-self-end"
            for="size"
            >Size</label
          >
          <select
            id="size"
            v-model="size"
          >
            <option
              v-for="opt in sizeOpts"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="justify-self-end"
            for="color"
            >Color</label
          >
          <select
            id="size"
            v-model="color"
          >
            <option
              v-for="opt in colorOpts"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3 mx-6">
          <label
            class="justify-self-end"
            for="color"
            >Type</label
          >
          <select
            id="size"
            v-model="type"
          >
            <option
              v-for="opt in typeOpts"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="justify-self-end"
            for="loading"
            >Loading state</label
          >
          <input
            id="loading"
            v-model="loading"
            type="checkbox"
            class="justify-self-start"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="justify-self-end"
            for="loading"
            >Disabled state</label
          >
          <input
            id="disabled"
            v-model="disabled"
            type="checkbox"
            class="justify-self-start"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="justify-self-end"
            for="loading"
            >Icon left</label
          >
          <input
            id="left"
            v-model="iconLeft"
            type="checkbox"
            class="justify-self-start"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="justify-self-end"
            for="loading"
            >Icon Right</label
          >
          <input
            id="right"
            v-model="iconRight"
            type="checkbox"
            class="justify-self-start"
          />
        </div>
      </div>
    </template> -->
</template>

<script>
export default {
  data() {
    return {
      text: 'test',
      size: 'lg',
      color: 'primary',
      loading: false,
      disabled: false,
      iconRight: false,
      iconLeft: false,
      type: 'button'
    }
  },
  computed: {
    sizeOpts() {
      return ['sm', 'md', 'lg']
    },
    colorOpts() {
      return ['primary', 'secondary', 'tertiary', 'error']
    },
    typeOpts() {
      return ['button', 'text', 'icon']
    }
  }
}
</script>

<style scoped></style>
