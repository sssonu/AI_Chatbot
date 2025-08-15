import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { WebSocketLink } from '@apollo/client/link/ws'
import { getMainDefinition } from '@apollo/client/utilities'
import { nhost } from './nhost'

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_HASURA_ENDPOINT,
})

const wsLink = new WebSocketLink({
  uri: import.meta.env.VITE_HASURA_WS_ENDPOINT,
  options: {
    reconnect: true,
    connectionParams: () => ({
      headers: {
        authorization: `Bearer ${nhost.auth.getAccessToken()}`,
      },
    }),
  },
})

const authLink = setContext((_, { headers }) => {
  const token = nhost.auth.getAccessToken()
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  authLink.concat(httpLink)
)

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
})
