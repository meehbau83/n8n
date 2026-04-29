'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { setTransferState, clearTransferState } from '@/lib/transfer-state'
import { StepProgress } from '@/components/send-flow/step-progress'

export default function CountryPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear previous state when starting new transfer
    clearTransferState()
  }, [])

  const handleContinue = () => {
    setTransferState({ destination_country: 'Vietnam' })
    router.push('/send/method')
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Bạn muốn chuyển tiền về đâu?</h1>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={1} />

        {/* Selected Country Card - Vietnam pre-selected */}
        <div className="bg-card rounded-2xl p-5 border-2 border-primary card-shadow-md">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🇻🇳</span>
            <div className="flex-1">
              <p className="text-lg font-bold text-foreground">Việt Nam</p>
              <p className="text-sm text-muted-foreground">Vietnamese Dong (VNĐ)</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Continue Button */}
        <Button
          type="button"
          onClick={handleContinue}
          className="w-full h-12 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity mt-6"
        >
          Tiếp tục
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </main>
  )
}
