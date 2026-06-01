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
          <tlt-select
            v-model="value"
            :data-source="options"
          />
        </div>
        <div class="field">
          <tlt-select
            v-model="value"
            icon="gear"
            :data-source="options"
          />
        </div>
      </div>
      <div class="contents">
        <div class="descriptor">Default with placeholder</div>
        <div class="field">
          <tlt-select
            v-model="value"
            :data-source="options"
            placeholder="e.g., route 192.168.1.0 255.255.255.0"
          />
        </div>
        <div class="field">
          <tlt-select
            v-model="value"
            :data-source="options"
            icon="gear"
            placeholder="e.g., route 192.168.1.0 255.255.255.0"
          />
        </div>
      </div>
      <div class="contents">
        <div class="descriptor">Disabled</div>
        <div class="field">
          <tlt-select
            v-model="value"
            :data-source="options"
            disabled
          />
        </div>
        <div class="field">
          <tlt-select
            v-model="value"
            :data-source="options"
            icon="gear"
            disabled
          />
        </div>
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
          <tlt-select
            v-model="allowCreate"
            :data-source="options"
            allow-create
          />
        </div>
        <div class="field">
          <tlt-select
            v-model="allowCreate"
            icon="gear"
            :data-source="options"
            allow-create
          />
        </div>
      </div>
      <div class="contents">
        <div class="descriptor">Default with placeholder</div>
        <div class="field">
          <tlt-select
            v-model="allowCreate"
            :data-source="options"
            placeholder="e.g., route 192.168.1.0 255.255.255.0"
            allow-create
          />
        </div>
        <div class="field">
          <tlt-select
            v-model="allowCreate"
            :data-source="options"
            icon="gear"
            placeholder="e.g., route 192.168.1.0 255.255.255.0"
            allow-create
          />
        </div>
      </div>
      <div class="contents">
        <div class="descriptor">Disabled</div>
        <div class="field">
          <tlt-select
            v-model="allowCreate"
            :data-source="options"
            disabled
            allow-create
          />
        </div>
        <div class="field">
          <tlt-select
            v-model="allowCreate"
            :data-source="options"
            icon="gear"
            disabled
            allow-create
          />
        </div>
      </div>
    </div>
    <h2 class="text-salmon font-semibold mt-10 mb-6">Placeholder when no options are present</h2>
    <tlt-select
      v-model="valueNoOpts"
      :data-source="[]"
      icon="gear"
      placeholder="e.g., route 192.168.1.0 255.255.255.0"
    />
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
      valueNoOpts: '',
      value: '',
      allowCreate: '',
      invalid: false
    }
  },
  computed: {
    options() {
      return Array.from({ length: 10 }, (_, i) => ({ key: `${i}`, value: `Option ${i + 1}` }))
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
  @apply w-80;
}
</style>
