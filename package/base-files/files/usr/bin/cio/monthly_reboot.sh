#!/bin/sh

DELAY=$(awk 'BEGIN{srand(); print int(rand()*3600)}')

logger "Monthly reboot scheduled. Sleeping for $DELAY seconds..."
sleep $DELAY

logger "Executing monthly scheduled reboot now."
reboot -f
