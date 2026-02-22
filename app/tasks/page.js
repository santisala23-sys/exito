'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getToday } from '../../lib/time';
import Link from 'next/link';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(getToday()); // Por defecto carga la fecha de hoy
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('completed', false);
    if (data) setTasks(data);
  }

  // --- ACCIONES ---
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        title: newTitle.trim(), 
        due_date: newDate || null,
        priority: 0 
      }])
      .select();

    if (!error) {
      setTasks([...tasks, data[0]]);
      setNewTitle('');
    }
  };

  const completeTask = async (id, title) => {
    if (window.confirm(`¿Seguro que terminaste: "${title}"?`)) {
      const { error } = await supabase.from('tasks').update({ completed: true }).eq('id', id);
      if (!error) setTasks(tasks.filter(t => t.id !== id));
    }
  };

  // --- EDICIÓN Y PRIORIDAD ---
  const updateTask = async (id, field, value) => {
    await supabase.from('tasks').update({ [field]: value }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const changePriority = async (id, currentPriority, change) => {
    const newPriority = (currentPriority || 0) + change;
    await supabase.from('tasks').update({ priority: newPriority }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, priority: newPriority } : t));
  };

  const deleteTask = async (id) => {
    if (window.confirm("¿Querés borrar esta tarea por completo?")) {
      await supabase.from('tasks').delete().eq('id', id);
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  // --- FILTROS (Separar Hoy de Próximas) ---
  const todayStr = getToday();
  
  // Tareas de Hoy o Atrasadas (Ordenadas por prioridad mayor a menor)
  const todayTasks = tasks
    .filter(t => !t.due_date || t.due_date <= todayStr)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Tareas del futuro (Ordenadas por fecha más próxima)
  const futureTasks = tasks
    .filter(t => t.due_date && t.due_date > todayStr)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver</Link>
        <button 
          onClick={() => setEditMode(!editMode)}
          style={{ padding: '8px 16px', borderRadius: '16px', border: 'none', backgroundColor: editMode ? '#ef4444' : '#f3f4f6', color: editMode ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {editMode ? 'Terminar Edición' : '⚙️ Editar'}
        </button>
      </header>

      <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 2rem 0', letterSpacing: '-0.05em' }}>
        {editMode ? 'Gestión de Tareas' : 'Pendientes'}
      </h1>

      <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2.5rem', backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '24px' }}>
        <input 
          type="text" 
          placeholder="¿Qué hay que hacer?" 
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', border: '1px solid #eee', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="date" 
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid #eee', color: '#666', outline: 'none', fontFamily: 'inherit' }}
          />
          <button type="submit" style={{ padding: '0 1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold' }}>
            Añadir
          </button>
        </div>
      </form>

      {!editMode ? (
        /* VISTA NORMAL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* BLOQUE HOY */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem', color: '#111' }}>📍 Hoy / Atrasadas</h2>
            {todayTasks.length === 0 ? (
              <p style={{ color: '#999', fontSize: '0.9rem', fontStyle: 'italic' }}>Todo al día.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todayTasks.map(task => (
                  <div key={task.id} onClick={() => completeTask(task.id, task.title)} style={{ padding: '1.2rem 1.5rem', borderRadius: '20px', border: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', color: '#111', fontSize: '1.05rem' }}>{task.title}</span>
                      {task.due_date && task.due_date < todayStr && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', marginTop: '4px' }}>⚠️ Atrasada</span>}
                    </div>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BLOQUE PRÓXIMAS */}
          {futureTasks.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem', color: '#999' }}>🗓️ Próximas</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {futureTasks.map(task => {
                  const [y, m, d] = task.due_date.split('-');
                  return (
                    <div key={task.id} onClick={() => completeTask(task.id, task.title)} style={{ padding: '1rem 1.5rem', borderRadius: '20px', border: '1px dashed #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', opacity: 0.8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500', color: '#666', fontSize: '1rem' }}>{task.title}</span>
                        <span style={{ fontSize: '0.75rem', color: '#999', marginTop: '2px' }}>Para el {d}/{m}</span>
                      </div>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ddd', flexShrink: 0 }}></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      ) : (

        /* MODO EDICIÓN */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Ajustá el nombre, la fecha, o usá las flechas para subir/bajar la prioridad de las tareas de hoy.</p>
          {tasks.sort((a,b) => (b.priority || 0) - (a.priority || 0)).map(task => (
            <div key={task.id} style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '20px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  defaultValue={task.title}
                  onBlur={(e) => updateTask(task.id, 'title', e.target.value)}
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none', minWidth: 0 }}
                />
                <button 
                  onClick={() => deleteTask(task.id)}
                  style={{ padding: '0.8rem 1rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                >🗑️</button>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="date" 
                  defaultValue={task.due_date || ''}
                  onBlur={(e) => updateTask(task.id, 'due_date', e.target.value || null)}
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', fontSize: '0.9rem', color: '#666', minWidth: 0, fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <button onClick={() => changePriority(task.id, task.priority, 1)} style={{ padding: '0.6rem', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>🔼</button>
                  <button onClick={() => changePriority(task.id, task.priority, -1)} style={{ padding: '0.6rem', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>🔽</button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </main>
  );
}