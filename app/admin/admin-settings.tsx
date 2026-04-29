'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

/*
Required Supabase table SQL:

CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exchange_rate INTEGER NOT NULL DEFAULT 25000,
  bank_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  cash_vnd_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 5,
  cash_usd_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 5,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row
INSERT INTO app_settings (exchange_rate, bank_fee_usd, cash_vnd_fee_usd, cash_usd_fee_usd)
VALUES (25000, 0, 5, 5);

-- RLS policy (optional - restrict to admin)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON app_settings FOR ALL USING (auth.role() = 'authenticated');
*/

interface AppSettings {
  id: string
  exchange_rate: number
  bank_fee_usd: number
  cash_vnd_fee_usd: number
  cash_usd_fee_usd: number
  updated_at: string
}

export function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [exchangeRate, setExchangeRate] = useState('25000')
  const [bankFee, setBankFee] = useState('0')
  const [cashVndFee, setCashVndFee] = useState('5')
  const [cashUsdFee, setCashUsdFee] = useState('5')
  const [settingsId, setSettingsId] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      // Table might not exist yet
      if (error.code === 'PGRST116') {
        setError('Bảng app_settings chưa tồn tại. Vui lòng tạo bảng theo hướng dẫn trong code.')
      } else {
        setError(`Lỗi tải cài đặt: ${error.message}`)
      }
      setLoading(false)
      return
    }

    if (data) {
      const settings = data as AppSettings
      setSettingsId(settings.id)
      setExchangeRate(settings.exchange_rate.toString())
      setBankFee(settings.bank_fee_usd.toString())
      setCashVndFee(settings.cash_vnd_fee_usd.toString())
      setCashUsdFee(settings.cash_usd_fee_usd.toString())
    }
    
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    
    const updateData = {
      exchange_rate: parseInt(exchangeRate) || 25000,
      bank_fee_usd: parseFloat(bankFee) || 0,
      cash_vnd_fee_usd: parseFloat(cashVndFee) || 5,
      cash_usd_fee_usd: parseFloat(cashUsdFee) || 5,
      updated_at: new Date().toISOString(),
    }

    let result
    if (settingsId) {
      // Update existing row
      result = await supabase
        .from('app_settings')
        .update(updateData)
        .eq('id', settingsId)
    } else {
      // Insert new row
      result = await supabase
        .from('app_settings')
        .insert(updateData)
        .select()
        .single()
      
      if (result.data) {
        setSettingsId(result.data.id)
      }
    }

    if (result.error) {
      setError(`Lỗi lưu cài đặt: ${result.error.message}`)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    
    setSaving(false)
  }

  // Format number input with commas
  const formatNumber = (value: string) => {
    const num = value.replace(/[^\d]/g, '')
    if (!num) return ''
    return parseInt(num).toLocaleString('en-US')
  }

  // Parse formatted number back to plain digits
  const parseNumber = (value: string) => {
    return value.replace(/[^\d]/g, '')
  }

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 card-shadow border mb-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Đang tải cài đặt...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl p-6 card-shadow border mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <Settings className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Cài đặt tỷ giá & phí</h2>
          <p className="text-sm text-muted-foreground">Cập nhật tỷ giá và phí giao dịch</p>
        </div>
      </div>

      {error?.trim() ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : null}

      {success && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm text-success font-medium">Đã lưu cài đặt thành công!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Exchange Rate */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Tỷ giá USD → VNĐ
          </label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              value={formatNumber(exchangeRate)}
              onChange={(e) => setExchangeRate(parseNumber(e.target.value))}
              className="h-11 pr-12"
              placeholder="25000"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
          </div>
        </div>

        {/* Bank Transfer Fee */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Phí nhận qua ngân hàng
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={bankFee}
              onChange={(e) => setBankFee(e.target.value)}
              className="h-11 pl-7"
              placeholder="0"
            />
          </div>
        </div>

        {/* Cash VND Fee */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Phí giao tiền mặt VNĐ tận nơi
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={cashVndFee}
              onChange={(e) => setCashVndFee(e.target.value)}
              className="h-11 pl-7"
              placeholder="5"
            />
          </div>
        </div>

        {/* Cash USD Fee */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Phí giao tiền mặt USD tận nơi
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={cashUsdFee}
              onChange={(e) => setCashUsdFee(e.target.value)}
              className="h-11 pl-7"
              placeholder="5"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full px-6"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            'Lưu cài đặt'
          )}
        </Button>
      </div>
    </div>
  )
}
