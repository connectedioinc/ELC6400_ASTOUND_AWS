interface StarlinkAlerts {
  motorsStuck?: boolean
  thermalShutdown?: boolean
  thermalThrottle?: boolean
  unexpectedLocation?: boolean
  mastNotNearVertical?: boolean
  slowEthernetSpeeds?: boolean
  roaming?: boolean
  installPending?: boolean
  isHeating?: boolean
  powerSupplyThermalThrottle?: boolean
  isPowerSaveIdle?: boolean
  movingWhileNotMobile?: boolean
  dbfTelemStale?: boolean
  movingTooFastForPolicy?: boolean
  lowMotorCurrent?: boolean
  lowerSignalThanPredicted?: boolean
  slowEthernetSpeeds100mbps?: boolean
  obstructionMapReset?: boolean
}

export interface StarlinkDishStatus {
  id: string
  hardware_version: string
  software_version: string
  fraction_obstructed?: number
  currently_obstructed?: boolean
  boresight_azimuth_deg?: number
  boresight_elevation_deg?: number
  uplink_throughput: number
  downlink_throughput: number
  pop_ping_latency: number
  pop_ping_drop_rate?: number
  mobility_class?: 'mobile' | 'nomadic' | 'stationary'
  alerts: StarlinkAlerts
}
