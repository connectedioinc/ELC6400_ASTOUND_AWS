#!/bin/sh

# Function to generate a random number between MIN and MAX
generate_random_number() {
  MIN=$1
  MAX=$2
  RANGE=$((MAX - MIN + 1))
  RANDOM_NUMBER=$(hexdump -n 4 -e '/4 "%u"' /dev/urandom)
  RANDOM_NUMBER=$((RANDOM_NUMBER % RANGE + MIN))
  echo $RANDOM_NUMBER
}

# Generate the random minute (10-59)
MIN=10
MAX=59
minute=$(generate_random_number $MIN $MAX)
reboot_time="4:$minute"

uci set periodic_reboot.@reboot_instance[0].time="$reboot_time"
uci commit periodic_reboot
/etc/init.d/periodic_reboot restart

