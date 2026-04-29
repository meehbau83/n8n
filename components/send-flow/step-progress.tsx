'use client'

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
    <div className="mb-6">
      {/* Visual progress indicator only */}
      <div className="flex items-center justify-center gap-1.5">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          
          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isCompleted
                    ? 'bg-success'
                    : isCurrent
                      ? 'bg-primary w-6 rounded-full'
                      : 'bg-secondary/50'
                }`}
              />
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-6 h-0.5 mx-1 transition-colors ${
                    isCompleted ? 'bg-success' : 'bg-secondary/40'
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
