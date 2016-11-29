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


# Running

ARG target=broker
ENV TARGET=${target}

ARG broker_ip=172.17.0.2
ENV BROKER_IP=${broker_ip}

# Uncoment below to disable verbose output
# ENV TINY_ZMQ_DEBUG=

CMD nodemon -L -d 1 example.${TARGET}.js
