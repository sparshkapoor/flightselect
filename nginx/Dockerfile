FROM node:20-alpine AS react-builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/client/package*.json ./packages/client/
RUN npm ci --workspace=packages/shared --workspace=packages/client
COPY packages/shared ./packages/shared
COPY packages/client ./packages/client
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/client

FROM nginx:1.25-alpine
COPY --from=react-builder /app/packages/client/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
