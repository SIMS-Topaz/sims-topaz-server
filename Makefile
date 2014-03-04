start:
	forever start topaz-server.js

stop:
	forever stop topaz-server.js

restart: stop start

test:
	export NODE_ENV=test; mocha -u bdd -R spec

install:
	npm install; npm install mocha forever -g

.PHONY: test
