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
    <div className="mb-5">
      {/* Step label badge */}
      <div className="flex justify-center mb-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">
            {currentStep}
          </span>
          <span className="text-sm font-medium text-primary">
            {STEPS[currentStep - 1]?.label}
          </span>
          <span className="text-xs text-muted-foreground">
            / 6
          </span>
        </div>
      </div>
      
      {/* Visual progress bar */}
      <div className="flex items-center justify-center gap-1">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          
          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-success text-white'
                    : isCurrent
                      ? 'bg-primary text-white ring-2 ring-primary/30 ring-offset-1'
                      : 'bg-secondary/60 text-muted-foreground/70'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-4 h-1 rounded-full mx-0.5 transition-colors ${
                    isCompleted ? 'bg-success' : 'bg-secondary/60'
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
