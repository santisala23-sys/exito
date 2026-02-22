'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getToday } from '../lib/time';
import Link from 'next/link';

export default function Home() {
  const [pendientes, setPendientes] = useState({
    tasks: 0,
    otros: 0,
    entrenamiento: 0,
    nutricion: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calcularPendientes() {
      const today = getToday();

      // 1. Tasks Pendientes
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('completed', false);

      // 2. Otros (Hábitos diarios faltantes)
      const { data: allHabits } = await supabase.from('custom_tasks').select('id');
      const { data: doneHabits } = await supabase
        .from('daily_task_logs')
        .select('task_id')
        .eq('date', today)
        .eq('completed', true);
      
      const otrosCount = (allHabits?.length || 0) - (doneHabits?.length || 0);

      // 3. Entrenamiento (¿Hice algo hoy?)
      const { count: workoutDone } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);
      
      const entrenamientoCount = workoutDone > 0 ? 0 : 1;

      // 4. Nutrición (Comidas faltantes)
      const { count: mealsDone } = await supabase
        .from('meal_plan')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('completed', true);
      
      const nutricionCount = 4 - (mealsDone || 0);

      setPendientes({
        tasks: tasksCount || 0,
        otros: otrosCount < 0 ? 0 : otrosCount,
        entrenamiento: entrenamientoCount,
        nutricion: nutricionCount
      });
      setLoading(false);
    }

    calcularPendientes();
  }, []);

  const totalPendientes = pendientes.tasks + pendientes.otros + pendientes.entrenamiento + pendientes.nutricion;

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh', color: '#111' }}>
      
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: '900', letterSpacing: '-0.05em', margin: '0 0 0.5rem 0' }}>Hola Santi</h1>
        <div style={{ display: 'inline-block', backgroundColor: totalPendientes === 0 ? '#166534' : '#000', color: '#fff', padding: '10px 25px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1rem' }}>
          {loading ? '...' : totalPendientes === 0 ? '🎉 Todo listo' : `${totalPendientes} pendientes hoy`}
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        
        {/* TASKS - VIOLETA */}
        <Link href="/tasks" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1.8rem', backgroundColor: '#5D5CDE', color: '#fff', border: 'none', borderRadius: '28px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>📝 Tasks</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Pendientes únicas</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '18px' }}>
              {pendientes.tasks}
            </span>
          </button>
        </Link>

        {/* ENTRENAMIENTO - NEGRO */}
        <Link href="/entrenamiento" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1.8rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '28px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>🏋️ Entrenamiento</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{pendientes.entrenamiento > 0 ? 'Falta registrar' : 'Completado'}</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '18px' }}>
              {pendientes.entrenamiento}
            </span>
          </button>
        </Link>

        {/* NUTRICION - GRIS CLARO */}
        <Link href="/nutricion" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1.8rem', backgroundColor: '#f3f4f6', color: '#000', border: 'none', borderRadius: '28px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>🍎 Nutrición</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>Comidas restantes</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', backgroundColor: 'rgba(0,0,0,0.05)', padding: '10px 20px', borderRadius: '18px' }}>
              {pendientes.nutricion}
            </span>
          </button>
        </Link>

        {/* OTROS - GRIS OSCURO */}
        <Link href="/otros" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1.8rem', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '28px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>✨ Otros</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Hábitos diarios</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '18px' }}>
              {pendientes.otros}
            </span>
          </button>
        </Link>

      </div>

      <footer style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>
        ÉXITO APP • 2026
      </footer>
    </main>
  );
}