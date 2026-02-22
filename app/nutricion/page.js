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

  // --- COMIDAS DIARIAS ---
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

  const checkIngredientes = (necesarios) => {
    if (!necesarios || necesarios.length === 0) return true;
    return necesarios.every(ing => 
      inventario.find(i => i.ingredient.toLowerCase() === ing.toLowerCase())?.in_stock
    );
  };

  // --- PLAN SEMANAL ---
  const getRecipe = (day, type) => recipes.find(r => r.day_of_week === day && r.meal_type === type);

  const saveRecipe = async (day, type, name, ingredientsParam) => {
    if (!name || name.trim() === '') {
      await supabase.from('recipes').delete().match({ day_of_week: day, meal_type: type });
      fetchData();
      return;
    }

    let ingArray = Array.isArray(ingredientsParam) ? ingredientsParam : ingredientsParam.split(',').map(i => i.trim()).filter(i => i);
    const existing = getRecipe(day, type);

    if (existing) {
      await supabase.from('recipes').update({ recipe_name: name.trim(), ingredients: ingArray }).eq('id', existing.id);
    } else {
      await supabase.from('recipes').insert([{ day_of_week: day, meal_type: type, recipe_name: name.trim(), ingredients: ingArray }]);
    }
    fetchData(); 
  };

  // --- CRUD HELADERA (Stock) ---
  const toggleStock = async (id, currentStatus) => {
    setInventario(inventario.map(item => item.id === id ? { ...item, in_stock: !currentStatus } : item));
    await supabase.from('pantry_inventory').update({ in_stock: !currentStatus }).eq('id', id);
  };

  const addPantryItem = async (e) => {
    e.preventDefault();
    if (!newIngredient.trim()) return;
    const { data, error } = await supabase.from('pantry_inventory').insert([{ ingredient: newIngredient.trim(), in_stock: true }]).select();
    if (!error) {
      setInventario([...inventario, data[0]].sort((a, b) => a.ingredient.localeCompare(b.ingredient)));
      setNewIngredient('');
    }
  };

  const updateIngredientName = async (id, newName) => {
    if(!newName.trim()) return;
    await supabase.from('pantry_inventory').update({ ingredient: newName.trim() }).eq('id', id);
    setInventario(inventario.map(i => i.id === id ? { ...i, ingredient: newName.trim() } : i));
  };

  const deleteIngredient = async (id) => {
    if (window.confirm('¿Eliminar ingrediente definitivamente?')) {
      await supabase.from('pantry_inventory').delete().eq('id', id);
      setInventario(inventario.filter(i => i.id !== id));
    }
  };

  // --- CRUD RECETARIO GLOBAL ---
  const createTemplateRecipe = async (name) => {
    if(!name.trim()) return;
    await supabase.from('recipes').insert([{ day_of_week: 'TEMPLATE', meal_type: 'TEMPLATE', recipe_name: name.trim(), ingredients: [] }]);
    fetchData();
  };

  const updateGlobalRecipe = async (oldName, newName, newIngredientsStr) => {
    if(!newName.trim()) return;
    const ingArray = newIngredientsStr.split(',').map(i => i.trim()).filter(i => i);
    await supabase.from('recipes').update({ recipe_name: newName.trim(), ingredients: ingArray }).eq('recipe_name', oldName);
    fetchData();
  };

  const deleteGlobalRecipe = async (name) => {
    if (window.confirm(`¿Borrar "${name}" de tu recetario general? (También se borrará de los días planificados)`)) {
      await supabase.from('recipes').delete().eq('recipe_name', name);
      fetchData();
    }
  };

  // --- ESTILOS REUTILIZABLES ---
  const moduleStyle = { backgroundColor: '#f9fafb', border: '1px solid #eee', borderRadius: '24px', padding: '1.5rem', marginBottom: '1.5rem' };
  const summaryStyle = { fontWeight: '900', fontSize: '1.4rem', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', color: '#111' };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver</Link>
      </header>

      {/* SECCIÓN 1: HOY */}
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

      {/* SECCIÓN 2: MÓDULO HELADERA (Desplegable) */}
      <details style={moduleStyle}>
        <summary style={summaryStyle}>🛒 Heladera y Stock</summary>
        <p style={{ color: '#666', marginTop: '10px', fontSize: '0.9rem' }}>Tocá la casilla para tildar el stock. Podés editar el nombre tocando el texto.</p>
        
        <form onSubmit={addPantryItem} style={{ display: 'flex', gap: '10px', margin: '1.5rem 0' }}>
          <input 
            type="text" 
            placeholder="Agregar nuevo ingrediente..." 
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid #ddd', outline: 'none' }}
          />
          <button type="submit" style={{ padding: '0 1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold' }}>+</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {inventario.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: item.in_stock ? '#f0fdf4' : '#fff', border: `1px solid ${item.in_stock ? '#bbf7d0' : '#eee'}`, borderRadius: '16px' }}>
              <button onClick={() => toggleStock(item.id, item.in_stock)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}>
                {item.in_stock ? '✅' : '⬜'}
              </button>
              <input 
                type="text" 
                defaultValue={item.ingredient} 
                onBlur={(e) => updateIngredientName(item.id, e.target.value)} 
                style={{ flex: 1, border: 'none', background: 'transparent', fontWeight: '600', color: item.in_stock ? '#166534' : '#333', outline: 'none', fontSize: '1rem', width: '100%' }} 
              />
              <button onClick={() => deleteIngredient(item.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontWeight: 'bold' }}>
                🗑️
              </button>
            </div>
          ))}
        </div>
      </details>

      {/* SECCIÓN 3: MÓDULO RECETARIO Y PLAN (Desplegable) */}
      <details style={moduleStyle}>
        <summary style={summaryStyle}>🍲 Recetario y Plan</summary>
        
        {/* Sub-sección: Plan Semanal */}
        <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: '800' }}>📅 Plan Semanal</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {dias.map(day => (
            <details key={day} style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '20px', padding: '1.5rem' }}>
              <summary style={{ fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', outline: 'none' }}>
                {day} {day === diaHoy && '📍'}
              </summary>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {tipos.map(type => {
                  const r = getRecipe(day, type);
                  const slotKey = `${day}-${type}`;
                  const isCustom = showCustomInput[slotKey];

                  return (
                    <div key={type} style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '16px', border: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: '#000' }}>{type}</label>
                        {r && !isCustom && (
                          <button onClick={() => setShowCustomInput({...showCustomInput, [slotKey]: true})} style={{ fontSize: '0.75rem', color: '#5D5CDE', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
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
                              if (val === 'NEW') setShowCustomInput({...showCustomInput, [slotKey]: true});
                              else if (val === '') saveRecipe(day, type, '', []); 
                              else {
                                const found = uniqueRecipes.find(ur => ur.name === val);
                                if (found) saveRecipe(day, type, found.name, found.ingredients);
                              }
                            }}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', backgroundColor: '#fff', fontSize: '1rem', outline: 'none', marginBottom: r ? '8px' : '0' }}
                          >
                            <option value="">-- Sin plan --</option>
                            {uniqueRecipes.map(ur => <option key={ur.name} value={ur.name}>🍲 {ur.name}</option>)}
                            <option value="NEW" style={{ fontWeight: 'bold', color: '#5D5CDE' }}>➕ Escribir otro plato...</option>
                          </select>

                          {r?.recipe_name && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                              {(r.ingredients || []).map(ing => (
                                <span key={ing} style={{ backgroundColor: '#e5e7eb', color: '#333', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '500' }}>{ing}</span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <input 
                            id={`name-${slotKey}`} type="text" placeholder="Nombre del plato..." autoFocus defaultValue={r?.recipe_name || ''} 
                            onBlur={(e) => saveRecipe(day, type, e.target.value, r?.ingredients || [])}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #5D5CDE', boxSizing: 'border-box', fontWeight: 'bold' }}
                          />
                          {(r?.ingredients?.length > 0) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {r.ingredients.map(ing => (
                                <span key={ing} style={{ background: '#e5e7eb', padding: '6px 10px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {ing}
                                  <span onClick={() => {
                                    const newIngs = r.ingredients.filter(i => i !== ing);
                                    const currentName = document.getElementById(`name-${slotKey}`)?.value || 'Plato Nuevo';
                                    saveRecipe(day, type, currentName, newIngs);
                                  }} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>×</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <select 
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if(!val) return;
                              const currentName = document.getElementById(`name-${slotKey}`)?.value || 'Plato Nuevo';
                              saveRecipe(day, type, currentName, [...(r?.ingredients || []), val]);
                            }}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '0.9rem' }}
                          >
                            <option value="">+ Sumar ingrediente de heladera...</option>
                            {inventario.filter(i => !(r?.ingredients || []).includes(i.ingredient)).map(i => (
                              <option key={i.id} value={i.ingredient}>{i.ingredient}</option>
                            ))}
                          </select>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <input id={`new-ing-${slotKey}`} type="text" placeholder="O crear uno nuevo..." style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                            <button 
                              onClick={async () => {
                                const input = document.getElementById(`new-ing-${slotKey}`);
                                const val = input.value.trim();
                                if(!val) return;
                                const currentName = document.getElementById(`name-${slotKey}`)?.value || 'Plato Nuevo';
                                await supabase.from('pantry_inventory').insert([{ ingredient: val, in_stock: true }]);
                                await saveRecipe(day, type, currentName, [...(r?.ingredients || []), val]);
                                input.value = '';
                              }}
                              style={{ padding: '0 15px', borderRadius: '12px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold' }}
                            >Crear</button>
                          </div>
                          <button onClick={() => setShowCustomInput({...showCustomInput, [slotKey]: false})} style={{ marginTop: '5px', padding: '10px', borderRadius: '12px', background: '#ddd', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#333' }}>✓ Terminar Plato</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>

        {/* Sub-sección: Base de Datos de Recetas */}
        <h3 style={{ marginTop: '3rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: '800' }}>📖 Todas mis Recetas</h3>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>Los cambios acá afectan a tu plan semanal. Los ingredientes separalos por coma.</p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          <input id="new-global-recipe" type="text" placeholder="Crear receta nueva..." style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid #ddd', outline: 'none' }} />
          <button 
            onClick={() => {
              const input = document.getElementById('new-global-recipe');
              createTemplateRecipe(input.value);
              input.value = '';
            }} 
            style={{ padding: '0 1.5rem', backgroundColor: '#5D5CDE', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold' }}
          >+ Crear</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {uniqueRecipes.map(ur => (
            <div key={ur.name} style={{ background: '#fff', padding: '1.2rem', borderRadius: '16px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input 
                  type="text" 
                  defaultValue={ur.name} 
                  onBlur={(e) => updateGlobalRecipe(ur.name, e.target.value, ur.ingredients.join(', '))} 
                  style={{ flex: 1, fontWeight: '800', fontSize: '1.1rem', border: '1px solid #ddd', borderRadius: '10px', padding: '10px', outline: 'none' }} 
                />
                <button 
                  onClick={() => deleteGlobalRecipe(ur.name)} 
                  style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '10px', padding: '10px 14px', fontWeight: 'bold' }}
                >🗑️</button>
              </div>
              <input 
                type="text" 
                placeholder="Ingredientes (ej: Pan, Queso)" 
                defaultValue={ur.ingredients.join(', ')} 
                onBlur={(e) => updateGlobalRecipe(ur.name, ur.name, e.target.value)} 
                style={{ width: '100%', fontSize: '0.9rem', border: '1px solid #ddd', borderRadius: '10px', padding: '10px', color: '#666', outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>
          ))}
        </div>

      </details>
    </main>
  );
}