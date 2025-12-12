FROM node:22 AS build

ARG VITE_BACKEND
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

ENV VITE_BACKEND=${VITE_BACKEND}
ENV VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}
ENV VITE_KEYCLOAK_REALM=${VITE_KEYCLOAK_REALM}
ENV VITE_KEYCLOAK_CLIENT_ID=${VITE_KEYCLOAK_CLIENT_ID}

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build


FROM nginx:1.28

COPY nginx-http-server.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/build/client /usr/share/nginx/html
RUN mkdir -p /var/cache/nginx/client_temp \
  && chown -R nginx:nginx /var/cache/nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
