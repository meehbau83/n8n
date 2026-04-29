'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Mail, Lock, ArrowRight, Send, User } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
            `${window.location.origin}/auth/callback`,
          data: {
            full_name: name,
          },
        },
      })

      if (error) {
        throw error
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md rounded-2xl card-shadow-md border">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold mb-2">Kiểm tra email của bạn</h2>
            <p className="text-muted-foreground mb-6">
              Chúng tôi đã gửi link xác nhận tới <strong>{email}</strong>. 
              Vui lòng kiểm tra email để hoàn tất đăng ký.
            </p>
            <Link href="/auth/login">
              <Button variant="outline" className="rounded-full">
                Quay lại đăng nhập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl card-shadow-md border">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto w-14 h-14 rounded-2xl fintech-gradient flex items-center justify-center mb-2">
            <Send className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Tạo tài khoản</CardTitle>
          <CardDescription>Đăng ký để theo dõi tất cả giao dịch của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error?.trim() ? (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            ) : null}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Họ và tên</FieldLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tối thiểu 6 ký tự</p>
              </Field>
            </FieldGroup>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 rounded-full text-base font-semibold fintech-gradient hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  Đang tạo tài khoản...
                </>
              ) : (
                <>
                  Đăng ký
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">
              Đăng nhập
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Tiếp tục không đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
