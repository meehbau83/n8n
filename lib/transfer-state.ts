'use client'

import type { ReceiveMethod } from '@/lib/types'

export interface TransferState {
  destination_country: string | null
  receive_method: ReceiveMethod | null
  receiver_name: string
  bank_name: string
  account_number: string
  phone: string
  address: string
  amount_usd: number
  amount_vnd: number
  rounding_difference_vnd: number
  fee_usd: number
  exchange_rate: number
  sender_email: string
  sender_phone: string
  payment_method: string
  receipt_file_name: string | null
  receipt_preview: string | null
  transaction_code: string | null
}

const STORAGE_KEY = 'transfer_state'

const defaultState: TransferState = {
  destination_country: null,
  receive_method: null,
  receiver_name: '',
  bank_name: '',
  account_number: '',
  phone: '',
  address: '',
  amount_usd: 0,
  amount_vnd: 0,
  rounding_difference_vnd: 0,
  fee_usd: 0,
  exchange_rate: 25000,
  sender_email: '',
  sender_phone: '',
  payment_method: 'zelle',
  receipt_file_name: null,
  receipt_preview: null,
  transaction_code: null,
}

export function getTransferState(): TransferState {
  if (typeof window === 'undefined') return defaultState
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) }
    }
  } catch {}
  return defaultState
}

export function setTransferState(state: Partial<TransferState>): TransferState {
  const current = getTransferState()
  const updated = { ...current, ...state }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }
  return updated
}

export function clearTransferState(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

// Default fee configuration (fallback if Supabase fetch fails)
export const DEFAULT_FEES: Record<ReceiveMethod, number> = {
  bank_transfer: 0,
  cash_usd: 5,
  cash_vnd: 5,
}

export const DEFAULT_EXCHANGE_RATE = 25000

// These will be populated from Supabase app_settings
// Use getAppSettings() to fetch current values
export let FEES: Record<ReceiveMethod, number> = { ...DEFAULT_FEES }
export let EXCHANGE_RATE = DEFAULT_EXCHANGE_RATE

// Fetch app settings from Supabase and update the exported values
export async function fetchAppSettings(): Promise<{
  exchange_rate: number
  fees: Record<ReceiveMethod, number>
}> {
  try {
    // Dynamic import to avoid SSR issues
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('exchange_rate, bank_fee_usd, cash_vnd_fee_usd, cash_usd_fee_usd')
      .limit(1)
      .single()

    if (error || !data) {
      console.warn('[v0] Failed to fetch app_settings, using defaults:', error?.message)
      return {
        exchange_rate: DEFAULT_EXCHANGE_RATE,
        fees: DEFAULT_FEES,
      }
    }

    // Update the exported values
    EXCHANGE_RATE = data.exchange_rate || DEFAULT_EXCHANGE_RATE
    FEES = {
      bank_transfer: data.bank_fee_usd ?? 0,
      cash_vnd: data.cash_vnd_fee_usd ?? 5,
      cash_usd: data.cash_usd_fee_usd ?? 5,
    }

    return {
      exchange_rate: EXCHANGE_RATE,
      fees: FEES,
    }
  } catch (err) {
    console.warn('[v0] Error fetching app_settings:', err)
    return {
      exchange_rate: DEFAULT_EXCHANGE_RATE,
      fees: DEFAULT_FEES,
    }
  }
}
