'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Nutricion() {
  const [recipes, setRecipes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [registroComidas, setRegistroComidas] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const tipos = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];
  const diaHoy = dias[new Date().getDay()];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0];
    
    // Traer Recetas, Inventario y el Registro de hoy
    const { data: recs } = await supabase.from('recipes').select('*');
    const { data: inv } = await supabase.from('pantry_inventory').select('*').order('ingredient', { ascending: true });
    const { data: meals } = await supabase.from('meal_plan').select('*').eq('date', today);

    if (recs) setRecipes(recs);
    if (inv) setInventario(inv);
    if (meals) {
      const mapping = {};
      meals.forEach(m => mapping[m.meal_type] = m.completed);
      setRegistroComidas(mapping);
    }
  }

  // --- FUNCIONES DE COMIDAS ---
  const registrarComida = async (tipo, plato) => {
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = !registroComidas[tipo];
    
    setRegistroComidas({ ...registroComidas, [tipo]: isCompleted });

    await supabase.from('meal_plan').upsert({
      date: today,
      meal_type: tipo,
      planned_meal: plato,
      completed: isCompleted
    }, { onConflict: 'date, meal_type' });
  };

  const getRecipe = (day, type) => recipes.find(r => r.day_of_week === day && r.meal_type === type);

  const saveRecipe = async (day, type, name, ingredientsString) => {
    const ingArray = ingredientsString.split(',').map(i => i.trim()).filter(i => i);
    const existing = getRecipe(day, type);

    if (existing) {
      await supabase.from('recipes').update({ recipe_name: name, ingredients: ingArray }).eq('id', existing.id);
    } else {
      await supabase.from('recipes').insert([{ day_of_week: day, meal_type: type, recipe_name: name, ingredients: ingArray }]);
    }
    fetchData(); // Recargamos para ver los cambios
  };

  const checkIngredientes = (necesarios) => {
    if (!necesarios || necesarios.length === 0) return true;
    return necesarios.every(ing => 
      inventario.find(i => i.ingredient.toLowerCase() === ing.toLowerCase())?.in_stock
    );
  };

  // --- FUNCIONES DE HELADERA ---
  const toggleStock = async (id, currentStatus) => {
    setInventario(inventario.map(item => item.id === id ? { ...item, in_stock: !currentStatus } : item));
    await supabase.from('pantry_inventory').update({ in_stock: !currentStatus }).eq('id', id);
  };

  const addPantryItem = async (e) => {
    e.preventDefault();
    if (!newIngredient.trim()) return;
    
    const { data, error } = await supabase
      .from('pantry_inventory')
      .insert([{ ingredient: newIngredient.trim(), in_stock: true }])
      .select();

    if (!error) {
      setInventario([...inventario, data[0]].sort((a, b) => a.ingredient.localeCompare(b.ingredient)));
      setNewIngredient('');
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver</Link>
        <button 
          onClick={() => setEditMode(!editMode)}
          style={{ padding: '10px 18px', borderRadius: '16px', border: 'none', backgroundColor: editMode ? '#ef4444' : '#f3f4f6', color: editMode ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {editMode ? 'Cerrar Editor' : '✏️ Plan Semanal'}
        </button>
      </header>

      {/* MODO VISTA DIARIA */}
      {!editMode ? (
        <>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 2rem 0', letterSpacing: '-0.05em' }}>Hoy: {diaHoy}</h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '3rem' }}>
            {tipos.map(tipo => {
              const r = getRecipe(diaHoy, tipo);
              const plato = r ? r.recipe_name : 'No hay menú asignado';
              const ingredientes = r?.ingredients || [];
              const tengoTodo = checkIngredientes(ingredientes);
              
              return (
                <div key={tipo} style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid #f3f4f6', backgroundColor: registroComidas[tipo] ? '#f0fdf4' : '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#999' }}>{tipo}</span>
                    {r && (
                      <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '10px', backgroundColor: tengoTodo ? '#dcfce7' : '#fee2e2', color: tengoTodo ? '#166534' : '#991b1b', fontWeight: '600' }}>
                        {tengoTodo ? '✅ Stock OK' : '❌ Falta comprar'}
                      </span>
                    )}
                  </div>
                  
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', color: '#111' }}>{plato}</h3>
                  {r && <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 15px 0' }}>{ingredientes.join(', ')}</p>}
                  
                  <button 
                    onClick={() => registrarComida(tipo, plato)}
                    disabled={!r}
                    style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', backgroundColor: registroComidas[tipo] ? '#166534' : (r ? '#000' : '#e5e7eb'), color: r ? '#fff' : '#999', fontWeight: '700', cursor: r ? 'pointer' : 'not-allowed' }}
                  >
                    {registroComidas[tipo] ? 'Completado ✅' : (r ? 'Marcar como hecho' : 'Sin plan')}
                  </button>
                </div>
              );
            })}
          </div>

          {/* SECCIÓN HELADERA */}
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem' }}>🛒 Mi Heladera</h2>
          
          {/* Formulario para agregar ingrediente */}
          <form onSubmit={addPantryItem} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Agregar nuevo (ej: Tomate)" 
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid #eee', outline: 'none', backgroundColor: '#f9fafb' }}
            />
            <button type="submit" style={{ padding: '0 1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold' }}>
              +
            </button>
          </form>

          {/* Grilla de ingredientes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {inventario.map(item => (
              <div 
                key={item.id} 
                onClick={() => toggleStock(item.id, item.in_stock)}
                style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '16px', cursor: 'pointer', backgroundColor: item.in_stock ? '#f0fdf4' : '#fff', borderColor: item.in_stock ? '#bbf7d0' : '#eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
              >
                <span style={{ fontWeight: '500', fontSize: '0.95rem', color: item.in_stock ? '#166534' : '#333' }}>{item.ingredient}</span>
                <span style={{ fontSize: '1.2rem' }}>{item.in_stock ? '✅' : '➕'}</span>
              </div>
            ))}
          </div>
        </>
      ) : (

        /* MODO EDICIÓN SEMANAL */
        <>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 2rem 0', letterSpacing: '-0.05em' }}>Planificador</h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>Editá los platos y los ingredientes (separalos por comas). Se guarda automáticamente al salir del texto.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dias.map(day => (
              <details key={day} style={{ backgroundColor: '#f9fafb', border: '1px solid #eee', borderRadius: '20px', padding: '1.5rem' }}>
                <summary style={{ fontWeight: '800', fontSize: '1.2rem', cursor: 'pointer', outline: 'none' }}>
                  {day} {day === diaHoy && '📍'}
                </summary>
                
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {tipos.map(type => {
                    const r = getRecipe(day, type);
                    return (
                      <div key={type} style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: '#000', display: 'block', marginBottom: '8px' }}>{type}</label>
                        
                        <input 
                          type="text" 
                          placeholder="Nombre del plato (Ej: Tostadas)"
                          defaultValue={r?.recipe_name || ''} 
                          onBlur={(e) => saveRecipe(day, type, e.target.value, r?.ingredients?.join(', ') || '')}
                          style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '8px', boxSizing: 'border-box' }}
                        />
                        
                        <input 
                          type="text" 
                          placeholder="Ingredientes (Ej: Pan, Huevos)"
                          defaultValue={(r?.ingredients || []).join(', ')} 
                          onBlur={(e) => saveRecipe(day, type, r?.recipe_name || '', e.target.value)}
                          style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', fontSize: '0.9rem', color: '#666', boxSizing: 'border-box' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </main>
  );
}