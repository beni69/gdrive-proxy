FROM node:lts-alpine

WORKDIR /app

COPY package*.json .
COPY yarn.lock .

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

EXPOSE 8000
ENV NODE_ENV=production

CMD ["yarn", "start"]
