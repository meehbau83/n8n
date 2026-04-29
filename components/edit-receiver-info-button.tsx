'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Pencil, User, Building2, CreditCard, Phone, MapPin, CheckCircle2 } from 'lucide-react'
import type { Transaction, ReceiveMethod } from '@/lib/types'

interface EditReceiverInfoButtonProps {
  transaction: Transaction
}

export function EditReceiverInfoButton({ transaction }: EditReceiverInfoButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [receiverName, setReceiverName] = useState(transaction.receiver_name)
  const [bankName, setBankName] = useState(transaction.bank_name || '')
  const [accountNumber, setAccountNumber] = useState(transaction.account_number || '')
  const [phone, setPhone] = useState(transaction.phone || '')
  const [address, setAddress] = useState(transaction.address || '')

  const isBankTransfer = transaction.receive_method === 'bank_transfer'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      // Build update object based on receive method
      const updateData: Record<string, string> = {
        receiver_name: receiverName,
        status: 'processing_vn',
      }

      if (isBankTransfer) {
        updateData.bank_name = bankName
        updateData.account_number = accountNumber
      } else {
        updateData.phone = phone
        updateData.address = address
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transaction.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setSuccess(true)
      
      // Close modal and refresh after showing success
      setTimeout(() => {
        setOpen(false)
        router.refresh()
      }, 1500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật thông tin. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Only allow editing when status is "verify"
  if (transaction.status !== 'verify') {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Cập nhật thông tin người nhận
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Cập nhật thông tin người nhận</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </div>
            <p className="font-semibold text-lg">Đã lưu thông tin!</p>
            <p className="text-sm text-muted-foreground mt-1">Giao dịch đang được xử lý.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error?.trim() ? (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            ) : null}

            <FieldGroup>
              {/* Receiver Name - Always shown */}
              <Field>
                <FieldLabel htmlFor="receiver_name">Tên người nhận</FieldLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="receiver_name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Nguyen Van A"
                    required
                    className="pl-10"
                  />
                </div>
              </Field>

              {/* Bank Transfer Fields */}
              {isBankTransfer && (
                <>
                  <Field>
                    <FieldLabel htmlFor="bank_name">Tên ngân hàng</FieldLabel>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="bank_name"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Vietcombank"
                        required
                        className="pl-10"
                      />
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="account_number">Số tài khoản</FieldLabel>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="account_number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="1234567890"
                        required
                        className="pl-10"
                      />
                    </div>
                  </Field>
                </>
              )}

              {/* Cash Delivery Fields */}
              {!isBankTransfer && (
                <>
                  <Field>
                    <FieldLabel htmlFor="phone">Số điện thoại</FieldLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0901234567"
                        required
                        className="pl-10"
                      />
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="address">Địa chỉ nhận tiền</FieldLabel>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Nguyen Hue, Q1, HCM"
                        required
                        className="pl-10"
                      />
                    </div>
                  </Field>
                </>
              )}
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl fintech-gradient"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  Đang lưu...
                </>
              ) : (
                'Lưu thông tin'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
