'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { 
  ArrowRight, 
  ArrowLeft,
  DollarSign, 
  User, 
  Building2, 
  CreditCard, 
  CheckCircle2,
  ChevronDown,
  Phone,
  Send,
  Upload,
  X,
  Banknote,
  MapPin,
  Wallet,
  Lock
} from 'lucide-react'
import type { ReceiveMethod } from '@/lib/types'
import { getOrCreateSessionId } from '@/lib/session'

const EXCHANGE_RATE = 25000 // 1 USD = 25,000 VND
const ZELLE_PHONE = '657-789-2355'

// Format USD with comma separators: 1,000.00
function formatUsd(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Format VND with dot separators: 1.000.000
function formatVnd(num: number): string {
  return num.toLocaleString('vi-VN')
}

// Parse VND string (remove dots): "1.000.000" -> 1000000
function parseVndInput(value: string): number {
  const cleaned = value.replace(/\./g, '')
  return parseInt(cleaned, 10) || 0
}

// Format VND input for display (add dots while typing)
function formatVndInput(value: string): string {
  const cleaned = value.replace(/\./g, '').replace(/\D/g, '')
  if (!cleaned) return ''
  const num = parseInt(cleaned, 10)
  return num.toLocaleString('vi-VN')
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

function formatCurrency(amount: number, currency: 'USD' | 'VND'): string {
  if (currency === 'USD') {
    return `$${formatUsd(amount)}`
  }
  return `${formatVnd(amount)} VNĐ`
}

const receiveMethodOptions: { value: ReceiveMethod; label: string; description: string; icon: typeof Banknote }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'Direct to VN bank account', icon: Building2 },
  { value: 'cash_usd', label: 'Cash (USD)', description: 'Receive USD cash in person', icon: DollarSign },
  { value: 'cash_vnd', label: 'Cash (VND)', description: 'Receive VND cash in person', icon: Banknote },
]

type WizardStep = 'amount' | 'receive_method' | 'zelle_instruction'

