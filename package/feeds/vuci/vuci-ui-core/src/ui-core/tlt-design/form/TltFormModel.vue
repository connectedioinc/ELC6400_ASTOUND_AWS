<template>
  <component
    :is="tag"
    :class="{ 'md:flex-row! flex-wrap': inlineForm }"
  >
    <slot />
  </component>
</template>

<script>
export default {
  inject: {
    inlineForm: {
      default: false
    }
  },

  provide() {
    return {
      formData: this.modelData ? this.modelData : {},
      rules: this.rules ? this.rules : [],
      bindComponent: this.bindComponent,
      unbindComponent: this.unbindComponent
    }
  },
  props: {
    model: {
      type: Object,
      default: () => {}
    },
    rules: {
      type: Object,
      default: () => {}
    },
    tag: {
      type: String,
      default: 'ListLayout'
    }
  },
  data() {
    return {
      registeredComponents: [],
      modelData: this.model
    }
  },
  computed: {
    invalidInputs() {
      return this.registeredComponents.filter(component => !component?.valid)
    },
    invalidTabs() {
      return Array.from(new Set(this.invalidInputs.map(input => input.tab?.title).filter(v => !!v)))
    }
  },
  methods: {
    bindComponent(instance) {
      this.registeredComponents.push(instance)
    },
    unbindComponent(instance) {
      const index = this.registeredComponents.indexOf(instance)
      if (index < 0) return
      this.registeredComponents.splice(index, 1)
    },
    getFieldsData() {
      const dataObject = {}
      this.registeredComponents.forEach(component => {
        if (component && component.validate && component.depend) {
          dataObject[component.prop] = component.modelValue
        }
      })
      return dataObject
    },
    async validate() {
      if (!this.registeredComponents?.length) return { valid: true }

      const promises = this.registeredComponents.map(component => {
        if (component && component.validate && component.depend) return component.validate()
        return Promise.resolve(true)
      })

      const values = await Promise.all(promises)
      const valid = !values.includes(false)

      return {
        valid,
        message: !valid
          ? this.invalidTabs.length
            ? this.$t('Configuration could not be saved. Some fields in %s are invalid'.format(this.invalidTabs.map(title => `"${title}"`).join(', ')))
            : this.$t('Configuration could not be saved. Some fields are invalid')
          : undefined
      }
    },

    setValid(valid) {
      this.registeredComponents.forEach(component => {
        component?.setValid(valid)
      })
    }
  }
}
</script>
