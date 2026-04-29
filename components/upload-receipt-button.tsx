'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Upload, CheckCircle2 } from 'lucide-react'

export function UploadReceiptButton({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Upload receipt
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file)

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      // Update transaction with receipt_url and change status to processing_vn
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          receipt_url: urlData.publicUrl,
          status: 'processing_vn',
        })
        .eq('id', transactionId)

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`)
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Tải lên biên nhận Zelle</span>
        </div>
        <Button
          size="sm"
          onClick={handleClick}
          disabled={loading}
          className="rounded-full bg-amber-600 hover:bg-amber-700"
        >
          {loading ? (
            <>
              <Spinner className="h-4 w-4 mr-1.5" />
              Đang tải...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-1.5" />
              Tải lên
            </>
          )}
        </Button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {error?.trim() ? (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
