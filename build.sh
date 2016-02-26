#!/bin/bash
cat \
 GreaseMonkeyHeader.txt \
 CHANGELOG.txt \
 util/*.js \
 app/*.js \
 app/nouns/*.js \
 app/pagehandler/*.js \
 vendor/*.js \
 main.js \
 data/*.js \
 > SAplusplus.user.js
