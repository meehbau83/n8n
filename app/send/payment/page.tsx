'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Mail, Phone } from 'lucide-react'
import { getTransferState, setTransferState } from '@/lib/transfer-state'
import { StepProgress } from '@/components/send-flow/step-progress'
import { StickySummary } from '@/components/send-flow/sticky-summary'

export default function PaymentPage() {
  const router = useRouter()
  const [state, setState] = useState(getTransferState())
  const [senderContact, setSenderContact] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    const stored = getTransferState()
    setState(stored)
    // Pre-fill if already set
    if (stored.sender_email) {
      setSenderContact(stored.sender_email)
    } else if (stored.sender_phone) {
      setSenderContact(stored.sender_phone)
    }
    if (!stored.receive_method || stored.amount_usd <= 0) {
      router.push('/send/method')
    }
  }, [router])

  const handleBack = () => {
    router.push('/send/amount')
  }

  // Validate email format
  const isValidEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  // Validate phone format (basic: at least 10 digits)
  const isValidPhone = (value: string): boolean => {
    const digitsOnly = value.replace(/\D/g, '')
    return digitsOnly.length >= 10
  }

  const handleContinue = () => {
    const trimmedContact = senderContact.trim()

    // Validate: contact is required
    if (!trimmedContact) {
      setValidationError('Vui lòng nhập email hoặc số điện thoại')
      return
    }

    // Detect if email or phone based on @ symbol
    const isEmail = trimmedContact.includes('@')

    if (isEmail) {
      if (!isValidEmail(trimmedContact)) {
        setValidationError('Email không hợp lệ')
        return
      }
      // Save to sender_email, clear sender_phone
      setTransferState({
        sender_email: trimmedContact,
        sender_phone: '',
        payment_method: 'zelle',
      })
    } else {
      if (!isValidPhone(trimmedContact)) {
        setValidationError('Số điện thoại không hợp lệ (cần ít nhất 10 số)')
        return
      }
      // Save to sender_phone, clear sender_email
      setTransferState({
        sender_email: '',
        sender_phone: trimmedContact,
        payment_method: 'zelle',
      })
    }

    setValidationError(null)
    router.push('/send/zelle')
  }

  if (!state.receive_method || state.amount_usd <= 0) {
    return null
  }

  // Detect current input type for icon
  const isEmailInput = senderContact.includes('@')

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Thanh toán</h1>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={5} />

        {/* Payment Method Selection */}
        <div className="bg-card rounded-2xl p-4 border card-shadow-md mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Chọn hình thức thanh toán</h3>
          <button
            type="button"
            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary/5"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-foreground text-sm">Zelle</p>
              <p className="text-xs text-muted-foreground">Chuyển tiền qua Zelle</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </button>
        </div>

        {/* Sender Contact - Single Input */}
        <div className="bg-card rounded-2xl p-4 border card-shadow-md">
          <h3 className="text-sm font-semibold text-foreground mb-3">Email hoặc số điện thoại người gửi</h3>
          <div className="relative">
            {isEmailInput ? (
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            ) : (
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              type="text"
              placeholder="Nhập email hoặc số điện thoại"
              value={senderContact}
              onChange={(e) => {
                setSenderContact(e.target.value)
                setValidationError(null)
              }}
              className="pl-10 h-11 rounded-xl"
            />
          </div>
          {validationError && (
            <p className="text-xs text-destructive mt-2">{validationError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Thông tin này giúp chúng tôi xác nhận thanh toán của bạn
          </p>
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
