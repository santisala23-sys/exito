'use client';
import { useState, useEffect } from 'react';
import { getToday } from '../../lib/time';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Otros() {
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState({});
  const [newTaskName, setNewTaskName] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchDailyLogs();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase.from('custom_tasks').select('*').order('created_at', { ascending: true });
    if (data) setTasks(data);
  }

  async function fetchDailyLogs() {
    const today = getToday();
    const { data } = await supabase.from('daily_task_logs').select('task_id, completed').eq('date', today);
    if (data) {
      const mapping = {};
      data.forEach(log => mapping[log.task_id] = log.completed);
      setLogs(mapping);
    }
  }

  // --- ACCIONES DE USUARIO ---
  const completeTask = async (taskId, taskName) => {
    const confirmar = window.confirm(`¿Terminaste de "${taskName}"?`);
    if (confirmar) {
      const today = getToday();
      const { error } = await supabase.from('daily_task_logs').upsert({
        date: today,
        task_id: taskId,
        completed: true
      }, { onConflict: 'date, task_id' });

      if (!error) setLogs({ ...logs, [taskId]: true });
    }
  };

  const undoTask = async (taskId) => {
    const today = getToday();
    const { error } = await supabase.from('daily_task_logs').upsert({
      date: today,
      task_id: taskId,
      completed: false
    }, { onConflict: 'date, task_id' });

    if (!error) setLogs({ ...logs, [taskId]: false });
  };

  // --- ACCIONES DE EDICIÓN ---
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    const { data, error } = await supabase.from('custom_tasks').insert([{ name: newTaskName.trim() }]).select();
    if (!error) {
      setTasks([...tasks, data[0]]);
      setNewTaskName('');
    }
  };

  const updateTaskName = async (id, newName) => {
    if (!newName.trim()) return;
    await supabase.from('custom_tasks').update({ name: newName }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, name: newName } : t));
  };

  const deleteTask = async (id) => {
    if (window.confirm("¿Seguro que querés eliminar este hábito de tu vida?")) {
      await supabase.from('custom_tasks').delete().eq('id', id);
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  // --- FILTROS ---
  const pendingTasks = tasks.filter(task => !logs[task.id]);
  const completedTasks = tasks.filter(task => logs[task.id]);

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#999', fontWeight: '600' }}>← Volver</Link>
        <button 
          onClick={() => setEditMode(!editMode)}
          style={{ padding: '8px 16px', borderRadius: '16px', border: 'none', backgroundColor: editMode ? '#ef4444' : '#f3f4f6', color: editMode ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {editMode ? 'Terminar Edición' : '⚙️ Editar Hábitos'}
        </button>
      </header>
      
      {!editMode ? (
        <>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 2rem 0', letterSpacing: '-0.05em' }}>Pendientes</h1>

          {/* Formulario rápido */}
          <form onSubmit={addTask} style={{ display: 'flex', gap: '10px', marginBottom: '2.5rem' }}>
            <input 
              type="text" 
              placeholder="Ej: Meditar, Estudiar..." 
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              style={{ flex: 1, padding: '1.2rem', borderRadius: '18px', border: '1px solid #eee', fontSize: '1rem', outline: 'none', backgroundColor: '#f9fafb' }}
            />
            <button type="submit" style={{ padding: '0 1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '18px', fontWeight: 'bold' }}>
              +
            </button>
          </form>

          {/* Lista de Pendientes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingTasks.map(task => (
              <div 
                key={task.id}
                onClick={() => completeTask(task.id, task.name)}
                style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f3f4f6', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
              >
                <span style={{ fontSize: '1.2rem', marginRight: '1rem' }}>{task.icon || '✨'}</span>
                <span style={{ fontWeight: '600', color: '#111', fontSize: '1.05rem' }}>{task.name}</span>
              </div>
            ))}
          </div>

          {pendingTasks.length === 0 && tasks.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', backgroundColor: '#f0fdf4', borderRadius: '24px' }}>
              <span style={{ fontSize: '3rem' }}>🎉</span>
              <p style={{ color: '#166534', marginTop: '1rem', fontWeight: 'bold' }}>¡Todo listo por hoy!</p>
            </div>
          )}

          {/* Lista de Completados (Para poder deshacer) */}
          {completedTasks.length > 0 && (
            <div style={{ marginTop: '3rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Hechos hoy</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {completedTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => undoTask(task.id)}
                    style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px dashed #d1d5db', cursor: 'pointer', backgroundColor: '#f9fafb', opacity: 0.7 }}
                  >
                    <span style={{ fontSize: '1.2rem', marginRight: '1rem' }}>✅</span>
                    <span style={{ fontWeight: '500', color: '#666', textDecoration: 'line-through' }}>{task.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (

        /* MODO EDICIÓN */
        <>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 1rem 0', letterSpacing: '-0.05em' }}>Tus Hábitos</h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>Modificá el texto y tocá afuera para guardar, o eliminalos con el botón rojo.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="text" 
                  defaultValue={task.name}
                  onBlur={(e) => updateTaskName(task.id, e.target.value)}
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
        </>
      )}

    </main>
  );
}