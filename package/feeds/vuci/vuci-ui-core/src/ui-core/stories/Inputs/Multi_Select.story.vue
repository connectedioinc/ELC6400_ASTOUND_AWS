<template>
  <section>
    Make invalid:
    <input
      v-model="invalid"
      type="checkbox"
    />
    <div class="t-grid">
      <div></div>
      <div class="descriptor">No icon</div>
      <div class="descriptor">icon Both</div>
      <div class="contents">
        <div class="descriptor">Default</div>
        <div class="field">
          <tlt-multi-select
            v-model="value"
            :data-source="options"
            has-select-all
            :disabled-options="disabled"
          />
        </div>
        <div class="field">
          <tlt-multi-select
            v-model="value"
            icon="gear"
            :data-source="options"
            :disabled-options="disabled"
          />
        </div>
      </div>
      <div class="descriptor">Disabled</div>
      <div class="field">
        <tlt-multi-select
          v-model="value"
          :data-source="options"
          :disabled-options="disabled"
          disabled
        />
      </div>
      <div class="field">
        <tlt-multi-select
          v-model="value"
          :data-source="options"
          :disabled-options="disabled"
          icon="gear"
          disabled
        />
      </div>
    </div>
    <h3 class="mt-12 mb-4 text-salmon">With Allow Create</h3>
    <div class="t-grid">
      <div></div>
      <div class="descriptor">No icon</div>
      <div class="descriptor">icon Both</div>
      <div class="contents">
        <div class="descriptor">Default</div>
        <div class="field">
          <tlt-multi-select
            v-model="allowCreate"
            :data-source="options"
            :disabled-options="disabled"
            allow-create
          />
        </div>
        <div class="field">
          <tlt-multi-select
            v-model="allowCreate"
            icon="gear"
            :data-source="options"
            :disabled-options="disabled"
            allow-create
          />
        </div>
      </div>

      <div class="contents">
        <div class="descriptor">Disabled</div>
        <div class="field">
          <tlt-multi-select
            v-model="allowCreate"
            :data-source="options"
            :disabled-options="disabled"
            disabled
            allow-create
          />
        </div>
        <div class="field">
          <tlt-multi-select
            v-model="allowCreate"
            :data-source="options"
            :disabled-options="disabled"
            icon="gear"
            disabled
            allow-create
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  provide() {
    return {
      valid: () => !this.invalid,
      maxlength: 321
    }
  },
  data() {
    return {
      value: [],
      allowCreate: [],
      invalid: false
    }
  },
  computed: {
    options() {
      return Array.from({ length: 10 }, (_, i) => ({ key: `${i}`, value: `Option ${i + 1}` }))
    },
    disabled() {
      return Array.from({ length: 2 }, (_, i) => ({ key: `${i}`, value: `Option ${i + 1}` }))
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.t-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(10rem, max-content));
  row-gap: 1.5rem;
  column-gap: 2rem;
}
.t-grid .descriptor {
  @apply text-fish font-semibold uppercase;
}
.t-grid .field {
  @apply w-40;
}
</style>
