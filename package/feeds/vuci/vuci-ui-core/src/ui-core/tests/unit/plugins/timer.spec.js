import createWrapper from '../mockFactory'
import timerPlugin from '@ui-core/mixins/timer'

describe('timer.js', () => {
  const component = {
    render() {},
    mixins: [timerPlugin]
  }
  let wrapper = createWrapper(component)
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it('initializes timers when options are passed via timers option', () => {
    const timedFunction = () => {}
    const timedFunction2 = () => {}
    wrapper = createWrapper({
      render: () => null,
      methods: { timedFunction, timedFunction2 },
      timers: {
        timedFunction: { autostart: false },
        timedFunction2: { autostart: true, time: 3000 }
      },
      mixins: [timerPlugin]
    })
    const timer1 = wrapper.vm.$timer.getTimer(timedFunction)
    expect(timer1.name).toBe('timedFunction')
    expect(timer1.time).toBe(1000)
    expect(timer1.isRunning).toBe(false)
    const timer2 = wrapper.vm.$timer.getTimer(timedFunction2)
    expect(timer2.name).toBe('timedFunction2')
    expect(timer2.time).toBe(3000)
    expect(timer2.isRunning).toBe(true)
  })
})
