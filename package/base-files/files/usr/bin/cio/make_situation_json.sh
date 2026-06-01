#!/bin/sh
# make_situation_json.sh — build a single-line, JSON-escaped situation report
LIVE_ADDR="$1"
BETA_ADDR="$2"
IMEI="$(gsmctl -i 2>/dev/null || echo unknown)"
SERIAL="$(mnf_info -s)"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
LOGFILE="/overlay/cioClient.log"
# Build info (make the grep/sed robust even if the line is missing)
BUILD="$(/usr/bin/build 2>/dev/null | sed -n 's/^Base OS Version  :[[:space:]]*//p')"

ROUTE=$( (route -n 2>/dev/null || ip route) | sed -n '3p' | tr -d '"' | tr -s ' ' )
UPTIME="$(uptime 2>/dev/null)"
NETSTAT="$(netstat -nt 2>/dev/null | grep 'ESTABLISHED' | head -n 2 | awk '{print $4"->"$5}' | tr '\n' ';' | tr -d '"')"
# Figure out SIM status by trying several commands
SIM_STATUS=""
SIM_RAW="$(gsmctl -z 2>/dev/null)"
NET_STATE="$(gsmctl -g 2>/dev/null)"
case "$SIM_RAW" in
  Inserted|*READY*|*ready*)
    case "$NET_STATE" in
      Registered,\ home|Registered,\ roaming)
        SIM_STATUS="active"
        ;;
      *registered*|*Searching*|*searching*|*Denied*)
        SIM_STATUS="inserted"
        ;;
      *)
        SIM_STATUS="inserted"
        ;;
    esac
    ;;
  *ABSENT*|*not\ inserted*|*MISSING*|*missing*)
    SIM_STATUS="missing"
    ;;
  *PIN*|*PUK*|*LOCK*|*locked*)
    SIM_STATUS="locked"
    ;;
  ""|unknown)
    SIM_STATUS="unknown"
    ;;
  *)
    SIM_STATUS="unknown"
    ;;
esac


# Determine MQTT connection state
MQTT_CONN="disconnected"
if netstat -tnp 2>/dev/null | grep -q cioClient; then
    if [ -n "$LIVE_ADDR" ] && netstat -tnp 2>/dev/null | grep -q "$LIVE_ADDR"; then
        BROKER="live"                       
    elif [ -n "$BETA_ADDR" ] && netstat -tnp 2>/dev/null | grep -q "$BETA_ADDR"; then
        BROKER="beta"            
    else                                          
        BROKER="unknown"                                                           
    fi                                                                             
                                                                                     
    if [ -f "$LOGFILE" ]; then                                                       
        if find $LOGFILE -mmin -5 | grep -q .; then
                MQTT_CONN="connected-$BROKER"
        else            
            MQTT_CONN="dormant-$BROKER"
        fi                    
    else                                                         
        MQTT_CONN="dormant-$BROKER"                              
    fi                                       
fi  

BUILD_ESC=$(printf '%s' "$BUILD" )
ROUTE_ESC=$(printf '%s' "$ROUTE" )
UPTIME_ESC=$(printf '%s' "$UPTIME" )
NET_ESC=$(printf   '%s' "$NETSTAT" )
SIM_ESC=$(printf   '%s' "$SIM_STATUS" )
MQTT_CONN_ESC=$(printf   '%s' "$MQTT_CONN" )

printf '{ "imei":"%s","serial":"%s","timestamp":"%s","build":"%s","route":"%s","uptime":"%s","netstat":"%s","sim_status":"%s","mqtt_conn":"%s" }\n' \
  "$IMEI" "$SERIAL" "$TS" "$BUILD_ESC" "$ROUTE_ESC" "$UPTIME_ESC" "$NET_ESC" "$SIM_ESC" "$MQTT_CONN_ESC"
