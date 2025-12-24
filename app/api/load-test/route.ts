import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

// k6 실행 파일 경로 찾기
async function findK6Path(): Promise<string> {
  const isWindows = process.platform === 'win32'
  const k6Command = isWindows ? 'k6.exe' : 'k6'
  
  try {
    // 먼저 PATH에서 k6 찾기 시도 (Windows에서는 where.exe 사용)
    const command = isWindows ? 'where.exe k6.exe' : 'which k6'
    const { stdout } = await execAsync(command, {
      timeout: 5000,
    })
    const k6Path = stdout.trim().split('\r\n')[0].split('\n')[0]
    if (k6Path && existsSync(k6Path)) {
      return k6Path
    }
  } catch (e) {
    // PATH에서 찾지 못함, 계속 진행
  }
  
  // 기본 경로들 시도
  const commonPaths = isWindows
    ? [
        'C:\\Program Files\\k6\\k6.exe',
        'C:\\Program Files (x86)\\k6\\k6.exe',
        join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'k6', 'k6.exe'),
        join(process.env.LOCALAPPDATA || '', 'Programs', 'k6', 'k6.exe'),
      ]
    : ['/usr/local/bin/k6', '/usr/bin/k6', '/opt/k6/k6']
  
  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path
    }
  }
  
  // 마지막으로 k6 명령어 그대로 시도 (PATH에 있을 수 있음)
  // 실제로 실행 가능한지 확인
  try {
    await execAsync(`"${k6Command}" version`, {
      timeout: 5000,
    })
    return k6Command
  } catch (e) {
    // 실행 불가능
    throw new Error('k6를 찾을 수 없습니다. PATH에 k6가 있는지 확인하거나 Docker를 사용해주세요.')
  }
}

interface LoadTestConfig {
  targetUrl: string
  virtualUsers: number
  duration: string
  method: string
  callType: 'simultaneous' | 'gradual'
  rampUp?: string
  headers?: string
  body?: string
}

