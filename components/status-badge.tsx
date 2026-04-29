import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, AlertTriangle, Loader2, XCircle } from 'lucide-react'
import type { TransactionStatus } from '@/lib/types'

const statusConfig: Record<TransactionStatus, { 
  label: string
  className: string
  icon: typeof CheckCircle2
}> = {
  awaiting_zelle_receipt: { 
    label: 'Chờ biên nhận Zelle', 
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock
  },
  processing_vn: { 
    label: 'Đang xử lý ở VN', 
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Loader2
  },
  verify: { 
    label: 'Cần cập nhật thông tin người nhận', 
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: AlertTriangle
  },
  complete: { 
    label: 'Hoàn tất', 
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2
  },
  fail: { 
    label: 'Thất bại', 
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle
  },
}

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const config = statusConfig[status] || statusConfig.awaiting_zelle_receipt
  const Icon = config.icon
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      config.className
    )}>
      <Icon className={cn('h-3 w-3', status === 'processing_vn' && 'animate-spin')} />
      {config.label}
    </span>
  )
}
