/* eslint-disable vue/one-component-per-file */
import { expect, describe } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { FormRoot } from '@ui-core/components/form'
import InputText from '@ui-core/components/input/InputText.vue'
import { FieldControl, FieldLabel, FieldRoot } from '..'
import { render } from '@ui-core/tests/utils'

const components = {
  FormRoot,
  FieldRoot,
  FieldLabel,
  FieldControl,
  InputText
}

describe('FieldModelValue', () => {
  test('empty ref() modelValue should be overridden by provided defaultValue', async () => {
    const modelValue = ref()
    const wrapper = mount(
      defineComponent({
        components,
        setup() {
          return { modelValue }
        },
        template: `
        <FieldRoot default-value="default" v-model="modelValue">
          <FieldControl>
            <InputText />
          </FieldControl>
        </FieldRoot>
      `
      })
    )
    await flushPromises()
    expect(modelValue.value).toEqual('default')
    expect(wrapper.find('input').element.value).toEqual('default')
  })
  test('non-empty ref() modelValue should override defaultValue', async () => {
    const modelValue = ref('defined')
    const wrapper = mount(
      defineComponent({
        components,
        setup() {
          return { modelValue }
        },
        template: `
        <FieldRoot default-value="default" v-model="modelValue">
          <FieldControl>
            <InputText />
          </FieldControl>
        </FieldRoot>
      `
      })
    )
    await flushPromises()
    expect(modelValue.value).toEqual('defined')
    expect(wrapper.find('input').element.value).toEqual('defined')
  })

  test('two-way binding should work', async () => {
    const modelValue = ref()
    const { findByLabelText, user } = render(
      defineComponent({
        components,
        setup() {
          return { modelValue }
        },
        template: `
        <FieldRoot default-value="default" v-model="modelValue">
          <FieldLabel>Input label</FieldLabel>
          <FieldControl>
            <InputText />
          </FieldControl>
        </FieldRoot>
      `
      })
    )
    await flushPromises()
    const input = await findByLabelText(/input label/i)
    expect(input).toHaveValue('default')
    expect(modelValue.value).toEqual('default')

    // user changes value
    await user.clear(input)
    await user.type(input, 'user-typed')
    expect(modelValue.value).toEqual('user-typed')
    // value being changed by programmatic input
    modelValue.value = 'programmatic'
    await flushPromises()
    expect(input).toHaveValue('programmatic')
  })
  test("field's defaultValue should be used when form does not provide a default value for it", () => {
    const wrapper = mount(
      defineComponent({
        components,
        setup() {},
        template: `
        <FormRoot :default-values="{other:'form-default'}">
          <FieldRoot name="field1" default-value="field-default">
            <FieldControl>
              <InputText />
            </FieldControl>
          </FieldRoot>
        </FormRoot>
        `
      })
    )
    expect(wrapper.find('input').element.value).toEqual('field-default')
  })
  test("form's defaultValue should override field's defaultValue", () => {
    const wrapper = mount(
      defineComponent({
        components,
        template: `
        <FormRoot :default-values="{field1: 'form-default'}">
          <FieldRoot name="field1" default-value="field-default">
            <FieldControl>
              <InputText />
            </FieldControl>
          </FieldRoot>
        </FormRoot>`
      })
    )
    expect(wrapper.find('input').element.value).toBe('form-default')
  })
})
