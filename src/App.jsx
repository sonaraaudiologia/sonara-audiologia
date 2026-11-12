import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase";

// ─── UTILS ────────────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("App crash:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", background: "#FEF2F2", minHeight: "100vh" }}>
          <h2 style={{ color: "#DC2626" }}>Error en la aplicación</h2>
          <pre style={{ background: "#fff", padding: 20, borderRadius: 8, overflow: "auto", fontSize: 12, color: "#991B1B" }}>
            {this.state.error.toString()}
            {" | "}
            {this.state.error.stack}
            {this.state.error.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: "8px 20px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  try {
    const hoy = new Date();
    const nac = new Date(fechaNac + "T12:00:00");
    if (isNaN(nac.getTime())) return null;
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? edad : null;
  } catch(e) { return null; }
}

function formatFecha(str) {
  if (!str) return "-";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}
function today() { return new Date().toISOString().split("T")[0]; }
// Fecha local (Argentina) en formato YYYY-MM-DD; today() usa UTC y después de las 21 hs devolvería el día siguiente
function hoyLocal() { return new Date().toLocaleDateString("en-CA"); }
// Texto de detalle de un audífono en la ficha: (año) · S/N · Retiro dd/mm/aaaa
function detalleAudifono(pac, lado) {
  const anio = pac[`audifono_${lado}_anio`], serie = pac[`audifono_${lado}_serie`], fecha = pac[`audifono_${lado}_fecha`];
  const partes = [];
  if (anio) partes.push(`(${anio})`);
  if (serie) partes.push(`S/N ${serie}`);
  if (fecha) partes.push(`Retiro ${formatFecha(fecha)}`);
  return partes.length ? " " + partes.join(" · ") : "";
}
function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11); }
// Normaliza texto para comparar ignorando tildes/diacríticos y mayúsculas (ej: "Garcia" === "García")
function normalizar(str) {
  return (str || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Lista centralizada de profesionales del consultorio. Agregar acá cualquier
// profesional nuevo para que aparezca automáticamente en agenda, disponibilidad,
// turnos, historia clínica y bloqueos.
const PROFESIONALES = [
  { key: "Lic. Cecilia Miatello", apellido: "Miatello", label: "Miatello", short: "CM", color: "#1a6b6b", bg: "#e0f4f4" },
  { key: "Lic. Graciela Valles",  apellido: "Valles",   label: "Valles",   short: "GV", color: "#4338CA", bg: "#EEF2FF" },
  { key: "Analía Paloma",         apellido: "Paloma",   label: "Paloma",   short: "AP", color: "#B45309", bg: "#FEF3C7" },
  // ocultoPorDefecto: arranca destildada en la agenda; cada usuario puede tildarla
  { key: "Lic. Carolina Abatte",  apellido: "Abatte",   label: "Abatte",   short: "CA", color: "#BE185D", bg: "#FCE7F3", ocultoPorDefecto: true },
];
function getLunes(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function sumarMeses(fechaStr, meses) {
  const d = new Date(fechaStr + "T12:00:00");
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().split("T")[0];
}

// ─── RECORDATORIOS REPETIDOS ──────────────────────────────────────────────────
// Frecuencias disponibles al agendar un recordatorio.
const FRECUENCIAS_REC = [
  { key: "",          label: "No se repite" },
  { key: "semanal",   label: "Cada semana" },
  { key: "quincenal", label: "Cada 2 semanas" },
  { key: "mensual",   label: "Cada mes" },
  { key: "anual",     label: "Cada año" },
];
const MAX_REPETICIONES_REC = 104;
// Suma meses sin "desbordar" (31/01 + 1 mes = 28/02 o 29/02, no 03/03).
function sumarMesesClamp(fechaStr, meses) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  const total = (m - 1) + meses;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const ultimoDia = new Date(ny, nm + 1, 0).getDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, ultimoDia)).padStart(2, "0")}`;
}
// Devuelve todas las fechas de la serie (incluida la primera) entre fechaInicio y fechaHasta.
function fechasRepeticion(fechaInicio, frecuencia, fechaHasta) {
  if (!frecuencia || !fechaHasta || fechaHasta < fechaInicio) return [fechaInicio];
  const fechas = [];
  for (let i = 0; i < MAX_REPETICIONES_REC; i++) {
    const f = frecuencia === "semanal" ? addDays(fechaInicio, 7 * i)
      : frecuencia === "quincenal" ? addDays(fechaInicio, 14 * i)
      : frecuencia === "mensual" ? sumarMesesClamp(fechaInicio, i)
      : frecuencia === "anual" ? sumarMesesClamp(fechaInicio, 12 * i)
      : fechaInicio;
    if (f > fechaHasta) break;
    fechas.push(f);
    if (!["semanal", "quincenal", "mensual", "anual"].includes(frecuencia)) break;
  }
  return fechas;
}

// ─── SEGUIMIENTO POSVENTA ─────────────────────────────────────────────────────
// Recordatorios automáticos contados desde la fecha de retiro (entrega) del audífono.
// Para agregar/quitar un plazo, tocar solo esta lista.
const SEGUIMIENTO_POSVENTA = [
  { meses: 1,  etiqueta: "1 mes" },
  { meses: 6,  etiqueta: "6 meses" },
  { meses: 12, etiqueta: "1 año" },
];
const MENSAJES_POSVENTA = {
  "1 mes":   n => `Hola ${n} 👋 Te escribimos de Sonara Audiología. Ya pasó un mes desde que empezaste a usar tus audífonos y queríamos saber cómo te estás adaptando. ¿Cómo te sentís con ellos? Si notás algo que te moleste o querés hacer algún ajuste, avisanos y coordinamos un turno.`,
  "6 meses": n => `Hola ${n} 👋 Te escribimos de Sonara Audiología. Ya pasaron 6 meses desde que retiraste tus audífonos y queríamos saber cómo te está yendo. Es un buen momento para un control y limpieza de los equipos. ¿Te coordinamos un turno?`,
  "1 año":   n => `Hola ${n} 👋 Te escribimos de Sonara Audiología. ¡Se cumple un año desde que empezaste a usar tus audífonos! Te recomendamos hacer el control anual para revisar tu audición y el funcionamiento de los equipos. ¿Te coordinamos un turno?`,
};
// Link de wa.me para un recordatorio de posventa (solo abre WhatsApp con el texto listo).
function linkPosventaWhatsApp(rec, paciente) {
  if (rec?.tipo !== "posventa" || !paciente?.telefono) return null;
  const numero = limpiarTelefonoAR(paciente.telefono);
  if (!numero) return null;
  const etapa = SEGUIMIENTO_POSVENTA.find(s => (rec.titulo || "").startsWith(`Posventa ${s.etiqueta} ·`));
  const armar = MENSAJES_POSVENTA[etapa?.etiqueta] || MENSAJES_POSVENTA["1 mes"];
  return `https://wa.me/${numero}?text=${encodeURIComponent(armar(paciente.nombre || ""))}`;
}

// ─── WHATSAPP — recordatorio manual de turnos ─────────────────────────────────
// Limpia y normaliza un número de teléfono argentino al formato que espera wa.me
// (54 9 + código de área + número, sin el "15" local ni el "0" de larga distancia).
function limpiarTelefonoAR(tel) {
  if (!tel) return "";
  const original = String(tel).trim();
  if (!original) return "";
  // El "15" solo se quita cuando aparece como grupo separado en el texto original
  // (con espacio, guion, punto o paréntesis alrededor), tal como la gente lo escribe
  // cuando quiere indicar el viejo prefijo de celular. Si el número está todo junto
  // sin separadores, se lo deja tal cual: buscar "15" dentro de una tira de dígitos
  // ya unida es ambiguo y puede confundir un "1" o un "5" reales del número
  // (por ej. área "341" + local que empieza con "5" arma un falso "...1" + "5...").
  const grupos = original.split(/\D+/).filter(Boolean);
  let d;
  if (grupos.length > 1 && grupos.includes("15")) {
    d = grupos.filter(g => g !== "15").join("");
  } else {
    d = original.replace(/\D/g, "");
  }
  if (!d) return "";
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("549")) return d;
  if (d.startsWith("54")) return "549" + d.slice(2);
  return "549" + d;
}