async function generateK6Script(config: LoadTestConfig): Promise<{ path: string; content: string }> {
  const scriptDir = join(process.cwd(), 'k6-scripts')
  
  // k6-scripts 디렉토리가 없으면 생성
  if (!existsSync(scriptDir)) {
    await mkdir(scriptDir, { recursive: true })
  }

  const scriptId = `test_${Date.now()}.js`
  const scriptPath = join(scriptDir, scriptId)

  // 헤더 파싱
  let headersObj: Record<string, string> = {}
  if (config.headers) {
    try {
      headersObj = JSON.parse(config.headers)
    } catch (e) {
      throw new Error('헤더 형식이 올바르지 않습니다. JSON 형식이어야 합니다.')
    }
  }

  // 본문 파싱
  let bodyContent = ''
  let bodyObject = null
  if (config.body) {
    try {
      // JSON 유효성 검사 및 객체로 변환
      bodyObject = JSON.parse(config.body)
      // k6 스크립트에 객체로 삽입 (JSON.stringify로 감싸서 문자열로 변환)
      // k6 스크립트에서 payload는 객체가 되고, JSON.stringify(payload)로 올바르게 변환됨
      bodyContent = JSON.stringify(bodyObject)
    } catch (e) {
      throw new Error('요청 본문 형식이 올바르지 않습니다. JSON 형식이어야 합니다.')
    }
  }

  // k6 스크립트 생성
  // 호출 방식에 따라 다른 stages 설정
  let stagesConfig = ''
  
  if (config.callType === 'simultaneous') {
    // 동시 호출: 매우 짧은 ramp-up 후 지정된 VU 수 유지
    stagesConfig = `
  stages: [
    { duration: '1s', target: ${config.virtualUsers} }, // 1초 내에 모든 가상 사용자 시작
    { duration: '${config.duration}', target: ${config.virtualUsers} }, // 지정된 시간 동안 동시 호출 유지
  ],`
  } else {
    // 점진적 호출: ramp-up 시간에 걸쳐 점진적으로 증가
    const rampUpTime = config.rampUp || '10s'
    stagesConfig = `
  stages: [
    { duration: '${rampUpTime}', target: ${config.virtualUsers} }, // 점진적으로 가상 사용자 증가
    { duration: '${config.duration}', target: ${config.virtualUsers} }, // 지정된 시간 동안 유지
  ],`
  }

  // k6 스크립트 템플릿 생성
  // 이 스크립트는 부하테스트 실행을 위한 k6 스크립트입니다
  const k6Script = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 커스텀 메트릭: 에러율을 추적하기 위한 Rate 메트릭 생성
const errorRate = new Rate('errors');

// k6 테스트 옵션 설정
export const options = {${stagesConfig}
  // 성능 임계값(thresholds) 설정: 테스트가 실패로 간주되는 조건 정의
  thresholds: {
    // http_req_duration: HTTP 요청 지속 시간 임계값
    // p(95)<2000: 95번째 백분위수의 응답 시간이 2000ms(2초) 미만이어야 함
    http_req_duration: ['p(95)<2000'], // 95%의 요청이 2초 이내
    // http_req_failed: HTTP 요청 실패율 임계값
    // rate<0.1: 실패율이 10% 미만이어야 함 (0.1 = 10%)
    http_req_failed: ['rate<0.1'], // 에러율 10% 미만
    // errors: 커스텀 에러 메트릭 임계값
    // rate<0.1: 커스텀 에러율이 10% 미만이어야 함
    errors: ['rate<0.1'],
  },
};

// k6 테스트의 메인 함수: 각 가상 사용자가 실행하는 함수
export default function () {
  const url = '${config.targetUrl}';
  
  // HTTP 요청 파라미터 설정
  const params = {
    headers: ${JSON.stringify(headersObj, null, 2)},
  };

  // 요청 본문(body) 설정: POST, PUT, PATCH, DELETE 메서드에서 사용
  // bodyContent가 있는 경우에만 payload 변수 생성
  // JSON.parse를 사용하여 JSON 문자열을 JavaScript 객체로 변환
  ${bodyContent ? `const payload = JSON.parse(${JSON.stringify(bodyContent)});` : ''}

  // HTTP 응답을 저장할 변수
  let response;
  
  // HTTP 메서드에 따라 적절한 요청 함수 호출
  ${config.method === 'GET' 
    ? `
    response = http.get(url, params);`
    : config.method === 'POST'
    ? `
    response = http.post(url, ${bodyContent ? 'JSON.stringify(payload)' : 'null'}, params);`
    : config.method === 'PUT'
    ? `
    response = http.put(url, ${bodyContent ? 'JSON.stringify(payload)' : 'null'}, params);`
    : config.method === 'PATCH'
    ? `
    response = http.patch(url, ${bodyContent ? 'JSON.stringify(payload)' : 'null'}, params);`
    : `
    response = http.del(url, ${bodyContent ? 'JSON.stringify(payload)' : 'null'}, params);`
  }

  // 응답 검증: check 함수를 사용하여 응답이 기대한 조건을 만족하는지 확인
  const success = check(response, {
    // 'status is 200-299': HTTP 상태 코드가 2xx 범위인지 확인 (성공 응답)
    'status is 200-299': (r) => r.status >= 200 && r.status < 300,
    // 'response time < 2000ms': 응답 시간이 2초 미만인지 확인
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // 커스텀 에러 메트릭 업데이트: 검증 실패 시 에러율 증가
  // success가 false이면 에러로 기록됨
  errorRate.add(!success);
  
  // 각 가상 사용자가 응답을 받은 후 즉시 다음 요청을 보냄
  // sleep이 없으면 가상 사용자는 응답을 받는 즉시 다음 반복을 시작합니다
}
`

  await writeFile(scriptPath, k6Script, 'utf-8')
  return { path: scriptPath, content: k6Script.trim() }
}

async function runK6Test(scriptPath: string): Promise<{ summary: string; metrics: any; rawOutput: string }> {
  try {
    // k6 경로 찾기
    let k6Path: string
    try {
      k6Path = await findK6Path()
    } catch (e: any) {
      throw new Error(`k6를 찾을 수 없습니다: ${e.message}\n\nk6가 설치되어 있고 PATH에 포함되어 있는지 확인해주세요.`)
    }
    
    // 스크립트 경로를 따옴표로 감싸서 공백이나 특수문자 처리
    const escapedScriptPath = scriptPath.includes(' ') ? `"${scriptPath}"` : scriptPath
    
    // k6 실행 명령어 구성
    const command = k6Path.includes(' ') 
      ? `"${k6Path}" run ${escapedScriptPath}`
      : `${k6Path} run ${escapedScriptPath}`
    
    // k6 실행
    const { stdout, stderr } = await execAsync(
      command,
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 600000, // 10분 타임아웃
      }
    )

    // 출력에서 메트릭 추출 시도
    let metrics: any = {}
    const output = stdout + stderr

    // k6 출력에서 주요 메트릭 추출
    const metricPatterns = {
      http_reqs: /http_reqs[:\s]+(\d+)/,
      http_req_duration: /http_req_duration[:\s]+avg=([\d.]+)ms\s+min=([\d.]+)ms\s+med=([\d.]+)ms\s+max=([\d.]+)ms\s+p\(95\)=([\d.]+)ms/,
      http_req_failed: /http_req_failed[:\s]+([\d.]+)%/,
      iteration_duration: /iteration_duration[:\s]+avg=([\d.]+)ms/,
      vus: /vus[:\s]+(\d+)/,
      vus_max: /vus_max[:\s]+(\d+)/,
    }

    try {
      const httpReqsMatch = output.match(metricPatterns.http_reqs)
      if (httpReqsMatch) metrics.http_reqs = parseInt(httpReqsMatch[1])

      const durationMatch = output.match(metricPatterns.http_req_duration)
      if (durationMatch) {
        metrics.http_req_duration = {
          avg: parseFloat(durationMatch[1]),
          min: parseFloat(durationMatch[2]),
          med: parseFloat(durationMatch[3]),
          max: parseFloat(durationMatch[4]),
          p95: parseFloat(durationMatch[5]),
        }
      }

      const failedMatch = output.match(metricPatterns.http_req_failed)
      if (failedMatch) metrics.http_req_failed = parseFloat(failedMatch[1])

      const vusMatch = output.match(metricPatterns.vus)
      if (vusMatch) metrics.vus = parseInt(vusMatch[1])

      const vusMaxMatch = output.match(metricPatterns.vus_max)
      if (vusMaxMatch) metrics.vus_max = parseInt(vusMaxMatch[1])
    } catch (e) {
      // 메트릭 파싱 실패 시 무시
      console.warn('Failed to parse metrics:', e)
    }

    return {
      summary: output || '테스트가 완료되었습니다.',
      metrics,
      rawOutput: output,
    }
  } catch (error: any) {
    // k6가 설치되어 있지 않거나 실행 오류
    if (error.code === 'ENOENT' || error.message.includes('k6') || error.message.includes('not found')) {
      const errorMessage = `k6를 찾을 수 없습니다. 
      
다음 중 하나를 확인해주세요:
1. k6가 설치되어 있는지 확인: https://k6.io/docs/getting-started/installation/
2. k6가 PATH 환경 변수에 포함되어 있는지 확인
3. Windows의 경우: k6.exe가 PATH에 있는지 확인
4. Docker를 사용하여 실행하는 것을 권장합니다: docker-compose up

상세 오류: ${error.message}`
      throw new Error(errorMessage)
    }
    
    // 다른 실행 오류
    throw new Error(`k6 실행 중 오류가 발생했습니다: ${error.message}\n${error.stderr || ''}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const config: LoadTestConfig = await request.json()

    // 입력 검증
    if (!config.targetUrl || !config.virtualUsers || !config.duration || !config.callType) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 점진적 호출인 경우 rampUp 시간 검증
    if (config.callType === 'gradual' && !config.rampUp) {
      return NextResponse.json(
        { error: '점진적 호출의 경우 Ramp-up 시간이 필요합니다.' },
        { status: 400 }
      )
    }

    // k6 스크립트 생성
    const { path: scriptPath, content: scriptContent } = await generateK6Script(config)

    // k6 테스트 실행
    const results = await runK6Test(scriptPath)

    // 스크립트 내용을 결과에 포함
    return NextResponse.json({
      ...results,
      script: scriptContent,
    })
  } catch (error: any) {
    console.error('Load test error:', error)
    return NextResponse.json(
      { error: error.message || '부하테스트 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

