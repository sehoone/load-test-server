# API 부하테스트 서버

k6를 사용한 API 부하테스트 서버

## 기능

- 웹 기반 부하테스트 인터페이스
- 가상 사용자 수 설정
- 테스트 지속 시간 설정
- 다양한 HTTP 메서드 지원 (GET, POST, PUT, PATCH, DELETE)
- 커스텀 HTTP 헤더 및 요청 본문 설정
- 실시간 테스트 결과 확인

## 요구사항

- Docker
- Docker Compose

## 실행 방법

### Docker Compose 사용

```bash
# 서버 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d --build

# 서버 중지
docker-compose down
```

서버가 실행되면 브라우저에서 `http://localhost:3000`에 접속하세요.

## 사용 방법

1. **타겟 URL 입력**: 부하테스트를 실행할 API 엔드포인트 URL을 입력합니다.
2. **HTTP 메서드 선택**: GET, POST, PUT, PATCH, DELETE 중 선택합니다.
3. **가상 사용자 수 설정**: 동시에 요청을 보낼 가상 사용자 수를 설정합니다.
4. **테스트 지속 시간 설정**: 테스트가 실행될 시간을 설정합니다 (예: 30s, 1m, 5m30s).
5. **HTTP 헤더 설정** (선택사항): JSON 형식으로 헤더를 입력합니다.
   ```json
   {
     "Content-Type": "application/json",
     "Authorization": "Bearer your-token"
   }
   ```
6. **요청 본문 설정** (선택사항): POST, PUT, PATCH, DELETE 메서드의 경우 JSON 형식으로 본문을 입력합니다.
7. **부하테스트 시작** 버튼을 클릭하여 테스트를 실행합니다.

## 테스트 결과

테스트가 완료되면 다음 정보를 확인할 수 있습니다:

- 요청 통계 (요청 수, 성공/실패율)
- 응답 시간 (평균, 최소, 최대, 95th percentile)
- 에러율
- 상세 출력 로그

## 기술 스택

- **Frontend/Backend**: Next.js 14 (App Router)
- **Load Testing**: k6
- **Containerization**: Docker, Docker Compose
- **Language**: TypeScript

## 주의사항

- 부하테스트는 대상 서버에 부하를 주므로, 테스트 전에 대상 서버의 허용 용량을 확인하세요.
- k6 스크립트는 `/k6-scripts` 디렉토리에 생성됩니다.
- 테스트 실행 중에는 브라우저를 닫지 마세요.

## 개발 모드

로컬에서 개발하려면:

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

단, 로컬 개발 시 k6가 설치되어 있어야 합니다. k6 설치 방법은 [k6 공식 문서](https://k6.io/docs/getting-started/installation/)를 참고
