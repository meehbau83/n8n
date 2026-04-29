'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Building2, DollarSign, Banknote, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { getTransferState, setTransferState, fetchAppSettings, DEFAULT_FEES } from '@/lib/transfer-state'
import { StepProgress } from '@/components/send-flow/step-progress'
import type { ReceiveMethod } from '@/lib/types'

interface MethodOption {
  value: ReceiveMethod
  label: string
  description: string
  time: string
  icon: typeof Building2
}

const methodOptionsConfig: MethodOption[] = [
  {
    value: 'bank_transfer',
    label: 'Nhận qua ngân hàng',
    description: 'Chuyển thẳng vào tài khoản ngân hàng VN',
    time: 'Hoàn tất trong vòng 15 phút',
    icon: Building2,
  },
  {
    value: 'cash_vnd',
    label: 'Giao tiền mặt VNĐ tận nơi',
    description: 'Nhận tiền mặt VNĐ trực tiếp',
    time: 'Xử lý trong vòng 1-2h',
    icon: Banknote,
  },
  {
    value: 'cash_usd',
    label: 'Giao tiền mặt USD tận nơi',
    description: 'Nhận tiền mặt USD trực tiếp',
    time: 'Xử lý trong vòng 1-2h',
    icon: DollarSign,
  }
]

export default function MethodPage() {
  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState<ReceiveMethod | null>(null)
  const [fees, setFees] = useState<Record<ReceiveMethod, number>>(DEFAULT_FEES)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  useEffect(() => {
    // Check if country was selected
    const state = getTransferState()
    if (!state.destination_country) {
      router.push('/send/country')
      return
    }
    
    // Fetch app settings from Supabase
    fetchAppSettings()
      .then(({ fees: fetchedFees }) => {
        setFees(fetchedFees)
        setLoadingSettings(false)
      })
      .catch(() => {
        setSettingsError('Không thể tải tỷ giá và phí. Vui lòng thử lại.')
        setLoadingSettings(false)
      })
  }, [router])

  const handleContinue = () => {
    if (selectedMethod) {
      setTransferState({
        receive_method: selectedMethod,
        fee_usd: fees[selectedMethod],
      })
      router.push('/send/receiver')
    }
  }

  // Show error if settings failed to load
  if (settingsError) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-4">
            {settingsError}
          </div>
          <Button onClick={() => window.location.reload()} className="rounded-full">
            Thử lại
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Người nhận muốn nhận tiền bằng cách nào?</h1>
          <p className="text-sm text-muted-foreground mt-1">Chọn hình thức nhận tiền</p>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={2} />

        {/* Method Options */}
        <div className="space-y-3">
          {loadingSettings ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : (
            methodOptionsConfig.map((option) => {
              const Icon = option.icon
              const isSelected = selectedMethod === option.value
              const optionFee = fees[option.value]
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedMethod(option.value)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${isSelected
                    ? 'border-primary bg-primary/5 card-shadow-md'
                    : 'border-border bg-card hover:border-primary/50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                      }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{option.label}</p>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-sm font-medium ${optionFee === 0 ? 'text-success' : 'text-foreground'}`}>
                          {optionFee === 0 ? 'Miễn phí' : `Phí: $${optionFee}`}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {option.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Continue Button */}
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!selectedMethod}
          className="w-full h-12 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity disabled:opacity-50 mt-6"
        >
          Tiếp tục
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </main>
  )
}
