'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('completed', false)
      .order('created_at', { ascending: false });
    if (data) setTasks(data);
  }

  // --- ACCIONES ---
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title: newTitle.trim() }])
      .select();

    if (!error) {
      setTasks([data[0], ...tasks]);
      setNewTitle('');
    }
  };

  const completeTask = async (id, title) => {
    // Pedimos confirmación para no tildar por error
    if (window.confirm(`¿Seguro que terminaste: "${title}"?`)) {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: true })
        .eq('id', id);

      if (!error) {
        setTasks(tasks.filter(t => t.id !== id));
      }
    }
  };

  // --- EDICIÓN ---
  const updateTaskTitle = async (id, newTitle) => {
    if (!newTitle.trim()) return;
    await supabase.from('tasks').update({ title: newTitle.trim() }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle.trim() } : t));
  };

  const deleteTask = async (id) => {
    if (window.confirm("¿Querés borrar esta tarea por completo?")) {
      await supabase.from('tasks').delete().eq('id', id);
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver</Link>
        <button 
          onClick={() => setEditMode(!editMode)}
          style={{ padding: '8px 16px', borderRadius: '16px', border: 'none', backgroundColor: editMode ? '#ef4444' : '#f3f4f6', color: editMode ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {editMode ? 'Terminar Edición' : '⚙️ Editar Tareas'}
        </button>
      </header>

      <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 2rem 0', letterSpacing: '-0.05em' }}>
        {editMode ? 'Editar Tareas' : 'Tareas Pendientes'}
      </h1>

      <form onSubmit={addTask} style={{ display: 'flex', gap: '10px', marginBottom: '2.5rem' }}>
        <input 
          type="text" 
          placeholder="¿Qué hay que hacer?" 
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{ flex: 1, padding: '1.2rem', borderRadius: '18px', border: '1px solid #eee', fontSize: '1rem', outline: 'none', backgroundColor: '#f9fafb' }}
        />
        <button type="submit" style={{ padding: '0 1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '18px', fontWeight: 'bold' }}>
          +
        </button>
      </form>

      {!editMode ? (
        /* VISTA NORMAL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tasks.map(task => (
            <div 
              key={task.id}
              onClick={() => completeTask(task.id, task.title)}
              style={{
                padding: '1.5rem',
                borderRadius: '20px',
                border: '1px solid #f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
              <span style={{ fontWeight: '600', color: '#111', fontSize: '1.05rem' }}>{task.title}</span>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', backgroundColor: '#f0fdf4', borderRadius: '24px' }}>
              <span style={{ fontSize: '3rem' }}>🏖️</span>
              <p style={{ color: '#166534', marginTop: '1rem', fontWeight: 'bold' }}>¡Todo al día!</p>
            </div>
          )}
        </div>
      ) : (
        /* MODO EDICIÓN */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Modificá el texto y tocá afuera para guardar, o eliminalas definitivamente.</p>
          {tasks.map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="text" 
                defaultValue={task.title}
                onBlur={(e) => updateTaskTitle(task.id, e.target.value)}
                style={{ flex: 1, padding: '1.2rem', borderRadius: '16px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' }}
              />
              <button 
                onClick={() => deleteTask(task.id)}
                style={{ padding: '1.2rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}