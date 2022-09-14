FROM node:lts as pkg
RUN npm i -g pnpm pkg
WORKDIR /src
# deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
# code
COPY auth.ts .
RUN pnpm tsc auth.ts --esModuleInterop && pnpm exec pkg auth.js -o auth-manager

FROM docker.io/openresty/openresty as final
ENV DEBIAN_FRONTEND=noninteractive
# install node & pnpm
RUN apt update && \
    apt upgrade -y --no-install-recommends && \
    apt install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt install -y nodejs && \
    npm install -g pnpm
WORKDIR /app
COPY --from=pkg /src/auth-manager .
