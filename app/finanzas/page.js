'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getToday } from '../../lib/time';
import Link from 'next/link';

export default function Finanzas() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    transaction_type: 'egreso',
    amount: '',
    category: '',
    description: '',
    date: getToday()
  });

  // Categorías sugeridas
  const categoriasEgreso = ['Supermercado', 'Comida / Delivery', 'Transporte', 'Servicios / Suscripciones', 'Salidas', 'Proyectos', 'Salud', 'Otros'];
  const categoriasIngreso = ['Honorarios Terapia', 'Sueldo / Agencia', 'Proyectos Musicales', 'Ventas', 'Otros'];

  useEffect(() => {
    fetchFinances();
  }, []);

  async function fetchFinances() {
    // Traemos todo lo de este mes por defecto
    const todayStr = getToday();
    const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"
    
    const { data } = await supabase
      .from('finances')
      .select('*')
      .gte('date', `${currentMonthStr}-01`)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) setTransactions(data);
    setLoading(false);
  }

  const saveTransaction = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.category) return alert("Falta el monto o la categoría");

    const { data, error } = await supabase.from('finances').insert([{
      transaction_type: form.transaction_type,
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description.trim() || 'Sin detalle',
      date: form.date
    }]).select();

    if (!error) {
      setTransactions([data[0], ...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setForm({ ...form, amount: '', description: '', category: '' }); // Limpia pero guarda tipo y fecha
      setShowForm(false);
    }
  };

  const deleteTransaction = async (id) => {
    if (window.confirm("¿Borrar este movimiento?")) {
      await supabase.from('finances').delete().eq('id', id);
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  // --- CÁLCULOS DEL MES ---
  const totalIngresos = transactions.filter(t => t.transaction_type === 'ingreso').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalEgresos = transactions.filter(t => t.transaction_type === 'egreso').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const balance = totalIngresos - totalEgresos;

  // Formateador de moneda (ARS)
  const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver</Link>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', borderRadius: '16px', border: 'none', backgroundColor: showForm ? '#ef4444' : '#111', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {showForm ? 'Cancelar' : '➕ Nuevo Movimiento'}
        </button>
      </header>

      {/* DASHBOARD MES ACTUAL */}
      <div style={{ backgroundColor: '#111', color: '#fff', padding: '2rem', borderRadius: '24px', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: '0 0 5px 0', color: '#9ca3af', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance de este mes</p>
        <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.05em' }}>
          {formatMoney(balance)}
        </h1>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>↓ INGRESOS</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#4ade80' }}>{formatMoney(totalIngresos)}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>↑ EGRESOS</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f87171' }}>{formatMoney(totalEgresos)}</span>
          </div>
        </div>
      </div>

      {/* FORMULARIO DESPLEGABLE */}
      {showForm && (
        <form onSubmit={saveTransaction} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem', border: '1px solid #eee', animation: 'fadeIn 0.2s ease-out' }}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button type="button" onClick={() => setForm({...form, transaction_type: 'egreso', category: ''})} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: form.transaction_type === 'egreso' ? '2px solid #ef4444' : '1px solid #ddd', backgroundColor: form.transaction_type === 'egreso' ? '#fef2f2' : '#fff', color: form.transaction_type === 'egreso' ? '#b91c1c' : '#666', fontWeight: 'bold' }}>
              🔴 Egreso
            </button>
            <button type="button" onClick={() => setForm({...form, transaction_type: 'ingreso', category: ''})} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: form.transaction_type === 'ingreso' ? '2px solid #22c55e' : '1px solid #ddd', backgroundColor: form.transaction_type === 'ingreso' ? '#f0fdf4' : '#fff', color: form.transaction_type === 'ingreso' ? '#15803d' : '#666', fontWeight: 'bold' }}>
              🟢 Ingreso
            </button>
          </div>

          <input type="number" placeholder="Monto ($)" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', border: '1px solid #eee', fontSize: '1.5rem', fontWeight: '800', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
          
          <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #eee', fontSize: '1rem', outline: 'none', marginBottom: '10px', backgroundColor: '#f9fafb', boxSizing: 'border-box' }}>
            <option value="">Seleccionar Categoría...</option>
            {(form.transaction_type === 'egreso' ? categoriasEgreso : categoriasIngreso).map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Otra">Otra...</option>
          </select>

          {form.category === 'Otra' && (
            <input type="text" placeholder="Escribí la categoría..." onChange={(e) => setForm({...form, category: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #eee', fontSize: '1rem', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
          )}

          <input type="text" placeholder="Asunto o Detalle..." value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #eee', fontSize: '1rem', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
          <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #eee', fontSize: '1rem', outline: 'none', marginBottom: '15px', color: '#666', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          
          <button type="submit" style={{ width: '100%', padding: '1.2rem', backgroundColor: '#111', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '1.1rem' }}>
            Guardar Movimiento
          </button>
        </form>
      )}

      {/* LISTA DE MOVIMIENTOS */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>Historial del Mes</h3>
      
      {loading ? <p style={{ color: '#999' }}>Cargando...</p> : transactions.length === 0 ? <p style={{ color: '#999', textAlign: 'center', marginTop: '2rem' }}>No hay movimientos este mes.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {transactions.map(t => {
            const isIngreso = t.transaction_type === 'ingreso';
            const [y, m, d] = t.date.split('-');
            
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '12px', backgroundColor: isIngreso ? '#dcfce7' : '#fee2e2', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
                    {isIngreso ? '↓' : '↑'}
                  </div>
                  <div>
                    <span style={{ display: 'block', fontWeight: '800', color: '#111', fontSize: '1.05rem' }}>{t.category}</span>
                    <span style={{ fontSize: '0.8rem', color: '#999' }}>{d}/{m} • {t.description}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontWeight: '800', fontSize: '1.1rem', color: isIngreso ? '#166534' : '#111' }}>
                    {isIngreso ? '+' : '-'}{formatMoney(t.amount)}
                  </span>
                  <button onClick={() => deleteTransaction(t.id)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}