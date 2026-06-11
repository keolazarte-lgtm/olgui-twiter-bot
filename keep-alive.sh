#!/bin/bash
while true; do
  cd /home/z/my-project
  node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 2>&1 | tee -a /tmp/next-alive.log
  echo "Server died at $(date), restarting in 3s..." >> /tmp/next-alive.log
  sleep 3
done
