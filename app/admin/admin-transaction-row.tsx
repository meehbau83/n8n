'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { CheckCircle, Image as ImageIcon, ArrowUpRight, AlertTriangle, Building2, DollarSign, Banknote, Phone, MapPin } from 'lucide-react'
import type { Transaction, TransactionStatus } from '@/lib/types'

const EXCHANGE_RATE = 25000

function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

function formatCurrency(amount: number, currency: 'USD' | 'VND'): string {
  if (currency === 'USD') {
    return `$${formatNumber(amount)}`
  }
  return `${formatNumber(amount)} VND`
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const receiveMethodLabels = {
  bank_transfer: { label: 'Bank Transfer', icon: Building2 },
  cash_usd: { label: 'Cash USD', icon: DollarSign },
  cash_vnd: { label: 'Cash VND', icon: Banknote },
}

export function AdminTransactionRow({ transaction }: { transaction: Transaction }) {
  const router = useRouter()
  const [loading, setLoading] = useState<TransactionStatus | null>(null)
  const [transactionCode, setTransactionCode] = useState('')

  const updateStatus = async (newStatus: TransactionStatus, code?: string) => {
    setLoading(newStatus)
    const supabase = createClient()

    const updateData: { status: TransactionStatus; transaction_code?: string } = { status: newStatus }
    if (code) {
      updateData.transaction_code = code
    }

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transaction.id)

    if (!error) {
      router.refresh()
    }
    setLoading(null)
    setTransactionCode('')
  }

  const canProcess = transaction.status === 'awaiting_zelle_receipt' || transaction.status === 'processing_vn'
  const vndAmount = Number(transaction.amount) * EXCHANGE_RATE
  const method = receiveMethodLabels[transaction.receive_method || 'bank_transfer']
  const MethodIcon = method.icon

  return (
    <div className="p-5 hover:bg-secondary/30 transition-colors">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: Transaction Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-xl font-bold">
              {formatCurrency(Number(transaction.amount), 'USD')}
            </span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {formatCurrency(vndAmount, 'VND')}
            </span>
            <StatusBadge status={transaction.status} />
          </div>
          
          <p className="font-medium text-foreground">
            {transaction.receiver_name}
          </p>
          
          {/* Receive method */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <MethodIcon className="h-3.5 w-3.5" />
            <span>{method.label}</span>
          </div>
          
          {/* Bank details */}
          {transaction.receive_method === 'bank_transfer' && transaction.bank_name && (
            <p className="text-sm text-muted-foreground">
              {transaction.bank_name} &middot; {transaction.account_number}
            </p>
          )}
          
          {/* Address for cash */}
          {(transaction.receive_method === 'cash_usd' || transaction.receive_method === 'cash_vnd') && transaction.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {transaction.address}
            </p>
          )}
          
          {/* Phone */}
          {transaction.phone && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {transaction.phone}
            </p>
          )}
          
          <p className="text-xs text-muted-foreground mt-1">
            {formatDateTime(transaction.created_at)}
          </p>
          
          {/* Show transaction code if exists */}
          {transaction.transaction_code && (
            <div className="mt-2 inline-block px-2 py-1 rounded bg-success/10 border border-success/20">
              <span className="text-xs text-muted-foreground mr-1">Code:</span>
              <span className="font-mono font-medium text-success">{transaction.transaction_code}</span>
            </div>
          )}
          
          {/* Show rounding difference for admin */}
          {transaction.rounding_difference_vnd != null && transaction.rounding_difference_vnd > 0 && (
            <div className="mt-2 ml-2 inline-block px-2 py-1 rounded bg-amber-50 border border-amber-200">
              <span className="text-xs text-muted-foreground mr-1">Chênh lệch làm tròn:</span>
              <span className="font-medium text-amber-700">{formatNumber(transaction.rounding_difference_vnd)}₫</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {transaction.receipt_url && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <ImageIcon className="h-4 w-4 mr-1.5" />
                    Receipt
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg p-2" aria-describedby={undefined}>
                  <VisuallyHidden>
                    <DialogTitle>Receipt Image</DialogTitle>
                  </VisuallyHidden>
                  <img
                    src={transaction.receipt_url}
                    alt="Zelle receipt"
                    className="w-full rounded-lg"
                  />
                </DialogContent>
              </Dialog>
            )}

            {canProcess && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus('verify')}
                  disabled={loading !== null}
                  className="rounded-full border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  {loading === 'verify' ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-1.5" />
                      Verify Info
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Complete with transaction code */}
          {canProcess && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="text"
                placeholder="Transaction code"
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value)}
                className="h-8 text-sm rounded-full w-40"
              />
              <Button
                size="sm"
                onClick={() => updateStatus('complete', transactionCode || undefined)}
                disabled={loading !== null}
                className="rounded-full fintech-gradient-success"
              >
                {loading === 'complete' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Hoàn tất
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
