import { createEventBus } from '@ui-core/plugins/event-bus' // Replace with the actual module path

const eventBus = createEventBus()

suite('EventBus', () => {
  test('on() should add a listener for an event', () => {
    let callbackCalled = false
    const eventName = 'testEvent'

    eventBus.on(eventName, () => {
      callbackCalled = true
    })

    eventBus.emit(eventName)

    expect(callbackCalled).equal(true)
  })

  test('once() should add a listener that is called only once', () => {
    let callbackCount = 0
    const eventName = 'testEvent'

    eventBus.once(eventName, () => {
      callbackCount += 1
    })

    eventBus.emit(eventName)
    eventBus.emit(eventName)

    expect(callbackCount).equal(1)
  })

  test('off() should remove an event listener', () => {
    let callbackCalled = false
    const eventName = 'testEvent'
    const listener = () => {
      callbackCalled = true
    }

    eventBus.on(eventName, listener)
    eventBus.off(eventName, listener)
    eventBus.emit(eventName)

    expect(callbackCalled).equal(false)
  })

  test('emit() should trigger all event listeners', () => {
    let callback1Called = false
    let callback2Called = false
    const eventName = 'testEvent'

    eventBus.on(eventName, () => {
      callback1Called = true
    })

    eventBus.on(eventName, () => {
      callback2Called = true
    })

    eventBus.emit(eventName)

    expect(callback1Called).equal(true)
    expect(callback2Called).equal(true)
  })
})
