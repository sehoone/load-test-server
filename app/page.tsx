'use client'

import { useState } from 'react'
import LoadTestForm from './components/LoadTestForm'
import LoadTestResults from './components/LoadTestResults'

export default function Home() {
  const [testResults, setTestResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTestStart = async (testConfig: {
    targetUrl: string
    virtualUsers: number
    duration: string
    method: string
    callType: 'simultaneous' | 'gradual'
    rampUp?: string
    headers?: string
    body?: string
  }) => {
    setIsLoading(true)
    setError(null)
    setTestResults(null)

    try {
      const response = await fetch('/api/load-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testConfig),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '부하테스트 실행 중 오류가 발생했습니다.')
      }

      const data = await response.json()
      setTestResults(data)
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ marginBottom: '2rem', color: '#333', textAlign: 'center' }}>
          API 부하테스트
        </h1>
        <LoadTestForm onSubmit={handleTestStart} isLoading={isLoading} />
        {error && <div className="error">{error}</div>}
        {isLoading && <div className="loading">부하테스트 실행 중...</div>}
        {testResults && <LoadTestResults results={testResults} />}
      </div>
    </div>
  )
}

