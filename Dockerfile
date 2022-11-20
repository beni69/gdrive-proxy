FROM --platform=$BUILDPLATFORM rust as builder
ARG TARGETARCH
WORKDIR /src
RUN echo `case $TARGETARCH in amd64) printf "x86_64-unknown-linux-gnu";; arm64) printf "aarch64-unknown-linux-gnu";; esac` | tee /target.txt && \
    rustup target add `cat /target.txt` && \
    cargo init --bin
COPY Cargo.toml Cargo.lock ./
RUN cargo build --release --verbose --target `cat /target.txt` && \
    rm -rf src
COPY src/ ./src
RUN rm -rf ./target/release/deps/auth-manager* && \
    cargo build --release --verbose --target `cat /target.txt` && \
    cp ./target/`cat /target.txt`/release/auth-manager /auth-manager

FROM docker.io/openresty/openresty:bullseye-fat as final
ARG TARGETARCH
WORKDIR /tmp
RUN opm get jprjr/lua-resty-exec && \
    ARCH=`case $TARGETARCH in amd64) printf "x86_64";; arm64) printf "aarch64";; esac` && \
    curl -Lo sockexec.tar.gz "https://github.com/jprjr/sockexec/releases/download/3.1.1/sockexec-$ARCH-linux-musl.tar.gz" && \
    tar xvf sockexec.tar.gz --directory /usr

WORKDIR /app
COPY --from=builder /auth-manager .
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf

COPY entry.sh .
CMD ["/app/entry.sh"]
