FROM node:20-alpine

# k6 설치
RUN apk add --no-cache curl && \
    curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz && \
    mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/k6 && \
    rm -rf k6-v0.47.0-linux-amd64 && \
    chmod +x /usr/local/bin/k6

WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm ci

# 소스 코드 복사
COPY . .

# Next.js 빌드
RUN npm run build

# 포트 노출
EXPOSE 3000

# 앱 실행
CMD ["npm", "start"]

