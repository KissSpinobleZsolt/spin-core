FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

# In Docker the nginx reverse proxy handles /api, so a relative base URL works.
# Override at build time: docker build --build-arg VITE_API_BASE_URL=http://... if needed.
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_MOCK=false
ARG VITE_CHATBOT_REMOTE_URL=http://localhost:3002/remoteEntry.js
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_CHATBOT_REMOTE_URL=$VITE_CHATBOT_REMOTE_URL

RUN pnpm build

# --- serve stage ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
