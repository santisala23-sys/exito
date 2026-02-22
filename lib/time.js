// lib/time.js

// Te devuelve la fecha (YYYY-MM-DD) exacta en Argentina
export function getToday() {
  const str = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
  const argDate = new Date(str);
  
  const yyyy = argDate.getFullYear();
  const mm = String(argDate.getMonth() + 1).padStart(2, '0');
  const dd = String(argDate.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
}

// Te devuelve el número del día de la semana (0 = Domingo, 1 = Lunes...) exacto en Argentina
export function getArgDay() {
  const str = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
  return new Date(str).getDay(); 
}