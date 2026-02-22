'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getToday } from '../../lib/time';
import Link from 'next/link';

export default function Analitica() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    workouts: [],
    habits: { total: 0, done: 0 },
    nutrition: { total: 0, done: 0 },
    tasks: { pending: 0, completed: 0 }
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    // --- LÓGICA DE FECHAS (Hora Argentina) ---
    const todayStr = getToday();
    const parts = todayStr.split('-');
    const todayArg = new Date(parts[0], parts[1] - 1, parts[2]); 
    
    // Hace 7 días (para hábitos y nutrición)
    const sevenDaysAgoObj = new Date(todayArg);
    sevenDaysAgoObj.setDate(todayArg.getDate() - 7);
    const sevenDaysAgoStr = `${sevenDaysAgoObj.getFullYear()}-${String(sevenDaysAgoObj.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgoObj.getDate()).padStart(2, '0')}`;

    // Inicio de esta semana (Lunes)
    const startOfWeek = new Date(todayArg);
    const dayOfWeek = startOfWeek.getDay() || 7;
    startOfWeek.setDate(todayArg.getDate() - dayOfWeek + 1);
    const weekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;

    // Inicio de este mes (Día 1)
    const monthStr = `${parts[0]}-${parts[1]}-01`;

    // 1. Traer datos de Entrenamiento (Metas vs Realidad)
    const { data: wTypes } = await supabase.from('workout_types').select('*');
    const { data: wLogs } = await supabase.from('workout_logs').select('*').gte('date', monthStr); // Traemos desde principio de mes para cubrir todo
    
    let workoutStats = [];
    if (wTypes && wLogs) {
      workoutStats = wTypes.map(t => {
        let progress = 0;
        wLogs.forEach(log => {
          if (log.exercise === t.name) {
            if (t.goal_period === 'diario' && log.date === todayStr) progress += log.amount;
            if (t.goal_period === 'semanal' && log.date >= weekStr && log.date <= todayStr) progress += log.amount;
            if (t.goal_period === 'mensual' && log.date >= monthStr && log.date <= todayStr) progress += log.amount;
          }
        });
        return { name: t.name, progress, goal: t.goal_amount, period: t.goal_period };
      });
    }

    // 2. Traer datos de Hábitos (Últimos 7 días)
    const { data: activeHabits } = await supabase.from('custom_tasks').select('id');
    const { data: habitsData } = await supabase.from('daily_task_logs').select('*').gte('date', sevenDaysAgoStr);
    let hDone = habitsData ? habitsData.filter(h => h.completed).length : 0;
    const hTotal = (activeHabits?.length || 0) * 7; 

    // 3. Traer datos de Nutrición (Últimos 7 días)
    const { data: mealsData } = await supabase.from('meal_plan').select('*').gte('date', sevenDaysAgoStr);
    let mDone = mealsData ? mealsData.filter(m => m.completed).length : 0;
    let mTotal = 28; // 4 comidas * 7 días

    // 4. Traer datos de Tareas (Totales históricas)
    const { data: tasksData } = await supabase.from('tasks').select('completed');
    let tPending = 0;
    let tCompleted = 0;
    if (tasksData) {
      tPending = tasksData.filter(t => !t.completed).length;
      tCompleted = tasksData.filter(t => t.completed).length;
    }

    setStats({
      workouts: workoutStats,
      habits: { total: hTotal, done: hDone },
      nutrition: { total: mTotal, done: mDone },
      tasks: { pending: tPending, completed: tCompleted }
    });
    
    setLoading(false);
  }

  // --- COMPONENTES DE UI ---
  const Card = ({ title, children, icon, color }) => (
    <div style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid #eee', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: '1.5rem', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: color, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', marginRight: '15px', flexShrink: 0 }}>
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
      <p style={{ color: '#666', marginBottom: '2rem' }}>Tu rendimiento y progreso de objetivos.</p>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#999', marginTop: '3rem', fontWeight: 'bold' }}>Calculando métricas...</p>
      ) : (
        <>
          {/* ENTRENAMIENTO: AHORA AGRUPADO POR PERIODOS */}
          <Card title="Metas Físicas" icon="💪" color="#e0e7ff">
            {stats.workouts.length === 0 ? (
              <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>No tenés metas configuradas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {['diario', 'semanal', 'mensual'].map(periodo => {
                  const items = stats.workouts.filter(w => w.period === periodo);
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={periodo} style={{ marginBottom: '15px' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                        Objetivo {periodo}
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {items.map(w => {
                          const percent = w.goal > 0 ? Math.min((w.progress / w.goal) * 100, 100) : 0;
                          const isDone = w.progress >= w.goal;
                          return (
                            <div key={w.name}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600', color: isDone ? '#166534' : '#111', marginBottom: '4px' }}>
                                <span>{w.name}</span>
                                <span>{w.progress} / {w.goal}</span>
                              </div>
                              <div style={{ width: '100%', height: '8px', backgroundColor: isDone ? '#dcfce7' : '#f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${percent}%`, height: '100%', backgroundColor: isDone ? '#166534' : '#5D5CDE', transition: 'width 1s ease' }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* HÁBITOS */}
          <Card title="Consistencia (Hábitos)" icon="✨" color="#fef3c7">
            <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 5px 0' }}>Tasa de cumplimiento (Últimos 7 días)</p>
            <ProgressBar done={stats.habits.done} total={stats.habits.total} color="#f59e0b" />
          </Card>

          {/* NUTRICIÓN */}
          <Card title="Adherencia Nutricional" icon="🥗" color="#dcfce7">
            <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 5px 0' }}>Comidas planificadas cumplidas (Últimos 7 días)</p>
            <ProgressBar done={stats.nutrition.done} total={stats.nutrition.total} color="#166534" />
          </Card>

          {/* TAREAS */}
          <Card title="Productividad (Tareas)" icon="✅" color="#fee2e2">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f9fafb', border: '1px solid #eee', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '2rem', fontWeight: '900', color: '#111' }}>{stats.tasks.completed}</span>
                <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: '800' }}>Hechas</span>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#fff0f0', border: '1px solid #fee2e2', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '2rem', fontWeight: '900', color: '#991b1b' }}>{stats.tasks.pending}</span>
                <span style={{ fontSize: '0.75rem', color: '#991b1b', textTransform: 'uppercase', fontWeight: '800' }}>Pendientes</span>
              </div>
            </div>
          </Card>
        </>
      )}

    </main>
  );
}