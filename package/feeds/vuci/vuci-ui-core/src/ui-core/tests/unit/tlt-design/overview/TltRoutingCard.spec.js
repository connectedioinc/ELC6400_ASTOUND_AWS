import createWrapper from '../../mockFactory'
import TltRoutingCard from '../../../../tlt-design/overview/TltRoutingCard.vue'

describe('TltRoutingCard.vue', () => {
  it('check if component is rendered', () => {
    const wrapper = createWrapper(TltRoutingCard)
    expect(wrapper).toBeTruthy()
  })
  it.each([
    {
      maxNumberOfColumnElements: 3,
      cardsColumns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      result: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
    },
    { maxNumberOfColumnElements: 3, cardsColumns: [1, 2, 3, 4, 5, 6, 7], result: [[1, 2, 3], [4, 5, 6], [7]] },
    {
      maxNumberOfColumnElements: 2,
      cardsColumns: [1, 2, 3, 4, 5, 6],
      result: [
        [1, 2],
        [3, 4],
        [5, 6]
      ]
    },
    {
      maxNumberOfColumnElements: 3,
      cardsColumns: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      result: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]
    },
    {
      maxNumberOfColumnElements: 4,
      cardsColumns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      result: [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12]
      ]
    },
    {
      maxNumberOfColumnElements: 5,
      cardsColumns: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      result: [
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9]
      ]
    },
    { maxNumberOfColumnElements: 3, cardsColumns: [1], result: [[1]] }
  ])('should return an array of columns from the cardsColumns array', ({ maxNumberOfColumnElements, cardsColumns, result }) => {
    const wrapper = createWrapper(TltRoutingCard, {
      propsData: {
        cardsColumns,
        maxNumberOfColumnElements
      }
    })
    expect(wrapper.vm.columns).toEqual(result)
  })
  it('check tooglecontent function', () => {
    const wrapper = createWrapper(TltRoutingCard, { props: { cardsColumns: [], cards: [{ id: 1, data: {} }] } })
    wrapper.vm._toggleContent(1)
    expect(wrapper.vm.cardStates).toEqual({ 1: true })
  })
})
