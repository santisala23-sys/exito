'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Entrenamiento() {
  const [form, setForm] = useState({
    Flexiones: '',
    Abdominales: '',
    'Correr (km)': '',
    Bíceps: ''
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const guardarTodo = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filtramos solo los que tengan un valor cargado
    const logs = Object.entries(form)
      .filter(([_, value]) => value !== '' && value !== null)
      .map(([exercise, amount]) => ({
        exercise,
        amount: parseFloat(amount),
        date: today
      }));

    if (logs.length === 0) {
      alert("Cargá al menos un ejercicio");
      return;
    }

    const { error } = await supabase.from('workout_logs').insert(logs);

    if (error) {
      console.error(error);
      alert("Error al guardar");
    } else {
      alert('¡Entrenamiento registrado con éxito! 💪');
      setForm({ Flexiones: '', Abdominales: '', 'Correr (km)': '', Bíceps: '' });
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', fontFamily: '-apple-system, system-ui, sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      <Link href="/" style={{ textDecoration: 'none', color: '#999', fontSize: '0.9rem' }}>← Volver al inicio</Link>
      
      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '1.5rem 0' }}>Registro Diario</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Cargá lo que hiciste hoy para ver tu progreso mensual.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {Object.keys(form).map((ex) => (
          <div key={ex} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: '600', fontSize: '1rem', color: '#333' }}>{ex}</label>
            <input 
              name={ex}
              type="number" 
              placeholder="0" 
              value={form[ex]}
              onChange={handleChange}
              style={{ 
                padding: '1.2rem', 
                borderRadius: '16px', 
                border: '1px solid #eee', 
                fontSize: '1.1rem',
                backgroundColor: '#f9f9f9',
                outline: 'none'
              }}
            />
          </div>
        ))}

        <button 
          onClick={guardarTodo} 
          style={{ 
            padding: '1.5rem', 
            backgroundColor: '#000', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '20px', 
            fontWeight: 'bold', 
            fontSize: '1.1rem',
            marginTop: '1rem',
            cursor: 'pointer'
          }}
        >
          Registrar Entrenamiento
        </button>
      </div>
    </main>
  );
}