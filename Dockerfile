FROM node:18-alpine as builder

ARG VITE_BACKEND
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

ENV VITE_BACKEND ${VITE_BACKEND}
ENV VITE_KEYCLOAK_URL ${VITE_KEYCLOAK_URL}
ENV VITE_KEYCLOAK_REALM ${VITE_KEYCLOAK_REALM}
ENV VITE_KEYCLOAK_CLIENT_ID ${VITE_KEYCLOAK_CLIENT_ID}

WORKDIR /usr/src/app

COPY . .

RUN npm install --legacy-peer-deps
RUN npm run build

FROM registry.access.redhat.com/ubi7/nginx-120

COPY --from=builder /usr/src/app/build .

ADD ./nginx.conf "${NGINX_CONF_PATH}"

CMD nginx -g "daemon off;"
