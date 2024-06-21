FROM node:18-alpine as builder

ARG REACT_APP_BACKEND

ENV REACT_APP_BACKEND ${REACT_APP_BACKEND}

WORKDIR /usr/src/app

COPY . .

RUN npm install --legacy-peer-deps
RUN npm run build

FROM registry.access.redhat.com/ubi7/nginx-120

COPY --from=builder /usr/src/app/build .

ADD ./nginx.conf "${NGINX_CONF_PATH}"

CMD nginx -g "daemon off;"
