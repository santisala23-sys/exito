'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');

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

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title: newTitle }])
      .select();

    if (!error) {
      setTasks([data[0], ...tasks]);
      setNewTitle('');
    }
  };

  const completeTask = async (id) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: true })
      .eq('id', id);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', minHeight: '100vh' }}>
      <Link href="/" style={{ textDecoration: 'none', color: '#999' }}>← Volver</Link>
      
      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '1rem 0' }}>Tareas Pendientes</h1>

      <form onSubmit={addTask} style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="¿Qué hay que hacer?" 
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #eee', fontSize: '1rem' }}
        />
        <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
          Añadir
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {tasks.map(task => (
          <div 
            key={task.id}
            onClick={() => completeTask(task.id)}
            style={{
              padding: '1.2rem',
              borderRadius: '16px',
              border: '1px solid #eee',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9fafb'
            }}>
            <span style={{ fontWeight: '500' }}>{task.title}</span>
            <span style={{ color: '#ccc' }}>○</span>
          </div>
        ))}
      </div>

      {tasks.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>No hay tareas pendientes.</p>}
    </main>
  );
}