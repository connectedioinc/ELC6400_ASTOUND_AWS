export type TableConfig = {
  '.type': 'table'
  id: string
  name: string
  table_id: string
}

export type RuleConfig = {
  '.type': 'rule'
  id: string
  priority: string
  in: string
  out: string
  src: string
  dest: string
  tos: string
  mark: string
  invert: string
  action_group: string
  lookup: string
  goto: string
  action: string
}

export type RouteConfig = {
  '.type': 'route'
  id: string
  interface: string
  target: string
  netmask: string
  gateway: string
  metric: string
  mtu: string
  type: string
  table: string
}
