'use client'

import { CheckCircle2, Clock, Loader2, AlertTriangle, XCircle } from 'lucide-react'
import type { TransactionStatus } from '@/lib/types'

const TIMELINE_STEPS = [
  { key: 'awaiting', label: 'Chờ biên nhận' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'complete', label: 'Hoàn tất' },
]

interface StatusTimelineProps {
  status: TransactionStatus
  compact?: boolean
}

export function StatusTimeline({ status, compact = false }: StatusTimelineProps) {
  // Map status to timeline position
  const getActiveStep = () => {
    switch (status) {
      case 'awaiting_zelle_receipt':
        return 0
      case 'processing_vn':
        return 1
      case 'verify':
        return 1 // Same as processing, but with warning
      case 'complete':
        return 2
      case 'fail':
        return -1 // Failed state
      default:
        return 0
    }
  }

  const activeStep = getActiveStep()
  const isFailed = status === 'fail'
  const needsVerify = status === 'verify'

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {TIMELINE_STEPS.map((step, idx) => {
          const isActive = idx === activeStep
          const isCompleted = idx < activeStep && !isFailed
          const isPending = idx > activeStep || isFailed

          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full ${
                  isFailed && idx === 0
                    ? 'bg-red-500'
                    : isCompleted
                      ? 'bg-success'
                      : isActive
                        ? needsVerify
                          ? 'bg-orange-500'
                          : 'bg-primary'
                        : 'bg-secondary'
                }`}
              />
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`w-4 h-0.5 ${
                    isCompleted ? 'bg-success' : 'bg-secondary'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      {TIMELINE_STEPS.map((step, idx) => {
        const isActive = idx === activeStep
        const isCompleted = idx < activeStep && !isFailed
        const isPending = idx > activeStep || isFailed

        const getIcon = () => {
          if (isFailed && idx === 0) {
            return <XCircle className="w-4 h-4" />
          }
          if (isCompleted) {
            return <CheckCircle2 className="w-4 h-4" />
          }
          if (isActive) {
            if (needsVerify) {
              return <AlertTriangle className="w-4 h-4" />
            }
            if (idx === 1) {
              return <Loader2 className="w-4 h-4 animate-spin" />
            }
            return <Clock className="w-4 h-4" />
          }
          return <div className="w-2 h-2 rounded-full bg-current" />
        }

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isFailed && idx === 0
                    ? 'bg-red-100 text-red-600'
                    : isCompleted
                      ? 'bg-success/10 text-success'
                      : isActive
                        ? needsVerify
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-primary/10 text-primary'
                        : 'bg-secondary text-muted-foreground'
                }`}
              >
                {getIcon()}
              </div>
              <span
                className={`text-[10px] mt-1 ${
                  isFailed && idx === 0
                    ? 'text-red-600 font-medium'
                    : isCompleted
                      ? 'text-success'
                      : isActive
                        ? needsVerify
                          ? 'text-orange-600 font-medium'
                          : 'text-primary font-medium'
                        : 'text-muted-foreground'
                }`}
              >
                {isFailed && idx === 0 ? 'Thất bại' : step.label}
              </span>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${
                  isCompleted ? 'bg-success' : 'bg-secondary'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
