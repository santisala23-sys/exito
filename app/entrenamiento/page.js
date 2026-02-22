'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getToday } from '../../lib/time';
import Link from 'next/link';

export default function Entrenamiento() {
  const [types, setTypes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', goal_amount: 0, goal_period: 'diario' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // 1. Traer configuración de ejercicios
    const { data: t } = await supabase.from('workout_types').select('*').order('created_at');
    
    // 2. Traer registros de los últimos 31 días (para poder calcular metas mensuales y semanales)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data: l } = await supabase.from('workout_logs').select('*').gte('date', dateString);
    
    if (t) setTypes(t);
    if (l) setLogs(l);
    setLoading(false);
  }

  // --- LÓGICA DE PROGRESO (Ajustada a hora Argentina) ---
  const calcularProgreso = (exName, period) => {
    // Usamos getToday() para saber qué día es hoy en Argentina
    const todayStr = getToday(); 
    
    // Convertimos ese string ('YYYY-MM-DD') en un objeto Date para poder operar (saber si es lunes, etc.)
    const parts = todayStr.split('-');
    // Atención: el mes en JS arranca en 0 (Enero=0), por eso parts[1] - 1
    const todayArg = new Date(parts[0], parts[1] - 1, parts[2]); 
    
    // Calcular el inicio de esta semana (Lunes)
    const startOfWeek = new Date(todayArg);
    const dayOfWeek = startOfWeek.getDay() || 7; // Si es domingo (0), lo tomamos como 7
    startOfWeek.setDate(todayArg.getDate() - dayOfWeek + 1);
    
    // Formatear el Lunes a YYYY-MM-DD para comparar con Supabase
    const yWeek = startOfWeek.getFullYear();
    const mWeek = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const dWeek = String(startOfWeek.getDate()).padStart(2, '0');
    const weekStr = `${yWeek}-${mWeek}-${dWeek}`;

    // Calcular el día 1 del mes actual
    const monthStr = `${parts[0]}-${parts[1]}-01`;

    return logs.filter(log => {
      if (log.exercise !== exName) return false;
      if (period === 'diario') return log.date === todayStr;
      if (period === 'semanal') return log.date >= weekStr && log.date <= todayStr;
      if (period === 'mensual') return log.date >= monthStr && log.date <= todayStr;
      return false;
    }).reduce((acc, curr) => acc + curr.amount, 0);
  };

  // --- REGISTRAR HOY (Ajustado a hora Argentina) ---
  const guardarTodo = async () => {
    // Usamos la hora de Argentina para guardar en la DB
    const today = getToday(); 
    
    const newLogs = Object.entries(form)
      .filter(([_, val]) => val !== '' && val !== null && val > 0)
      .map(([exercise, amount]) => ({
        exercise,
        amount: parseFloat(amount),
        date: today
      }));

    if (newLogs.length === 0) return alert("Cargá al menos un ejercicio");

    const { error } = await supabase.from('workout_logs').insert(newLogs);
    if (!error) {
      alert('¡Entrenamiento registrado! 💪');
      setForm({});
      fetchData(); // Recargar para actualizar barritas
    } else {
      console.error(error);
      alert('Error al guardar.');
    }
  };

  // --- CONFIGURACIÓN DE METAS ---
  const addExercise = async (e) => {
    e.preventDefault();
    if (!newExercise.name.trim()) return;
    const { data, error } = await supabase.from('workout_types').insert([newExercise]).select();
    if (!error) {
      setTypes([...types, data[0]]);
      setNewExercise({ name: '', goal_amount: 0, goal_period: 'diario' });
    }
  };

  const updateGoal = async (id, field, value) => {
    await supabase.from('workout_types').update({ [field]: value }).eq('id', id);
    setTypes(types.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver</Link>
        <button 
          onClick={() => setEditMode(!editMode)}
          style={{ padding: '10px 18px', borderRadius: '16px', border: 'none', backgroundColor: editMode ? '#ef4444' : '#f3f4f6', color: editMode ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {editMode ? 'Terminar Edición' : '⚙️ Configurar Metas'}
        </button>
      </header>

      {!editMode ? (
        <>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 0.5rem 0', letterSpacing: '-0.05em' }}>Entrenamiento</h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>Cargá lo de hoy. Las barras miden tu progreso según la meta.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {loading ? <p>Cargando métricas...</p> : types.map(t => {
              const currentProgress = calcularProgreso(t.name, t.goal_period);
              const isGoalReached = currentProgress >= t.goal_amount;
              const percent = t.goal_amount > 0 ? Math.min((currentProgress / t.goal_amount) * 100, 100) : 0;

              return (
                <div key={t.id} style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid #eee', backgroundColor: isGoalReached ? '#f0fdf4' : '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t.name}</h3>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isGoalReached ? '#166534' : '#999', textTransform: 'uppercase' }}>
                      {t.goal_period}
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px', fontWeight: '600', color: isGoalReached ? '#166534' : '#111' }}>
                      <span>Llevás: {currentProgress}</span>
                      <span>Meta: {t.goal_amount}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: isGoalReached ? '#bbf7d0' : '#f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', backgroundColor: isGoalReached ? '#166534' : '#000', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="number" 
                      placeholder="¿Cuánto sumar hoy?" 
                      value={form[t.name] || ''}
                      onChange={(e) => setForm({...form, [t.name]: e.target.value})}
                      style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #ddd', outline: 'none', backgroundColor: '#f9fafb', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              );
            })}

            {types.length > 0 && (
              <button onClick={guardarTodo} style={{ width: '100%', padding: '1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '24px', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                Guardar Progreso
              </button>
            )}
          </div>
        </>
      ) : (
        /* MODO CONFIGURACIÓN */
        <>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 2rem 0', letterSpacing: '-0.05em' }}>Tus Metas</h1>
          
          <form onSubmit={addExercise} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '3rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '20px', border: '1px solid #eee' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Añadir nuevo ejercicio</h3>
            
            <input 
              type="text" 
              placeholder="Nombre (ej: Sentadillas)" 
              value={newExercise.name}
              onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box' }}
            />
            
            {/* Contenedor Grid asegurando simetría */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
              <input 
                type="number" 
                placeholder="Meta (ej: 100)" 
                value={newExercise.goal_amount || ''}
                onChange={(e) => setNewExercise({...newExercise, goal_amount: parseInt(e.target.value) || 0})}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
              <select 
                value={newExercise.goal_period}
                onChange={(e) => setNewExercise({...newExercise, goal_period: e.target.value})}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#5D5CDE', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
              + Agregar
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {types.map(t => (
              <div key={t.id} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{t.name}</span>
                
                {/* Contenedor Grid asegurando simetría en la lista */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                  <input 
                    type="number" 
                    defaultValue={t.goal_amount}
                    onBlur={(e) => updateGoal(t.id, 'goal_amount', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                  />
                  <select 
                    defaultValue={t.goal_period}
                    onChange={(e) => updateGoal(t.id, 'goal_period', e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}