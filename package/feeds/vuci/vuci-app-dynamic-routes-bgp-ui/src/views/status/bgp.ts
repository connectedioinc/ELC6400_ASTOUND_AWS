export type BGPStatus = { default: DefaultBGPNeighbor } & {
  [ipAddress: string]: BGPNeighbor
}

export type DefaultBGPNeighbor = {
  routerId: string
  vrfName: string
  vrfId: number
  routes: {
    [ipAddress: string]: RouteInfo[]
  }
}

export type RouteInfo = {
  valid: boolean
  prefixLen: number
  network: string
  origin: string
  nexthops: NextHop[]
  path: string
  peerId: string
  pathFrom: string
  prefix: string
  weight: number
  metric: number
  selectionReason: string
  bestpath: boolean
  version: number
}

export type NextHop = {
  used: boolean
  afi: string
  hostname: string
  ip: string
}

export type BGPNeighbor = {
  remoteRole: string
  localRole: string
  bgpState: string
  bgpTimerConfiguredConditionalAdvertisementsSec: number
  gracefulRestartInfo: {
    endOfRibRecv: [null]
    remoteGrMode: string
    localGrMode: string
    endOfRibSend: [null]
    timers: {
      receivedRestartTimer: number
      configuredRestartTimer: number
    }
    rBit: boolean
    nBit: boolean
  }
  addressFamilyInfo: {
    ipv4Unicast: {
      acceptedPrefixCounter: number
      commAttriSentToNbr: string
      outboundEbgpRequiresPolicy: string
      inboundEbgpRequiresPolicy: string
    }
  }
  extendedOptionalParametersLength: boolean
  minBtwnAdvertisementRunsTimerMsecs: number
  remoteRouterId: string
  bgpTimerLastWrite: number
  lastResetTimerMsecs: number
  portLocal: number
  bgpTimerConfiguredHoldTimeMsecs: number
  bgpTimerUpString: string
  messageStats: {
    updatesRecv: number
    totalSent: number
    capabilityRecv: number
    capabilitySent: number
    routeRefreshRecv: number
    keepalivesSent: number
    depthInq: number
    routeRefreshSent: number
    keepalivesRecv: number
    totalRecv: number
    opensSent: number
    notificationsSent: number
    notificationsRecv: number
    depthOutq: number
    updatesSent: number
    opensRecv: number
  }
  readThread: string
  hostLocal: string
  lastResetCode: number
  nextConnectTimerDueInMsecs: number
  connectRetryTimer: number
  bgpTimerKeepAliveIntervalMsecs: number
  portForeign: number
  hostForeign: string
  bgpTimerLastRead: number
  connectionsEstablished: number
  bgpInUpdateElapsedTimeMsecs: number
  writeThread: string
  bgpTimerConfiguredKeepAliveIntervalMsecs: number
  lastResetDueTo: string
  bgpVersion: number
  bgpTimerHoldTimeMsecs: number
  connectionsDropped: number
  nbrExternalLink: boolean
  localRouterId: string
  externalBgpNbrMaxHopsAway: number
  remoteAs: number
  localAs: number
}
