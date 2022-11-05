FROM node:lts as pkg
RUN npm i -g pnpm pkg
WORKDIR /src
# deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
# code
COPY auth.ts .
RUN pnpm exec tsc auth.ts --esModuleInterop && pnpm exec pkg auth.js -o auth-manager

FROM docker.io/openresty/openresty:bullseye-fat as final
# ENV DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
WORKDIR /tmp
RUN opm get jprjr/lua-resty-exec && \
    ARCH=`case $TARGETARCH in amd64) printf "x86_64";; arm64) printf "aarch64";; esac` && \
    curl -Lo sockexec.tar.gz "https://github.com/jprjr/sockexec/releases/download/3.1.1/sockexec-$ARCH-linux-musl.tar.gz" && \
    tar xvf sockexec.tar.gz --directory /usr

WORKDIR /app
COPY --from=pkg /src/auth-manager .
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf

COPY entry.sh .
CMD ["/app/entry.sh"]
