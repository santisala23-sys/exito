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

  // --- ESTADOS PARA ACCESOS RÁPIDOS ---
  const [cigStatus, setCigStatus] = useState(''); 
  const [showParking, setShowParking] = useState(false);
  const [parkingLoc, setParkingLoc] = useState('');
  const [parkingInput, setParkingInput] = useState('');
  const [parkingStatus, setParkingStatus] = useState('');

  useEffect(() => {
    async function initData() {
      const today = getToday();

      // 1. Tasks Pendientes (Solo de hoy, atrasadas o sin fecha)
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('completed', false)
        .or(`due_date.lte.${today},due_date.is.null`);
      
      const tasksCount = tasksData ? tasksData.length : 0;

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
        tasks: tasksCount,
        otros: otrosCount < 0 ? 0 : otrosCount,
        entrenamiento: entrenamientoCount,
        nutricion: nutricionCount
      });

      // 5. Cargar última ubicación del auto
      const { data: parkData } = await supabase.from('parking').select('location').eq('id', 1).single();
      if (parkData) {
        setParkingLoc(parkData.location);
        setParkingInput(parkData.location === 'No registrado' ? '' : parkData.location);
      }

      setLoading(false);
    }

    initData();
  }, []);

  const totalPendientes = pendientes.tasks + pendientes.otros + pendientes.entrenamiento + pendientes.nutricion;

  // --- FUNCIONES DE ACCESOS RÁPIDOS ---
  const logCigarette = async () => {
    setCigStatus('⏳');
    const { error } = await supabase.from('cigarettes_log').insert([{}]); 
    if (!error) {
      setCigStatus('✅ Registrado');
      setTimeout(() => setCigStatus(''), 2000); 
    } else {
      setCigStatus('❌ Error');
      setTimeout(() => setCigStatus(''), 2000);
    }
  };

  const toggleParking = () => {
    setShowParking(!showParking);
    setParkingStatus('');
  };

  const saveParking = async (e) => {
    e.preventDefault();
    setParkingStatus('⏳');
    const newLocation = parkingInput.trim() || 'No registrado';
    const { error } = await supabase.from('parking').upsert({ id: 1, location: newLocation, updated_at: new Date() });
    
    if (!error) {
      setParkingLoc(newLocation);
      setParkingStatus('✅ Guardado');
      setTimeout(() => {
        setParkingStatus('');
        setShowParking(false); 
      }, 1500);
    } else {
      setParkingStatus('❌ Error');
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh', color: '#111' }}>
      
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: '900', letterSpacing: '-0.05em', margin: '0 0 0.5rem 0' }}>Hola Santi</h1>
        <div style={{ display: 'inline-block', backgroundColor: totalPendientes === 0 ? '#166534' : '#000', color: '#fff', padding: '10px 25px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1rem' }}>
          {loading ? '...' : totalPendientes === 0 ? '🎉 Todo listo' : `${totalPendientes} pendientes hoy`}
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        
        {/* TASKS */}
        <Link href="/tasks" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1.8rem', backgroundColor: '#5D5CDE', color: '#fff', border: 'none', borderRadius: '28px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>📝 Tasks</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Para hoy</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '18px' }}>
              {pendientes.tasks}
            </span>
          </button>
        </Link>

        {/* ENTRENAMIENTO */}
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

        {/* NUTRICION */}
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

        {/* OTROS */}
        <Link href="/otros" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', padding: '1.8rem', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '28px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>✨ Diarios</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Hábitos</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '18px' }}>
              {pendientes.otros}
            </span>
          </button>
        </Link>

        {/* BOTÓN ANALÍTICA */}
        <Link href="/analitica" style={{ textDecoration: 'none', display: 'block', marginTop: '1.5rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#111', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '800', color: '#fff' }}>Ver mis métricas</h2>
          </div>
        </Link>

      </div>

      {/* --- NUEVO MÓDULO: ACCESOS RÁPIDOS --- */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', textAlign: 'center' }}>Accesos Rápidos</h3>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          
          {/* BOTÓN CIGARRO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={logCigarette}
              style={{ width: '65px', height: '65px', borderRadius: '20px', border: '1px solid #eee', backgroundColor: '#f9fafb', fontSize: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
            >
              🚬
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: cigStatus.includes('✅') ? '#166534' : '#666', height: '15px' }}>
              {cigStatus || 'Fumar'}
            </span>
          </div>

          {/* BOTÓN ESTACIONAMIENTO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={toggleParking}
              style={{ width: '65px', height: '65px', borderRadius: '20px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '1.8rem', fontWeight: '900', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37,99,235,0.3)' }}
            >
              E
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#666', height: '15px' }}>
              Auto
            </span>
          </div>

        </div>

        {/* CAJÓN DESPLEGABLE DE ESTACIONAMIENTO */}
        {showParking && (
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '20px', border: '1px solid #eee' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>
              Última ubicación: <strong style={{ color: '#111' }}>{parkingLoc}</strong>
            </p>
            <form onSubmit={saveParking} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Ej: Av. Cabildo 2040" 
                value={parkingInput}
                onChange={(e) => setParkingInput(e.target.value)}
                style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }}
              />
              <button type="submit" style={{ padding: '0 1.5rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
                {parkingStatus || 'Guardar'}
              </button>
            </form>
          </div>
        )}
      </div>

      <footer style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>
        ÉXITO APP • 2026
      </footer>

    </main>
  );
}