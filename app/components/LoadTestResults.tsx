'use client'

import { useState } from 'react'

interface LoadTestResultsProps {
  results: {
    summary?: string
    metrics?: any
    rawOutput?: string
    script?: string
  }
}

const metricDescriptions = [
  {
    name: 'http_reqs',
    title: 'http_reqs (총 HTTP 요청 수)',
    description: '테스트 중에 전송된 총 HTTP 요청의 개수입니다. 성공과 실패를 모두 포함합니다.',
  },
  {
    name: 'http_req_duration',
    title: 'http_req_duration (HTTP 요청 지속 시간)',
    description: 'HTTP 요청이 완료되는 데 걸린 시간입니다. avg(평균), min(최소), med(중간값), max(최대), p95(95번째 백분위수) 등의 통계를 포함합니다.',
  },
  {
    name: 'http_req_failed',
    title: 'http_req_failed (HTTP 요청 실패율)',
    description: '실패한 HTTP 요청의 비율입니다. 4xx, 5xx 응답 코드 또는 네트워크 오류가 발생한 요청을 포함합니다.',
  },
  {
    name: 'checks',
    title: 'checks (체크 결과)',
    description: '테스트 중 실행된 체크의 결과입니다. checks_total(총 체크 수), checks_passed(성공한 체크 수), checks_failed(실패한 체크 수)를 포함합니다.',
  },
  {
    name: 'checks_total',
    title: 'checks_total (총 체크 수)',
    description: '테스트 중 실행된 모든 체크의 총 개수입니다. check() 함수로 검증한 모든 항목을 포함합니다.',
  },
  {
    name: 'checks_passed',
    title: 'checks_passed (성공한 체크 수)',
    description: '성공적으로 통과한 체크의 개수입니다. 조건이 true로 평가된 체크를 의미합니다.',
  },
  {
    name: 'checks_failed',
    title: 'checks_failed (실패한 체크 수)',
    description: '실패한 체크의 개수입니다. 조건이 false로 평가되거나 오류가 발생한 체크를 의미합니다.',
  },
  {
    name: 'vus',
    title: 'vus (현재 가상 사용자 수)',
    description: '현재 실행 중인 가상 사용자(Virtual Users)의 수입니다. 테스트 중 동적으로 변경될 수 있습니다.',
  },
  {
    name: 'vus_max',
    title: 'vus_max (최대 가상 사용자 수)',
    description: '테스트 중 동시에 실행된 최대 가상 사용자 수입니다.',
  },
  {
    name: 'iteration_duration',
    title: 'iteration_duration (반복 지속 시간)',
    description: '한 번의 반복(iteration)이 완료되는 데 걸린 시간입니다. default 함수가 한 번 실행되는 데 걸린 시간을 의미합니다.',
  },
  {
    name: 'data_received',
    title: 'data_received (수신한 데이터 양)',
    description: '서버로부터 수신한 총 데이터 양입니다. 바이트 단위로 표시됩니다.',
  },
  {
    name: 'data_sent',
    title: 'data_sent (전송한 데이터 양)',
    description: '서버로 전송한 총 데이터 양입니다. 요청 본문과 헤더를 포함하여 바이트 단위로 표시됩니다.',
  },
  {
    name: 'iterations',
    title: 'iterations (반복 횟수)',
    description: '테스트 중 실행된 총 반복(iteration) 횟수입니다. 각 가상 사용자가 default 함수를 실행한 횟수의 합계입니다.',
  },
  {
    name: 'http_req_waiting',
    title: 'http_req_waiting (HTTP 요청 대기 시간)',
    description: '서버로부터 첫 번째 바이트를 받기까지 걸린 시간(TTFB - Time To First Byte)입니다.',
  },
  {
    name: 'http_req_connecting',
    title: 'http_req_connecting (HTTP 연결 시간)',
    description: '서버와 TCP 연결을 설정하는 데 걸린 시간입니다.',
  },
  {
    name: 'http_req_tls_handshaking',
    title: 'http_req_tls_handshaking (TLS 핸드셰이크 시간)',
    description: 'HTTPS 연결의 경우 TLS 핸드셰이크를 완료하는 데 걸린 시간입니다.',
  },
  {
    name: 'http_req_sending',
    title: 'http_req_sending (HTTP 요청 전송 시간)',
    description: '요청 데이터를 서버로 전송하는 데 걸린 시간입니다.',
  },
  {
    name: 'http_req_receiving',
    title: 'http_req_receiving (HTTP 응답 수신 시간)',
    description: '서버로부터 응답 데이터를 수신하는 데 걸린 시간입니다.',
  },
]

export default function LoadTestResults({ results }: LoadTestResultsProps) {
  const [isScriptExpanded, setIsScriptExpanded] = useState(false)

  return (
    <div className="results">
      <h3>테스트 결과</h3>
      
      {results.script && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onClick={() => setIsScriptExpanded(!isScriptExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <h4 style={{ margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{isScriptExpanded ? '▼' : '▶'}</span>
              생성된 k6 스크립트
            </h4>
          </div>
          {isScriptExpanded && (
            <div
              style={{
                background: '#2d2d2d',
                borderRadius: '8px',
                padding: '1rem',
                overflow: 'auto',
                maxHeight: '500px',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  color: '#f8f8f2',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                }}
              >
                {results.script}
              </pre>
            </div>
          )}
        </div>
      )}

      {results.rawOutput && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>상세 출력:</h4>
          <pre>{results.rawOutput}</pre>
        </div>
      )}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ marginBottom: '1rem', color: '#333' }}>주요 지표 설명</h4>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {metricDescriptions.map((metric) => (
            <div
              key={metric.name}
              style={{
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '3px solid #667eea',
              }}
            >
              <h5 style={{ marginBottom: '0.5rem', color: '#667eea', fontSize: '1rem' }}>
                {metric.title}
              </h5>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {metric.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      
    </div>
  )
}

