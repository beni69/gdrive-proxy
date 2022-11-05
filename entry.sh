#!/bin/sh
set -e

useradd www-data 2>/dev/null || true
chown -R www-data:www-data /app

su www-data -s /bin/sh -c "sockexec /tmp/exec.sock" &

./auth-manager refresh &

su root -c "openresty -g 'daemon off; user www-data www-data;'"
