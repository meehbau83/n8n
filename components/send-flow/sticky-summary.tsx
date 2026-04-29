'use client'

import { getTransferState } from '@/lib/transfer-state'

// Format VND with dot separators
function formatVnd(num: number): string {
  return num.toLocaleString('vi-VN')
}

interface StickySummaryProps {
  className?: string
}

export function StickySummary({ className = '' }: StickySummaryProps) {
  const state = getTransferState()
  
  // Only show if we have amount data
  if (!state.amount_usd || state.amount_usd <= 0) {
    return null
  }

  const isCashUsd = state.receive_method === 'cash_usd'
  
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t card-shadow-md z-40 ${className}`}>
      <div className="max-w-md mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground text-xs">Gửi</span>
              <p className="font-semibold">${state.amount_usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
            </div>
            {!isCashUsd && state.amount_vnd > 0 && (
              <div>
                <span className="text-muted-foreground text-xs">Nhận</span>
                <p className="font-semibold text-success">{formatVnd(state.amount_vnd)}₫</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs">Phí</span>
            <p className={`font-semibold ${state.fee_usd === 0 ? 'text-success' : ''}`}>
              {state.fee_usd === 0 ? 'Miễn phí' : `$${state.fee_usd}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
