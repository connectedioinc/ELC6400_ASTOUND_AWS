#!/bin/sh

SERVICE="cioClient"
INIT="/etc/init.d/$SERVICE"
TAG="random-restart-$SERVICE"
# Generate random delay (0–3599)
DELAY="$(awk 'BEGIN{srand(); print int(rand()*3600)}')"
# Fallback safety
case "$DELAY" in
    ''|*[!0-9]*) DELAY=10 ;;
esac
# Clamp value
[ "$DELAY" -gt 3599 ] && DELAY=3599
logger -t "$TAG" "Daily restart scheduled. Sleeping ${DELAY}s"
sleep "$DELAY"
if [ -x "$INIT" ]; then
    "$INIT" restart
    logger -t "$TAG" "$SERVICE restarted after ${DELAY}s delay"
else
    logger -t "$TAG" "ERROR: $INIT not found"
fi
