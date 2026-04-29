export type TransactionStatus = 
  | 'awaiting_zelle_receipt'
  | 'processing_vn'
  | 'verify'
  | 'complete'
  | 'fail'

export type ReceiveMethod = 'bank_transfer' | 'cash_usd' | 'cash_vnd'

export interface Transaction {
  id: string
  amount: number
  receiver_name: string
  bank_name: string | null
  account_number: string | null
  receive_method: ReceiveMethod
  phone: string | null
  address: string | null
  status: TransactionStatus
  receipt_url: string | null
  transaction_code: string | null
  user_id: string | null
  session_id: string | null
  sender_email: string | null
  sender_phone: string | null
  payment_method: string | null
  // Rounding difference in VNĐ (requires rounding_difference_vnd column in Supabase)
  rounding_difference_vnd: number | null
  created_at: string
}
