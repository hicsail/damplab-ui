FROM node:18-alpine as builder

ARG REACT_APP_BACKEND
ARG REACT_APP_ADMIN_USERNAME
ARG REACT_APP_ADMIN_PASSWORD
ARG REACT_APP_CLIENT_USERNAME
ARG REACT_APP_CLIENT_PASSWORD

ENV REACT_APP_BACKEND ${REACT_APP_BACKEND}
ENV REACT_APP_ADMIN_USERNAME ${REACT_APP_ADMIN_USERNAME}
ENV REACT_APP_ADMIN_PASSWORD ${REACT_APP_ADMIN_PASSWORD}
ENV REACT_APP_CLIENT_USERNAME ${REACT_APP_CLIENT_USERNAME}
ENV REACT_APP_CLIENT_PASSWORD ${REACT_APP_CLIENT_PASSWORD}

WORKDIR /usr/src/app

COPY . .

RUN npm install --legacy-peer-deps
RUN npm run build

FROM registry.access.redhat.com/ubi7/nginx-120

COPY --from=builder /usr/src/app/build .

ADD ./nginx.conf "${NGINX_CONF_PATH}"

CMD nginx -g "daemon off;"
