#!/bin/bash
cd /home/z/my-project
node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 &
echo $! > /tmp/nextjs.pid
wait
