# Author: Radinet & Toan Pham
########################################################################

LOCKFILE=/tmp/modem.lock
LOCKCOUNTER=/tmp/modem.lock.counter

if [ $# -eq 1  ]; then
   #echo Usage: $0 \"AT command\" 
   # echo Error
    	modem="/dev/ttyUSB3"
    

   # exit 1
elif [ $# -eq 2  ]; then
	modem=$2
else
    	echo Error
	exit 1
	
fi

modem1="/dev/ttyACM0"


if [ -f $modem ]; then
  rm $modem 
  mknod $modem c 166 0
fi

if [ ! -c $modem ] && [ -c $modem1 ]; then 
  mknod $modem c 166 0
fi

#check if modem is connected
#check for LT1001 and LT1000

if [ ! -c $modem ]; then
  modem="/dev/ttyUSB2"
  if [ ! -c $modem ]; then
    if [ -f $modem ]; then
	rm $modem 
	mknod /dev/ttyUSB2 c 188 2
    fi
    echo "No modem detected"
    exit 1
  fi
fi

# Exclusive lock
if [ -e ${LOCKFILE} ]; then
#if [ -e ${LOCKFILE} ] && kill -0 `cat ${LOCKFILE}`; then
    [ -f $LOCKCOUNTER ] || echo 0 > $LOCKCOUNTER
    counter=$(cat $LOCKCOUNTER)
    counter=$((counter+1))
    echo $counter > $LOCKCOUNTER
    if [ $counter -gt 20 ]; then
	# Stale lock, can be left by kill or term signal
	rm -f $LOCKFILE &> /dev/null
	echo 0 > $LOCKCOUNTER
    fi;
    echo "Try Again"
    exit 1 
else
    echo 0 > $LOCKCOUNTER
fi


# make sure the lockfile is removed when we exit and then claim it
trap "rm -f ${LOCKFILE} &> /dev/null; exit" STOP KILL HUP INT TERM EXIT
echo $$ > ${LOCKFILE}

s=`/usr/sbin/chat -V -t2 '' $1 OK '' 2>&1 > $modem < $modem` 

if [ -z "$s" ]; then
  echo "Failed to execute command"
  exit 1
fi

#s=${s%%OK}
s=${s##*$1}
#echo $s  | cut -d' ' -f2- 
echo $s  | cut -d' ' -f1-

# Remove modem lock
rm -f ${LOCKFILE}


[ "$s" == "ERROR" ] && exit 1
[ -z "${s#*ERROR}" ] && exit 1
exit 0
