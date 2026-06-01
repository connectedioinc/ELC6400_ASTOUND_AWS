export interface ContainerData {
  image: string
  name: string
  status_code: number
  id: string
  interactive: boolean
  tty: boolean
  image_id: string
  privileged: boolean
  networks: string[]
  env: string[]
  publish: string[]
  max_retry_count: string
  host_config: {
    privileged: boolean
    network_mode: string
    port_bindings: {
      [key: string]: {
        host_ip: string
        host_port: string
      }[]
    }
    restart_policy: {
      name: string
      maximum_retry_count: number
    }
  }
  config: {
    open_stdin: boolean
    tty: boolean
    env: string[]
  }
  restart: string
  command: string
}

export interface ImageData {
  id: string
  status_code: number
  pull: 'docker' | 'server' | 'local'
  from_image: string
  from_src: string
  image_path: File
  created: number
  repo: string
  size: number
  message: string
  changes: string[]
  repo_tags: string[]
}
