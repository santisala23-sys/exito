'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Otros() {
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState({});
  const [newTaskName, setNewTaskName] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchDailyLogs();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase.from('custom_tasks').select('*').order('created_at', { ascending: true });
    if (data) setTasks(data);
  }

  async function fetchDailyLogs() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('daily_task_logs').select('task_id, completed').eq('date', today);
    if (data) {
      const mapping = {};
      data.forEach(log => mapping[log.task_id] = log.completed);
      setLogs(mapping);
    }
  }

  const completeTask = async (taskId, taskName) => {
    // 1. Pedir confirmación
    const confirmar = window.confirm(`¿Terminaste de "${taskName}"?`);
    
    if (confirmar) {
      const today = new Date().toISOString().split('T')[0];
      
      // 2. Guardar en Supabase
      const { error } = await supabase.from('daily_task_logs').upsert({
        date: today,
        task_id: taskId,
        completed: true
      }, { onConflict: 'date, task_id' });

      if (!error) {
        // 3. Actualizar estado local para que "desaparezca" de la vista actual
        setLogs({ ...logs, [taskId]: true });
      } else {
        alert("Hubo un error al guardar.");
      }
    }
  };

  const addTask = async () => {
    if (!newTaskName) return;
    const { data, error } = await supabase.from('custom_tasks').insert([{ name: newTaskName }]).select();
    if (!error) {
      setTasks([...tasks, data[0]]);
      setNewTaskName('');
    }
  };

  // Filtramos la lista: solo mostramos las que NO están marcadas como completadas hoy
  const pendingTasks = tasks.filter(task => !logs[task.id]);

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      <Link href="/" style={{ textDecoration: 'none', color: '#999' }}>← Volver</Link>
      
      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '1rem 0' }}>Pendientes</h1>

      {/* Agregar nueva actividad */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Ej: Meditar, Estudiar..." 
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #eee', fontSize: '1rem' }}
        />
        <button onClick={addTask} style={{ padding: '12px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          +
        </button>
      </div>

      {/* Lista de Actividades Pendientes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {pendingTasks.map(task => (
          <div 
            key={task.id}
            onClick={() => completeTask(task.id, task.name)}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              padding: '1.5rem', 
              borderRadius: '20px', 
              border: '1px solid #eee', 
              cursor: 'pointer', 
              backgroundColor: '#fff',
              transition: 'transform 0.1s ease',
              boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
            }}>
            <span style={{ fontSize: '1.2rem', marginRight: '1rem' }}>{task.icon || '✨'}</span>
            <span style={{ fontWeight: '600', color: '#111' }}>{task.name}</span>
          </div>
        ))}
      </div>

      {pendingTasks.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <span style={{ fontSize: '3rem' }}>🎉</span>
          <p style={{ color: '#999', marginTop: '1rem' }}>¡Todo listo por hoy, Santi!</p>
        </div>
      )}
    </main>
  );
}