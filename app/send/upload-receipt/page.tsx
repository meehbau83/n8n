'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Upload, X, CheckCircle2 } from 'lucide-react'
import { getTransferState, setTransferState } from '@/lib/transfer-state'
import { StepProgress } from '@/components/send-flow/step-progress'
import { StickySummary } from '@/components/send-flow/sticky-summary'

export default function UploadReceiptPage() {
  const router = useRouter()
  const [state, setState] = useState(getTransferState())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    const stored = getTransferState()
    setState(stored)

    // Restore preview if previously uploaded
    if (stored.receipt_preview) {
      setPreview(stored.receipt_preview)
    }

    if (!stored.receive_method || stored.amount_usd <= 0) {
      router.push('/send/method')
    }
    if (!stored.sender_email && !stored.sender_phone) {
      router.push('/send/payment')
    }
  }, [router])

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

  const handleBack = () => {
    router.push('/send/zelle')
  }

  const handleSkip = () => {
    // Clear any existing receipt data
    setTransferState({
      receipt_file_name: null,
      receipt_preview: null,
    })
    sessionStorage.removeItem('receipt_file_data')
    sessionStorage.removeItem('receipt_file_name')
    sessionStorage.removeItem('receipt_file_type')

    router.push('/send/review')
  }

  const handleContinue = () => {
    // Save receipt preview to state
    setTransferState({
      receipt_file_name: selectedFile?.name || null,
      receipt_preview: preview,
    })

    // Store file in sessionStorage for review page to access
    if (selectedFile && preview) {
      sessionStorage.setItem('receipt_file_data', preview)
      sessionStorage.setItem('receipt_file_name', selectedFile.name)
      sessionStorage.setItem('receipt_file_type', selectedFile.type)
    }

    router.push('/send/review')
  }

  if (!state.receive_method || state.amount_usd <= 0) {
    return null
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Upload biên nhận Zelle</h1>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={5} />

        {/* Upload Card */}
        <div className="bg-card rounded-2xl p-4 border card-shadow-md">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Bạn có thể upload hình Zelle bây giờ hoặc cập nhật sau.
          </p>

          {!preview ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
              <Upload className="h-10 w-10 text-primary/50 mb-3" />
              <span className="text-sm font-medium text-foreground">Nhấn để tải lên</span>
              <span className="text-xs text-muted-foreground mt-1">PNG, JPG, HEIC</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full h-48 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-2 bg-success text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Đã tải lên
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 mb-16">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="h-12 rounded-full px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>

          {preview ? (
            <Button
              type="button"
              onClick={handleContinue}
              className="flex-1 h-12 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity"
            >
              Tiếp tục
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkip}
              className="flex-1 h-12 rounded-full text-base font-semibold"
            >
              Để sau
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Sticky Summary */}
      <StickySummary />
    </main>
  )
}
