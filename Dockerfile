FROM node:18-alpine as builder

WORKDIR /usr/src/app

COPY . .

RUN npm install --legacy-peer-deps
RUN npm run build

FROM nginx

COPY --from=builder /usr/src/app/build /usr/share/nginx/html