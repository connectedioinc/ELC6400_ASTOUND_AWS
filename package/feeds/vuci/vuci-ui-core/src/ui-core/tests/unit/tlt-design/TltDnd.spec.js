import { vi } from 'vitest'
import createWrapper from '../mockFactory'
import TltDnd from '@ui-core/tlt-design/layout/TltDnd.vue'

describe('TltDnd.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltDnd, {
      props: {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]
      },
      computed: { ...TltDnd.computed, elements: () => Array(3).fill(document.createElement('div')) },
      data() {
        return {
          elementRects: [...Array(10).keys()].map(i => ({ x: i * 10, y: i * 10, width: 10, height: 10 }))
        }
      }
    })
  })

  it('Checks if component is rendered', () => {
    expect(wrapper).toBeTruthy()
  })

  it.each([
    ['vertical', true, false],
    ['horizontal', false, true],
    ['both', true, true]
  ])('Sets direction to %s', async (direction, vertical, horizontal) => {
    await wrapper.setProps({ direction })
    expect(wrapper.vm.vertical).toBe(vertical)
    expect(wrapper.vm.horizontal).toBe(horizontal)
  })

  it.each([
    ['vertical', 0, 5],
    ['horizontal', 5, 0],
    ['both', 5, 5]
  ])('Computes drag element position for %s direction(s)', async (direction, x, y) => {
    await wrapper.setProps({ direction })
    await wrapper.setData({ mousePosition: { x: 30, y: 30 }, rect: { x: 20, y: 20 }, mouseOffset: { x: 5, y: 5 } })
    expect(wrapper.vm.position).toEqual({ x, y })
  })

  it('Computes drag element position when restrict to container is true', async () => {
    await wrapper.setProps({ restrictToContainer: true, direction: 'both' })
    await wrapper.setData({ mousePosition: { x: 30, y: 30 }, rect: { x: 20, y: 20 }, mouseOffset: { x: 5, y: 5 } })
    expect(wrapper.vm.position).toEqual({ x: 0, y: 0 })
  })

  it('Starts dragging', async () => {
    wrapper.vm.addListeners = vi.fn()
    wrapper.vm.handleStart(10, 10, 1)
    expect(wrapper.vm.dragging).toBe(true)
    expect(wrapper.vm.targetIndex).toBe(1)
    expect(wrapper.vm.mousePosition).toEqual({ x: 10, y: 10 })
    expect(wrapper.vm.addListeners).toHaveBeenCalled()
  })

  it('Updates mouse position on mouse move', async () => {
    wrapper.vm.teleportElement = vi.fn().mockReturnValue(document.createElement('div'))
    wrapper.vm.findClosestElementIndex = vi.fn()
    wrapper.vm.applyElementTransforms = vi.fn()
    wrapper.vm.scrollContainer = vi.fn()
    wrapper.vm.targetElement = document.createElement('div')
    await wrapper.setData({ dragging: true })
    wrapper.vm.handleMove(10, 10)
    expect(wrapper.vm.mousePosition).toEqual({ x: 10, y: 10 })
  })

  it('Does not update mouse position on mouse move', async () => {
    await wrapper.setData({ dragging: false })
    wrapper.vm.handleMove(10, 10)
    expect(wrapper.vm.mousePosition).toEqual({ x: 0, y: 0 })
  })

  it('Stops dragging when item has been moved', async () => {
    wrapper.vm.moveItem = vi.fn()
    wrapper.vm.stopScroll = vi.fn()
    wrapper.vm.animateDragElement = vi.fn().mockReturnValue({})
    wrapper.vm.nearestScrollContainer = document.createElement('div')
    await wrapper.setData({ dragging: true, mousePosition: { x: 10, y: 10 }, swapIndex: 1 })
    wrapper.vm.handleEnd()
    expect(wrapper.vm.dragging).toBe(false)
    expect(wrapper.vm.moveItem).toHaveBeenCalled()
    expect(wrapper.vm.animateDragElement).toHaveBeenCalled()
  })

  it('Stops dragging when item is not moved', async () => {
    wrapper.vm.reset = vi.fn()
    wrapper.vm.animateDragElement = vi.fn().mockReturnValue({})
    await wrapper.setData({ dragging: true, position: { x: 0, y: 0 } })
    wrapper.vm.handleEnd()
    expect(wrapper.vm.dragging).toBe(false)
    expect(wrapper.vm.reset).toHaveBeenCalled()
    expect(wrapper.vm.animateDragElement).not.toHaveBeenCalled()
  })

  it('Scrolls container while it is not being scrolled', async () => {
    wrapper.vm.stopScroll = vi.fn()
    window.setInterval = vi.fn()
    wrapper.vm.scrollContainer(10, 10, document.scrollingElement)
    expect(wrapper.vm.stopScroll).not.toHaveBeenCalled()
    expect(window.setInterval).toHaveBeenCalled()
  })

  it('Does not scroll container if it is already scrolling', async () => {
    window.setInterval = vi.fn()
    await wrapper.setData({ scrollInterval: 1 })
    wrapper.vm.scrollContainer(10, 10, document.scrollingElement)
    expect(window.setInterval).not.toHaveBeenCalled()
  })

  it('Gets nearest scroll container', () => {
    const el = wrapper.vm.$refs.container.$el
    expect(wrapper.vm.getNearestScrollContainer(el)).toBe(document.body)
  })

  it('Animates drag element to its end position', async () => {
    await wrapper.setData({
      swapIndex: 1,
      elementRects: [
        { x: 10, y: 10 },
        { x: 20, y: 20 }
      ],
      dragElement: document.createElement('div')
    })
    wrapper.vm.dragElement.animate = vi.fn()
    wrapper.vm.animateDragElement()
    expect(wrapper.vm.dragElement.animate).toHaveBeenCalled()
  })

  it('Teleports element to target element', async () => {
    const el = document.createElement('div')
    const clone = wrapper.vm.teleportElement(el, document.body)
    expect(clone).not.toBe(el)
    expect(document.body).toContain(clone)
  })

  it('Teleports table row element to target element and preserves cell widths', async () => {
    const el = document.createElement('tr')
    el.appendChild(document.createElement('td'))
    const clone = wrapper.vm.teleportElement(el, document.body)
    expect(clone.children[0].style.width).toBeTruthy()
  })
  it.each([
    [-100, 100, 0],
    [45, 0, 2],
    [55, 0, 3],
    [1000, 1000, 9]
  ])('Finds closest element index', async (x, y, index) => {
    await wrapper.setData({
      rect: { x, y, width: 10, height: 10 }
    })
    const i = wrapper.vm.findClosestElementIndex()
    expect(i).toBe(index)
  })

  it('Applies element transforms', async () => {
    await wrapper.setData({ targetIndex: 1, swapIndex: 2 })
    wrapper.vm.applyElementTransforms()
    expect(wrapper.vm.elements[1].style.transform).toBe('translate(10px, 10px)')
  })

  it('Clears element transforms', async () => {
    wrapper.vm.elements[0].style.transform = 'translate(10px, 10px)'
    wrapper.vm.clearElementTransforms()
    expect(wrapper.vm.elements[0].style.transform).toBe('')
  })

  it('Moves item', async () => {
    const arr = [1, 2, 3, 4, 5]
    const res = wrapper.vm.moveItem(arr, 1, 3)
    expect(res).toEqual([1, 3, 4, 2, 5])
  })

  it('Swaps items', async () => {
    const items = wrapper.vm.swapElements(0, 3)
    expect(wrapper.vm.swapping).toBe(true)
    expect(items).toEqual([{ id: 4 }, { id: 2 }, { id: 3 }, { id: 1 }, { id: 5 }])
  })

  it('Resets state', async () => {
    wrapper.vm.stopScroll = vi.fn()
    wrapper.vm.clearElementTransforms = vi.fn()
    wrapper.vm.removeListeners = vi.fn()
    wrapper.vm.dragElement = document.createElement('div')
    wrapper.vm.reset()
    expect(wrapper.vm.dragElement).toBeFalsy()
    expect(wrapper.vm.stopScroll).toHaveBeenCalled()
    expect(wrapper.vm.clearElementTransforms).toHaveBeenCalled()
    expect(wrapper.vm.removeListeners).toHaveBeenCalled()
  })

  it('Adds event listeners', async () => {
    wrapper.vm.nearestScrollContainer = document.createElement('div')
    document.addEventListener = vi.fn()
    wrapper.vm.addListeners()
    expect(document.addEventListener).toHaveBeenCalled()
  })

  it('Removes event listeners', async () => {
    wrapper.vm.nearestScrollContainer = document.createElement('div')
    document.removeEventListener = vi.fn()
    wrapper.vm.removeListeners()
    expect(document.removeEventListener).toHaveBeenCalled()
  })
})
