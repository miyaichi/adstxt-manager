FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install necessary libraries for Alpine
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    && npm install \
    && apk del .build-deps

# 開発環境ではvolumesでマウントするため不要
# 本番環境用にはコメントを外す
# COPY . .
# RUN npm run build

EXPOSE 4000

# CMD will be overridden by docker-compose.yml
CMD ["npm", "start"]