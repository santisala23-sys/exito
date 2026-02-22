'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (pin === process.env.NEXT_PUBLIC_APP_PIN) {
      // Seteamos una "cookie" de autorización que dura 30 días
      document.cookie = "exito_auth=true; path=/; max-age=" + 60 * 60 * 24 * 30;
      router.push('/');
    } else {
      setError('PIN incorrecto ❌');
      setPin('');
    }
  };

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem', fontFamily: 'sans-serif' }}>
      <form onSubmit={handleLogin} style={{ backgroundColor: '#fff', padding: '2.5rem 2rem', borderRadius: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-0.05em' }}>Éxito</h1>
        <p style={{ color: '#666', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Ingresá tu PIN para acceder</p>
        
        <input 
          type="password" 
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          style={{ width: '100%', padding: '1.2rem', fontSize: '2rem', textAlign: 'center', borderRadius: '20px', border: '2px solid #eee', marginBottom: '1rem', letterSpacing: '0.3em', outline: 'none' }}
        />
        
        <div style={{ minHeight: '24px', marginBottom: '1rem' }}>
          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: 0, fontWeight: '600' }}>{error}</p>}
        </div>

        <button type="submit" style={{ width: '100%', padding: '1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
          Entrar
        </button>
      </form>
    </main>
  );
}