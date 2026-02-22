'use client';
import { useState, useEffect } from 'react';
import { getToday, getArgDay } from '../../lib/time';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Nutricion() {
  const [recipes, setRecipes] = useState([]);
  const [uniqueRecipes, setUniqueRecipes] = useState([]); 
  const [inventario, setInventario] = useState([]);
  const [registroComidas, setRegistroComidas] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  
  const [showCustomInput, setShowCustomInput] = useState({}); 

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const tipos = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];
  const diaHoy = dias[getArgDay()];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const today = getToday();
    
    const { data: recs } = await supabase.from('recipes').select('*');
    const { data: inv } = await supabase.from('pantry_inventory').select('*').order('ingredient', { ascending: true });
    const { data: meals } = await supabase.from('meal_plan').select('*').eq('date', today);

    if (recs) {
      setRecipes(recs);
      const unique = [];
      const map = new Map();
      recs.forEach(r => {
         if (r.recipe_name && !map.has(r.recipe_name.toLowerCase())) {
            map.set(r.recipe_name.toLowerCase(), true);
            unique.push({ name: r.recipe_name, ingredients: r.ingredients });
         }
      });
      setUniqueRecipes(unique.sort((a, b) => a.name.localeCompare(b.name)));
    }
    
    if (inv) setInventario(inv);
    
    if (meals) {
      const mapping = {};
      meals.forEach(m => mapping[m.meal_type] = m.completed);
      setRegistroComidas(mapping);
    }
  }

  const registrarComida = async (tipo, plato) => {
    const today = getToday();
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

  // Modificado para aceptar tanto Strings (del dropdown de recetas) como Arrays (del nuevo selector)
  const saveRecipe = async (day, type, name, ingredientsParam) => {
    if (!name || name.trim() === '') {
      await supabase.from('recipes').delete().match({ day_of_week: day, meal_type: type });
      fetchData();
      return;
    }

    let ingArray = [];
    if (Array.isArray(ingredientsParam)) {
      ingArray = ingredientsParam;
    } else if (typeof ingredientsParam === 'string') {
      ingArray = ingredientsParam.split(',').map(i => i.trim()).filter(i => i);
    }

    const existing = getRecipe(day, type);

    if (existing) {
      await supabase.from('recipes').update({ recipe_name: name.trim(), ingredients: ingArray }).eq('id', existing.id);
    } else {
      await supabase.from('recipes').insert([{ day_of_week: day, meal_type: type, recipe_name: name.trim(), ingredients: ingArray }]);
    }
    fetchData(); 
  };

  const checkIngredientes = (necesarios) => {
    if (!necesarios || necesarios.length === 0) return true;
    return necesarios.every(ing => 
      inventario.find(i => i.ingredient.toLowerCase() === ing.toLowerCase())?.in_stock
    );
  };

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
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver</Link>
        <button 
          onClick={() => setEditMode(!editMode)}
          style={{ padding: '10px 18px', borderRadius: '16px', border: 'none', backgroundColor: editMode ? '#ef4444' : '#f3f4f6', color: editMode ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {editMode ? 'Cerrar Planificador' : '✏️ Plan Semanal'}
        </button>
      </header>

      {!editMode ? (
        /* VISTA DIARIA Y HELADERA */
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

          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem' }}>🛒 Mi Heladera</h2>
          
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 1rem 0', letterSpacing: '-0.05em' }}>Planificador</h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>Elegí una receta de tu historial o armá una a medida seleccionando ingredientes de tu heladera.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dias.map(day => (
              <details key={day} open={day === diaHoy} style={{ backgroundColor: '#f9fafb', border: '1px solid #eee', borderRadius: '20px', padding: '1.5rem' }}>
                <summary style={{ fontWeight: '800', fontSize: '1.2rem', cursor: 'pointer', outline: 'none' }}>
                  {day} {day === diaHoy && '📍'}
                </summary>
                
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {tipos.map(type => {
                    const r = getRecipe(day, type);
                    const slotKey = `${day}-${type}`;
                    const isCustom = showCustomInput[slotKey];

                    return (
                      <div key={type} style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: '#000' }}>{type}</label>
                          {r && !isCustom && (
                            <button 
                              onClick={() => setShowCustomInput({...showCustomInput, [slotKey]: true})} 
                              style={{ fontSize: '0.75rem', color: '#5D5CDE', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ✏️ Ajustar
                            </button>
                          )}
                        </div>
                        
                        {!isCustom ? (
                          <>
                            <select
                              value={r?.recipe_name || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'NEW') {
                                  setShowCustomInput({...showCustomInput, [slotKey]: true});
                                } else if (val === '') {
                                  saveRecipe(day, type, '', []); 
                                } else {
                                  const found = uniqueRecipes.find(ur => ur.name === val);
                                  if (found) saveRecipe(day, type, found.name, found.ingredients);
                                }
                              }}
                              style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', backgroundColor: '#f9fafb', fontSize: '1rem', outline: 'none', marginBottom: r ? '8px' : '0' }}
                            >
                              <option value="">-- Sin plan --</option>
                              {uniqueRecipes.map(ur => (
                                <option key={ur.name} value={ur.name}>🍲 {ur.name}</option>
                              ))}
                              <option value="NEW" style={{ fontWeight: 'bold', color: '#5D5CDE' }}>➕ Escribir otro plato...</option>
                            </select>

                            {r?.recipe_name && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                                {(r.ingredients || []).map(ing => (
                                  <span key={ing} style={{ backgroundColor: '#f3f4f6', color: '#666', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem' }}>
                                    {ing}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          
                          /* EDITOR AVANZADO DE RECETAS E INGREDIENTES */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input 
                              id={`name-${slotKey}`}
                              type="text" 
                              placeholder="Nombre del plato..."
                              autoFocus
                              defaultValue={r?.recipe_name || ''} 
                              onBlur={(e) => saveRecipe(day, type, e.target.value, r?.ingredients || [])}
                              style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #5D5CDE', boxSizing: 'border-box', fontWeight: 'bold' }}
                            />
                            
                            {/* Píldoras de ingredientes actuales */}
                            {(r?.ingredients?.length > 0) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {r.ingredients.map(ing => (
                                  <span key={ing} style={{ background: '#e5e7eb', padding: '6px 10px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {ing}
                                    <span onClick={() => {
                                      const newIngs = r.ingredients.filter(i => i !== ing);
                                      const currentName = document.getElementById(`name-${slotKey}`)?.value || 'Plato Nuevo';
                                      saveRecipe(day, type, currentName, newIngs);
                                    }} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '1rem', lineHeight: '1' }}>×</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Selector para agregar desde el Inventario */}
                            <select 
                              value=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if(!val) return;
                                const currentName = document.getElementById(`name-${slotKey}`)?.value || 'Plato Nuevo';
                                const newIngs = [...(r?.ingredients || []), val];
                                saveRecipe(day, type, currentName, newIngs);
                              }}
                              style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '0.9rem' }}
                            >
                              <option value="">+ Sumar ingrediente de heladera...</option>
                              {inventario.filter(i => !(r?.ingredients || []).includes(i.ingredient)).map(i => (
                                <option key={i.id} value={i.ingredient}>{i.ingredient}</option>
                              ))}
                            </select>

                            {/* Crear Ingrediente Rápido */}
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <input 
                                id={`new-ing-${slotKey}`}
                                type="text"
                                placeholder="O crear uno nuevo..."
                                style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }}
                              />
                              <button 
                                onClick={async () => {
                                  const input = document.getElementById(`new-ing-${slotKey}`);
                                  const val = input.value.trim();
                                  if(!val) return;
                                  
                                  const currentName = document.getElementById(`name-${slotKey}`)?.value || 'Plato Nuevo';
                                  await supabase.from('pantry_inventory').insert([{ ingredient: val, in_stock: true }]);
                                  const newIngs = [...(r?.ingredients || []), val];
                                  await saveRecipe(day, type, currentName, newIngs);
                                  input.value = '';
                                }}
                                style={{ padding: '0 15px', borderRadius: '12px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold' }}
                              >
                                Crear
                              </button>
                            </div>

                            <button 
                              onClick={() => setShowCustomInput({...showCustomInput, [slotKey]: false})} 
                              style={{ marginTop: '5px', padding: '10px', borderRadius: '12px', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#333' }}
                            >
                              ✓ Terminar Plato
                            </button>
                          </div>
                        )}
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