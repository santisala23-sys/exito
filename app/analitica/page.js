'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getToday } from '../../lib/time';
import Link from 'next/link';

export default function Analitica() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    workouts: {},
    habits: { total: 0, done: 0 },
    nutrition: { total: 0, done: 0 },
    tasks: { pending: 0, completed: 0 }
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    // Calculamos la fecha de hace 7 días para las métricas semanales
    const todayStr = getToday();
    const todayObj = new Date(todayStr);
    const sevenDaysAgoObj = new Date(todayObj);
    sevenDaysAgoObj.setDate(todayObj.getDate() - 7);
    
    const y = sevenDaysAgoObj.getFullYear();
    const m = String(sevenDaysAgoObj.getMonth() + 1).padStart(2, '0');
    const d = String(sevenDaysAgoObj.getDate()).padStart(2, '0');
    const sevenDaysAgoStr = `${y}-${m}-${d}`;

    // 1. Traer datos de Entrenamiento (Últimos 7 días)
    const { data: workoutsData } = await supabase.from('workout_logs').select('*').gte('date', sevenDaysAgoStr);
    const wStats = {};
    if (workoutsData) {
      workoutsData.forEach(log => {
        if (!wStats[log.exercise]) wStats[log.exercise] = 0;
        wStats[log.exercise] += log.amount;
      });
    }

    // 2. Traer datos de Hábitos (Últimos 7 días)
    // Para simplificar, vemos cuántos registros de 'completed: true' hubo vs la cantidad de hábitos activos
    const { data: activeHabits } = await supabase.from('custom_tasks').select('id');
    const { data: habitsData } = await supabase.from('daily_task_logs').select('*').gte('date', sevenDaysAgoStr);
    
    let hDone = 0;
    if (habitsData) {
      hDone = habitsData.filter(h => h.completed).length;
    }
    const hTotal = (activeHabits?.length || 0) * 7; // Hábitos totales posibles en 7 días

    // 3. Traer datos de Nutrición (Últimos 7 días)
    const { data: mealsData } = await supabase.from('meal_plan').select('*').gte('date', sevenDaysAgoStr);
    let mDone = 0;
    let mTotal = 28; // 4 comidas * 7 días
    if (mealsData) {
      mDone = mealsData.filter(m => m.completed).length;
    }

    // 4. Traer datos de Tareas (Totales históricas)
    const { data: tasksData } = await supabase.from('tasks').select('completed');
    let tPending = 0;
    let tCompleted = 0;
    if (tasksData) {
      tPending = tasksData.filter(t => !t.completed).length;
      tCompleted = tasksData.filter(t => t.completed).length;
    }

    setStats({
      workouts: wStats,
      habits: { total: hTotal, done: hDone },
      nutrition: { total: mTotal, done: mDone },
      tasks: { pending: tPending, completed: tCompleted }
    });
    
    setLoading(false);
  }

  // --- COMPONENTES DE UI ---
  const Card = ({ title, children, icon, color }) => (
    <div style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid #eee', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: color, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', marginRight: '15px' }}>
          {icon}
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#111' }}>{title}</h2>
      </div>
      {children}
    </div>
  );

  const ProgressBar = ({ done, total, color }) => {
    const percent = total > 0 ? Math.min((done / total) * 100, 100) : 0;
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', color: '#666', marginBottom: '5px' }}>
          <span>{done} completados</span>
          <span>{Math.round(percent)}%</span>
        </div>
        <div style={{ width: '100%', height: '10px', backgroundColor: '#f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', backgroundColor: color, transition: 'width 1s ease' }}></div>
        </div>
      </div>
    );
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver al inicio</Link>
      </header>

      <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 0.5rem 0', letterSpacing: '-0.05em' }}>Analítica</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Tu rendimiento de los últimos 7 días.</p>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#999', marginTop: '3rem', fontWeight: 'bold' }}>Calculando métricas...</p>
      ) : (
        <>
          {/* ENTRENAMIENTO */}
          <Card title="Esfuerzo Físico" icon="💪" color="#e0e7ff">
            {Object.keys(stats.workouts).length === 0 ? (
              <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>No hay registros en los últimos 7 días.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(stats.workouts).map(([exercise, amount]) => (
                  <div key={exercise} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                    <span style={{ fontWeight: '600', color: '#333' }}>{exercise}</span>
                    <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#5D5CDE' }}>{amount}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* HÁBITOS */}
          <Card title="Consistencia (Hábitos)" icon="✨" color="#fef3c7">
            <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 5px 0' }}>Tasa de cumplimiento semanal</p>
            <ProgressBar done={stats.habits.done} total={stats.habits.total} color="#f59e0b" />
          </Card>

          {/* NUTRICIÓN */}
          <Card title="Adherencia Nutricional" icon="🥗" color="#dcfce7">
            <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 5px 0' }}>Comidas planificadas cumplidas</p>
            <ProgressBar done={stats.nutrition.done} total={stats.nutrition.total} color="#166534" />
          </Card>

          {/* TAREAS */}
          <Card title="Productividad (Tareas)" icon="✅" color="#fee2e2">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ padding: '15px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '2rem', fontWeight: '900', color: '#111' }}>{stats.tasks.completed}</span>
                <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', fontWeight: '700' }}>Hechas</span>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '2rem', fontWeight: '900', color: '#991b1b' }}>{stats.tasks.pending}</span>
                <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', fontWeight: '700' }}>Pendientes</span>
              </div>
            </div>
          </Card>
        </>
      )}

    </main>
  );
}