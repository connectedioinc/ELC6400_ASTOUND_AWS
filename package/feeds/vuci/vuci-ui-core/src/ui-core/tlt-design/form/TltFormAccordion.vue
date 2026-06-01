<template>
  <div>
    <tlt-form-item-template>
      <tlt-button
        :button-id="$utils.slug(parsedTitle)"
        :data-expanded="show"
        type="text"
        @click="onShowClick"
      >
        <tlt-icon
          icon="dropdown-arrow"
          :class="{ 'rotate-180': show }"
          class="transition-transform"
        />
        {{ text }}
      </tlt-button>
    </tlt-form-item-template>
    <tlt-collapse-transition>
      <div v-show="show">
        <ListLayout
          gap="md"
          class="pt-6"
        >
          <slot />
        </ListLayout>
      </div>
    </tlt-collapse-transition>
  </div>
</template>

<script>
export default {
  props: {
    name: {
      type: String,
      required: true,
      default: '-'
    },
    title: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {
      storageKey: `${this.$route.path.slice(1).replace(/\//g, '-')}-${this.name}-form-accordion`,
      show: false
    }
  },
  computed: {
    parsedTitle() {
      return this.title ?? this.$t('advanced settings')
    },
    text() {
      return this.show ? this.$t('Hide %s').format(this.parsedTitle) : this.$t('Show %s').format(this.parsedTitle)
    }
  },
  created() {
    this.show = localStorage.getItem(this.storageKey) === 'true'
  },
  methods: {
    onShowClick() {
      this.show = !this.show
      localStorage.setItem(this.storageKey, this.show)
    }
  }
}
</script>
