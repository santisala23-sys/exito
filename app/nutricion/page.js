'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Nutricion() {
  const [inventario, setInventario] = useState([]);
  const [registroComidas, setRegistroComidas] = useState({});

  const planSemanal = {
    Desayuno: { plato: "Café + Tostada con huevo, palta y tomate", ingredientes: ["Café", "Pan (Tostadas)", "Huevos", "Palta", "Tomate", "Queso rallado"] },
    Almuerzo: { plato: "Wok de pollo y arroz", ingredientes: ["Pollo", "Arroz", "Cebolla", "Pimiento / Morrón"] },
    Merienda: { plato: "Fruta o cereales con leche", ingredientes: ["Fruta", "Leche", "Cereales"] },
    Cena: { plato: "Arroz con atún, huevo y tomate", ingredientes: ["Arroz", "Atún", "Huevos", "Tomate"] }
  };

  useEffect(() => {
    fetchPantry();
    fetchDailyMeals();
  }, []);

  async function fetchPantry() {
    const { data } = await supabase.from('pantry_inventory').select('*').order('ingredient', { ascending: true });
    if (data) setInventario(data);
  }

  async function fetchDailyMeals() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('meal_plan').select('*').eq('date', today);
    if (data) {
      const mapping = {};
      data.forEach(m => mapping[m.meal_type] = m.completed);
      setRegistroComidas(mapping);
    }
  }

  const toggleStock = async (id, currentStatus) => {
    const { error } = await supabase.from('pantry_inventory').update({ in_stock: !currentStatus }).eq('id', id);
    if (!error) setInventario(inventario.map(item => item.id === id ? { ...item, in_stock: !currentStatus } : item));
  };

  const registrarComida = async (tipo, plato) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('meal_plan').upsert({
      date: today,
      meal_type: tipo,
      planned_meal: plato,
      completed: !registroComidas[tipo]
    });

    if (!error) setRegistroComidas({ ...registroComidas, [tipo]: !registroComidas[tipo] });
  };

  const checkIngredientes = (necesarios) => {
    return necesarios.every(ing => inventario.find(i => i.ingredient === ing)?.in_stock);
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      <Link href="/" style={{ textDecoration: 'none', color: '#999' }}>← Volver</Link>
      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '1rem 0' }}>Nutrición</h1>

      {/* Bloque de Comidas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
        {Object.entries(planSemanal).map(([tipo, info]) => {
          const tengoTodo = checkIngredientes(info.ingredientes);
          return (
            <div key={tipo} style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid #eee', backgroundColor: registroComidas[tipo] ? '#f0fdf4' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: '#999' }}>{tipo}</span>
                <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', backgroundColor: tengoTodo ? '#dcfce7' : '#fee2e2', color: tengoTodo ? '#166534' : '#991b1b' }}>
                  {tengoTodo ? 'Stock OK' : 'Faltan cosas'}
                </span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{info.plato}</h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>{info.ingredientes.join(', ')}</p>
              <button 
                onClick={() => registrarComida(tipo, info.plato)}
                style={{ width: '100%', padding: '10px', borderRadius: '12px', border: 'none', backgroundColor: registroComidas[tipo] ? '#166534' : '#000', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
              >
                {registroComidas[tipo] ? 'Completado ✅' : 'Marcar como hecho'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Stock Heladera */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🛒 Mi Heladera</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {inventario.map(item => (
          <div key={item.id} 
               onClick={() => toggleStock(item.id, item.in_stock)}
               style={{ padding: '12px', border: '1px solid #eee', borderRadius: '14px', cursor: 'pointer', backgroundColor: item.in_stock ? '#f0fdf4' : '#fff', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
            {item.ingredient}
            <span>{item.in_stock ? '✅' : '➕'}</span>
          </div>
        ))}
      </div>
    </main>
  );
}