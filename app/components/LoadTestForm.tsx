'use client'

import { useState, FormEvent } from 'react'

interface LoadTestFormProps {
  onSubmit: (config: {
    targetUrl: string
    virtualUsers: number
    duration: string
    method: string
    callType: 'simultaneous' | 'gradual'
    rampUp?: string
    headers?: string
    body?: string
  }) => void
  isLoading: boolean
}

export default function LoadTestForm({ onSubmit, isLoading }: LoadTestFormProps) {
  const [targetUrl, setTargetUrl] = useState('')
  const [virtualUsers, setVirtualUsers] = useState(10)
  const [duration, setDuration] = useState('5s')
  const [method, setMethod] = useState('GET')
  const [callType, setCallType] = useState<'simultaneous' | 'gradual'>('simultaneous')
  const [rampUp, setRampUp] = useState('10s')
  const [headers, setHeaders] = useState('')
  const [body, setBody] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!targetUrl.trim()) {
      alert('타겟 URL을 입력해주세요.')
      return
    }

    onSubmit({
      targetUrl: targetUrl.trim(),
      virtualUsers,
      duration,
      method,
      callType,
      rampUp: callType === 'gradual' ? rampUp : undefined,
      headers: headers.trim() || undefined,
      body: body.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="targetUrl">타겟 URL *</label>
        <input
          type="url"
          id="targetUrl"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://quickpizza.grafana.com"
          required
          disabled={isLoading}
        />
        <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
          예: https://quickpizza.grafana.com
        </small>
      </div>
      

      <div className="form-group">
        <label htmlFor="method">HTTP 메서드</label>
        <select
          id="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          disabled={isLoading}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div className="form-group">
        <label>호출 방식</label>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="callType"
              value="simultaneous"
              checked={callType === 'simultaneous'}
              onChange={(e) => setCallType(e.target.value as 'simultaneous' | 'gradual')}
              disabled={isLoading}
              style={{ marginRight: '0.5rem' }}
            />
            동시 호출
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="callType"
              value="gradual"
              checked={callType === 'gradual'}
              onChange={(e) => setCallType(e.target.value as 'simultaneous' | 'gradual')}
              disabled={isLoading}
              style={{ marginRight: '0.5rem' }}
            />
            점진적 호출
          </label>
        </div>
        <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
          {callType === 'simultaneous' 
            ? '지정된 수만큼의 가상 사용자가 동시에 API를 호출합니다.'
            : '지정된 시간에 걸쳐 가상 사용자 수를 점진적으로 증가시킵니다.'}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="virtualUsers">가상 사용자 수 (VUs)</label>
        <input
          type="number"
          id="virtualUsers"
          value={virtualUsers}
          onChange={(e) => setVirtualUsers(parseInt(e.target.value) || 1)}
          min="1"
          max="1000"
          required
          disabled={isLoading}
        />
        <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
          {callType === 'simultaneous' 
            ? '동시에 실행될 가상 사용자 수입니다.'
            : '최종적으로 도달할 가상 사용자 수입니다.'}
        </small>
      </div>

      {callType === 'gradual' && (
        <div className="form-group">
          <label htmlFor="rampUp">Ramp-up 시간 (점진적 증가 시간)</label>
          <input
            type="text"
            id="rampUp"
            value={rampUp}
            onChange={(e) => setRampUp(e.target.value)}
            placeholder="10s, 30s, 1m"
            required
            disabled={isLoading}
          />
          <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
            가상 사용자 수를 0에서 목표 수까지 증가시키는 데 걸리는 시간 (예: 10s, 30s, 1m)
          </small>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="duration">테스트 지속 시간</label>
        <input
          type="text"
          id="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="50s, 1m, 5m30s"
          required
          disabled={isLoading}
        />
        <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
          예: 30s, 1m, 5m30s
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="headers">HTTP 헤더 (JSON 형식, 선택사항)</label>
        <textarea
          id="headers"
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            resize: 'vertical',
          }}
          disabled={isLoading}
        />
        <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
          예: {"{\"Content-Type\": \"application/json\", \"Authorization\": \"Bearer token\"}"}
        </small>
      </div>

      {method !== 'GET' && (
        <div className="form-group">
          <label htmlFor="body">요청 본문 (JSON 형식, 선택사항)</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`{\n    "message": "리더쉽",\n    "topK": 5,\n    "flag": "keyword",\n    "category": "content"\n}`}
            rows={8}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              resize: 'vertical',
            }}
            disabled={isLoading}
          />
          <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
            JSON 형식으로 요청 본문을 입력하세요. 예: {`{"message": "리더쉽", "topK": 5, "flag": "keyword", "category": "content"}`}
          </small>
        </div>
      )}

      <button type="submit" className="btn" disabled={isLoading}>
        {isLoading ? '테스트 실행 중...' : '부하테스트 시작'}
      </button>
    </form>
  )
}

