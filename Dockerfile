FROM node:lts-alpine

RUN npm i -g pnpm

WORKDIR /app

COPY package.json .
COPY pnpm-lock.yaml .
COPY .npmrc .

RUN pnpm install

COPY . .

RUN pnpm build

EXPOSE 8000
ENV NODE_ENV=production

CMD ["pnpm", "start"]
