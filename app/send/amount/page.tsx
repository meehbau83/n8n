'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { getTransferState, setTransferState, fetchAppSettings, DEFAULT_EXCHANGE_RATE, DEFAULT_FEES } from '@/lib/transfer-state'
import { StepProgress } from '@/components/send-flow/step-progress'
import type { ReceiveMethod } from '@/lib/types'

// Format VND with dot separators
function formatVnd(num: number): string {
  return num.toLocaleString('vi-VN')
}

// Parse VND string (remove dots)
function parseVndInput(value: string): number {
  const cleaned = value.replace(/\./g, '')
  return parseInt(cleaned, 10) || 0
}

// Format VND input for display
function formatVndInput(value: string): string {
  const cleaned = value.replace(/\./g, '').replace(/\D/g, '')
  if (!cleaned) return ''
  const num = parseInt(cleaned, 10)
  return num.toLocaleString('vi-VN')
}

// Parse USD string (remove commas) to get numeric value (allows decimals)
function parseUsdInput(value: string): number {
  const cleaned = value.replace(/,/g, '')
  return parseFloat(cleaned) || 0
}

// Format USD input for display with comma separators (allows up to 2 decimal places)
function formatUsdInput(value: string, allowDecimals = true): string {
  // Remove commas first
  const cleaned = value.replace(/,/g, '')
  
  // Handle empty or invalid input
  if (!cleaned || cleaned === '.') return cleaned
  
  if (allowDecimals) {
    // Split by decimal point
    const parts = cleaned.split('.')
    const integerPart = parts[0].replace(/\D/g, '')
    const decimalPart = parts[1]?.replace(/\D/g, '')
    
    // Format integer part with commas
    const formattedInteger = integerPart ? parseInt(integerPart, 10).toLocaleString('en-US') : ''
    
    // Combine with decimal if present (limit to 2 places)
    if (parts.length > 1 && decimalPart !== undefined) {
      const limitedDecimal = decimalPart.slice(0, 2)
      return `${formattedInteger}.${limitedDecimal}`
    }
    
    // If user just typed a decimal point
    if (value.endsWith('.')) {
      return `${formattedInteger}.`
    }
    
    return formattedInteger
  } else {
    // Whole numbers only - strip everything non-digit
    const digitsOnly = cleaned.replace(/\D/g, '')
    if (!digitsOnly) return ''
    const num = parseInt(digitsOnly, 10)
    return num.toLocaleString('en-US')
  }
}

// Parse USD for whole number only (cash_usd)
function parseUsdWhole(value: string): number {
  const cleaned = value.replace(/,/g, '').replace(/\D/g, '')
  return parseInt(cleaned, 10) || 0
}

// Round VND down to nearest 1,000
function roundVndDown(vnd: number): number {
  return Math.floor(vnd / 1000) * 1000
}

// Amount validation limits
const MIN_AMOUNT_USD = 50
const MAX_AMOUNT_USD = 10000

