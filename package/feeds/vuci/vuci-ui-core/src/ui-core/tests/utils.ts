import { render, queries, within, queryHelpers } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

type Params = Parameters<typeof queryAllByPart>

export const queryAllByPart = queryHelpers.queryAllByAttribute.bind(null, 'data-part')
export const queryByPart = queryHelpers.queryByAttribute.bind(null, 'data-part')

const allQueries = { ...queries, getAllByPart, getByPart, queryByPart, queryAllByPart }

export function getAllByPart(container: Params[0], id: Params[1], ...rest: Params[2][]) {
  const els = queryAllByPart(container, id, ...rest)
  if (!els.length) {
    throw queryHelpers.getElementError(`Unable to find an element by: [data-part='${id}']`, container)
  }
  return els
}

export function getByPart(container: Params[0], id: Params[1], ...rest: Params[2][]) {
  const result = getAllByPart(container, id, ...rest)
  if (result.length > 1) {
    throw queryHelpers.getElementError(`Found multiple elements with the [data-part='${id}']`, container)
  }
  return result[0]
}

const customRender = <T>(...params: Parameters<typeof render<T>>) => ({ ...render(params[0], { ...params[1] }), user: userEvent.setup() })

const customWithin = (element: HTMLElement) => within(element, allQueries)
export { axe } from 'jest-axe'
export * from '@testing-library/vue'
export { customRender as render, customWithin as within }
