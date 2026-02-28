'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
// CAMBIO IMPORTANTE: Usamos ruta relativa y la nueva función createClient
import { createClient } from '../../lib/supabase'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  
  // Inicializamos el cliente aquí
  const supabase = createClient();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('¡Cuenta creada! Revisa tu email o inicia sesión.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Datos incorrectos ❌' : err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (El resto del return visual queda IGUAL que antes)
  // Solo asegúrate de copiar el return que ya tenías abajo de esto.
  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', backgroundColor: '#f9fafb', padding: '1rem', fontFamily: '-apple-system, system-ui, sans-serif' }}>
      <form onSubmit={handleAuth} style={{ backgroundColor: '#fff', padding: '2.5rem 1.5rem', borderRadius: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', width: '100%', maxWidth: '350px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.05em', margin: 0 }}>Éxito</h1>
            <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>{isSignUp ? 'Crear nueva cuenta' : 'Ingresá tus datos'}</p>
        </div>
        <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '16px', border: '2px solid #f3f4f6', outline: 'none', backgroundColor: '#f9fafb', boxSizing: 'border-box' }} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '16px', border: '2px solid #f3f4f6', outline: 'none', backgroundColor: '#f9fafb', boxSizing: 'border-box' }} />
        {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '600' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>{loading ? 'Cargando...' : (isSignUp ? 'Registrarme' : 'Entrar')}</button>
        <p onClick={() => { setIsSignUp(!isSignUp); setError(''); }} style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#666', textDecoration: 'underline' }}>{isSignUp ? '¿Ya tenés cuenta? Ingresar' : '¿No tenés cuenta? Registrate'}</p>
      </form>
    </main>
  );
}