export default function AmountPage() {
  const router = useRouter()
  const [state, setState] = useState(getTransferState())
  const [amountUsd, setAmountUsd] = useState('')
  const [receiverAmount, setReceiverAmount] = useState('')
  const [lastEdited, setLastEdited] = useState<'usd' | 'receiver'>('usd')
  const [isVndFocused, setIsVndFocused] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE)
  const [fees, setFees] = useState<Record<ReceiveMethod, number>>(DEFAULT_FEES)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  useEffect(() => {
    const stored = getTransferState()
    setState(stored)
    if (!stored.receive_method) {
      router.push('/send/method')
    }
    
    // Fetch app settings from Supabase
    fetchAppSettings()
      .then(({ exchange_rate, fees: fetchedFees }) => {
        setExchangeRate(exchange_rate)
        setFees(fetchedFees)
        setSettingsLoaded(true)
      })
      .catch(() => {
        setSettingsError('Không thể tải tỷ giá và phí. Vui lòng thử lại.')
      })
  }, [router])

  // Determine if receiver gets USD or VNĐ based on receive method
  const isCashUsd = state.receive_method === 'cash_usd'
  const isReceiverVnd = state.receive_method === 'bank_transfer' || state.receive_method === 'cash_vnd'
  const fee = fees[state.receive_method || 'bank_transfer']

  // Parse the USD input value
  const usdValue = parseUsdInput(amountUsd)

  // Calculate receiver value based on method
  // For cash_usd: receiver gets USD (no conversion)
  // For bank_transfer and cash_vnd: receiver gets VNĐ
  const receiverValue = isCashUsd
    ? usdValue
    : lastEdited === 'usd'
      ? usdValue * exchangeRate
      : parseVndInput(receiverAmount)

  const handleUsdChange = (value: string) => {
    if (isReceiverVnd) {
      // For bank_transfer/cash_vnd: USD allows decimals (max 2 places)
      const formatted = formatUsdInput(value, true)
      setAmountUsd(formatted)
      setLastEdited('usd')
      const usd = parseUsdInput(value)
      
      // Convert USD to VNĐ, round DOWN to nearest 1,000
      const rawVnd = usd * exchangeRate
      const roundedVnd = roundVndDown(rawVnd)
      setReceiverAmount(usd > 0 ? formatVnd(roundedVnd) : '')
    } else {
      // For cash_usd: USD must be whole numbers only
      const formatted = formatUsdInput(value, false)
      setAmountUsd(formatted)
      setLastEdited('usd')
      // Receiver gets same whole USD amount
      setReceiverAmount(formatted)
    }
  }

  const handleReceiverChange = (value: string) => {
    if (isReceiverVnd) {
      // For VNĐ (bank_transfer, cash_vnd): whole numbers only, format with dot separators
      // Do NOT round while typing - allow natural input, round on blur
      const formatted = formatVndInput(value)
      setReceiverAmount(formatted)
      setLastEdited('receiver')
      // Calculate USD preview from raw (unrounded) VND - can have decimals
      const rawVnd = parseVndInput(value)
      const usdFromVnd = rawVnd > 0 ? rawVnd / exchangeRate : 0
      // Show USD with up to 2 decimal places
      setAmountUsd(usdFromVnd > 0 ? formatUsdInput(usdFromVnd.toFixed(2), true) : '')
    } else {
      // For cash_usd: receiver USD must be whole numbers only
      const formatted = formatUsdInput(value, false)
      setReceiverAmount(formatted)
      setAmountUsd(formatted)
    }
  }

  // Handle VND input blur - round down to nearest 1,000 and recalculate USD from rounded VND
  const handleVndBlur = () => {
    setIsVndFocused(false)
    if (isReceiverVnd && receiverAmount) {
      const rawVnd = parseVndInput(receiverAmount)
      const roundedVnd = roundVndDown(rawVnd)
      setReceiverAmount(roundedVnd > 0 ? formatVnd(roundedVnd) : '')
      // IMPORTANT: Recalculate USD from ROUNDED VND (can have decimals)
      const usdFromRoundedVnd = roundedVnd > 0 ? roundedVnd / exchangeRate : 0
      setAmountUsd(usdFromRoundedVnd > 0 ? formatUsdInput(usdFromRoundedVnd.toFixed(2), true) : '')
    }
  }

  // Validation: check min/max limits
  const getAmountError = (): string | null => {
    if (usdValue === 0) return null // Don't show error for empty input
    if (usdValue < MIN_AMOUNT_USD) return `Số tiền tối thiểu là $${MIN_AMOUNT_USD}`
    if (usdValue > MAX_AMOUNT_USD) return `Số tiền tối đa là $${MAX_AMOUNT_USD.toLocaleString('en-US')}`
    return null
  }

  const amountError = getAmountError()
  const isValid = usdValue >= MIN_AMOUNT_USD && usdValue <= MAX_AMOUNT_USD

  const handleContinue = () => {
    let finalUsd: number
    let finalVnd: number
    let roundingDiff: number

    if (isCashUsd) {
      // For cash_usd: receiver gets whole USD only
      finalUsd = parseUsdWhole(amountUsd)
      finalVnd = 0
      roundingDiff = 0
    } else if (lastEdited === 'receiver' && isReceiverVnd) {
      // User typed in VND field - use rounded VND, then calculate USD from it
      const rawVnd = parseVndInput(receiverAmount)
      finalVnd = roundVndDown(rawVnd)
      finalUsd = finalVnd / exchangeRate // USD can have decimals
      roundingDiff = rawVnd - finalVnd
    } else {
      // User typed in USD field - calculate VND from USD
      finalUsd = parseUsdInput(amountUsd)
      const rawVnd = finalUsd * exchangeRate
      finalVnd = roundVndDown(rawVnd)
      roundingDiff = rawVnd - finalVnd
    }

    setTransferState({
      amount_usd: finalUsd,
      amount_vnd: finalVnd,
      rounding_difference_vnd: roundingDiff,
      fee_usd: fee,
      exchange_rate: exchangeRate,
    })
    router.push('/send/payment')
  }

  const handleBack = () => {
    router.push('/send/receiver')
  }

  if (!state.receive_method) {
    return null
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
          <h1 className="text-xl font-bold tracking-tight text-foreground">Nhập số tiền</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isCashUsd ? 'Nhập số tiền USD muốn gửi' : 'Nhập số tiền USD hoặc VNĐ'}
          </p>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={4} />

        {/* Amount Inputs */}
        <div className="space-y-4">
          {/* You Send (USD) */}
          <div className="bg-card rounded-2xl p-4 border card-shadow-md">
            <label className="text-sm font-semibold text-foreground mb-3 block">Số tiền gửi</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border-2 border-primary/20">
                <span className="text-xl font-bold text-primary">$</span>
              </div>
              <div className="flex-1 relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập số tiền USD"
                  value={amountUsd}
                  onChange={(e) => handleUsdChange(e.target.value)}
                  className="h-12 text-xl font-bold bg-white border-2 border-border rounded-xl pl-4 pr-16 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">USD</span>
              </div>
            </div>
            {amountError && (
              <p className="text-xs text-destructive mt-2">{amountError}</p>
            )}
          </div>

          {/* Receiver Gets - VNĐ for bank_transfer/cash_vnd, USD for cash_usd */}
          <div className="bg-card rounded-2xl p-4 border card-shadow-md">
            <label className="text-sm font-semibold text-foreground mb-3 block">Số tiền nhận được</label>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${isReceiverVnd ? 'bg-success/10 border-2 border-success/20' : 'bg-primary/10 border-2 border-primary/20'}`}>
                <span className={`text-xl font-bold ${isReceiverVnd ? 'text-success' : 'text-primary'}`}>
                  {isReceiverVnd ? '₫' : '$'}
                </span>
              </div>
              <div className="flex-1 relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={isReceiverVnd ? 'Nhập số tiền VNĐ' : 'Nhập số tiền USD'}
                  value={receiverAmount}
                  onChange={(e) => handleReceiverChange(e.target.value)}
                  onFocus={() => isReceiverVnd && setIsVndFocused(true)}
                  onBlur={handleVndBlur}
                  className={`h-12 text-xl font-bold bg-white border-2 rounded-xl pl-4 pr-16 focus-visible:ring-2 ${isReceiverVnd
                    ? 'border-success/30 text-success focus-visible:ring-success focus-visible:border-success'
                    : 'border-primary/30 text-primary focus-visible:ring-primary focus-visible:border-primary'
                    }`}
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold ${isReceiverVnd ? 'text-success/70' : 'text-primary/70'}`}>
                  {isReceiverVnd ? 'VNĐ' : 'USD'}
                </span>
              </div>
            </div>
            {isReceiverVnd ? (
              <p className="text-xs text-muted-foreground/70 text-center mt-3">
                VNĐ sẽ được làm tròn xuống đến hàng nghìn.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/70 text-center mt-3">
                Tiền mặt USD sẽ được làm tròn xuống đến số nguyên.
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Phí</span>
              <span className={fee === 0 ? 'text-success font-semibold' : 'font-medium'}>
                {fee === 0 ? 'Miễn phí' : `$${fee}`}
              </span>
            </div>
            {isReceiverVnd && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tỷ giá</span>
                <span className="font-medium">$1 = {formatVnd(exchangeRate)}₫</span>
              </div>
            )}
            {usdValue > 0 && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                <span className="font-medium">Tổng thanh toán</span>
                <span className="font-bold text-primary">
                  ${(usdValue + fee).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Trust helper text */}
          <p className="text-xs text-muted-foreground text-center">
            Tỷ giá và phí được cố định khi tạo giao dịch.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
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
            disabled={!isValid}
            className="flex-1 h-12 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Tiếp tục
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </main>
  )
}