// Firma corta del turno para el link de confirmación. Se calcula con id + paciente +
// fecha + hora: si el turno se reprograma, el link viejo deja de ser válido (así el
// paciente no confirma un horario que ya cambió), y nadie puede armar a mano un link
// para otro turno cambiando el número de id.
function firmaTurno(t) {
  const str = `sonara|${t.id}|${t.paciente_id}|${t.fecha}|${(t.hora || "").slice(0, 5)}`;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
// Link a la página pública donde el paciente confirma o cancela su turno
function linkConfirmacionTurno(turno) {
  if (!turno?.id || !turno?.paciente_id) return "";
  return `${window.location.origin}/?turno=${encodeURIComponent(turno.id)}&k=${firmaTurno(turno)}`;
}

// Arma el link de wa.me con el mensaje de recordatorio precargado (el usuario
// solo tiene que abrir el link y tocar "Enviar" — no se manda nada automáticamente).
function linkRecordatorioWhatsApp(turno, paciente) {
  if (!paciente?.telefono) return null;
  const numero = limpiarTelefonoAR(paciente.telefono);
  if (!numero) return null;
  const fecha = formatFecha(turno.fecha);
  const hora = turno.hora ? turno.hora.slice(0, 5) : "";
  const linkConf = linkConfirmacionTurno(turno);
  const cierre = linkConf
    ? `👉 Por favor confirmá o cancelá tu turno desde este link:\n${linkConf}`
    : `Ante cualquier inconveniente para asistir, por favor avisanos. ¡Te esperamos!`;
  const mensaje = `Hola ${paciente.nombre} 👋 Sonara Audiología te recuerda tu turno de mañana ${fecha}${hora ? ` a las ${hora} hs` : ""}.\n\nTe pedimos que llegues puntual, sin adelantarte más de 5-10 minutos, ya que el espacio es reducido y podría haber otro paciente en curso. Te esperamos en Ituzaingó 1934 Of. 1.\n\n${cierre}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

// Arma el link de wa.me con el saludo de cumpleaños precargado (mismo esquema que
// el recordatorio: solo abre WhatsApp con el texto listo, no envía nada solo).
function linkSaludoCumpleWhatsApp(paciente) {
  if (!paciente?.telefono) return null;
  const numero = limpiarTelefonoAR(paciente.telefono);
  if (!numero) return null;
  const mensaje = `¡Feliz cumpleaños, ${paciente.nombre}! 🎂🎉\n\nDesde Sonara Audiología te deseamos un día hermoso, para disfrutar junto a las voces y los sonidos que más querés.\n\n¡Un abrazo grande de todo el equipo! 💙`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
function nombreDia(dateStr) {
  return ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][new Date(dateStr + "T12:00:00").getDay()];
}
function numDia(dateStr) { return parseInt(dateStr.split("-")[2], 10); }
function mesCorto(dateStr) {
  const m = parseInt(dateStr.split("-")[1], 10) - 1;
  return ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][m];
}

// ─── ETIQUETAS ────────────────────────────────────────────────────────────────
const ETIQUETAS_DEFAULT = [
  { id: "ministerio",    label: "Ministerio",       color: "#1D4ED8", bg: "#DBEAFE" },
  { id: "oticon",        label: "Usuario Oticon",   color: "#065F46", bg: "#D1FAE5" },
  { id: "particular",   label: "Particular",        color: "#6B21A8", bg: "#F3E8FF" },
  { id: "derivacion",   label: "Con derivación",    color: "#92400E", bg: "#FEF3C7" },
];

function EtiquetaBadge({ etiqueta }) {
  return (
    <span style={{
      background: etiqueta.bg, color: etiqueta.color,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
      border: `1px solid ${etiqueta.color}22`, display: "inline-block"
    }}>{etiqueta.label}</span>
  );
}

function SelectorEtiquetas({ seleccionadas = [], onChange }) {
  const [etiquetasCustom, setEtiquetasCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem("etiquetas_custom") || "[]"); } catch { return []; }
  });
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [mostrarAgregar, setMostrarAgregar] = useState(false);

  const todasEtiquetas = [...ETIQUETAS_DEFAULT, ...etiquetasCustom];

  function toggleEtiqueta(id) {
    const ya = seleccionadas.includes(id);
    onChange(ya ? seleccionadas.filter(e => e !== id) : [...seleccionadas, id]);
  }

  function agregarCustom() {
    const label = nuevaEtiqueta.trim();
    if (!label) return;
    const id = "custom_" + uid();
    const colores = [
      { color: "#991B1B", bg: "#FEE2E2" }, { color: "#1E40AF", bg: "#DBEAFE" },
      { color: "#065F46", bg: "#D1FAE5" }, { color: "#4C1D95", bg: "#EDE9FE" },
      { color: "#92400E", bg: "#FEF3C7" }, { color: "#0369A1", bg: "#E0F2FE" },
    ];
    const c = colores[etiquetasCustom.length % colores.length];
    const nueva = { id, label, ...c };
    const actualizadas = [...etiquetasCustom, nueva];
    setEtiquetasCustom(actualizadas);
    localStorage.setItem("etiquetas_custom", JSON.stringify(actualizadas));
    onChange([...seleccionadas, id]);
    setNuevaEtiqueta("");
    setMostrarAgregar(false);
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {todasEtiquetas.map(e => {
          const activa = seleccionadas.includes(e.id);
          return (
            <button type="button" key={e.id} onClick={() => toggleEtiqueta(e.id)} style={{
              background: activa ? e.bg : "#F3F4F6",
              color: activa ? e.color : "#6B7280",
              border: activa ? `1.5px solid ${e.color}44` : "1.5px solid #E5E7EB",
              borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: activa ? 700 : 500,
              cursor: "pointer", transition: "all 0.15s"
            }}>{activa ? "✓ " : ""}{e.label}</button>
          );
        })}
        <button type="button" onClick={() => setMostrarAgregar(!mostrarAgregar)} style={{
          background: "transparent", color: "#6366F1", border: "1.5px dashed #6366F1",
          borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer"
        }}>+ Nueva etiqueta</button>
      </div>
      {mostrarAgregar && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Nombre de la etiqueta..."
            value={nuevaEtiqueta}
            onChange={e => setNuevaEtiqueta(e.target.value)}
            onKeyDown={e => e.key === "Enter" && agregarCustom()}
          />
          <button type="button" onClick={agregarCustom} style={{ ...btnPrimary, padding: "8px 14px", fontSize: 13 }}>Agregar</button>
          <button type="button" onClick={() => setMostrarAgregar(false)} style={{ ...btnSecondary, padding: "8px 10px", fontSize: 13 }}>✕</button>
        </div>
      )}
    </div>
  );
}

function getEtiquetaInfo(id) {
  try {
    const custom = JSON.parse(localStorage.getItem("etiquetas_custom") || "[]");
    return [...ETIQUETAS_DEFAULT, ...custom].find(e => e.id === id);
  } catch { return null; }
}

// ─── SELECTOR DERIVADO POR ────────────────────────────────────────────────────
function DerivadoPorSelector({ value, onChange }) {
  const [profesionales, setProfesionales] = useState([]);

  useEffect(() => {
    supabase.from("profesionales_externos").select("id,nombre,especialidad").order("nombre")
      .then(({ data }) => { if (data) setProfesionales(data); });
  }, []);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaEsp, setNuevaEsp] = useState("");

  async function agregarYSeleccionar() {
    if (!nuevoNombre.trim()) return;
    const { data: row } = await supabase.from("profesionales_externos")
      .insert({ nombre: nuevoNombre.trim(), especialidad: nuevaEsp.trim(), seguimiento: [] })
      .select().single();
    if (row) setProfesionales(p => [...p, row]);
    onChange(nuevoNombre.trim());
    setMostrarNuevo(false);
    setNuevoNombre("");
    setNuevaEsp("");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select style={{ ...selectStyle, flex: 1 }} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— Sin derivación —</option>
          {profesionales.map(p => (
            <option key={p.id} value={p.nombre}>{p.nombre}{p.especialidad ? ` · ${p.especialidad}` : ""}</option>
          ))}
        </select>
        <button type="button" onClick={() => setMostrarNuevo(!mostrarNuevo)} style={{
          background: "#EEF2FF", color: "#4338CA", border: "1.5px solid #C7D2FE",
          borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
        }}>+ Nuevo</button>
      </div>
      {mostrarNuevo && (
        <div style={{ marginTop: 8, background: "#F8FAFC", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "12px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#4338CA", marginBottom: 8 }}>Agregar nuevo profesional derivante</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 3 }}>Nombre *</label>
              <input style={inputStyle} value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Dr. Juan Pérez" onKeyDown={e => e.key === "Enter" && agregarYSeleccionar()} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 3 }}>Especialidad</label>
              <input style={inputStyle} value={nuevaEsp} onChange={e => setNuevaEsp(e.target.value)} placeholder="Médico clínico..." />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={agregarYSeleccionar} style={{ ...btnPrimary, padding: "7px 14px", fontSize: 12 }}>Agregar y seleccionar</button>
            <button type="button" onClick={() => setMostrarNuevo(false)} style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ETIQUETAS INLINE (sin componente externo, sin closures) ─────────────────
function EtiquetasInline({ seleccionadas, onChange }) {
  const [custom, setCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem("etiquetas_custom") || "[]"); } catch { return []; }
  });
  const [nueva, setNueva] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const todas = [...ETIQUETAS_DEFAULT, ...custom];

  function toggle(id) {
    const ya = seleccionadas.includes(id);
    const resultado = ya ? seleccionadas.filter(e => e !== id) : [...seleccionadas, id];
    onChange(resultado);
  }

  function agregarCustom() {
    const label = nueva.trim();
    if (!label) return;
    const id = "custom_" + Date.now();
    const cols = [
      { color: "#991B1B", bg: "#FEE2E2" }, { color: "#1E40AF", bg: "#DBEAFE" },
      { color: "#065F46", bg: "#D1FAE5" }, { color: "#4C1D95", bg: "#EDE9FE" },
      { color: "#92400E", bg: "#FEF3C7" }, { color: "#0369A1", bg: "#E0F2FE" },
    ];
    const c = cols[custom.length % cols.length];
    const nuevaEt = { id, label, ...c };
    const actualizadas = [...custom, nuevaEt];
    setCustom(actualizadas);
    localStorage.setItem("etiquetas_custom", JSON.stringify(actualizadas));
    onChange([...seleccionadas, id]);
    setNueva("");
    setMostrar(false);
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {todas.map(e => {
          const activa = seleccionadas.includes(e.id);
          return (
            <button type="button" key={e.id} onClick={() => toggle(e.id)} style={{
              background: activa ? e.bg : "#F3F4F6", color: activa ? e.color : "#6B7280",
              border: activa ? `1.5px solid ${e.color}44` : "1.5px solid #E5E7EB",
              borderRadius: 20, padding: "4px 12px", fontSize: 12,
              fontWeight: activa ? 700 : 500, cursor: "pointer"
            }}>{activa ? "✓ " : ""}{e.label}</button>
          );
        })}
        <button type="button" onClick={() => setMostrar(!mostrar)} style={{
          background: "transparent", color: "#6366F1", border: "1.5px dashed #6366F1",
          borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer"
        }}>+ Nueva</button>
      </div>
      {mostrar && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Nombre de la etiqueta..."
            value={nueva} onChange={e => setNueva(e.target.value)}
            onKeyDown={e => e.key === "Enter" && agregarCustom()} />
          <button type="button" onClick={agregarCustom} style={{ ...btnPrimary, padding: "8px 14px", fontSize: 13 }}>Agregar</button>
          <button type="button" onClick={() => setMostrar(false)} style={{ ...btnSecondary, padding: "8px 10px", fontSize: 13 }}>✕</button>
        </div>
      )}
    </div>
  );
}


// ─── COLOR POR MOTIVO ──────────────────────────────────────────────────────────
function colorPorMotivo(practicas, motivo) {
  const texto = (Array.isArray(practicas) && practicas.length > 0 ? practicas.join(" ") : motivo || "").toLowerCase();
  if (texto.includes("selección") || texto.includes("seleccion") || texto.includes("entrega de audíf") || texto.includes("entrega de audif") || texto.includes("asesoramiento")) {
    return { bg: "#EDE9FE", border: "#A78BFA", text: "#5B21B6", label: "Selección/Entrega" };
  }
  if (texto.includes("calibración de ic") || texto.includes("calibracion de ic") || texto.includes("encendido de ic") || texto.includes("rendimiento de ic") || texto.includes("rendimiento de ota")) {
    return { bg: "#D1FAE5", border: "#34D399", text: "#065F46", label: "IC/OTA" };
  }
  if (texto.includes("reunión") || texto.includes("reunion") || texto.includes("visita")) {
    return { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E", label: "Reunión/Visita" };
  }
  // Default: todos los demás
  return { bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF", label: "Consulta" };
}

function horaAMin(h) {
  if (!h) return 0;
  const [hh, mm] = (h.slice(0,5)).split(":").map(Number);
  return hh * 60 + mm;
}

// Devuelve las franjas horarias de una config de disponibilidad/excepción.
// Compatible con el formato viejo (horaDesde/horaHasta sueltos) y el nuevo (array `franjas`).
function franjasDeConf(conf) {
  if (!conf) return [];
  if (Array.isArray(conf.franjas) && conf.franjas.length > 0) return conf.franjas;
  return [{ horaDesde: conf.horaDesde || "08:00", horaHasta: conf.horaHasta || "18:00" }];
}


// ─── TIPOS DE ENTRADA DE AGENDA ───────────────────────────────────────────────
const TIPOS_ENTRADA = {
  turno:        { label: "Turno paciente",        color: "#1a6b6b", bg: "#e0f4f4", emoji: "👤" },
  recordatorio: { label: "Recordatorio",          color: "#6B7280", bg: "#F3F4F6", emoji: "🔔" },
  visita:       { label: "Visita / Reunión",      color: "#92400E", bg: "#FEF3C7", emoji: "🤝" },
  bloqueo:      { label: "Bloqueo de agenda",     color: "#991B1B", bg: "#FEE2E2", emoji: "🔒" },
};

const COLORES_PRESET = [
  "#1a6b6b","#4338CA","#065F46","#92400E","#991B1B",
  "#1D4ED8","#6D28D9","#0369A1","#B45309","#374151",
];

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#FAFAFA" };
const selectStyle = { ...inputStyle };
const btnPrimary = { background: "linear-gradient(135deg, #1a6b6b, #145555)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnSecondary = { background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" };

const COLORES_ESTADO = {
  pendiente:   { bg: "#FEF3C7", color: "#92400E", label: "Pendiente" },
  confirmado:  { bg: "#D1FAE5", color: "#065F46", label: "Confirmado" },
  cancelado:   { bg: "#FEE2E2", color: "#991B1B", label: "Cancelado" },
  suspendido:  { bg: "#FEE2E2", color: "#991B1B", label: "Suspendido" },
  realizado:   { bg: "#E0F2FE", color: "#075985", label: "Realizado" },
  ausente:     { bg: "#F3F4F6", color: "#4B5563", label: "Ausente" },
};
const ESTADOS_OCULTOS = ["cancelado", "suspendido"]; // no aparecen en agenda

// Lista de precios (planilla "Precios INSUMOS" → hoja Servicios/Insumos). precio = SONARA, especial = PAMI/Ministerio/Hospitales.
// Para actualizar precios, editar solo los números de esta lista.
const PRECIOS_INSUMOS = [
  // Insumos
  { nombre: "Pilas", precio: 12000 },
  { nombre: "Spaguettis", precio: 10000 },
  { nombre: "Spaguetti + servicio de cambio", precio: 15000 },
  { nombre: "Free tube", precio: 20000 },
  { nombre: "Domo", precio: 7000 },
  { nombre: "Free tube + domo", precio: 25000 },
  { nombre: "Codos", precio: 20000 },
  { nombre: "Sujetador", precio: 10000 },
  { nombre: "Deshumidificador", precio: 15000 },
  { nombre: "Tester de pilas", precio: 10000 },
  { nombre: "Rueda de filtro (x6)", precio: 35000 },
  { nombre: "Cambio de filtro (x1)", precio: 10000 },
  { nombre: "Molde rígido", precio: 60000, especial: 75000 },
  { nombre: "Molde silicona", precio: 65000, especial: 80000 },
  { nombre: "Molde RIC", precio: 65000 },
  { nombre: "Speaker", precio: 180000 },
  { nombre: "Tapones auditivos", precio: null },
  // Servicios técnicos
  { nombre: "Cambio pulsador de volumen", precio: 20000 },
  { nombre: "Cambio portapilas", precio: 25000 },
  { nombre: "Limpieza", precio: 40000 },
  { nombre: "Cambio de pila de litio", precio: 80000 },
  { nombre: "Reparación (costo + 75%)", precio: null },
  // Prácticas
  { nombre: "Consulta", precio: 45000, especial: 35000 },
  { nombre: "Audiometría", precio: 50000, especial: 40000 },
  { nombre: "Audio + logo", precio: 70000, especial: 50000 },
  { nombre: "Acufenometría y pruebas supraliminares", precio: 40000 },
  { nombre: "Audiometría por el juego", precio: 80000 },
  { nombre: "Calibración OTA", precio: 80000, especial: 60000 },
  { nombre: "Calibración (audífono comprado afuera, u$s 200)", precio: null },
  { nombre: "Calibración osteo", precio: 100000 },
  { nombre: "Calibración IC", precio: 120000, especial: 90000 },
  { nombre: "Calibración IC bilateral", precio: 160000, especial: 120000 },
  { nombre: "Encendido IC", precio: 250000 },
  { nombre: "Rendimiento OTA / evaluación habla", precio: 80000 },
  { nombre: "Asesoría / supervisión a profesionales", precio: 100000 },
  { nombre: "Otro", precio: null },
];
const INSUMOS_LISTA = PRECIOS_INSUMOS.map(i => i.nombre);
function precioInsumo(nombre, especial = false) {
  const it = PRECIOS_INSUMOS.find(i => i.nombre === nombre);
  if (!it) return "";
  const p = especial && it.especial != null ? it.especial : it.precio;
  return p != null ? String(p) : "";
}
// "especial" se mantiene entre ítems para no tener que tildarlo de nuevo en cada uno
const insumoVacio = (especial = false) => ({ nombre: "Pilas", cantidad: 1, precio: precioInsumo("Pilas", especial), especial });


const FORM_TURNO_VACIO = { paciente_id: "", fecha: today(), hora: "09:00", hora_fin: "09:30", motivo: "", practicas: [], profesional: "", estado: "pendiente", notas: "" };

const DURACION_MOTIVO = { "Selección de audífonos": 60, "Asesoramiento comercial": 60, "Calibración de IC": 60, "Encendido de IC": 60 };
function calcularHoraFin(horaInicio, motivo) {
  if (!horaInicio) return "";
  const mins = DURACION_MOTIVO[motivo] !== undefined ? DURACION_MOTIVO[motivo] : 30;
  const [h, m] = horaInicio.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}


const PRACTICAS_LISTA = [
  "Audiometría",
  "Audiometría y logoaudiometría",
  "Audiometría por juego",
  "Calibración de audífono",
  "Calibración de IC",
  "Encendido de IC",
  "Rendimiento de IC",
  "Rendimiento de OTA",
  "Toma de impresión para molde",
  "Entrega de Molde",
  "Selección de audífonos",
  "Entrega de audífonos",
  "Asesoramiento comercial",
  "Control",
  "Reparación",
  "Cambio de spaguetti",
  "Contacto telefónico / WhatsApp",
  "Seña/compra de audífono",
  "Compra de insumos",
  "Reunión con profesional / Visita",
  "Otro",
];

function Badge({ estado }) {
  const c = COLORES_ESTADO[estado];
  if (!c) return null;
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700, display: "inline-block" }}>
      {c.label}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px 14px", borderBottom: "1.5px solid #F0F0F0", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 17, cursor: "pointer", color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "18px 22px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5, textTransform: "none" }}>{label}</label>}
      {children}
    </div>
  );
}

// Selector de paciente con buscador (reemplaza al <select> nativo, que en Chrome/Windows
// se dibuja en blanco con listas largas). value = id del paciente o "" ; onChange recibe el id o "".
function SelectorPaciente({ pacientes, value, onChange, placeholder = "Seleccionar...", style }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState(null);
  const inputRef = useRef(null);
  const lista = pacientes || [];
  const seleccionado = lista.find(p => String(p.id) === String(value));
  const nombreDe = p => `${p.apellido || ""}, ${p.nombre || ""}`;

  const q = normalizar(texto).trim();
  const filtrados = (q
    ? lista.filter(p => { const n = normalizar(`${p.apellido} ${p.nombre} ${p.nombre} ${p.apellido} ${p.dni || ""}`); return q.split(/\s+/).every(t => n.includes(t)); })
    : lista
  ).slice(0, 60);
  const opciones = [{ id: "", _vacio: true }, ...filtrados];

  function medir() {
    const r = inputRef.current?.getBoundingClientRect();
    if (!r) return;
    const abajo = window.innerHeight - r.bottom;
    const alto = Math.min(260, Math.max(abajo, r.top) - 12);
    setPos(abajo >= 180 || abajo >= r.top
      ? { left: r.left, top: r.bottom + 4, width: r.width, maxHeight: alto }
      : { left: r.left, bottom: window.innerHeight - r.top + 4, width: r.width, maxHeight: alto });
  }

  useEffect(() => {
    if (!abierto) return;
    medir();
    const h = () => medir();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [abierto]);

  function abrir() { setTexto(""); setIdx(0); setAbierto(true); }
  function elegir(op) { onChange(op._vacio ? "" : op.id); setAbierto(false); setTexto(""); inputRef.current?.blur(); }

  function onKeyDown(e) {
    if (!abierto && (e.key === "ArrowDown" || e.key === "Enter")) { e.preventDefault(); abrir(); return; }
    if (!abierto) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, opciones.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (opciones[idx]) elegir(opciones[idx]); }
    else if (e.key === "Escape") { e.preventDefault(); setAbierto(false); setTexto(""); }
  }

  return (
    <div style={{ position: "relative", width: "100%", ...(style?.maxWidth ? { maxWidth: style.maxWidth } : {}) }}>
      <input
        ref={inputRef}
        style={{ ...selectStyle, ...style, maxWidth: "100%", paddingRight: 30, cursor: "pointer" }}
        value={abierto ? texto : (seleccionado ? nombreDe(seleccionado) : "")}
        placeholder={abierto ? "🔍 Escribí apellido, nombre o DNI..." : placeholder}
        onFocus={abrir}
        onClick={() => { if (!abierto) abrir(); }}
        onChange={e => { setTexto(e.target.value); setIdx(e.target.value ? 1 : 0); if (!abierto) setAbierto(true); }}
        onBlur={() => setTimeout(() => { setAbierto(false); setTexto(""); }, 150)}
        onKeyDown={onKeyDown}
      />
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#888", pointerEvents: "none" }}>▼</span>
      {abierto && pos && (
        <div style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: pos.maxHeight, overflowY: "auto", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 2000 }}>
          {opciones.map((op, i) => (
            <div key={op._vacio ? "__vacio" : op.id}
              onMouseDown={e => { e.preventDefault(); elegir(op); }}
              onMouseEnter={() => setIdx(i)}
              style={{ padding: "7px 12px", fontSize: 14, cursor: "pointer", color: op._vacio ? "#888" : "#1a1a2e", fontStyle: op._vacio ? "italic" : "normal", background: i === idx ? "#E6F2F2" : (String(op.id) === String(value) && !op._vacio ? "#F3F4F6" : "#fff"), fontWeight: String(op.id) === String(value) && !op._vacio ? 700 : 400 }}>
              {op._vacio ? placeholder : nombreDe(op)}
            </div>
          ))}
          {filtrados.length === 0 && <div style={{ padding: "8px 12px", fontSize: 13, color: "#aaa" }}>Sin resultados</div>}
          {q === "" && lista.length > 60 && <div style={{ padding: "6px 12px", fontSize: 11, color: "#aaa", borderTop: "1px solid #F0F0F0" }}>Mostrando 60 de {lista.length} — escribí para buscar</div>}
        </div>
      )}
    </div>
  );
}

// ─── OBRA SOCIAL: separar combinadas + selector desplegable ──────────────────
// "IAPOS y OSDE", "OSDE e IAPOS", "IAPOS, OSDE", "IAPOS/OSDE", "IAPOS + OSDE", "PAMI o Británica", "IAPOS-PAMI-UNIVERSIDAD" → separadas.
// OS_CON_GUION: nombres que llevan guion propio y NO se deben partir (agregar acá si aparece otra).
const OS_CON_GUION = ["Hospital Italiano - La Casa del Médico Mutual"];
// Clave para comparar/deduplicar: sin acentos, minúsculas, espacios simples, sin puntos/guiones sueltos en los bordes
function claveOS(str) { return normalizar(str).replace(/\s+/g, " ").replace(/^[\s.\-–—]+|[\s.\-–—]+$/g, "").trim(); }
// Valores que no son una obra social (se representan con la opción "Particular / sin obra social")
const OS_NO_VALIDAS = ["particular", "sin obra social", "no tiene", "no", "ninguna", "-", "s/os", "sin os"];
function separarOS(str) {
  const prot = new Set(OS_CON_GUION.map(x => normalizar(x).replace(/\s+/g, " ").trim()));
  return (str || "").split(/\s*(?:[,\/+;&]|\s+(?:y|e|o)\s+)\s*/i)
    .flatMap(parte => prot.has(normalizar(parte).replace(/\s+/g, " ").trim()) ? [parte] : parte.split(/\s*[-–—]\s*/))
    .map(s => s.replace(/^[\s.\-–—]+|[\s.\-–—]+$/g, "").trim()).filter(Boolean);
}

// Desplegable de obra social: catálogo (Derivadores → Obras sociales) + lo cargado en las fichas.
// Permite una 2da obra social (se guarda como "A y B") y agregar una nueva al catálogo.
function SelectObraSocial({ value, onChange, pacientes }) {
  const { items: externos, agregar } = useDerivadores();
  const [slotExtra, setSlotExtra] = useState(false);
  const [agregandoIdx, setAgregandoIdx] = useState(null);
  const [nueva, setNueva] = useState("");

  const catalogoOS = externos.filter(x => x.tipo === "obra_social").map(x => x.nombre);
  const mapa = new Map();
  const sumar = v => {
    const t = (v || "").replace(/\s+/g, " ").trim(), k = claveOS(t);
    if (k && !OS_NO_VALIDAS.includes(k) && !mapa.has(k)) mapa.set(k, t);
  };
  catalogoOS.forEach(n => separarOS(n).forEach(sumar));
  (pacientes || []).forEach(p => separarOS(p.obraSocial || p.obra_social).forEach(sumar));
  const opciones = [...mapa.values()].sort((a, b) => a.localeCompare(b, "es"));

  const partes = separarOS(value);
  const lista = partes.length ? [...partes] : [""];
  if (slotExtra) lista.push("");

  function guardarLista(l) {
    const vistos = new Set();
    onChange(l.map(x => (x || "").trim()).filter(x => {
      const k = claveOS(x);
      if (!k || vistos.has(k)) return false;
      vistos.add(k); return true;
    }).join(" y "));
  }
  function setParte(i, v) {
    if (v === "__nueva__") { setAgregandoIdx(i); setNueva(""); return; }
    const l = [...lista]; l[i] = v;
    if (i >= partes.length) setSlotExtra(false);
    guardarLista(l);
  }
  function quitarParte(i) {
    if (i >= partes.length) { setSlotExtra(false); return; }
    guardarLista(lista.filter((_, j) => j !== i));
  }
  async function confirmarNueva() {
    const nom = nueva.trim();
    if (!nom) return;
    const existente = opciones.find(o => claveOS(o) === claveOS(nom));
    const final = existente || nom;
    if (!existente && !externos.some(x => x.tipo === "obra_social" && claveOS(x.nombre) === claveOS(nom))) {
      try { await agregar({ ...FORM_OS_VACIO, nombre: nom }); } catch (e) { console.error(e); }
    }
    const i = agregandoIdx;
    setAgregandoIdx(null); setNueva("");
    setParte(i, final);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lista.map((parte, i) => {
        if (agregandoIdx === i) return (
          <div key={i} style={{ display: "flex", gap: 6 }}>
            <input autoFocus style={{ ...inputStyle, flex: 1 }} placeholder="Nombre de la nueva obra social" value={nueva}
              onChange={e => setNueva(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmarNueva(); } if (e.key === "Escape") setAgregandoIdx(null); }} />
            <button type="button" onClick={confirmarNueva} style={{ border: "none", background: "#4338CA", color: "#fff", borderRadius: 8, padding: "0 12px", fontWeight: 700, cursor: "pointer" }}>OK</button>
            <button type="button" onClick={() => setAgregandoIdx(null)} style={{ border: "1px solid #DDD", background: "#fff", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}>✕</button>
          </div>
        );
        const valSel = OS_NO_VALIDAS.includes(claveOS(parte)) ? "" : (opciones.find(o => claveOS(o) === claveOS(parte)) || parte);
        return (
          <div key={i} style={{ display: "flex", gap: 6 }}>
            <select style={{ ...inputStyle, flex: 1 }} value={valSel} onChange={e => setParte(i, e.target.value)}>
              <option value="">{i === 0 ? "Particular / sin obra social" : "— Elegir 2da obra social —"}</option>
              {valSel && !opciones.includes(valSel) && <option value={valSel}>{valSel}</option>}
              {opciones.map(o => <option key={o} value={o}>{o}</option>)}
              <option value="__nueva__">➕ Agregar nueva…</option>
            </select>
            {i > 0 && <button type="button" title="Quitar" onClick={() => quitarParte(i)} style={{ border: "1px solid #DDD", background: "#fff", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}>✕</button>}
          </div>
        );
      })}
      {!slotExtra && partes.length > 0 && agregandoIdx === null && (
        <button type="button" onClick={() => setSlotExtra(true)} style={{ alignSelf: "flex-start", border: "none", background: "none", color: "#4338CA", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>＋ Otra obra social</button>
      )}
    </div>
  );
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: copied ? "#059669" : "#4338CA", padding: "0 4px", fontWeight: 600 }}>
      {copied ? "✓" : "📋"}
    </button>
  );
}

// ─── ANOTADOR DE PEDIDOS ────────────────────────────────────────────
// Recordatorio interno, independiente de stock. Tabla propia: pedidos_pendientes.
// Al tildar un ítem (solo el cuadrado) se marca completado y desaparece de la lista.
function AnotadorPedidos() {
  const [items, setItems] = useState([]);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorTabla, setErrorTabla] = useState("");
  const [editId, setEditId] = useState(null);
  const [editTexto, setEditTexto] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      const { data: rows, error } = await supabase.from("pedidos_pendientes").select("*").eq("completado", false).order("created_at");
      if (!activo) return;
      if (error) { setErrorTabla(error.message); return; }
      setItems(rows || []);
    })();
    const ch = supabase.channel("realtime-pedidos_pendientes")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos_pendientes" }, payload => {
        setItems(prev => {
          if (payload.eventType === "INSERT") {
            if (payload.new.completado || prev.find(r => r.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          }
          if (payload.eventType === "UPDATE") {
            if (payload.new.completado) return prev.filter(r => r.id !== payload.new.id);
            return prev.find(r => r.id === payload.new.id)
              ? prev.map(r => r.id === payload.new.id ? payload.new : r)
              : [...prev, payload.new].sort((a,b) => (a.created_at||"").localeCompare(b.created_at||""));
          }
          if (payload.eventType === "DELETE") return prev.filter(r => r.id !== payload.old.id);
          return prev;
        });
      }).subscribe();
    return () => { activo = false; supabase.removeChannel(ch); };
  }, []);

  async function agregar() {
    const t = texto.trim();
    if (!t || guardando) return;
    setGuardando(true);
    const { data: row, error } = await supabase.from("pedidos_pendientes")
      .insert({ texto: t, creado_por: window.__sonaraUsuario || null }).select().single();
    setGuardando(false);
    if (error) { alert("No se pudo guardar: " + error.message); return; }
    setItems(prev => prev.find(r => r.id === row.id) ? prev : [...prev, row]);
    setTexto("");
  }

  function empezarEdicion(item) { setEditId(item.id); setEditTexto(item.texto || ""); }
  function cancelarEdicion() { setEditId(null); setEditTexto(""); }

  async function guardarEdicion(item) {
    const t = editTexto.trim();
    if (!t) return alert("El pedido no puede quedar vacío.");
    if (t === item.texto) { cancelarEdicion(); return; }
    setItems(prev => prev.map(r => r.id === item.id ? { ...r, texto: t } : r));
    cancelarEdicion();
    const { error } = await supabase.from("pedidos_pendientes").update({ texto: t }).eq("id", item.id);
    if (error) {
      alert("No se pudo guardar la edición: " + error.message);
      setItems(prev => prev.map(r => r.id === item.id ? item : r));
      return;
    }
    logAuditoria(window.__sonaraUsuario, "ACTUALIZAR", "pedidos_pendientes", `Pedido editado: "${item.texto}" → "${t}"`, item, { ...item, texto: t });
  }

  async function tildar(item) {
    setItems(prev => prev.filter(r => r.id !== item.id));
    const { error } = await supabase.from("pedidos_pendientes")
      .update({ completado: true, completado_por: window.__sonaraUsuario || null, completado_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      alert("No se pudo marcar como pedido: " + error.message);
      setItems(prev => [...prev, item].sort((a,b) => (a.created_at||"").localeCompare(b.created_at||"")));
      return;
    }
    logAuditoria(window.__sonaraUsuario, "ACTUALIZAR", "pedidos_pendientes", `Pedido "${item.texto}" marcado como realizado`, item, null);
  }

  return (
    <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>📝 Pedidos</div>
        <span style={{ fontSize: 12, color: "#888" }}>{items.length} pendiente{items.length !== 1 ? "s" : ""}</span>
      </div>
      {errorTabla ? (
        <div style={{ fontSize: 12, color: "#B91C1C", background: "#FEE2E2", borderRadius: 8, padding: "10px 12px" }}>
          No se pudo cargar el anotador ({errorTabla}). Falta crear la tabla <b>pedidos_pendientes</b> en Supabase.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") agregar(); }}
              placeholder="Ej: Oticon Intent 1 miniRITE R beige — Pérez (der) · Pilas 312 · Domos 8mm"
              style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", minWidth: 0 }} />
            <button onClick={agregar} disabled={!texto.trim() || guardando}
              style={{ background: texto.trim() ? "#1a6b6b" : "#CBD5E1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: texto.trim() ? "pointer" : "default", whiteSpace: "nowrap" }}>
              + Anotar
            </button>
          </div>
          {items.length === 0
            ? <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 12 }}>No hay pedidos pendientes</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map(it => (
                  <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, background: "#FAFBFF", border: "1px solid #F0F0F0" }}>
                    <input type="checkbox" checked={false} onChange={() => tildar(it)}
                      style={{ marginTop: 2, width: 16, height: 16, cursor: "pointer", accentColor: "#1a6b6b" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editId === it.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input autoFocus value={editTexto} onChange={e => setEditTexto(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") guardarEdicion(it); if (e.key === "Escape") cancelarEdicion(); }}
                            style={{ flex: 1, minWidth: 0, padding: "6px 9px", borderRadius: 7, border: "1.5px solid #1a6b6b", fontSize: 13, outline: "none" }} />
                          <button type="button" onClick={() => guardarEdicion(it)} title="Guardar"
                            style={{ background: "#1a6b6b", color: "#fff", border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
                          <button type="button" onClick={cancelarEdicion} title="Cancelar"
                            style={{ background: "#F3F4F6", color: "#555", border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕</button>
                        </div>
                      ) : (
                        <div onClick={() => empezarEdicion(it)} title="Clic para editar"
                          style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", wordBreak: "break-word", cursor: "text" }}>{it.texto}</div>
                      )}
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {it.created_at ? new Date(it.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : ""}{it.creado_por ? ` · ${it.creado_por}` : ""}
                      </div>
                    </div>
                    {editId !== it.id && (
                      <button type="button" onClick={() => empezarEdicion(it)} title="Editar pedido"
                        style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 14, padding: "0 2px", flexShrink: 0 }}>✏️</button>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data, db, onNavigate }) {
  const hoy = today();
  const [busqueda, setBusqueda] = useState("");

  const turnosHoy = data.turnos.filter(t => t.fecha === hoy).sort((a,b) => (a.hora||"").localeCompare(b.hora||""));
  const recsHoy = data.recordatorios.filter(r => !r.completado && r.fecha <= hoy).sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora));
  const proximosTurnos = data.turnos.filter(t => t.fecha > hoy).sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora)).slice(0, 5);

  // Turnos de mañana con paciente asignado (para el panel de recordatorios de WhatsApp)
  const manana = addDays(hoy, 1);
  const turnosManana = data.turnos
    .filter(t => t.fecha === manana && t.paciente_id && !ESTADOS_OCULTOS.includes(t.estado) && t.estado !== "bloqueado" && !(t.motivo||"").includes("BLOQUEADO"))
    .sort((a,b) => (a.hora||"").localeCompare(b.hora||""));

  // Pacientes que cumplen años hoy (para el panel de saludos por WhatsApp)
  const cumplesHoy = data.pacientes
    .filter(p => {
      const fn = p.fechaNac || p.fecha_nac;
      if (!fn) return false;
      const [, m, dd] = fn.split("-");
      return parseInt(dd, 10) === new Date().getDate() && parseInt(m, 10) === new Date().getMonth() + 1;
    })
    .sort((a,b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));

  const busquedaResultados = busqueda.length > 1 ? [
    ...data.pacientes.filter(p => normalizar(`${p.nombre} ${p.apellido} ${p.dni||""}`).includes(normalizar(busqueda))).slice(0,4).map(p => ({ tipo: "paciente", label: `${p.apellido}, ${p.nombre}`, sub: p.telefono || p.dni || "", id: p.id })),
    ...data.turnos.filter(t => t.fecha >= hoy && (t.motivo||"").toLowerCase().includes(busqueda.toLowerCase())).slice(0,3).map(t => ({ tipo: "turno", label: t.motivo || "Turno", sub: `${formatFecha(t.fecha)} ${t.hora}`, id: t.id })),
    ...data.recordatorios.filter(r => (r.titulo||"").toLowerCase().includes(busqueda.toLowerCase())).slice(0,3).map(r => ({ tipo: "recordatorio", label: r.titulo, sub: `${formatFecha(r.fecha)} · ${r.hora}`, id: r.id })),
  ] : [];

  const hoyDia = new Date().getDate();
  const hoyMes = new Date().getMonth() + 1;

  return (
    <div>
      {/* Bienvenida + búsqueda */}
      <div style={{ background: "linear-gradient(135deg, #1a6b6b 0%, #145555 100%)", borderRadius: 16, padding: "24px 28px", marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>👋 Bienvenida al sistema</div>
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
          {["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date().getDay()]} {hoyDia} — {turnosHoy.length} turno{turnosHoy.length !== 1 ? "s" : ""} hoy
        </div>
        <div style={{ position: "relative" }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar paciente, turno, recordatorio..."
            style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: "none", fontSize: 14, outline: "none", background: "rgba(255,255,255,0.15)", color: "#fff", boxSizing: "border-box" }}
          />
          {busquedaResultados.length > 0 && (
            <div style={{ position: "absolute", top: "110%", left: 0, right: 0, background: "#fff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 100, overflow: "hidden" }}>
              {busquedaResultados.map((r, i) => (
                <div key={i} onClick={() => { onNavigate(r.tipo); setBusqueda(""); }}
                  style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", display: "flex", gap: 10, alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <span style={{ fontSize: 16 }}>{r.tipo === "paciente" ? "👤" : r.tipo === "turno" ? "📅" : "🔔"}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{r.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Pacientes", value: data.pacientes.length, color: "#4338CA", bg: "#EEF2FF", icon: "👤", tab: "paciente" },
          { label: "Turnos hoy", value: turnosHoy.length, color: "#0891B2", bg: "#E0F2FE", icon: "📅", tab: "turno" },
          { label: "Recordatorios", value: recsHoy.length, color: "#D97706", bg: "#FEF3C7", icon: "🔔", tab: "recordatorio" },
          { label: "Insumos pend.", value: data.compras.filter(c => c.estado === "pendiente").length, color: "#991B1B", bg: "#FEE2E2", icon: "🛍️", tab: "compras" },
        ].map(s => (
          <div key={s.label} onClick={() => onNavigate(s.tab)}
            style={{ background: s.bg, borderRadius: 12, padding: "14px 16px", cursor: "pointer", border: `1.5px solid ${s.color}22`, transition: "transform 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Anotador de pedidos */}
      <AnotadorPedidos />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Turnos hoy */}
        <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>📅 Turnos de hoy</div>
          {turnosHoy.length === 0
            ? <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 16 }}>Sin turnos para hoy</div>
            : turnosHoy.slice(0, 6).map(t => {
              const pac = data.pacientes.find(p => p.id === t.paciente_id);
              return (
                <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F8F8F8" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1a6b6b", minWidth: 40 }}>{t.hora?.slice(0,5)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pac ? `${pac.apellido}, ${pac.nombre}` : (t.motivo || "Sin paciente")}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>{Array.isArray(t.practicas) && t.practicas.length > 0 ? t.practicas[0] : t.motivo}</div>
                  </div>
                  <Badge estado={t.estado} />
                </div>
              );
            })
          }
        </div>

        {/* Recordatorios pendientes */}
        <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>🔔 Recordatorios pendientes</div>
          {recsHoy.length === 0
            ? <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 16 }}>Sin recordatorios pendientes</div>
            : recsHoy.slice(0, 6).map(r => (
              <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid #F8F8F8" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.fecha < hoy ? "#DC2626" : "#D97706", minWidth: 40 }}>{r.fecha < hoy ? "⚠️" : "📅"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{r.titulo}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{formatFecha(r.fecha)}{r.hora ? ` · ${r.hora.slice(0,5)}` : ""}</div>
                </div>
                {r.tipo === "posventa" && (() => {
                  const link = linkPosventaWhatsApp(r, data.pacientes.find(p => p.id === r.paciente_id));
                  return link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" title="Escribirle por WhatsApp"
                      style={{ background: "#25D366", color: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", alignSelf: "center" }}>
                      📱 Enviar
                    </a>
                  ) : null;
                })()}
                {db && (
                  <button onClick={async () => { await db.actualizarRecordatorio({ ...r, completado: true }); }}
                    title="Marcar como hecho"
                    style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", borderRadius: 8, padding: "4px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer", alignSelf: "center", flexShrink: 0 }}>
                    ✓
                  </button>
                )}
              </div>
            ))
          }
        </div>
      </div>

      {/* Recordatorios de WhatsApp para los turnos de mañana */}
      <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>📲 Recordatorios de mañana por WhatsApp</div>
          <span style={{ fontSize: 12, color: "#888" }}>{turnosManana.length} turno{turnosManana.length !== 1 ? "s" : ""}</span>
        </div>
        {turnosManana.length === 0
          ? <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 16 }}>No hay turnos con paciente asignado para mañana</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {turnosManana.map(t => {
                const pac = data.pacientes.find(p => p.id === t.paciente_id);
                const link = pac ? linkRecordatorioWhatsApp(t, pac) : null;
                return (
                  <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "#FAFBFF", border: "1px solid #F0F0F0" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1a6b6b", minWidth: 40 }}>{t.hora?.slice(0,5)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {pac ? `${pac.apellido}, ${pac.nombre}` : "Paciente"}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>{pac?.telefono || "Sin teléfono cargado"}</div>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer"
                        style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" }}>
                        📱 Enviar
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: "#B91C1C", background: "#FEE2E2", borderRadius: 8, padding: "7px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>Sin teléfono</span>
                    )}
                  </div>
                );
              })}
            </div>
          )
        }
      </div>

      {/* Saludos de cumpleaños por WhatsApp (pacientes que cumplen hoy) */}
      <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>🎂 Cumpleaños de hoy por WhatsApp</div>
          <span style={{ fontSize: 12, color: "#888" }}>{cumplesHoy.length} paciente{cumplesHoy.length !== 1 ? "s" : ""}</span>
        </div>
        {cumplesHoy.length === 0
          ? <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 16 }}>Ningún paciente cumple años hoy</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cumplesHoy.map(pac => {
                const link = linkSaludoCumpleWhatsApp(pac);
                return (
                  <div key={pac.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "#FFF7ED", border: "1px solid #FED7AA" }}>
                    <span style={{ fontSize: 18, minWidth: 40, textAlign: "center" }}>🎉</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {pac.apellido}, {pac.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>{pac.telefono || "Sin teléfono cargado"}</div>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer"
                        style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" }}>
                        📱 Saludar
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: "#B91C1C", background: "#FEE2E2", borderRadius: 8, padding: "7px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>Sin teléfono</span>
                    )}
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}

// ─── SUPABASE HOOK ────────────────────────────────────────────────────────────
async function logAuditoria(usuario, accion, tabla, descripcion, datosAnteriores = null, datosNuevos = null) {
  try {
    await supabase.from("auditoria").insert({
      usuario: usuario || "Sistema", accion, tabla, descripcion,
      datos_anteriores: datosAnteriores, datos_nuevos: datosNuevos,
    });
  } catch(e) { console.warn("Log auditoria:", e); }
}

function useSupabase() {
  const [data, setData] = useState({ pacientes: [], turnos: [], ventas: [], recordatorios: [], compras: [], stock: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const undoStack = React.useRef([]);
  const redoStack = React.useRef([]);
  const undoProcesando = React.useRef(false);

  function emitirUndo() {
    window.__sonaraUndo = undoStack.current;
    window.__sonaraRedo = redoStack.current;
    window.dispatchEvent(new Event("sonara-undo-update"));
  }

  function pushUndo(accion) {
    undoStack.current = [accion, ...undoStack.current.slice(0, 19)];
    redoStack.current = []; // una acción nueva invalida lo que se podía rehacer
    emitirUndo();
  }

  // Columnas calculadas por Postgres que no se pueden escribir
  const COLUMNAS_GENERADAS = { compras: ["saldo"] };
  function limpiarFila(tabla, fila) {
    const out = { ...fila };
    (COLUMNAS_GENERADAS[tabla] || []).forEach(k => delete out[k]);
    return out;
  }
  function chequear(res) {
    if (res && res.error) throw new Error(res.error.message);
    return res;
  }
  // Transforma filas crudas de Supabase al formato que usa cada tabla en el estado local
  function transformar(tabla, rows) {
    if (tabla === "ventas") return rows.map(fromDBVenta);
    if (tabla === "pacientes") return rows.map(fromDB);
    return rows;
  }
  const ORDEN_TABLAS = {
    pacientes: [["apellido", true]],
    turnos: [["fecha", true], ["hora", true]],
    ventas: [["fecha", false]],
    recordatorios: [["fecha", true], ["hora", true]],
    compras: [["fecha", false]],
  };
  async function recargarTabla(tabla) {
    let q = supabase.from(tabla).select("*");
    (ORDEN_TABLAS[tabla] || []).forEach(([col, asc]) => { q = q.order(col, { ascending: asc }); });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    setData(d => ({ ...d, [tabla]: transformar(tabla, rows || []) }));
  }

  async function insertarFilas(tabla, filas) {
    chequear(await supabase.from(tabla).insert(filas.map(f => limpiarFila(tabla, f))));
  }
  async function borrarFilas(tabla, ids) {
    chequear(await supabase.from(tabla).delete().in("id", ids));
  }
  async function actualizarFilas(tabla, filas) {
    for (const f of filas) {
      chequear(await supabase.from(tabla).update(limpiarFila(tabla, f)).eq("id", f.id));
    }
  }

  // Aplica una acción hacia atrás (deshacer) o hacia adelante (rehacer)
  async function aplicarAccion(accion, sentido) {
    const atras = sentido === "deshacer";
    const t = accion.tabla;
    switch (accion.tipo) {
      case "crear":
        if (atras) await borrarFilas(t, [accion.item.id]); else await insertarFilas(t, [accion.item]);
        break;
      case "eliminar":
        if (atras) await insertarFilas(t, [accion.item]); else await borrarFilas(t, [accion.item.id]);
        break;
      case "actualizar":
        await actualizarFilas(t, [atras ? accion.itemAnterior : accion.item]);
        break;
      case "crear_varios":
        if (atras) await borrarFilas(t, accion.items.map(it => it.id)); else await insertarFilas(t, accion.items);
        break;
      case "eliminar_varios":
        if (atras) await insertarFilas(t, accion.items); else await borrarFilas(t, accion.items.map(it => it.id));
        break;
      case "actualizar_varios":
        if (atras) await actualizarFilas(t, accion.itemsAnteriores);
        else chequear(await supabase.from(t).update(accion.cambios).in("id", accion.itemsAnteriores.map(it => it.id)));
        break;
      default:
        throw new Error("Tipo de acción desconocido: " + accion.tipo);
    }
    await recargarTabla(t);
  }

  async function deshacerUltima() {
    const accion = undoStack.current[0];
    if (!accion || undoProcesando.current) return;
    undoProcesando.current = true;
    try {
      await aplicarAccion(accion, "deshacer");
      undoStack.current = undoStack.current.slice(1);
      redoStack.current = [accion, ...redoStack.current.slice(0, 19)];
      emitirUndo();
      logAuditoria(window.__sonaraUsuario, "DESHACER", accion.tabla, accion.descripcion, null, null);
      alert(`↩ Deshecho: ${accion.descripcion}`);
    } catch(e) {
      alert("No se pudo deshacer: " + e.message);
    } finally { undoProcesando.current = false; }
  }

  async function rehacerUltima() {
    const accion = redoStack.current[0];
    if (!accion || undoProcesando.current) return;
    undoProcesando.current = true;
    try {
      await aplicarAccion(accion, "rehacer");
      redoStack.current = redoStack.current.slice(1);
      undoStack.current = [accion, ...undoStack.current.slice(0, 19)];
      emitirUndo();
      logAuditoria(window.__sonaraUsuario, "REHACER", accion.tabla, accion.descripcion, null, null);
      alert(`↪ Rehecho: ${accion.descripcion}`);
    } catch(e) {
      alert("No se pudo rehacer: " + e.message);
    } finally { undoProcesando.current = false; }
  }

  useEffect(() => {
    cargarTodo();
    const tablas = ["pacientes", "turnos", "ventas", "recordatorios", "compras"];
    const channels = tablas.map(tabla =>
      supabase.channel(`realtime-${tabla}`)
        .on("postgres_changes", { event: "*", schema: "public", table: tabla }, payload => {
          setData(prev => {
            const lista = [...prev[tabla]];
            // Convertir la fila cruda al formato que usa la app (ventas/pacientes)
            const nueva = payload.new && payload.new.id ? transformar(tabla, [payload.new])[0] : payload.new;
            if (payload.eventType === "INSERT") {
              if (!lista.find(r => r.id === nueva.id)) return { ...prev, [tabla]: [...lista, nueva] };
            } else if (payload.eventType === "UPDATE") {
              return { ...prev, [tabla]: lista.map(r => r.id === nueva.id ? nueva : r) };
            } else if (payload.eventType === "DELETE") {
              return { ...prev, [tabla]: lista.filter(r => r.id !== payload.old.id) };
            }
            return prev;
          });
        }).subscribe()
    );
    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, []);

  async function cargarTodo() {
    try {
      const [pac, tur, ven, rec, com, stk] = await Promise.all([
        supabase.from("pacientes").select("*").order("apellido"),
        supabase.from("turnos").select("*").order("fecha").order("hora"),
        supabase.from("ventas").select("*").order("fecha", { ascending: false }),
        supabase.from("recordatorios").select("*").order("fecha").order("hora"),
        supabase.from("compras").select("*").order("fecha", { ascending: false }),
        supabase.from("stock").select("*").order("created_at", { ascending: false }),
      ]);
      if (pac.error || tur.error) throw new Error(pac.error?.message || tur.error?.message);
      setData({
        pacientes: (pac.data || []).map(fromDB),
        turnos: tur.data || [],
        ventas: (ven.data || []).map(fromDBVenta),
        recordatorios: rec.data || [],
        compras: com.data || [],
        stock: stk.data || [],
      });
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  // ── toDB / fromDB ─────────────────────────────────────────────────────────
  function toDB(pac) {
    return {
      nombre: pac.nombre || "", apellido: pac.apellido || "",
      dni: pac.dni || "", fecha_nac: (pac.fechaNac || pac.fecha_nac) ? (pac.fechaNac || pac.fecha_nac) : null,
      telefono: pac.telefono || "", email: pac.email || "",
      obra_social: pac.obraSocial || pac.obra_social || "",
      nro_afiliado: pac.nroAfiliado || pac.nro_afiliado || "",
      direccion: pac.direccion || "", localidad: pac.localidad || "",
      diagnostico: pac.diagnostico || "", antecedentes: pac.antecedentes || "",
      notas: pac.notas || "", derivado_por: pac.derivadoPor || pac.derivado_por || "",
      audifono: pac.audifono || pac.audifono_der || "",
      audifono_der: pac.audifono_der || "", audifono_der_anio: pac.audifono_der_anio || "",
      audifono_izq: pac.audifono_izq || "", audifono_izq_anio: pac.audifono_izq_anio || "",
      audifono_der_serie: pac.audifono_der_serie || "", audifono_der_fecha: pac.audifono_der_fecha || null,
      audifono_izq_serie: pac.audifono_izq_serie || "", audifono_izq_fecha: pac.audifono_izq_fecha || null,
      historia: Array.isArray(pac.historia) ? pac.historia : [],
      etiquetas: Array.isArray(pac.etiquetas) ? pac.etiquetas : [],
      acompanante_nombre: pac.acompanante_nombre || "",
      acompanante_parentesco: pac.acompanante_parentesco || "",
    };
  }

  function fromDB(row) {
    return {
      ...row,
      fechaNac: row.fecha_nac || "",
      obraSocial: row.obra_social || "",
      nroAfiliado: row.nro_afiliado || "",
      derivadoPor: row.derivado_por || "",
      audifono: row.audifono || "",
      audifono_der: row.audifono_der || row.audifono || "",
      audifono_der_anio: row.audifono_der_anio || "",
      audifono_izq: row.audifono_izq || "",
      audifono_izq_anio: row.audifono_izq_anio || "",
      audifono_der_serie: row.audifono_der_serie || "", audifono_der_fecha: row.audifono_der_fecha || "",
      audifono_izq_serie: row.audifono_izq_serie || "", audifono_izq_fecha: row.audifono_izq_fecha || "",
      historia: Array.isArray(row.historia) ? row.historia : [],
      etiquetas: Array.isArray(row.etiquetas) ? row.etiquetas : [],
      acompanante_nombre: row.acompanante_nombre || "",
      acompanante_parentesco: row.acompanante_parentesco || "",
    };
  }

  function toDBTurno(t) {
    return {
      paciente_id: t.paciente_id || null, fecha: t.fecha, hora: t.hora, hora_fin: t.hora_fin || "",
      motivo: t.motivo || "", practicas: Array.isArray(t.practicas) ? t.practicas : [],
      profesional: t.profesional || "", estado: t.estado || "pendiente",
      notas: t.notas || "", color_custom: t.color_custom || null,
      creado_por: t.creado_por || "",
    };
  }

  function toDBVenta(v) {
    return {
      paciente_id: v.paciente_id || null, fecha: v.fecha, dispositivo: v.dispositivo || "Audífono",
      marca_der: v.marca_der || "", modelo_der: v.modelo_der || "",
      marca_izq: v.marca_izq || "", modelo_izq: v.modelo_izq || "",
      oido: v.oido || "bilateral", precio: parseFloat(v.precio) || null,
      obra_social_cubre: parseFloat(v.obraSocialCubre || v.obra_social_cubre) || null,
      condicion_pago_os: v.condicion_pago_os || "",
      saldo_paciente: parseFloat(v.saldoPaciente || v.saldo_paciente) || null,
      condicion_pago_paciente: v.condicion_pago_paciente || "",
      estado: v.estado || "seleccion",
      estados: Array.isArray(v.estados) ? v.estados : (v.estado ? [v.estado] : []),
      derivado_por: v.derivado_por || v.derivadoPor || "",
      observaciones: v.obra_social_directa
        ? (v.obra_social_directa + (v.observaciones ? " · " + v.observaciones : ""))
        : (v.observaciones || ""),
      pagos: Array.isArray(v.pagos) ? v.pagos : [],
      seguimiento: Array.isArray(v.seguimiento) ? v.seguimiento : [],
    };
  }

  function fromDBVenta(row) {
    return {
      ...row,
      obraSocialCubre: row.obra_social_cubre || "",
      saldoPaciente: row.saldo_paciente || "",
      marca_der: row.marca_der || "", modelo_der: row.modelo_der || "",
      pagos: Array.isArray(row.pagos) ? row.pagos : [],
      seguimiento: Array.isArray(row.seguimiento) ? row.seguimiento : [],
      estados: Array.isArray(row.estados) ? row.estados : (row.estado ? [row.estado] : []),
      derivadoPor: row.derivado_por || "",
    };
  }

  function toDBRec(r) {
    return {
      titulo: r.titulo || "", fecha: r.fecha, hora: r.hora || "09:00",
      tipo: r.tipo || "seguimiento", paciente_id: r.paciente_id || null,
      descripcion: r.descripcion || "", completado: r.completado || false,
      momento: "antes",
      ...(r.serie_id ? { serie_id: r.serie_id } : {}),
    };
  }

  // ── Posventa: (re)programa los recordatorios de seguimiento de un paciente ──
  // Se llama cuando cambia la fecha de retiro de un audífono. Borra los de posventa
  // pendientes (no completados) y crea los nuevos; solo los que caen de hoy en adelante.
  const programarPosventa = useCallback(async (pac, fechaEntrega) => {
    if (!pac?.id || !fechaEntrega) return;
    const { data: viejos } = await supabase.from("recordatorios").select("id")
      .eq("paciente_id", pac.id).eq("tipo", "posventa").eq("completado", false);
    const idsViejos = (viejos || []).map(r => r.id);
    if (idsViejos.length) await supabase.from("recordatorios").delete().in("id", idsViejos);
    const hoy = hoyLocal();
    const nombre = `${pac.apellido || ""}, ${pac.nombre || ""}`;
    const equipo = [...new Set([pac.audifono_der, pac.audifono_izq].filter(Boolean))].join(" / ");
    const nuevos = SEGUIMIENTO_POSVENTA.map(s => ({
      titulo: `Posventa ${s.etiqueta} · ${nombre}`,
      fecha: sumarMesesClamp(fechaEntrega, s.meses), hora: "09:00", tipo: "posventa", paciente_id: pac.id,
      descripcion: `Seguimiento posventa: ${s.etiqueta} desde la entrega (${formatFecha(fechaEntrega)})${equipo ? ` · ${equipo}` : ""}.`,
      completado: false,
    })).filter(r => r.fecha >= hoy);
    let rows = [];
    if (nuevos.length) {
      const { data: ins, error } = await supabase.from("recordatorios").insert(nuevos.map(toDBRec)).select();
      if (!error) rows = ins || [];
    }
    setData(d => ({ ...d, recordatorios: [...d.recordatorios.filter(r => !idsViejos.includes(r.id)), ...rows] }));
    if (rows.length) logAuditoria(window.__sonaraUsuario, "CREAR", "recordatorios", `Posventa programada · ${nombre} (${rows.length})`, null, rows[0]);
  }, []);

  // Devuelve la fecha de retiro más reciente que cambió entre `anterior` y `nuevo` (o null)
  function fechaRetiroNueva(nuevo, anterior) {
    const fechas = ["der", "izq"]
      .map(l => nuevo?.[`audifono_${l}_fecha`] && nuevo[`audifono_${l}_fecha`] !== (anterior?.[`audifono_${l}_fecha`] || "") ? nuevo[`audifono_${l}_fecha`] : null)
      .filter(Boolean).sort();
    return fechas.length ? fechas[fechas.length - 1] : null;
  }

  // ── CRUD Pacientes ────────────────────────────────────────────────────────
  const agregarPaciente = useCallback(async (pac) => {
    const payload = toDB(pac);
    const { data: row, error } = await supabase.from("pacientes").insert(payload).select().single();
    if (!error && row) {
      const p = fromDB(row);
      setData(d => ({ ...d, pacientes: [...d.pacientes, p] }));
      pushUndo({ tipo: "crear", tabla: "pacientes", item: row, descripcion: `Paciente ${row.apellido}, ${row.nombre} creado` });
      logAuditoria(window.__sonaraUsuario, "CREAR", "pacientes", `Paciente ${row.apellido}, ${row.nombre}`, null, row);
      const fRetiro = fechaRetiroNueva(p, null);
      if (fRetiro) await programarPosventa(p, fRetiro);
      return p;
    }
    return null;
  }, []);

  const actualizarPaciente = useCallback(async (pac) => {
    const itemAnterior = data.pacientes.find(p => p.id === pac.id);
    const payload = toDB(pac);
    const { error } = await supabase.from("pacientes").update(payload).eq("id", pac.id);
    if (!error) {
      setData(d => ({ ...d, pacientes: d.pacientes.map(p => p.id === pac.id ? { ...p, ...fromDB(payload) } : p) }));
      if (itemAnterior) {
        pushUndo({ tipo: "actualizar", tabla: "pacientes", item: { ...payload, id: pac.id }, itemAnterior: { ...toDB(itemAnterior), id: itemAnterior.id }, descripcion: `Paciente ${pac.apellido}, ${pac.nombre} editado` });
        logAuditoria(window.__sonaraUsuario, "EDITAR", "pacientes", `Paciente ${pac.apellido}, ${pac.nombre}`, toDB(itemAnterior), payload);
      }
      // Si cambió la fecha de retiro de un audífono → (re)programar seguimiento posventa
      const fRetiro = fechaRetiroNueva(pac, itemAnterior);
      if (fRetiro) await programarPosventa(pac, fRetiro);
    }
  }, [data.pacientes]);

  const eliminarPaciente = useCallback(async (id) => {
    const item = data.pacientes.find(p => p.id === id);
    const { data: crudo } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();
 
