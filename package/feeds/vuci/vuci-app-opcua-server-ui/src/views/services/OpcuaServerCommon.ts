import type { TagType } from '@/types/tagTypes'

export interface ServerNodeConfig {
  id: string
  enabled?: '1' | '0'
  name?: string
  source?: string
  source_value_id?: string
  source_value_type?: TagType
  node_id?: string
  node_id_type?: 'numeric' | 'string' | 'guid' | 'bytestring'

  io_name?: string
  io_type?: string
  '.type': 'server_node'
}
