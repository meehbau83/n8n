'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Send, History, Shield, Wallet, LogIn, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// Admin email whitelist - must match /app/admin/page.tsx
const ADMIN_EMAILS = [
  "pminht83@gmail.com"
]

const navItems = [
  { href: '/send', label: 'Gửi tiền', icon: Send },
  { href: '/history', label: 'Lịch sử', icon: History },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Check if user is admin using the same whitelist as /admin page
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl fintech-gradient">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-tight">Lato</span>
              <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Link And Transfer Online</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}

            {/* Admin link - only show for admins */}
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                  pathname === '/admin'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            {/* Auth section */}
            {!loading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-2 rounded-full">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.user_metadata?.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Đăng xuất
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm" className="ml-2 rounded-full">
                      <LogIn className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Đăng nhập</span>
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
