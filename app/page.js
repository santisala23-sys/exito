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
  const [cigLogsToday, setCigLogsToday] = useState([]);
  const [cigStatus, setCigStatus] = useState('');
  const [showParking, setShowParking] = useState(false);
  const [parkingLoc, setParkingLoc] = useState('');
  const [parkingInput, setParkingInput] = useState('');
  const [parkingStatus, setParkingStatus] = useState('');

  // --- ESTADOS PARA CARGA RÁPIDA DE FINANZAS ---
  const [quickFinanceType, setQuickFinanceType] = useState(null); // 'ingreso' o 'egreso'
  const [quickFinanceForm, setQuickFinanceForm] = useState({ amount: '', category: '' });
  const [quickFinanceStatus, setQuickFinanceStatus] = useState('');

  useEffect(() => {
    async function initData() {
      const today = getToday();

      // 1. Tasks Pendientes
      const { data: tasksData } = await supabase.from('tasks').select('*').eq('completed', false).or(`due_date.lte.${today},due_date.is.null`);
      const tasksCount = tasksData ? tasksData.length : 0;

      // 2. Otros (Hábitos)
      const { data: allHabits } = await supabase.from('custom_tasks').select('id');
      const { data: doneHabits } = await supabase.from('daily_task_logs').select('task_id').eq('date', today).eq('completed', true);
      const otrosCount = (allHabits?.length || 0) - (doneHabits?.length || 0);

      // 3. Entrenamiento
      const { count: workoutDone } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('date', today);
      const entrenamientoCount = workoutDone > 0 ? 0 : 1;

      // 4. Nutrición
      const { count: mealsDone } = await supabase.from('meal_plan').select('*', { count: 'exact', head: true }).eq('date', today).eq('completed', true);
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

      // 6. Cargar historial de cigarros de HOY
      const { data: cigData } = await supabase.from('cigarettes_log').select('id, created_at').order('created_at', { ascending: false }).limit(100);
      if (cigData) {
        const todaysLogs = cigData.filter(log => {
          const logDateStr = new Date(log.created_at).toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
          const argD = new Date(logDateStr);
          const yyyy = argD.getFullYear();
          const mm = String(argD.getMonth() + 1).padStart(2, '0');
          const dd = String(argD.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}` === today;
        });
        setCigLogsToday(todaysLogs.reverse());
      }

      setLoading(false);
    }

    initData();
  }, []);

  const totalPendientes = pendientes.tasks + pendientes.otros + pendientes.entrenamiento + pendientes.nutricion;

  // --- FUNCIONES DE CIGARRILLOS ---
  const logCigarette = async () => {
    setCigStatus('⏳');
    const { data, error } = await supabase.from('cigarettes_log').insert([{}]).select();
    if (!error && data) {
      setCigLogsToday([...cigLogsToday, data[0]]);
      setCigStatus('✅ Registrado');
      setTimeout(() => setCigStatus(''), 2000);
    } else {
      setCigStatus('❌ Error');
      setTimeout(() => setCigStatus(''), 2000);
    }
  };

  const undoCigarette = async () => {
    if (cigLogsToday.length === 0) return;
    setCigStatus('⏳');
    const lastLog = cigLogsToday[cigLogsToday.length - 1]; 
    const { error } = await supabase.from('cigarettes_log').delete().eq('id', lastLog.id);
    if (!error) {
      setCigLogsToday(cigLogsToday.slice(0, -1)); 
      setCigStatus('🗑️ Borrado');
      setTimeout(() => setCigStatus(''), 2000);
    } else {
      setCigStatus('❌ Error');
      setTimeout(() => setCigStatus(''), 2000);
    }
  };

  // --- FUNCIONES DE ESTACIONAMIENTO ---
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

  // --- FUNCIONES DE CARGA RÁPIDA FINANZAS ---
  const handleQuickFinanceClick = (e, type) => {
    e.preventDefault(); // Evita que el click abra la página /finanzas
    setQuickFinanceType(quickFinanceType === type ? null : type); // Toggle del formulario
    setQuickFinanceStatus('');
  };

  const saveQuickFinance = async (e) => {
    e.preventDefault();
    if (!quickFinanceForm.amount || !quickFinanceForm.category) return;
    
    setQuickFinanceStatus('⏳');
    const { error } = await supabase.from('finances').insert([{
      transaction_type: quickFinanceType,
      amount: parseFloat(quickFinanceForm.amount),
      category: quickFinanceForm.category,
      description: 'Carga rápida',
      date: getToday()
    }]);

    if (!error) {
      setQuickFinanceStatus('✅');
      setTimeout(() => {
        setQuickFinanceType(null);
        setQuickFinanceForm({ amount: '', category: '' });
        setQuickFinanceStatus('');
      }, 1500);
    } else {
      setQuickFinanceStatus('❌ Error');
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

        {/* --- TARJETA DE FINANZAS MODIFICADA --- */}
        <div style={{ backgroundColor: '#10b981', borderRadius: '28px', overflow: 'hidden' }}>
          <Link href="/finanzas" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '1.8rem', backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>💸 Finanzas</span>
                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Billetera y gastos</span>
              </div>
              
              {/* BOTONES DE CARGA RÁPIDA (Dentro de la tarjeta pero detienen la navegación al hacer clic) */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div onClick={(e) => handleQuickFinanceClick(e, 'egreso')} style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,0,0,0.8)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '1.5rem', color: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>-</div>
                <div onClick={(e) => handleQuickFinanceClick(e, 'ingreso')} style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '1.5rem', color: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>+</div>
              </div>
            </button>
          </Link>

          {/* FORMULARIO DESPLEGABLE RÁPIDO */}
          {quickFinanceType && (
            <div style={{ padding: '0 1.8rem 1.8rem 1.8rem', backgroundColor: '#10b981' }}>
              <form onSubmit={saveQuickFinance} style={{ display: 'flex', gap: '10px', backgroundColor: '#fff', padding: '10px', borderRadius: '16px' }}>
                <input 
                  type="number" 
                  placeholder="$" 
                  value={quickFinanceForm.amount}
                  onChange={(e) => setQuickFinanceForm({...quickFinanceForm, amount: e.target.value})}
                  style={{ width: '70px', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold' }}
                />
                <input 
                  type="text" 
                  placeholder={quickFinanceType === 'ingreso' ? 'Ej: Sueldo' : 'Ej: Comida'} 
                  value={quickFinanceForm.category}
                  onChange={(e) => setQuickFinanceForm({...quickFinanceForm, category: e.target.value})}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none' }}
                />
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: quickFinanceType === 'ingreso' ? '#22c55e' : '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>
                  {quickFinanceStatus || '✓'}
                </button>
              </form>
            </div>
          )}
        </div>
        {/* ------------------------------------ */}

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

        <Link href="/analitica" style={{ textDecoration: 'none', display: 'block', marginTop: '1.5rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#111', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '800', color: '#fff' }}>Ver mis métricas</h2>
          </div>
        </Link>
      </div>

      {/* --- MÓDULO: ACCESOS RÁPIDOS --- */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', textAlign: 'center' }}>Accesos Rápidos</h3>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={logCigarette}
              style={{ width: '65px', height: '65px', borderRadius: '20px', border: '1px solid #eee', backgroundColor: '#f9fafb', fontSize: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', position: 'relative' }}
            >
              🚬
              {cigLogsToday.length > 0 && (
                <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#111', color: '#fff', fontSize: '0.8rem', fontWeight: '900', width: '26px', height: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%', border: '2px solid #fff' }}>
                  {cigLogsToday.length}
                </span>
              )}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '40px', justifyContent: 'flex-start', marginTop: '5px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: cigStatus.includes('✅') ? '#166534' : (cigStatus.includes('🗑️') ? '#991b1b' : '#666') }}>
                {cigStatus || (cigLogsToday.length > 0 ? 'Fumados' : 'Fumar')}
              </span>
              {!cigStatus && cigLogsToday.length > 0 && (
                <button onClick={undoCigarette} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#ef4444', cursor: 'pointer', padding: 0, marginTop: '2px', textDecoration: 'underline' }}>
                  Deshacer
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={toggleParking}
              style={{ width: '65px', height: '65px', borderRadius: '20px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '1.8rem', fontWeight: '900', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37,99,235,0.3)' }}
            >
              E
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '40px', justifyContent: 'flex-start', marginTop: '5px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#666' }}>
                Auto
              </span>
            </div>
          </div>

        </div>

        {showParking && (
          <div style={{ marginTop: '0.5rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '20px', border: '1px solid #eee' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>
              Última ubicación: <strong style={{ color: '#111' }}>{parkingLoc}</strong>
            </p>
            <form onSubmit={saveParking} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Ej: Av. Cabildo 2040" 
                value={parkingInput}
                onChange={(e) => setParkingInput(e.target.value)}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem' }}>
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