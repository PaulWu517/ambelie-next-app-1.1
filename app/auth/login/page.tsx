'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 这里可以集成实际的登录逻辑
    console.log('Login attempt:', { email, password });
  };

  return (
    <main style={{ paddingTop: '120px', minHeight: '100vh' }}>
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto', 
        padding: '2rem',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <User size={48} style={{ margin: '0 auto 1rem', color: '#6b7280' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Sign In
          </h1>
          <p style={{ color: '#6b7280' }}>
            Welcome back to Ambelie
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                transition: 'border-color 0.2s'
              }}
              placeholder="Enter your email"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                transition: 'border-color 0.2s'
              }}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            Sign In
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link 
            href="/" 
            style={{ 
              color: '#6b7280', 
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
} 