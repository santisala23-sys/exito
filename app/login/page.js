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
      document.cookie = "exito_auth=true; path=/; max-age=" + 60 * 60 * 24 * 30;
      router.push('/');
    } else {
      setError('PIN incorrecto ❌');
      setPin('');
    }
  };

  return (
    <main style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100dvh', // Usamos dvh para que en el celu ignore las barras del navegador
      backgroundColor: '#f9fafb', 
      padding: '1rem', 
      fontFamily: '-apple-system, system-ui, sans-serif' 
    }}>
      <form onSubmit={handleLogin} style={{ 
        backgroundColor: '#fff', 
        padding: '2.5rem 1.5rem', 
        borderRadius: '32px', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.05)', 
        width: '100%', 
        maxWidth: '350px', // Un poco más angosto para que no toque los bordes
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-0.05em' }}>Éxito</h1>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.95rem' }}>Ingresá tu PIN</p>
        
        <input 
          type="password" 
          inputMode="numeric" // Mantiene el teclado numérico
          pattern="[0-9]*"    // Ayuda a algunos navegadores a entender que es solo números
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          autoFocus
          style={{ 
            width: '100%', 
            padding: '1rem', 
            fontSize: '2.5rem', 
            textAlign: 'center', 
            borderRadius: '20px', 
            border: '2px solid #f3f4f6', 
            marginBottom: '1rem', 
            letterSpacing: '0.2em', 
            outline: 'none',
            backgroundColor: '#f9fafb',
            boxSizing: 'border-box'
          }}
        />
        
        <div style={{ minHeight: '24px', marginBottom: '1rem' }}>
          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '600' }}>{error}</p>}
        </div>

        <button type="submit" style={{ 
          width: '100%', 
          padding: '1.2rem', 
          backgroundColor: '#000', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '20px', 
          fontSize: '1.1rem', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          Entrar
        </button>
      </form>
    </main>
  );
}