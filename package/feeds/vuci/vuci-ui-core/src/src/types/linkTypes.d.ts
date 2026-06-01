import type { RoutePath } from '@root/vuci-menu'

export type RoutePathWithHash = `${RoutePath}#${string}`

export type GeneralRoutePath = RoutePath | InternalLinkWithHash
