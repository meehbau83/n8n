'use client'

import { CheckCircle2 } from 'lucide-react'

const STEPS = [
  { key: 'country', label: 'Quốc gia' },
  { key: 'method', label: 'Hình thức' },
  { key: 'receiver', label: 'Người nhận' },
  { key: 'amount', label: 'Số tiền' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'review', label: 'Xem lại' },
]

interface StepProgressProps {
  currentStep: number // 1-6
}

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <div className="mb-4">
      {/* Step label */}
      <p className="text-xs text-muted-foreground text-center mb-2">
        Bước {currentStep}/6: {STEPS[currentStep - 1]?.label}
      </p>
      
      {/* Visual progress */}
      <div className="flex items-center justify-center gap-0.5">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          
          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-success text-white'
                    : isCurrent
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-muted-foreground'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : stepNum}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-3 h-0.5 ${
                    isCompleted ? 'bg-success' : 'bg-secondary'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
