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
 > /Users/jrussell/Library/Application\ Support/Firefox/Profiles/tgh6ouel.default/gm_scripts/SAplusplus/SAplusplus.user.js
