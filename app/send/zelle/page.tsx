'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Copy, Check } from 'lucide-react'
import { getTransferState } from '@/lib/transfer-state'
import { StepProgress } from '@/components/send-flow/step-progress'
import { StickySummary } from '@/components/send-flow/sticky-summary'

const ZELLE_PHONE = '657-789-2355'

// Format USD with comma separators and currency symbol
const formatUSD = (value: number | string): string => {
  const num = typeof value === 'string'
    ? Number(value.replace(/,/g, ''))
    : value

  if (!num || isNaN(num)) return '$0.00'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

// Generate secure 6-character transaction code using crypto
// Uses only unambiguous characters (no 0, O, I, 1)
function generateTransactionCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint32Array(length)
    window.crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      code += chars[array[i] % chars.length]
    }
    return code
  }
  // Fallback
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Get or create transaction code - single source of truth
function getOrCreateTransactionCode(): string {
  const existingCode = sessionStorage.getItem('transfer_transaction_code')
  if (existingCode && /^[A-HJ-NP-Z2-9]{6}$/.test(existingCode)) {
    return existingCode
  }
  const newCode = generateTransactionCode(6)
  sessionStorage.setItem('transfer_transaction_code', newCode)
  return newCode
}

export default function ZellePage() {
  const router = useRouter()
  const [state, setState] = useState(getTransferState())
  const [copied, setCopied] = useState(false)
  const [transactionCode, setTransactionCode] = useState('')

  useEffect(() => {
    const stored = getTransferState()
    setState(stored)
    
    // Get or create single transaction code using shared sessionStorage key
    const code = getOrCreateTransactionCode()
    setTransactionCode(code)
    
    if (!stored.receive_method || stored.amount_usd <= 0) {
      router.push('/send/method')
    }
    if (!stored.sender_email && !stored.sender_phone) {
      router.push('/send/payment')
    }
  }, [router])

  const copyPhone = async () => {
    await navigator.clipboard.writeText(ZELLE_PHONE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBack = () => {
    router.push('/send/payment')
  }

  const handleContinue = () => {
    router.push('/send/upload-receipt')
  }

  if (!state.receive_method || state.amount_usd <= 0) {
    return null
  }

  const totalPay = state.amount_usd + state.fee_usd

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Hướng dẫn chuyển Zelle</h1>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={5} />

        {/* Zelle Instructions Card */}
        <div className="bg-card rounded-2xl p-4 border card-shadow-md">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-sm text-amber-800 mb-2">Vui lòng Zelle đến số điện thoại:</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-2xl font-bold text-amber-900">{ZELLE_PHONE}</span>
              <button
                type="button"
                onClick={copyPhone}
                className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  <Copy className="h-5 w-5 text-amber-700" />
                )}
              </button>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-muted-foreground mb-1">Số tiền cần chuyển</p>
              <p className="text-2xl font-bold text-primary">{formatUSD(totalPay)}</p>
            </div>
          </div>

          {/* Transaction Code */}
          {transactionCode && (
            <div className="mt-4 p-3 bg-secondary/30 rounded-xl">
              <p className="text-xs text-muted-foreground text-center mb-1">Mã giao dịch</p>
              <p className="text-lg font-bold text-center text-primary">{transactionCode}</p>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Vui lòng ghi mã giao dịch trong phần ghi chú Zelle nếu có thể.
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 mb-16">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="h-12 rounded-full px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            className="flex-1 h-12 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity"
          >
            Tiếp tục
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Sticky Summary */}
      <StickySummary />
    </main>
  )
}
