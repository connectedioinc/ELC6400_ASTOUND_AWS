#!/bin/sh
# Get and parse the output of /proc/meminfo into JSON format

memInfoList=""

# Define memory keys to extract
keys="MemTotal MemFree MemAvailable Buffers Cached SwapTotal SwapFree SwapCached Active Inactive Dirty Writeback AnonPages Mapped Shmem SReclaimable SUnreclaim"

# Extract values efficiently with awk
memData=$(awk '
    /^MemTotal:/ {printf "\"a\":\"%d\",", $2 * 1024}
    /^MemFree:/ {printf "\"b\":\"%d\",", $2 * 1024}
    /^MemAvailable:/ {printf "\"c\":\"%d\",", $2 * 1024}
    /^Buffers:/ {printf "\"d\":\"%d\",", $2 * 1024}
    /^Cached:/ {printf "\"e\":\"%d\",", $2 * 1024}
    /^SwapTotal:/ {printf "\"f\":\"%d\",", $2 * 1024}
    /^SwapFree:/ {printf "\"g\":\"%d\",", $2 * 1024}
    /^SwapCached:/ {printf "\"h\":\"%d\",", $2 * 1024}
    /^Active:/ {printf "\"i\":\"%d\",", $2 * 1024}
    /^Inactive:/ {printf "\"j\":\"%d\",", $2 * 1024}
    /^Dirty:/ {printf "\"k\":\"%d\",", $2 * 1024}
    /^Writeback:/ {printf "\"l\":\"%d\",", $2 * 1024}
    /^AnonPages:/ {printf "\"m\":\"%d\",", $2 * 1024}
    /^Mapped:/ {printf "\"n\":\"%d\",", $2 * 1024}
    /^Shmem:/ {printf "\"o\":\"%d\",", $2 * 1024}
    /^SReclaimable:/ {printf "\"p\":\"%d\",", $2 * 1024}
    /^SUnreclaim:/ {printf "\"q\":\"%d\",", $2 * 1024}
' /proc/meminfo)

# Remove trailing comma and format JSON
memInfoList="\"b\":{${memData%,}}"

echo "$memInfoList"


