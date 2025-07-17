import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email Verification',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Verification Code', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null
        }

        try {
          // 验证验证码
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'
          const response = await fetch(`${apiUrl}/api/auth/verify-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              code: credentials.code
            })
          })

          const data = await response.json()

          if (response.ok && data.success) {
            return {
              id: data.user?.id?.toString() || credentials.email,
              email: data.user?.email || credentials.email,
              name: data.user?.name || credentials.email,
              accessToken: data.jwt || data.token
            }
          }
        } catch (error) {
          console.error('Auth error:', error)
        }

        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account) {
        token.accessToken = (user as any).accessToken
      }
      return token
    },
    async session({ session, token }) {
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
} 