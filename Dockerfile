FROM mhart/alpine-node:6.9.1

MAINTAINER Jordi Moraleda <jordi@tvrbo.pro>

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Native dependencies
RUN apk --update add --no-cache make git g++ python zeromq-dev \
	&& npm install -g nodemon \
	&& git clone https://github.com/TvrboPro/TinyZmq.git . \
	&& npm install --production \
	&& apk del --purge g++ python


# uncomment the appropriate command below

CMD nodemon -L -d 1 example.broker.js
#CMD nodemon -L -d 1 example.worker.js
#CMD nodemon -L -d 1 example.client.js
