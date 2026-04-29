'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateSessionId } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Send, User } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<'guest' | 'google' | null>(null)

  const handleGuestContinue = () => {
    setLoading('guest')
    // Ensure session ID exists for guest
    getOrCreateSessionId()
    router.push('/send')
  }

  const handleGoogleLogin = async () => {
    setLoading('google')
    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
          `${window.location.origin}/auth/callback?next=/send`,
      },
    })

    if (error) {
      console.error('Google login error:', error)
      setLoading(null)
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm card-shadow-md border-0 bg-card/80 backdrop-blur">
        <CardContent className="pt-8 pb-8 px-6">
          {/* Logo / Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl fintech-gradient flex items-center justify-center">
              <Send className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Brand */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Lato</h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-wide">Link And Transfer Online</p>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <p className="text-lg font-semibold text-foreground mb-1">Chào mừng</p>
            <p className="text-sm text-muted-foreground">
              Chuyển tiền với tư cách khách hoặc đăng nhập để lưu lịch sử
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {/* Guest Button - Primary */}
            <Button
              onClick={handleGuestContinue}
              disabled={loading !== null}
              className="w-full h-12 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity"
            >
              {loading === 'guest' ? (
                <Spinner className="mr-2" />
              ) : (
                <User className="mr-2 h-5 w-5" />
              )}
              Tiếp tục với tư cách khách
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">hoặc</span>
              </div>
            </div>

            {/* Google Button - Secondary */}
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading !== null}
              className="w-full h-12 rounded-full text-base font-medium border-2 hover:bg-secondary/50 transition-colors"
            >
              {loading === 'google' ? (
                <Spinner className="mr-2" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Đăng nhập với Google
            </Button>
          </div>

          {/* Footer text */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            Đăng nhập để theo dõi tất cả giao dịch của bạn
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
