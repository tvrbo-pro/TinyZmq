FROM mhart/alpine-node:6.9.1

MAINTAINER Jordi Moraleda <jordi@tvrbo.pro>

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD package.json /usr/src/app/package.json

# Native dependencies
RUN apk --update add --no-cache make git g++ python zeromq-dev \
	&& npm install -g nodemon \
	&& npm install --production \
	&& apk del --purge g++ python

ADD . /usr/src/app

CMD nodemon -L -d 2 example.broker.js
#CMD nodemon -L -d 2 example.worker.js
#CMD nodemon -L -d 2 example.client.js
