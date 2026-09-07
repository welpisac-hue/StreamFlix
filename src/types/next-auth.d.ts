import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id: string
    username?: string
    role?: 'USER' | 'ADMIN'
    image?: string | null
    onboardingCompleted?: boolean
  }

  interface Session {
    user: {
      id: string
      username: string
      role: 'USER' | 'ADMIN'
      name?: string | null
      image?: string | null
      onboardingCompleted?: boolean
      banned?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    username?: string
    role?: 'USER' | 'ADMIN'
    roleCheckedAt?: number
    onboardingCompleted?: boolean
    banned?: boolean
  }
}
