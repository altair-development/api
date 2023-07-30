#!/bin/bash
# check-head(commit-id)
CID0=`git log --pretty=format:"%H"|head -n 1`
echo $CID0
CID1=`git ls-remote origin HEAD|awk '{print $1}'`
echo $CID1

if [ $CID0 != $CID1 ]; then
	echo "change on the remote. Restart app.js.";
	git pull origin master;
	npm install;
	#pkill -f ^node;
	#NODE_ENV=staging node app &
fi