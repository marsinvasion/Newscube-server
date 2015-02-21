#!/bin/bash
export PATH="$PATH:/home/dev/bin"
source ~/.nvm/nvm.sh
export CONFIG_DIR=/home/dev/node

forever start -al rss.log -o /home/dev/node/rss.out -e /home/dev/node/rss.err /home/dev/node/rss.js
forever start -al express.log -o /home/dev/node/express.out -e /home/dev/node/express.err /home/dev/node/express.js
