import { createContext } from '@ui-core/utils/create-context'
import { Client } from './query/client'
import { hasInjectionContext } from 'vue'

const [provideClientContext, injectClientContext] = createContext<Client | undefined>('client')

export { provideClientContext }

/**
 * injects client context if available, throws error if not
 */
export function useClient(): Client {
  if (!hasInjectionContext()) {
    throw new Error('useClient can only be used inside scopes that support injection context. E.g., components.')
  }

  const client = injectClientContext()

  if (!client) {
    throw new Error('No Client provided. Please provide a client using the `provideClientContext` function.')
  }

  return client
}
