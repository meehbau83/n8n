'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Building2, CreditCard, Phone, MapPin, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react'
import { getTransferState, setTransferState } from '@/lib/transfer-state'
import { StepProgress } from '@/components/send-flow/step-progress'

const VIETNAM_BANKS = [
  'Vietcombank',
  'Techcombank',
  'ACB',
  'BIDV',
  'VietinBank',
  'Sacombank',
  'MB Bank',
  'VPBank',
  'TPBank',
  'Agribank',
  'HDBank',
  'SHB',
  'Eximbank',
  'OCB',
  'SeABank',
  'Nam A Bank',
  'VIB',
  'SCB',
  'MSB',
  'UOB Vietnam',
]

export default function ReceiverPage() {
  const router = useRouter()
  const [state, setState] = useState(getTransferState())
  const [receiverName, setReceiverName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  

  useEffect(() => {
    const stored = getTransferState()
    setState(stored)
    // If no method selected, redirect back
    if (!stored.receive_method) {
      router.push('/send/method')
      return
    }
    // Restore saved values
    setReceiverName(stored.receiver_name || '')
    setBankName(stored.bank_name || '')
    setAccountNumber(stored.account_number || '')
    setPhone(stored.phone || '')
    setAddress(stored.address || '')
  }, [router])

  const isBankTransfer = state.receive_method === 'bank_transfer'

  const isValid = () => {
    if (!receiverName) return false
    if (isBankTransfer) {
      return !!bankName && !!accountNumber
    } else {
      return !!phone && !!address
    }
  }

  const getFieldError = (field: string): string | null => {
    if (!touched[field]) return null
    switch (field) {
      case 'receiverName':
        return !receiverName ? 'Vui lòng nhập tên người nhận' : null
      case 'bankName':
        return isBankTransfer && !bankName ? 'Vui lòng chọn ngân hàng' : null
      case 'accountNumber':
        return isBankTransfer && !accountNumber ? 'Vui lòng nhập số tài khoản' : null
      case 'phone':
        return !isBankTransfer && !phone ? 'Vui lòng nhập số điện thoại' : null
      case 'address':
        return !isBankTransfer && !address ? 'Vui lòng nhập địa chỉ' : null
      default:
        return null
    }
  }

  const handleContinue = () => {
    setTransferState({
      receiver_name: receiverName,
      bank_name: isBankTransfer ? bankName : '',
      account_number: isBankTransfer ? accountNumber : '',
      phone,
      address: !isBankTransfer ? address : '',
    })
    router.push('/send/amount')
  }

  const handleBack = () => {
    router.push('/send/method')
  }

  if (!state.receive_method) {
    return null
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Thông tin người nhận</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isBankTransfer ? 'Nhập thông tin tài khoản ngân hàng' : 'Nhập thông tin liên hệ và địa chỉ'}
          </p>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={3} />

        {/* Form */}
        <div className="bg-card rounded-2xl p-5 border card-shadow-md space-y-4">
          {/* Receiver Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Tên người nhận *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Nguyễn Văn A"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, receiverName: true }))}
                className={`h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary ${
                  getFieldError('receiverName') ? 'ring-2 ring-destructive' : ''
                }`}
              />
            </div>
            {getFieldError('receiverName') && (
              <p className="text-xs text-destructive mt-1">{getFieldError('receiverName')}</p>
            )}
          </div>

          {isBankTransfer ? (
            <>
              {/* Bank Name - Native Select */}
              <div>
                <label htmlFor="bank_name" className="text-sm font-medium text-foreground mb-2 block">Tên ngân hàng *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <select
                    name="bank_name"
                    id="bank_name"
                    required
                    tabIndex={0}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, bankName: true }))}
                    className={`w-full h-12 pl-11 pr-10 rounded-xl bg-secondary/30 border-0 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary focus:outline-none ${
                      bankName ? 'text-foreground' : 'text-muted-foreground'
                    } ${getFieldError('bankName') ? 'ring-2 ring-destructive' : ''}`}
                  >
                    <option value="" disabled>Chọn ngân hàng</option>
                    {VIETNAM_BANKS.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
                {getFieldError('bankName') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('bankName')}</p>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label htmlFor="account_number" className="text-sm font-medium text-foreground mb-2 block">Số tài khoản *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="account_number"
                    type="text"
                    placeholder="1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, accountNumber: true }))}
                    className={`h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary ${
                      getFieldError('accountNumber') ? 'ring-2 ring-destructive' : ''
                    }`}
                  />
                </div>
                {getFieldError('accountNumber') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('accountNumber')}</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Phone */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Số điện thoại *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                    className={`h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary ${
                      getFieldError('phone') ? 'ring-2 ring-destructive' : ''
                    }`}
                  />
                </div>
                {getFieldError('phone') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('phone')}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Địa chỉ giao tiền *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="123 Nguyễn Huệ, Q1, TP.HCM"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, address: true }))}
                    className={`h-12 pl-11 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary ${
                      getFieldError('address') ? 'ring-2 ring-destructive' : ''
                    }`}
                  />
                </div>
                {getFieldError('address') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('address')}</p>
                )}
              </div>
            </>
          )}
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
            disabled={!isValid()}
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