export function TransactionForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  
  // Form state
  const [amount, setAmount] = useState('')
  const [receiverAmount, setReceiverAmount] = useState('')
  const [lastEdited, setLastEdited] = useState<'usd' | 'vnd'>('usd')
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>('bank_transfer')
  const [receiverName, setReceiverName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  
  // Wizard step
  const [currentStep, setCurrentStep] = useState<WizardStep>('amount')
  
  // Currency dropdown
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)

  // Bi-directional conversion
  const usdAmount = parseFloat(amount) || 0
  const vndAmount = lastEdited === 'usd' 
    ? usdAmount * EXCHANGE_RATE 
    : parseFloat(receiverAmount) || 0

  const handleUsdChange = (value: string) => {
    setAmount(value)
    setLastEdited('usd')
    const usd = parseFloat(value) || 0
    // Format VND with dots
    setReceiverAmount(usd > 0 ? formatVnd(Math.round(usd * EXCHANGE_RATE)) : '')
  }

  const handleVndChange = (value: string) => {
    // Format the input with dots
    const formatted = formatVndInput(value)
    setReceiverAmount(formatted)
    setLastEdited('vnd')
    const vnd = parseVndInput(value)
    setAmount(vnd > 0 ? (vnd / EXCHANGE_RATE).toFixed(2) : '')
  }

  // Validation
  const isAmountValid = usdAmount > 0
  const isReceiverInfoValid = () => {
    if (!receiverName || !phone) return false
    if (receiveMethod === 'bank_transfer' && (!bankName || !accountNumber)) return false
    if ((receiveMethod === 'cash_usd' || receiveMethod === 'cash_vnd') && !address) return false
    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreview(null)
  }

  const goToNextStep = () => {
    if (currentStep === 'amount' && isAmountValid) {
      setCurrentStep('receive_method')
    } else if (currentStep === 'receive_method' && isReceiverInfoValid()) {
      setCurrentStep('zelle_instruction')
    }
  }

  const goToPreviousStep = () => {
    if (currentStep === 'receive_method') {
      setCurrentStep('amount')
    } else if (currentStep === 'zelle_instruction') {
      setCurrentStep('receive_method')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get current user or session
      const { data: { user } } = await supabase.auth.getUser()
      const sessionId = user ? null : getOrCreateSessionId()
      
      let receiptUrl: string | null = null
      let status: 'awaiting_zelle_receipt' | 'processing_vn' = 'awaiting_zelle_receipt'

      // Upload receipt if provided
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, selectedFile)

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName)

        receiptUrl = urlData.publicUrl
        status = 'processing_vn'
      }

      const { error: insertError } = await supabase.from('transactions').insert({
        amount: usdAmount,
        receiver_name: receiverName,
        receive_method: receiveMethod,
        bank_name: receiveMethod === 'bank_transfer' ? bankName : null,
        account_number: receiveMethod === 'bank_transfer' ? accountNumber : null,
        phone,
        address: receiveMethod !== 'bank_transfer' ? address : null,
        receipt_url: receiptUrl,
        status,
        user_id: user?.id || null,
        session_id: sessionId,
      })

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`)
      }

      router.push('/history')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Step indicator data
  const steps = [
    { key: 'amount', label: 'Số tiền', num: 1 },
    { key: 'receive_method', label: 'Người nhận', num: 2 },
    { key: 'zelle_instruction', label: 'Thanh toán', num: 3 },
  ]
  const currentStepIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {currentStep === 'amount' ? 'Send Money' : currentStep === 'receive_method' ? 'Receiver Details' : 'Complete Payment'}
        </h1>
        {currentStep === 'amount' && (
          <p className="text-sm text-muted-foreground mt-1">Enter amount and choose receiving currency</p>
        )}
      </div>

      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                  currentStepIndex > idx 
                    ? 'bg-success text-white' 
                    : currentStepIndex === idx 
                      ? 'bg-primary text-white' 
                      : 'bg-secondary text-muted-foreground'
                }`}>
                  {currentStepIndex > idx ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.num}</span>
                  )}
                </div>
                <span className={`text-xs mt-1.5 ${
                  currentStepIndex >= idx ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 mt-[-16px] ${
                  currentStepIndex > idx ? 'bg-success' : 'bg-secondary'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* STEP 1: Amount */}
        {currentStep === 'amount' && (
          <div className="space-y-4">
            {/* Row 1: You Send (USD) */}
            <div className="bg-card rounded-2xl p-4 border card-shadow-md">
              <label className="text-sm font-semibold text-foreground mb-3 block">You Send</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border-2 border-primary/20">
                  <span className="text-xl font-bold text-primary">$</span>
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Enter USD amount"
                    value={amount}
                    onChange={(e) => handleUsdChange(e.target.value)}
                    className="h-12 text-xl font-bold bg-white border-2 border-border rounded-xl pl-4 pr-16 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">USD</span>
                </div>
              </div>
            </div>

            {/* Row 2: Receiver Gets (VNĐ) */}
            <div className="bg-card rounded-2xl p-4 border card-shadow-md">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-foreground">Receiver Gets</label>
                {/* Currency selector trigger */}
                <button
                  type="button"
                  onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <span className="font-semibold">VNĐ</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${currencyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-success/10 border-2 border-success/20">
                  <span className="text-xl font-bold text-success">₫</span>
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter VND amount"
                    value={receiverAmount}
                    onChange={(e) => handleVndChange(e.target.value)}
                    className="h-12 text-xl font-bold bg-white border-2 border-success/30 rounded-xl pl-4 pr-16 text-success focus-visible:ring-2 focus-visible:ring-success focus-visible:border-success"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-success/70">VNĐ</span>
                </div>
              </div>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground text-center mt-3">You can type in either field</p>

              {/* Currency Dropdown Menu */}
              {currencyDropdownOpen && (
                <div className="mt-3 bg-secondary/30 rounded-xl border overflow-hidden">
                  {/* VNĐ - Enabled */}
                  <button
                    type="button"
                    onClick={() => setCurrencyDropdownOpen(false)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors border-b bg-card"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-white">₫</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-foreground text-sm">VNĐ</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </button>
                  
                  {/* Disabled currencies */}
                  {[
                    { symbol: '$', code: 'USD' },
                    { symbol: '€', code: 'EUR' },
                    { symbol: '£', code: 'GBP' },
                    { symbol: 'C$', code: 'CAD' },
                    { symbol: 'A$', code: 'AUD' },
                    { symbol: '¥', code: 'JPY' },
                  ].map((currency) => (
                    <div
                      key={currency.code}
                      className="w-full flex items-center gap-3 p-2.5 opacity-40 cursor-not-allowed border-b last:border-b-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">{currency.symbol}</span>
                      </div>
                      <p className="font-medium text-muted-foreground text-sm flex-1">{currency.code}</p>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  ))}
                  
                  <div className="px-3 py-2 bg-secondary/50">
                    <p className="text-xs text-muted-foreground text-center">More currencies coming soon</p>
                  </div>
                </div>
              )}
            </div>

            {/* Exchange Rate Info */}
            <div className="flex items-center justify-between text-xs px-2 py-2 bg-secondary/30 rounded-xl">
              <span className="text-muted-foreground">Fee: <span className="text-success font-semibold">$0</span></span>
              <span className="text-muted-foreground">Rate: <span className="font-semibold">$1 = 25.000₫</span></span>
            </div>

            <Button 
              type="button"
              onClick={goToNextStep}
              disabled={!isAmountValid}
              className="w-full h-12 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Tiếp tục
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* STEP 2: Receive Method + Details */}
        {currentStep === 'receive_method' && (
          <div className="space-y-5">
            {/* Amount Summary */}
            <div className="bg-card rounded-2xl p-4 border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sending</p>
                <p className="text-lg font-bold">{formatCurrency(usdAmount, 'USD')}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Receiver gets</p>
                <p className="text-lg font-bold text-success">{formatCurrency(vndAmount, 'VND')}</p>
              </div>
            </div>

            {/* Receive Method Selection */}
            <div className="bg-card rounded-2xl p-5 card-shadow-md border">
              <label className="text-sm font-medium text-foreground mb-3 block">How should receiver get the money?</label>
              <div className="space-y-2">
                {receiveMethodOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setReceiveMethod(option.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        receiveMethod === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-secondary/30 hover:bg-secondary/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        receiveMethod === option.value ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-foreground">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      {receiveMethod === option.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Receiver Details */}
            <div className="bg-card rounded-2xl p-5 card-shadow-md border">
              <h3 className="text-sm font-medium text-foreground mb-4">Receiver details</h3>
              
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Receiver name *"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Phone number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {receiveMethod === 'bank_transfer' && (
                  <>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Bank name *"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Account number *"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                  </>
                )}

                {(receiveMethod === 'cash_usd' || receiveMethod === 'cash_vnd') && (
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Delivery address *"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                className="flex-1 h-14 rounded-full text-base font-semibold"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
              <Button 
                type="button"
                onClick={goToNextStep}
                disabled={!isReceiverInfoValid()}
                className="flex-1 h-14 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Zelle Instruction + Receipt Upload */}
        {currentStep === 'zelle_instruction' && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="bg-card rounded-2xl p-4 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Sending</span>
                <span className="font-bold">{formatCurrency(usdAmount, 'USD')}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">To</span>
                <span className="font-medium">{receiverName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="font-medium">{receiveMethodOptions.find(o => o.value === receiveMethod)?.label}</span>
              </div>
            </div>

            {/* Zelle Instruction */}
            <div className="bg-card rounded-2xl p-5 card-shadow-md border border-warning/30 bg-warning/5">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Complete Zelle Payment</h3>
              </div>
              
              <div className="p-4 rounded-xl bg-background border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Send Zelle payment to</p>
                    <p className="text-xl font-bold text-primary tracking-wide">{ZELLE_PHONE}</p>
                  </div>
                  <Send className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mt-3">
                After sending, take a screenshot and upload your receipt below.
              </p>
            </div>

            {/* Receipt Upload */}
            <div className="bg-card rounded-2xl p-5 card-shadow-md border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground">Upload Zelle Receipt</h3>
                <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  Optional
                </span>
              </div>
              
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-success">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="w-full max-h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-success text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Uploaded
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-foreground/80 text-background hover:bg-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 border-warning/50 bg-warning/5 hover:bg-warning/10 hover:border-warning">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-warning" />
                    <span className="text-sm font-medium text-muted-foreground">Click to upload receipt</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, or WebP</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            {error?.trim() ? (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : null}

            <div className="flex gap-3">
              <Button 
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                className="flex-1 h-14 rounded-full text-base font-semibold"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
              <Button 
                type="submit"
                disabled={loading}
                className="flex-1 h-14 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Hoàn tất
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>

            {!selectedFile && (
              <p className="text-center text-sm text-muted-foreground">
                Bạn có thể upload biên lai Zelle sau
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
