import VuciSelectSwitch from '@/components/VuciLayout/src/CommonElements/VuciSelectSwitch.vue'
import { mount } from '@vue/test-utils'

describe('VuciSelectSwitch.vue', () => {
  it('renders select options', () => {
    const wrapper = mount(VuciSelectSwitch, {
      props: {
        options: [
          ['1', 'Option 1'],
          ['2', 'Option 2']
        ],
        elementId: 'test'
      }
    })
    console.log(wrapper.html())
    expect(wrapper.text()).toContain('Option 1')
    expect(wrapper.text()).toContain('Option 2')
  })

  it('updates modelValue when an option is clicked', async () => {
    const wrapper = mount(VuciSelectSwitch, {
      props: {
        options: [
          ['1', 'Option 1'],
          ['2', 'Option 2']
        ],
        elementId: 'test'
      }
    })

    const option1 = wrapper.get('[test-id="selectoption-1"]')
    const option2 = wrapper.get('[test-id="selectoption-2"]')

    await option1.trigger('click')
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['1'])

    await option2.trigger('click')
    expect(wrapper.emitted('update:modelValue')[1]).toEqual(['2'])
  })
})
