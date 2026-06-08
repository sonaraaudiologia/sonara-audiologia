import React, { useState, useEffect, useCallback } from "react";
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
function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11); }
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
const COLORES_VENTA = {
  presupuestado:        { bg: "#EDE9FE", color: "#4C1D95",  label: "Presupuestado" },
  aprobado:             { bg: "#DBEAFE", color: "#1E40AF",  label: "Aprobado" },
  señado:               { bg: "#FEF3C7", color: "#92400E",  label: "Señado" },
  subido_sios:          { bg: "#E0F2FE", color: "#075985",  label: "Subido a SIOS" },
  pedido_acompañamiento:{ bg: "#F3E8FF", color: "#6D28D9",  label: "Pedido acompañamiento" },
  atendido_fono:        { bg: "#ECFDF5", color: "#047857",  label: "Atendido por Fono" },
  vendido:              { bg: "#D1FAE5", color: "#065F46",  label: "Vendido" },
  perdido:              { bg: "#FEE2E2", color: "#991B1B",  label: "Perdido" },
};

const INSUMOS_LISTA = ["Pilas", "Spaguetti", "Free tube", "Domo", "Codos", "Deshumidificador", "Molde", "Tapones auditivos", "Calibración", "Audiometría", "Logoaudiometría", "Otro"];

const CONDICIONES_PAGO = ["Contado", "Cuotas sin interés", "Cuotas con interés", "Transferencia", "Cheque", "SIOS / OS directo", "Pendiente"];

function Badge({ estado, tipo = "turno" }) {
  const mapa = tipo === "venta" ? COLORES_VENTA : COLORES_ESTADO;
  const c = mapa[estado] || { bg: "#F3F4F6", color: "#374151", label: estado };
  return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{c.label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #F0F0F0" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button onClick={handleCopy} title={`Copiar ${label}`} style={{
      background: copied ? "#D1FAE5" : "#F3F4F6", color: copied ? "#065F46" : "#6B7280",
      border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11,
      fontWeight: 600, cursor: "pointer", marginLeft: 6, transition: "all 0.2s"
    }}>{copied ? "✓ Copiado" : "Copiar"}</button>
  );
}

// ─── HOOK SUPABASE ────────────────────────────────────────────────────────────
function useSupabase() {
  const [data, setData] = useState({ pacientes: [], turnos: [], ventas: [], recordatorios: [], compras: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const undoStack = React.useRef([]); // { tipo, tabla, item, descripcion }

  function pushUndo(accion) {
    undoStack.current = [accion, ...undoStack.current.slice(0, 9)]; // keep last 10
    window.__sonaraUndo = undoStack.current;
    window.dispatchEvent(new Event("sonara-undo-update"));
  }

  async function deshacerUltima() {
    const accion = undoStack.current[0];
    if (!accion) return;
    undoStack.current = undoStack.current.slice(1);
    window.__sonaraUndo = undoStack.current;
    window.dispatchEvent(new Event("sonara-undo-update"));

    try {
      if (accion.tipo === "eliminar") {
        // Restore deleted item
        await supabase.from(accion.tabla).insert({ ...accion.item });
        const { data: rows } = await supabase.from(accion.tabla).select("*");
        if (rows) setData(d => ({ ...d, [accion.tabla]: rows }));

      } else if (accion.tipo === "crear") {
        // Delete the created item
        await supabase.from(accion.tabla).delete().eq("id", accion.item.id);
        setData(d => ({ ...d, [accion.tabla]: d[accion.tabla].filter(x => x.id !== accion.item.id) }));

      } else if (accion.tipo === "actualizar") {
        // Restore previous version
        await supabase.from(accion.tabla).update(accion.itemAnterior).eq("id", accion.itemAnterior.id);
        setData(d => ({ ...d, [accion.tabla]: d[accion.tabla].map(x => x.id === accion.itemAnterior.id ? accion.itemAnterior : x) }));
      }
      alert(`↩ Deshecho: ${accion.descripcion}`);
    } catch(e) {
      alert("Error al deshacer: " + e.message);
    }
  }

  useEffect(() => {
    cargarTodo();

    // ─── Tiempo real: escuchar cambios en todas las tablas ────────────────────
    const tablas = ["pacientes", "turnos", "ventas", "recordatorios", "compras"];
    const channels = tablas.map(tabla =>
      supabase.channel(`realtime-${tabla}`)
        .on("postgres_changes", { event: "*", schema: "public", table: tabla }, payload => {
          setData(prev => {
            const lista = [...prev[tabla]];
            if (payload.eventType === "INSERT") {
              // Avoid duplicates
              if (!lista.find(r => r.id === payload.new.id)) return { ...prev, [tabla]: [...lista, payload.new] };
            } else if (payload.eventType === "UPDATE") {
              return { ...prev, [tabla]: lista.map(r => r.id === payload.new.id ? payload.new : r) };
            } else if (payload.eventType === "DELETE") {
              return { ...prev, [tabla]: lista.filter(r => r.id !== payload.old.id) };
            }
            return prev;
          });
        })
        .subscribe()
    );

    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, []);

  async function cargarTodo() {
    try {
      setLoading(true);
      const [p, t, v, r, c] = await Promise.all([
        supabase.from("pacientes").select("*").order("apellido"),
        supabase.from("turnos").select("*").order("fecha").order("hora"),
        supabase.from("ventas").select("*").order("fecha", { ascending: false }).then(r => ({ ...r, data: (r.data||[]).map(v => ({ ...v, obraSocialCubre: v.obra_social_cubre||"", saldoPaciente: v.saldo_paciente||"" })) })),
        supabase.from("recordatorios").select("*").order("fecha"),
        supabase.from("compras").select("*").order("fecha", { ascending: false }),
      ]);
      if (p.error || t.error || v.error || r.error) throw new Error("Error al cargar datos");
      setData({
        pacientes: p.data || [],
        turnos: t.data || [],
        ventas: v.data || [],
        recordatorios: r.data || [],
        compras: c.data || [],
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toDB(pac) {
    return {
      nombre: pac.nombre || "",
      apellido: pac.apellido || "",
      dni: pac.dni || "",
      fecha_nac: (pac.fechaNac || pac.fecha_nac) ? (pac.fechaNac || pac.fecha_nac) : null,
      telefono: pac.telefono || "",
      email: pac.email || "",
      obra_social: pac.obraSocial || pac.obra_social || "",
      nro_afiliado: pac.nroAfiliado || pac.nro_afiliado || "",
      diagnostico: pac.diagnostico || "",
      antecedentes: pac.antecedentes || "",
      notas: pac.notas || "",
      derivado_por: pac.derivadoPor || pac.derivado_por || "",
      audifono: pac.audifono || pac.audifono_der || "",
      audifono_der: pac.audifono_der || "",
      audifono_der_anio: pac.audifono_der_anio || "",
      audifono_izq: pac.audifono_izq || "",
      audifono_izq_anio: pac.audifono_izq_anio || "",
      historia: Array.isArray(pac.historia) ? pac.historia : [],
      etiquetas: Array.isArray(pac.etiquetas) ? pac.etiquetas : [],
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
      etiquetas: Array.isArray(row.etiquetas) ? row.etiquetas : [],
    };
  }

  const agregarPaciente = useCallback(async (pac) => {
    const { data: row, error } = await supabase.from("pacientes").insert(toDB(pac)).select().single();
    if (!error) setData(d => ({ ...d, pacientes: [...d.pacientes, fromDB(row)] }));
    return row ? fromDB(row) : null;
  }, []);

  const actualizarPaciente = useCallback(async (pac) => {
    const payload = toDB(pac);
    const { error } = await supabase.from("pacientes").update(payload).eq("id", pac.id);
    if (!error) setData(d => ({ ...d, pacientes: d.pacientes.map(p => p.id === pac.id ? { ...p, ...pac, ...fromDB({...payload, id: pac.id}) } : p) }));
  }, []);

  const eliminarPaciente = useCallback(async (id) => {
    const item = data.pacientes.find(p => p.id === id);
    const { error } = await supabase.from("pacientes").delete().eq("id", id);
    if (!error) {
      setData(d => ({ ...d, pacientes: d.pacientes.filter(p => p.id !== id) }));
      if (item) pushUndo({ tipo: "eliminar", tabla: "pacientes", item, descripcion: `Paciente ${item.apellido}, ${item.nombre} eliminado` });
    }
  }, [data.pacientes]);

  function toDBTurno(turno) {
    return {
      paciente_id: turno.paciente_id || null,
      fecha: turno.fecha,
      hora: turno.hora,
      hora_fin: turno.hora_fin || null,
      motivo: Array.isArray(turno.practicas) && turno.practicas.length > 0
        ? turno.practicas.join(", ")
        : (turno.motivo || ""),
      practicas: Array.isArray(turno.practicas) ? turno.practicas : [],
      profesional: turno.profesional || "",
      estado: turno.estado || "pendiente",
      notas: turno.notas || "",
      color_custom: turno.color_custom || null,
    };
  }

  const agregarTurno = useCallback(async (turno) => {
    const payload = toDBTurno(turno);
    const { data: row, error } = await supabase.from("turnos").insert(payload).select().single();
    if (error) { console.error("Error turno:", error); return; }
    setData(d => ({ ...d, turnos: [...d.turnos, row] }));
    if (row) pushUndo({ tipo: "crear", tabla: "turnos", item: row, descripcion: `Turno ${row.fecha} ${row.hora?.slice(0,5)} creado` });
  }, []);

  const actualizarTurno = useCallback(async (turno) => {
    const itemAnterior = data.turnos.find(t => t.id === turno.id);
    const payload = { ...toDBTurno(turno), id: turno.id };
    const { error } = await supabase.from("turnos").update(payload).eq("id", turno.id);
    if (!error) {
      setData(d => ({ ...d, turnos: d.turnos.map(t => t.id === turno.id ? { ...t, ...payload } : t) }));
      if (itemAnterior) pushUndo({ tipo: "actualizar", tabla: "turnos", item: payload, itemAnterior, descripcion: `Turno ${turno.fecha} ${turno.hora?.slice(0,5)} editado` });
    }
  }, [data.turnos]);

  const eliminarTurno = useCallback(async (id) => {
    const item = data.turnos.find(t => t.id === id);
    const { error } = await supabase.from("turnos").delete().eq("id", id);
    if (!error) {
      setData(d => ({ ...d, turnos: d.turnos.filter(t => t.id !== id) }));
      if (item) pushUndo({ tipo: "eliminar", tabla: "turnos", item, descripcion: `Turno ${item.fecha} ${item.hora?.slice(0,5)} eliminado` });
    }
  }, [data.turnos]);

  function toDBVenta(v) {
    return {
      paciente_id: v.paciente_id || null,
      fecha: v.fecha || today(),
      dispositivo: v.dispositivo || "",
      marca: v.marca || "",
      modelo: v.modelo || "",
      marca_der: v.marca_der || "",
      modelo_der: v.modelo_der || "",
      marca_izq: v.marca_izq || "",
      modelo_izq: v.modelo_izq || "",
      oido: v.oido || "bilateral",
      precio: parseFloat(v.precio) || null,
      obra_social_cubre: parseFloat(v.obraSocialCubre || v.obra_social_cubre) || null,
      condicion_pago_os: v.condicion_pago_os || "",
      saldo_paciente: parseFloat(v.saldoPaciente || v.saldo_paciente) || null,
      condicion_pago_paciente: v.condicion_pago_paciente || "",
      estado: v.estado || "presupuestado",
      observaciones: v.observaciones || "",
    };
  }

  function fromDBVenta(row) {
    return {
      ...row,
      obraSocialCubre: row.obra_social_cubre || "",
      saldoPaciente: row.saldo_paciente || "",
      marca_der: row.marca_der || "",
      modelo_der: row.modelo_der || "",
      marca_izq: row.marca_izq || "",
      modelo_izq: row.modelo_izq || "",
      condicion_pago_os: row.condicion_pago_os || "",
      condicion_pago_paciente: row.condicion_pago_paciente || "",
    };
  }

  const agregarVenta = useCallback(async (venta) => {
    const { data: row, error } = await supabase.from("ventas").insert(toDBVenta(venta)).select().single();
    if (error) { console.error("Error venta:", error); return null; }
    const v = fromDBVenta(row);
    setData(d => ({ ...d, ventas: [...d.ventas, v] }));
    return v;
  }, []);

  const actualizarVenta = useCallback(async (venta) => {
    const payload = { ...toDBVenta(venta), id: venta.id };
    const { error } = await supabase.from("ventas").update(payload).eq("id", venta.id);
    if (!error) {
      const v = fromDBVenta(payload);
      setData(d => ({ ...d, ventas: d.ventas.map(x => x.id === venta.id ? { ...x, ...v } : x) }));
    }
  }, []);

  const eliminarVenta = useCallback(async (id) => {
    const item = data.ventas.find(v => v.id === id);
    const { error } = await supabase.from("ventas").delete().eq("id", id);
    if (!error) {
      setData(d => ({ ...d, ventas: d.ventas.filter(v => v.id !== id) }));
      if (item) pushUndo({ tipo: "eliminar", tabla: "ventas", item, descripcion: `Venta eliminada` });
    }
  }, [data.ventas]);

  function toDBRec(rec) {
    return {
      titulo: rec.titulo || "",
      fecha: rec.fecha || today(),
      hora: rec.hora || "09:00",
      tipo: rec.tipo || "seguimiento",
      paciente_id: rec.paciente_id || null,
      descripcion: rec.descripcion || "",
      completado: rec.completado || false,
    };
  }

  const agregarRecordatorio = useCallback(async (rec) => {
    const payload = toDBRec(rec);
    const { data: row, error } = await supabase.from("recordatorios").insert(payload).select().single();
    if (error) { console.error("Error recordatorio:", error); return; }
    if (!error) setData(d => ({ ...d, recordatorios: [...d.recordatorios, row] }));
  }, []);

  const actualizarRecordatorio = useCallback(async (rec) => {
    const payload = { ...toDBRec(rec), id: rec.id };
    const { error } = await supabase.from("recordatorios").update(payload).eq("id", rec.id);
    if (!error) setData(d => ({ ...d, recordatorios: d.recordatorios.map(r => r.id === rec.id ? { ...r, ...payload } : r) }));
  }, []);

  const eliminarRecordatorio = useCallback(async (id) => {
    const { error } = await supabase.from("recordatorios").delete().eq("id", id);
    if (!error) setData(d => ({ ...d, recordatorios: d.recordatorios.filter(r => r.id !== id) }));
  }, []);

  const agregarCompra = useCallback(async (compra) => {
    const { data: row, error } = await supabase.from("compras").insert(compra).select().single();
    if (!error) setData(d => ({ ...d, compras: [row, ...d.compras] }));
    return row;
  }, []);

  const actualizarCompra = useCallback(async (compra) => {
    const total = parseFloat(compra.total) || 0;
    const seña = parseFloat(compra.seña) || 0;
    const estadoAuto = total > 0 && seña >= total ? "pagado" : (compra.estado || "pendiente");
    const updated = { ...compra, estado: estadoAuto };
    const { error } = await supabase.from("compras").update(updated).eq("id", compra.id);
    if (!error) setData(d => ({ ...d, compras: d.compras.map(c => c.id === compra.id ? updated : c) }));
  }, []);

  const eliminarCompra = useCallback(async (id) => {
    const { error } = await supabase.from("compras").delete().eq("id", id);
    if (!error) setData(d => ({ ...d, compras: d.compras.filter(c => c.id !== id) }));
  }, []);

  const agregarEntradaHC = useCallback(async (pacienteId, entrada) => {
    const pac = data.pacientes.find(p => p.id === pacienteId);
    if (!pac) return;
    const nuevaHistoria = [...(pac.historia || []), { ...entrada, id: uid() }];
    await actualizarPaciente({ ...pac, historia: nuevaHistoria });
  }, [data.pacientes, actualizarPaciente]);

  return {
    data, loading, error,
    agregarPaciente, actualizarPaciente, eliminarPaciente,
    agregarTurno, actualizarTurno, eliminarTurno, deshacerUltima,
    agregarVenta, actualizarVenta, eliminarVenta,
    agregarRecordatorio, actualizarRecordatorio, eliminarRecordatorio,
    agregarCompra, actualizarCompra, eliminarCompra,
    agregarEntradaHC,
  };
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data, onNavigate }) {
  const hoy = today();
  const [busqueda, setBusqueda] = useState("");
  const turnosHoy = data.turnos.filter(t => t.fecha === hoy).length;
  const recVencidos = data.recordatorios.filter(r => !r.completado && r.fecha < hoy).length;
  const ventasActivas = data.ventas.filter(v => v.estado === "en_proceso").length;
  const totalVendido = data.ventas.filter(v => v.estado === "vendido").reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);
  const pacNombre = (id) => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : "—"; };
  const proximosTurnos = data.turnos.filter(t => t.fecha >= hoy).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0, 5);
  const proximosRec = data.recordatorios.filter(r => !r.completado && r.fecha >= hoy).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0, 5);

  const pacNombreD = (id) => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : "—"; };

  const resultados = busqueda.trim().length > 1 ? [
    ...data.turnos.filter(t => {
      const pac = data.pacientes.find(p => p.id === t.paciente_id);
      const nombre = pac ? `${pac.nombre} ${pac.apellido}` : "";
      return nombre.toLowerCase().includes(busqueda.toLowerCase()) || (t.motivo||"").toLowerCase().includes(busqueda.toLowerCase());
    }).slice(0,5).map(t => ({ tipo: "turno", label: pacNombreD(t.paciente_id), sub: `${formatFecha(t.fecha)} · ${t.hora} · ${t.motivo||""}`, id: t.id })),
    ...data.pacientes.filter(p => `${p.nombre} ${p.apellido} ${p.dni||""}`.toLowerCase().includes(busqueda.toLowerCase())).slice(0,5).map(p => ({ tipo: "paciente", label: `${p.apellido}, ${p.nombre}`, sub: `DNI: ${p.dni||"—"} · ${p.obra_social||"Particular"}`, id: p.id })),
    ...data.recordatorios.filter(r => (r.titulo||"").toLowerCase().includes(busqueda.toLowerCase())).slice(0,3).map(r => ({ tipo: "recordatorio", label: r.titulo, sub: `${formatFecha(r.fecha)} · ${r.hora}`, id: r.id })),
  ] : [];

  return (
    <div>
      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <input
          style={{ ...inputStyle, paddingLeft: 36, fontSize: 15, borderRadius: 12, border: "1.5px solid #E5E7EB" }}
          placeholder="🔍 Buscar turnos, pacientes, recordatorios..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {resultados.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 300, overflowY: "auto", marginTop: 4 }}>
            {resultados.map((r, i) => {
              const iconos = { turno: "📅", paciente: "👤", recordatorio: "🔔" };
              const colores = { turno: "#4338CA", paciente: "#0891B2", recordatorio: "#D97706" };
              return (
                <div key={r.tipo+r.id} onClick={() => { setBusqueda(""); if (onNavigate) onNavigate(r.tipo); }}
                  style={{ padding: "10px 14px", borderBottom: i < resultados.length-1 ? "1px solid #F3F4F6" : "none", cursor: "pointer", display: "flex", gap: 10, alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 18 }}>{iconos[r.tipo]}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: colores[r.tipo] }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{r.sub}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa", background: "#F3F4F6", borderRadius: 6, padding: "2px 8px" }}>{r.tipo}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Turnos hoy", value: turnosHoy, color: "#4338CA", bg: "#EEF2FF" },
          { label: "Pacientes", value: data.pacientes.length, color: "#0891B2", bg: "#E0F2FE" },
          { label: "Ventas en proceso", value: ventasActivas, color: "#D97706", bg: "#FEF3C7" },
          { label: "Alertas vencidas", value: recVencidos, color: "#DC2626", bg: "#FEE2E2" },
          { label: "Total vendido", value: `$${totalVendido.toLocaleString("es-AR")}`, color: "#166534", bg: "#F0FDF4" },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: c.color, opacity: 0.8 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📅 Próximos turnos</div>
          {proximosTurnos.length === 0 ? <div style={{ color: "#aaa", fontSize: 14 }}>Sin turnos próximos</div> : proximosTurnos.map(t => (
            <div key={t.id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{pacNombre(t.paciente_id)}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{formatFecha(t.fecha)} · {t.hora} · {t.motivo || "—"}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>🔔 Recordatorios pendientes</div>
          {proximosRec.length === 0 ? <div style={{ color: "#aaa", fontSize: 14 }}>Sin recordatorios próximos</div> : proximosRec.map(r => (
            <div key={r.id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 12px", marginBottom: 8, borderLeft: r.fecha < hoy ? "3px solid #EF4444" : "3px solid #10B981" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.titulo}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{formatFecha(r.fecha)} · {r.hora}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TURNOS ───────────────────────────────────────────────────────────────────
const FORM_PAC_VACIO = { nombre: "", apellido: "", dni: "", telefono: "", obraSocial: "", fechaNac: "", email: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "", derivadoPor: "", audifono: "", historia: [], etiquetas: [] };
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
  "Retira molde",
  "Selección de audífonos",
  "Entrega de audífonos",
  "Asesoramiento comercial",
  "Control",
  "Reparación",
  "Cambio de spaguetti",
  "Reunión con profesional / Visita",
  "Otro",
];

const FORM_TURNO_VACIO = { paciente_id: "", fecha: today(), hora: "09:00", hora_fin: "09:30", motivo: "", practicas: [], profesional: "", estado: "pendiente", notas: "" };

const DURACION_MOTIVO = { "Selección de audífonos": 60, "Asesoramiento comercial": 60, "Calibración de IC": 60, "Encendido de IC": 60 };
function calcularHoraFin(horaInicio, motivo) {
  if (!horaInicio) return "";
  const mins = DURACION_MOTIVO[motivo] !== undefined ? DURACION_MOTIVO[motivo] : 30;
  const [h, m] = horaInicio.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function SelectorPracticas({ seleccionadas = [], onChange }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PRACTICAS_LISTA.map(p => {
          const activa = seleccionadas.includes(p);
          return (
            <button type="button" key={p} onClick={() => {
              const nueva = activa ? seleccionadas.filter(x => x !== p) : [...seleccionadas, p];
              onChange(nueva);
            }} style={{
              background: activa ? "#EEF2FF" : "#F3F4F6",
              color: activa ? "#4338CA" : "#6B7280",
              border: activa ? "1.5px solid #6366F1" : "1.5px solid #E5E7EB",
              borderRadius: 20, padding: "4px 12px", fontSize: 12,
              fontWeight: activa ? 700 : 500, cursor: "pointer", transition: "all 0.15s"
            }}>{activa ? "✓ " : ""}{p}</button>
          );
        })}
      </div>
      {seleccionadas.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#4338CA", fontWeight: 600 }}>
          {seleccionadas.length} práctica{seleccionadas.length !== 1 ? "s" : ""} seleccionada{seleccionadas.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function TarjetaTurno({ t, pacNombre, onEditar, onEliminar, mostrarFecha, saldoPaciente }) {
  const saldo = saldoPaciente ? saldoPaciente(t.paciente_id) : 0;
  const esBloqueado = (t.motivo || "").includes("BLOQUEADO");
  if (esBloqueado) {
    return (
      <div style={{
        background: "repeating-linear-gradient(45deg, #FEE2E2, #FEE2E2 5px, #fff 5px, #fff 10px)",
        border: "1.5px solid #FECACA", borderRadius: 10, padding: "11px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ background: "rgba(220,38,38,0.3)", borderRadius: 7, padding: "6px 10px", textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#FCA5A5" }}>🔒 {t.hora}</div>
            {t.hora_fin && <div style={{ fontSize: 10, color: "#FCA5A5" }}>hasta {t.hora_fin}</div>}
            {mostrarFecha && <div style={{ fontSize: 10, color: "#FCA5A5" }}>{formatFecha(t.fecha)}</div>}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#991B1B" }}>AGENDA BLOQUEADA</div>
            <div style={{ fontSize: 12, color: "#991B1B" }}>{t.profesional || "Ambas profesionales"}</div>
            <div style={{ fontSize: 11, color: "#991B1B" }}>{t.motivo.replace("🔒 BLOQUEADO: ", "")}</div>
          </div>
        </div>
        <button onClick={() => onEliminar(t.id)} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 12, cursor: "pointer" }}>✕ Desbloquear</button>
      </div>
    );
  }
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${saldo > 0 ? "#FDE68A" : "#F0F0F0"}`, borderRadius: 10, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
        <div style={{ background: "#EEF2FF", borderRadius: 7, padding: "6px 10px", textAlign: "center", minWidth: 80, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1a6b6b" }}>{t.hora}{t.hora_fin ? `–${t.hora_fin}` : ""}</div>
          {mostrarFecha && <div style={{ fontSize: 10, color: "#6366F1" }}>{formatFecha(t.fecha)}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{pacNombre(t.paciente_id)}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {Array.isArray(t.practicas) && t.practicas.length > 0 
              ? t.practicas.join(" · ") 
              : (t.motivo || "Sin práctica")}
            {t.profesional ? ` · ${t.profesional}` : ""}
          </div>
          {saldo > 0 && (
            <div style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", borderRadius: 6, padding: "2px 8px", display: "inline-block", marginTop: 3, fontWeight: 700 }}>
              💰 Debe insumos: ${saldo.toLocaleString("es-AR")}
            </div>
          )}
        </div>
        <Badge estado={t.estado} />
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEditar(t)} style={{ ...btnSecondary, padding: "5px 11px", fontSize: 12 }}>Editar</button>
        <button onClick={() => onEliminar(t.id)} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 12, cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
}

function Turnos({ data, db, saldoPaciente, usuario, onNavigate, onEditarPaciente }) {
  const { getDisp } = useDisponibilidad();
  const [vista, setVista] = useState("semana");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [mostrarNuevoPacEntrada, setMostrarNuevoPacEntrada] = useState(false);
  const [formNuevoPac, setFormNuevoPac] = useState(FORM_PAC_VACIO);
  const [busquedaEntrada, setBusquedaEntrada] = useState("");
  const [savingPac, setSavingPac] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState(today());
  const [semanaBase, setSemanaBase] = useState(getLunes(today()));
  const [filtroProfesional, setFiltroProfesional] = useState("todas");

  // Modal nueva entrada
  const [modalEntrada, setModalEntrada] = useState(null); // null | { fecha, hora } | { editando: turno }
  const [tipoEntrada, setTipoEntrada] = useState("turno");
  const [colorEntrada, setColorEntrada] = useState("");
  const [formEntrada, setFormEntrada] = useState({});
  const [saving, setSaving] = useState(false);

  // Modal bloqueo
  const [modalBloqueo, setModalBloqueo] = useState(false);

  // HC desde agenda
  const [verHCTurno, setVerHCTurno] = useState(null);
  const [fichaPacienteId, setFichaPacienteId] = useState(null);

  // Insumos desde agenda
  const [mostrarInsumos, setMostrarInsumos] = useState(false);
  const [insumoFormT, setInsumoFormT] = useState({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
  const [insumoActualT, setInsumoActualT] = useState({ nombre: "Pilas", cantidad: 1, precio: "" });

  const pacientes = data.pacientes;
  const diasSemana = Array.from({ length: 6 }, (_, i) => addDays(semanaBase, i));

  const SLOT_H_DIA = 52;
  const SLOT_H_SEM = 48;
  const HORA_INICIO = 8;
  const HORA_FIN = 20;
  const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * 2;
  const HORAS = Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
    const h = HORA_INICIO + Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${String(h).padStart(2,"0")}:${m}`;
  });

  const semanaLabel = (() => {
    const fin = addDays(semanaBase, 5);
    return parseInt(semanaBase.split("-")[1]) === parseInt(fin.split("-")[1])
      ? `${numDia(semanaBase)} – ${numDia(fin)} ${mesCorto(fin)}`
      : `${numDia(semanaBase)} ${mesCorto(semanaBase)} – ${numDia(fin)} ${mesCorto(fin)}`;
  })();

  // ── Obtener todas las entradas de una fecha (turnos + recordatorios) ─────────
  // Check if hora is within disponibilidad for a profesional on a date
  function isDisponible(fecha, hora, profKey) {
    const conf = getDispEfectiva(fecha, profKey);
    if (conf === null && getDisp(profKey, new Date(fecha+"T12:00:00").getMonth()+1, new Date(fecha+"T12:00:00").getFullYear())?.length === 0) return null;
    if (!conf) return false;
    const horaMin = horaAMin(hora);
    const desde = horaAMin(conf.horaDesde || "08:00");
    const hasta = horaAMin(conf.horaHasta || "18:00");
    return horaMin >= desde && horaMin < hasta;
  }

  // Check if a date has any disponibilidad configured
  function getDispDia(fecha, profKey) {
    const d = new Date(fecha + "T12:00:00");
    const diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const mes = d.getMonth() + 1;
    const anio = d.getFullYear();
    const disp = getDisp(profKey, mes, anio);
    if (!disp || disp.length === 0) return null;
    return disp.find(x => x.dia === DIAS_SEMANA[diaSemana]) || null;
  }

  function entradasDia(fecha) {
    const turnos = data.turnos.filter(t => t.fecha === fecha && (mostrarCancelados || !ESTADOS_OCULTOS.includes(t.estado) || (t.motivo||"").includes("BLOQUEADO") || t.estado === "bloqueado"));
    const recs = data.recordatorios.filter(r => r.fecha === fecha && !r.completado);
    const todas = [
      ...turnos.map(t => ({ ...t, _kind: ((t.motivo||"").includes("BLOQUEADO") || t.estado === "bloqueado") ? "bloqueo" : "turno" })),
      ...recs.map(r => ({ ...r, _kind: "recordatorio", hora: r.hora || "08:00" })),
    ];
    if (filtroProfesional !== "todas") {
      return todas.filter(e => e._kind === "recordatorio" || e.profesional === filtroProfesional);
    }
    return todas;
  }

  // entradas sin recordatorios (para la grilla)
  function entradasDiaSinRecs(fecha) {
    return entradasDia(fecha).filter(e => e._kind !== "recordatorio");
  }

  // ── Color de entrada ──────────────────────────────────────────────────────────
  function getColor(entrada) {
    if (entrada.color_custom) return { color: entrada.color_custom, bg: entrada.color_custom + "22" };
    if (entrada._kind === "bloqueo") return { color: "#991B1B", bg: "#FEE2E2" };
    if (entrada._kind === "recordatorio") return { color: "#6B7280", bg: "#F3F4F6" };
    // turno: por motivo/practica
    return colorPorMotivo(entrada.practicas, entrada.motivo);
  }

  function pacNombre(id) {
    const p = pacientes.find(p => p.id === id);
    return p ? `${p.apellido} ${p.nombre}` : "Sin paciente";
  }

  // ── Abrir modal nueva entrada ─────────────────────────────────────────────────
  function abrirNueva(fecha, hora) {
    setTipoEntrada("turno");
    setColorEntrada("");
    setFormEntrada({ fecha, hora, hora_fin: calcularHoraFin(hora, ""), paciente_id: "", busqueda: "", titulo: "", motivo: "", practicas: [], profesional: "", notas: "", estado: "pendiente" });
    setModalEntrada({ fecha, hora });
    setMostrarInsumos(false);
  }

  function abrirEditar(entrada) {
    const kind = entrada._kind || "turno";
    setTipoEntrada(kind === "recordatorio" ? "recordatorio" : kind === "bloqueo" ? "bloqueo" : "turno");
    setColorEntrada(entrada.color_custom || "");
    if (kind === "recordatorio") {
      setFormEntrada({ ...entrada, titulo: entrada.titulo || "", hora: (entrada.hora||"08:00").slice(0,5) });
    } else {
      setFormEntrada({ ...entrada, practicas: Array.isArray(entrada.practicas) ? entrada.practicas : (entrada.motivo ? [entrada.motivo] : []) });
    }
    setModalEntrada({ editando: entrada });
    setMostrarInsumos(false);
  }

  function cerrarModal() {
    setModalEntrada(null);
    setMostrarInsumos(false);
    setMostrarNuevoPacEntrada(false);
    setBusquedaEntrada("");
    setFormNuevoPac(FORM_PAC_VACIO);
    setInsumoFormT({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
  }

  // ── Guardar entrada ───────────────────────────────────────────────────────────
  async function guardarEntrada() {
    if (!formEntrada.fecha || !formEntrada.hora) return alert("Completá fecha y hora.");
    setSaving(true);
    try {
      const esNueva = !modalEntrada?.editando;
      const colorFinal = colorEntrada || null;
      const estadoFinal = tipoEntrada === "bloqueo" ? "bloqueado" : (formEntrada.estado || "pendiente");
      const esOculto = ESTADOS_OCULTOS.includes(estadoFinal);

      if (tipoEntrada === "recordatorio") {
        if (!formEntrada.titulo) return alert("Escribí un título.");
        const rec = {
          titulo: formEntrada.titulo,
          fecha: formEntrada.fecha,
          hora: formEntrada.hora,
          tipo: "seguimiento",
          paciente_id: formEntrada.paciente_id || null,
          descripcion: formEntrada.notas || "",
          completado: false,
        };
        if (esNueva) await db.agregarRecordatorio(rec);
        else await db.actualizarRecordatorio({ ...rec, id: modalEntrada.editando.id });

      } else {
        // turno o bloqueo
        const turno = {
          fecha: formEntrada.fecha,
          hora: formEntrada.hora,
          hora_fin: formEntrada.hora_fin || "",
          paciente_id: tipoEntrada === "bloqueo" ? null : (formEntrada.paciente_id || null),
          motivo: tipoEntrada === "bloqueo"
            ? `🔒 BLOQUEADO: ${formEntrada.titulo || "Bloqueo"}`
            : (Array.isArray(formEntrada.practicas) && formEntrada.practicas.length > 0 ? formEntrada.practicas.join(", ") : formEntrada.titulo || formEntrada.motivo || ""),
          practicas: tipoEntrada === "bloqueo" ? [] : (Array.isArray(formEntrada.practicas) ? [...formEntrada.practicas] : []),
          profesional: formEntrada.profesional || "",
          estado: tipoEntrada === "bloqueo" ? "bloqueado" : (formEntrada.estado || "pendiente"),
          notas: formEntrada.notas || "",
          color_custom: colorFinal,
          creado_por: usuario?.nombre || "",
        };

        if ((tipoEntrada === "bloqueo" || tipoEntrada === "visita") && formEntrada.profesional === "ambas") {
          await db.agregarTurno({ ...turno, profesional: "Lic. Cecilia Miatello" });
          await db.agregarTurno({ ...turno, profesional: "Lic. Graciela Valles" });
        } else if (esNueva) {
          await db.agregarTurno(turno);
        } else {
          // Siempre actualizar el turno (no eliminar)
          await db.actualizarTurno({ ...turno, id: modalEntrada.editando.id });
          // Si es cancelado/suspendido: registrar en HC también
          if (esOculto && formEntrada.paciente_id) {
            const practicasTexto = Array.isArray(formEntrada.practicas) && formEntrada.practicas.length > 0
              ? formEntrada.practicas.join(", ") : (formEntrada.motivo || "Consulta");
            await db.agregarEntradaHC(formEntrada.paciente_id, {
              fecha: formEntrada.fecha,
              tipo: estadoFinal === "suspendido" ? "Turno suspendido" : "Turno cancelado",
              descripcion: `${practicasTexto} · ${formEntrada.hora?.slice(0,5)}${formEntrada.hora_fin ? `–${formEntrada.hora_fin.slice(0,5)}` : ""} · ${estadoFinal === "suspendido" ? "Suspendido" : "Cancelado"}${formEntrada.notas ? `. ${formEntrada.notas}` : ""}`,
              profesional: formEntrada.profesional || "",
            });
          }
          // Si es realizado: registrar en HC
          if (estadoFinal === "realizado" && formEntrada.paciente_id) {
            const practicasHC = Array.isArray(formEntrada.hcPracticas) && formEntrada.hcPracticas.length > 0
              ? formEntrada.hcPracticas : (Array.isArray(formEntrada.practicas) ? formEntrada.practicas : []);
            await db.agregarEntradaHC(formEntrada.paciente_id, {
              fecha: formEntrada.fecha,
              tipo: practicasHC.join(", ") || "Consulta",
              descripcion: formEntrada.hcDescripcion || `${practicasHC.join(", ")} · ${formEntrada.hora?.slice(0,5)}`,
              profesional: formEntrada.profesional || "",
            });
          }
        }
      }
      cerrarModal();
    } finally { setSaving(false); }
  }

  async function eliminarEntrada(entrada) {
    if (!window.confirm("¿Eliminar esta entrada?")) return;
    if (entrada._kind === "recordatorio") await db.eliminarRecordatorio(entrada.id);
    else await db.eliminarTurno(entrada.id);
  }

  // ── Layout para grilla ────────────────────────────────────────────────────────
  function entradaLayout(e, slotH) {
    const inicio = horaAMin(e.hora);
    const fin = e.hora_fin ? horaAMin(e.hora_fin) : inicio + 30;
    const top = (inicio - HORA_INICIO * 60) / 30 * slotH;
    const height = Math.max((fin - inicio) / 30 * slotH, slotH);
    return { top, height };
  }

  function asignarCols(entradas) {
    const sorted = [...entradas].sort((a,b) => horaAMin(a.hora) - horaAMin(b.hora));
    const colFin = [];
    const withCols = sorted.map(e => {
      const ini = horaAMin(e.hora);
      const fin = e.hora_fin ? horaAMin(e.hora_fin) : ini + 30;
      let col = 0;
      while (colFin[col] !== undefined && colFin[col] > ini) col++;
      colFin[col] = fin;
      return { ...e, _col: col };
    });
    return withCols.map(e => {
      const ini = horaAMin(e.hora);
      const fin = e.hora_fin ? horaAMin(e.hora_fin) : ini + 30;
      const concurrent = withCols.filter(u => {
        const ui = horaAMin(u.hora); const uf = u.hora_fin ? horaAMin(u.hora_fin) : ui + 30;
        return ui < fin && uf > ini;
      });
      return { ...e, _totalCols: concurrent.length };
    });
  }

  // ── Render entrada (chip) ─────────────────────────────────────────────────────
  function ChipEntrada({ entrada, slotH, col, totalCols, onEdit, onDelete }) {
    const { top, height } = entradaLayout(entrada, slotH);
    const cm = getColor(entrada);
    const pct = 100 / Math.max(totalCols, 1);
    const esBloqueo = entrada._kind === "bloqueo";
    const esRec = entrada._kind === "recordatorio";
    const pac = !esRec && !esBloqueo ? pacientes.find(p => p.id === entrada.paciente_id) : null;

    const displayName = esRec
      ? entrada.titulo
      : esBloqueo
      ? (entrada.profesional || "Bloqueado")
      : (pac ? `${pac.apellido} ${pac.nombre}` : "Sin paciente");

    const displaySub = esRec ? "🔔 Recordatorio" : esBloqueo
      ? (entrada.motivo||"").replace("🔒 BLOQUEADO: ","")
      : (Array.isArray(entrada.practicas) && entrada.practicas.length > 0 ? entrada.practicas[0] : entrada.motivo || "");

    return (
      <div style={{
        position: "absolute",
        top: top + 1,
        left: `${col * pct}%`,
        width: `calc(${pct}% - 2px)`,
        height: height - 2,
        background: esBloqueo
          ? "repeating-linear-gradient(45deg,#FEE2E2,#FEE2E2 5px,#fff 5px,#fff 10px)"
          : cm.bg,
        border: `1.5px solid ${cm.color}`,
        borderRadius: 7,
        overflow: "hidden",
        cursor: "pointer",
        boxSizing: "border-box",
        zIndex: 4,
      }}>
        <div onClick={onEdit} style={{ position: "absolute", top: 2, left: 3, right: 20, bottom: 2, overflow: "hidden" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: cm.color, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {entrada.hora?.slice(0,5)}{entrada.hora_fin ? `–${entrada.hora_fin.slice(0,5)}` : ""}
            {entrada.profesional && ` · ${entrada.profesional.includes("Miatello") ? "CM" : entrada.profesional.includes("Valles") ? "GV" : entrada.profesional}`}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {displayName}
          </div>
          <div style={{ fontSize: 9, color: cm.color, opacity: 0.85, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {displaySub}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ position: "absolute", top: 2, right: 2, background: "rgba(255,255,255,0.8)", border: "none", borderRadius: 3, width: 14, height: 14, fontSize: 9, cursor: "pointer", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>×</button>
      </div>
    );
  }

  // ── Grilla horaria (reutilizable para día y semana) ──────────────────────────
  function GrillaHoraria({ fecha, entradas, slotH, width = "100%", profKey = null }) {
    const totalHeight = TOTAL_SLOTS * slotH;
    const conCols = asignarCols(entradas);
    // Calc where disponibilidad starts and ends
    const finDisp = profKey ? getFinDisponibilidad(fecha, profKey) : null;
    const inicioDisp = profKey ? getInicioDisponibilidad(fecha, profKey) : null;
    const finDispTop = finDisp ? (horaAMin(finDisp) - HORA_INICIO * 60) / 30 * slotH : null;
    const inicioDispTop = inicioDisp ? (horaAMin(inicioDisp) - HORA_INICIO * 60) / 30 * slotH : null;

    return (
      <div style={{ position: "relative", height: totalHeight, width }}>
        {/* Línea inicio de disponibilidad */}
        {inicioDispTop !== null && inicioDispTop > 0 && (
          <div style={{ position: "absolute", top: inicioDispTop, left: 0, right: 0, height: 2, background: "#1a6b6b", zIndex: 10, opacity: 0.6 }}>
            <span style={{ position: "absolute", left: 4, top: -10, fontSize: 9, fontWeight: 700, color: "#1a6b6b", background: "#fff", padding: "0 4px", borderRadius: 4 }}>
              inicio {inicioDisp?.slice(0,5)}
            </span>
          </div>
        )}
        {/* Línea fin de disponibilidad */}
        {finDispTop !== null && (
          <div style={{ position: "absolute", top: finDispTop, left: 0, right: 0, height: 2, background: "#1a6b6b", zIndex: 10, opacity: 0.6 }}>
            <span style={{ position: "absolute", right: 4, top: -10, fontSize: 9, fontWeight: 700, color: "#1a6b6b", background: "#fff", padding: "0 4px", borderRadius: 4 }}>
              fin {finDisp?.slice(0,5)}
            </span>
          </div>
        )}
        {/* Líneas de fondo con color disponibilidad */}
        {HORAS.map((h, i) => {
          const esM = i % 2 !== 0;
          // Determine background based on disponibilidad
          let bgBase = esM ? "#FAFAFA" : "#fff";
          let bgHover = "#EEF2FF";
          if (profKey) {
            const disp = isDisponible(fecha, h, profKey);
            if (disp === true) {
              bgBase = esM ? "#F0FAF0" : "#E8F7E8"; // verde pastel
              bgHover = "#D0F0D0";
            } else if (disp === false) {
              bgBase = esM ? "#F2F2F2" : "#EBEBEB"; // gris sombreado
              bgHover = "#DCDCDC";
            }
          }
          return (
            <div key={h} style={{ position: "absolute", top: i * slotH, left: 0, right: 0, height: slotH,
              borderBottom: `1px solid ${esM ? "#F5F5F5" : "#E5E7EB"}`,
              background: bgBase, zIndex: 1 }}
              onClick={() => abrirNueva(fecha, h)}
              onMouseEnter={e => { if (!e.target.closest('[data-entrada]')) e.currentTarget.style.background = bgHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = bgBase; }}
            />
          );
        })}
        {/* Entradas */}
        {conCols.map(e => (
          <ChipEntrada key={e._kind + e.id} entrada={e} slotH={slotH}
            col={e._col || 0} totalCols={e._totalCols || 1}
            onEdit={() => abrirEditar(e)}
            onDelete={() => eliminarEntrada(e)}
          />
        ))}
      </div>
    );
  }

  // ── Columna de horas ─────────────────────────────────────────────────────────

  // ── Recordatorios al pie (estilo Google Calendar) ────────────────────────────
  function RecordatoriosPie({ fecha, profKeys }) {
    const recs = data.recordatorios.filter(r => r.fecha === fecha && !r.completado);
    if (recs.length === 0) return null;

    // Agrupar por profesional (o general)
    const grupos = profKeys || ["general"];

    return (
      <div style={{ borderTop: "2px dashed #E5E7EB", padding: "8px 8px 10px", background: "#F9FAFB" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingLeft: 2 }}>
          🔔 Recordatorios del día
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {recs.sort((a,b) => (a.hora||"").localeCompare(b.hora||"")).map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: 7, background: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <input type="checkbox" checked={r.completado} onChange={async () => { await db.actualizarRecordatorio({ ...r, completado: true }); }}
                style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#6B7280", flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", lineHeight: 1.4, wordBreak: "break-word" }}>
                  {r.hora ? <span style={{ color: "#9CA3AF", marginRight: 4, fontSize: 11 }}>{r.hora.slice(0,5)}</span> : null}{r.titulo}
                </div>
                {r.descripcion && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, lineHeight: 1.4, wordBreak: "break-word" }}>{r.descripcion}</div>}
                {r.paciente_id && (() => { const p = data.pacientes.find(x => x.id === r.paciente_id); return p ? <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>👤 {p.apellido}, {p.nombre}</div> : null; })()}
              </div>
              <button type="button" onClick={() => db.eliminarRecordatorio(r.id)}
                style={{ background: "none", border: "none", color: "#D1D5DB", cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Calcular fin e inicio de disponibilidad para una fecha ──────────────────
  function getDispEfectiva(fecha, profKey) {
    const d = new Date(fecha + "T12:00:00");
    const diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const mes = d.getMonth() + 1;
    const anio = d.getFullYear();
    const disp = getDisp(profKey, mes, anio);
    if (!disp || disp.length === 0) return null;
    // Check date-specific exception first
    const excepcion = disp.find(x => x.fecha === fecha);
    if (excepcion) return excepcion.activo ? excepcion : null;
    const diaConf = disp.find(x => x.dia === DIAS_SEMANA[diaSemana]);
    if (!diaConf || !diaConf.activo) return null;
    return diaConf;
  }

  function getFinDisponibilidad(fecha, profKey) {
    const conf = getDispEfectiva(fecha, profKey);
    return conf ? (conf.horaHasta || null) : null;
  }

  function getInicioDisponibilidad(fecha, profKey) {
    const conf = getDispEfectiva(fecha, profKey);
    return conf ? (conf.horaDesde || null) : null;
  }

  function ColumnaHoras({ slotH }) {
    const totalHeight = TOTAL_SLOTS * slotH;
    return (
      <div style={{ width: 44, flexShrink: 0, position: "relative", height: totalHeight, background: "#F8FAFC", borderRight: "1.5px solid #E5E7EB" }}>
        {HORAS.map((h, i) => {
          const esM = i % 2 !== 0;
          return (
            <div key={h} style={{ position: "absolute", top: i * slotH, left: 0, right: 0, height: slotH,
              borderBottom: `1px solid ${esM ? "#F0F0F0" : "#E5E7EB"}`, background: esM ? "#FAFAFA" : "#F8FAFC",
              display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 6, paddingTop: 3 }}>
              {!esM && <span style={{ fontSize: 10, fontWeight: 700, color: "#aaa" }}>{h}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* ── Barra de control ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          {/* Vistas */}
          <div style={{ display: "flex", gap: 3, background: "#F3F4F6", borderRadius: 9, padding: 3 }}>
            {[["dia","Día"],["semana","Semana"],["todos","Agenda"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setVista(v)} style={{ background: vista === v ? "#1a6b6b" : "transparent", color: vista === v ? "#fff" : "#555", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          {/* Navegación */}
          {vista === "dia" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button type="button" onClick={() => setFiltroFecha(addDays(filtroFecha, -1))} style={{ ...btnSecondary, padding: "6px 10px" }}>‹</button>
              <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
              <button type="button" onClick={() => setFiltroFecha(addDays(filtroFecha, 1))} style={{ ...btnSecondary, padding: "6px 10px" }}>›</button>
              <button type="button" onClick={() => setFiltroFecha(today())} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>Hoy</button>
            </div>
          )}
          {vista === "semana" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button type="button" onClick={() => setSemanaBase(addDays(semanaBase, -7))} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 16 }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{semanaLabel}</span>
              <button type="button" onClick={() => setSemanaBase(addDays(semanaBase, 7))} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 16 }}>›</button>
              <button type="button" onClick={() => setSemanaBase(getLunes(today()))} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>Hoy</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          {/* Filtros: profesional + cancelados */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 3, background: "#F3F4F6", borderRadius: 8, padding: 3 }}>
              {[["todas","Todas"],["Lic. Cecilia Miatello","Miatello"],["Lic. Graciela Valles","Valles"]].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setFiltroProfesional(v)} style={{
                  background: filtroProfesional === v ? "#1a6b6b" : "transparent",
                  color: filtroProfesional === v ? "#fff" : "#555",
                  border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer"
                }}>{l}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 3, background: "#F3F4F6", borderRadius: 8, padding: 3 }}>
              <button type="button" onClick={() => setMostrarCancelados(false)} style={{ background: !mostrarCancelados ? "#1a6b6b" : "transparent", color: !mostrarCancelados ? "#fff" : "#555", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Sin cancelados</button>
              <button type="button" onClick={() => setMostrarCancelados(true)} style={{ background: mostrarCancelados ? "#1a6b6b" : "transparent", color: mostrarCancelados ? "#fff" : "#555", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Todos</button>
            </div>
          </div>
          {/* Leyenda tipos */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {Object.entries(TIPOS_ENTRADA).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: v.color }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: v.bg, border: `1.5px solid ${v.color}` }} />
                {v.label}
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* ── Vista DÍA ─────────────────────────────────────────────────────────── */}
      {vista === "dia" && (
        <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, background: "#fff", overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", minWidth: 320 }}>
            <div style={{ position: "sticky", left: 0, zIndex: 10, background: "#F8FAFC", flexShrink: 0, borderRight: "1.5px solid #E5E7EB" }}>
              <ColumnaHoras slotH={SLOT_H_DIA} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <GrillaHoraria fecha={filtroFecha} entradas={entradasDia(filtroFecha).filter(e => e._kind !== "recordatorio")} slotH={SLOT_H_DIA}
                profKey={filtroProfesional !== "todas" ? filtroProfesional : null} />
            </div>
          </div>
          <RecordatoriosPie fecha={filtroFecha} profKeys={[filtroProfesional !== "todas" ? filtroProfesional : "todas"]} />
        </div>
      )}

      {/* ── Vista SEMANA ──────────────────────────────────────────────────────── */}
      {vista === "semana" && (() => {
        const PROFS_SEM = [
          { key: "Lic. Cecilia Miatello", short: "CM", color: "#1a6b6b", bg: "#e0f4f4" },
          { key: "Lic. Graciela Valles",  short: "GV", color: "#4338CA", bg: "#EEF2FF" },
        ];

        function entsProfFecha(profKey, fecha) {
          const turnos = data.turnos
            .filter(t => t.fecha === fecha && (mostrarCancelados || !ESTADOS_OCULTOS.includes(t.estado) || (t.motivo||"").includes("BLOQUEADO") || t.estado === "bloqueado"))
            .filter(t => {
              if ((t.motivo||"").includes("BLOQUEADO")) return t.profesional === profKey;
              return t.profesional === profKey || (!t.profesional && profKey === "Lic. Cecilia Miatello");
            });
          // No incluir recordatorios en la grilla — se muestran al pie
          return turnos.map(t => ({ ...t, _kind: ((t.motivo||"").includes("BLOQUEADO") || t.estado === "bloqueado") ? "bloqueo" : "turno" }));
        }

        const totalCols = `44px repeat(6, minmax(110px, 1fr))`;

        const numProfs = filtroProfesional === "todas" ? 2 : 1;
        const minColW = 90;
        const totalGridW = 44 + diasSemana.length * numProfs * minColW;

        return (
          <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, background: "#fff", overflow: "auto", maxHeight: "calc(100vh - 200px)", WebkitOverflowScrolling: "touch" }}>
            <div style={{ minWidth: totalGridW }}>
              {/* Header días sticky top */}
              <div style={{ display: "grid", gridTemplateColumns: totalCols, borderBottom: "2px solid #E5E7EB", position: "sticky", top: 0, zIndex: 20, background: "#fff" }}>
                <div style={{ background: "#F8FAFC", borderRight: "1.5px solid #E5E7EB", position: "sticky", left: 0, zIndex: 25 }} />
                {diasSemana.map(fecha => {
                  const hoy = fecha === today();
                  const bCM = entsProfFecha("Lic. Cecilia Miatello", fecha).filter(e => e._kind === "bloqueo").length > 0;
                  const bGV = entsProfFecha("Lic. Graciela Valles", fecha).filter(e => e._kind === "bloqueo").length > 0;
                  const algoBloq = bCM || bGV;
                  return (
                    <div key={fecha} onClick={() => { setVista("dia"); setFiltroFecha(fecha); }}
                      style={{ background: hoy ? "#1a6b6b" : algoBloq ? "#FEF3F3" : "#F8FAFC", padding: "6px 4px", textAlign: "center", cursor: "pointer", borderRight: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: hoy ? "rgba(255,255,255,0.6)" : "#888" }}>{nombreDia(fecha)}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: hoy ? "#fff" : "#1a1a2e" }}>{numDia(fecha)}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 2 }}>
                        {(filtroProfesional === "todas" || filtroProfesional === "Lic. Cecilia Miatello") && (
                          <span style={{ fontSize: 8, fontWeight: 700, color: bCM ? "#991B1B" : "#1a6b6b", background: bCM ? "#FEE2E2" : "#e0f4f4", borderRadius: 4, padding: "1px 4px" }}>{bCM ? "🔒CM" : "CM"}</span>
                        )}
                        {(filtroProfesional === "todas" || filtroProfesional === "Lic. Graciela Valles") && (
                          <span style={{ fontSize: 8, fontWeight: 700, color: bGV ? "#991B1B" : "#4338CA", background: bGV ? "#FEE2E2" : "#EEF2FF", borderRadius: 4, padding: "1px 4px" }}>{bGV ? "🔒GV" : "GV"}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cuerpo: cada día dividido en 2 sub-columnas */}
              <div style={{ display: "flex" }}>
                {/* Columna horas sticky left */}
                <div style={{ position: "sticky", left: 0, zIndex: 15, flexShrink: 0, background: "#F8FAFC" }}>
                  <ColumnaHoras slotH={SLOT_H_SEM} />
                </div>

                {/* 6 días */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
                  {diasSemana.map(fecha => {
                    const profsFilt = filtroProfesional === "todas" ? PROFS_SEM : PROFS_SEM.filter(p => p.key === filtroProfesional);
                    return (
                    <div key={fecha} style={{ borderRight: "1px solid #E5E7EB", display: "grid", gridTemplateColumns: profsFilt.length === 1 ? "1fr" : "1fr 1fr" }}>
                      {profsFilt.map((prof, pi) => {
                        const ents = entsProfFecha(prof.key, fecha);
                        const conCols = asignarCols(ents);
                        const totalH = TOTAL_SLOTS * SLOT_H_SEM;
                        const tieneBloqueo = ents.some(e => e._kind === "bloqueo");
                        return (
                          <div key={prof.key} style={{ position: "relative", height: totalH, borderRight: pi === 0 && profsFilt.length > 1 ? "1px dashed #E5E7EB" : "none" }}>
                            {/* Líneas fondo con disponibilidad */}
                            {HORAS.map((h, i) => {
                              const esM = i % 2 !== 0;
                              const disp = isDisponible(fecha, h, prof.key);
                              // Color solo por disponibilidad — el bloqueo no tiñe el fondo
                              let bgBase;
                              if (disp === true) {
                                bgBase = esM ? "#F0FAF0" : "#E8F7E8"; // verde pastel
                              } else if (disp === false) {
                                bgBase = esM ? "#F2F2F2" : "#EBEBEB"; // gris sombreado
                              } else {
                                bgBase = esM ? "#FAFAFA" : "#fff"; // sin config = blanco
                              }
                              return (
                                <div key={h} onClick={() => { abrirNueva(fecha, h); setTimeout(() => setFormEntrada(f => ({ ...f, profesional: prof.key })), 0); }}
                                  style={{ position: "absolute", top: i * SLOT_H_SEM, left: 0, right: 0, height: SLOT_H_SEM,
                                    borderBottom: `1px solid ${esM ? "#F0F0F0" : "#E8E8E8"}`, zIndex: 1, cursor: "pointer",
                                    background: bgBase }}
                                  onMouseEnter={e => e.currentTarget.style.background = disp === false ? "#DCDCDC" : "#D0F0D0"}
                                  onMouseLeave={e => e.currentTarget.style.background = bgBase}
                                />
                              );
                            })}
                            {/* Entradas */}
                            {conCols.filter(e => e._kind !== "bloqueo").map(e => (
                              <ChipEntrada key={e._kind + e.id} entrada={e} slotH={SLOT_H_SEM}
                                col={e._col || 0} totalCols={e._totalCols || 1}
                                onEdit={() => abrirEditar(e)}
                                onDelete={() => eliminarEntrada(e)}
                              />
                            ))}
                            {/* Líneas verde inicio/fin disponibilidad */}
                            {(() => {
                              const conf = getDispEfectiva(fecha, prof.key);
                              if (!conf) return null;
                              const topI = conf.horaDesde ? (horaAMin(conf.horaDesde) - HORA_INICIO * 60) / 30 * SLOT_H_SEM : null;
                              const topF = conf.horaHasta ? (horaAMin(conf.horaHasta) - HORA_INICIO * 60) / 30 * SLOT_H_SEM : null;
                              return (<>
                                {topI !== null && topI > 0 && (
                                  <div style={{ position: "absolute", top: topI, left: 0, right: 0, height: 2, background: "#1a6b6b", zIndex: 8, opacity: 0.7 }}>
                                    <span style={{ position: "absolute", left: 1, top: -9, fontSize: 7, fontWeight: 700, color: "#1a6b6b", background: "#fff", padding: "0 2px", borderRadius: 2 }}>{conf.horaDesde?.slice(0,5)}</span>
                                  </div>
                                )}
                                {topF !== null && (
                                  <div style={{ position: "absolute", top: topF, left: 0, right: 0, height: 2, background: "#1a6b6b", zIndex: 8, opacity: 0.7 }}>
                                    <span style={{ position: "absolute", right: 1, top: -9, fontSize: 7, fontWeight: 700, color: "#1a6b6b", background: "#fff", padding: "0 2px", borderRadius: 2 }}>{conf.horaHasta?.slice(0,5)}</span>
                                  </div>
                                )}
                              </>);
                            })()}
                            {/* Bloqueo como overlay con botón eliminar */}
                            {tieneBloqueo && (() => {
                              const blq = ents.find(e => e._kind === "bloqueo");
                              const { top, height } = entradaLayout(blq, SLOT_H_SEM);
                              return (
                                <div style={{ position: "absolute", top, left: 1, right: 1, height, zIndex: 2,
                                  background: "repeating-linear-gradient(45deg,#FEE2E2,#FEE2E2 5px,rgba(255,255,255,0.6) 5px,rgba(255,255,255,0.6) 10px)",
                                  border: "1px solid #FECACA", borderRadius: 5, padding: "2px 4px",
                                  display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 8, fontWeight: 800, color: "#991B1B" }}>🔒 {prof.short}</span>
                                  <div style={{ display: "flex", gap: 2 }}>
                                    {blq.notas && blq.notas.startsWith("serie:") && (
                                      <button type="button"
                                        onClick={async e => {
                                          e.stopPropagation();
                                          const serieId = blq.notas;
                                          if (window.confirm("¿Eliminar TODOS los bloqueos de esta serie?")) {
                                            const serie = data.turnos.filter(t => t.notas === serieId && t.estado === "bloqueado");
                                            await Promise.all(serie.map(t => db.eliminarTurno(t.id)));
                                          }
                                        }}
                                        style={{ background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 3, padding: "1px 4px", fontSize: 8, cursor: "pointer", color: "#991B1B", lineHeight: 1, whiteSpace: "nowrap" }}>
                                        Serie
                                      </button>
                                    )}
                                    <button type="button"
                                      onClick={e => { e.stopPropagation(); if (window.confirm("¿Eliminar este bloqueo?")) db.eliminarTurno(blq.id); }}
                                      style={{ background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 3, width: 14, height: 14, fontSize: 9, cursor: "pointer", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                      {/* Recordatorios al pie — se muestran una sola vez por día */}
                      <div style={{ gridColumn: "1 / -1", borderTop: "2px dashed #E5E7EB" }}>
                        <RecordatoriosPie fecha={fecha} profKeys={profsFilt.map(p => p.key)} />
                      </div>
                    </div>
                    );
                  })}
                </div>
                </div>
              </div>
            </div>
        );
      })()}

      {/* ── Vista TODOS ───────────────────────────────────────────────────────── */}
      {vista === "todos" && (() => {
        const SLOT_H_AG = 48;
        const totalHeight = TOTAL_SLOTS * SLOT_H_AG;

        const PROFS = [
          { key: "Lic. Cecilia Miatello", label: "Miatello", short: "CM", color: "#1a6b6b", bg: "#e0f4f4" },
          { key: "Lic. Graciela Valles",  label: "Valles",   short: "GV", color: "#4338CA", bg: "#EEF2FF" },
        ];

        function entradasProf(profKey) {
          const turnos = data.turnos
            .filter(t => t.fecha === filtroFecha && (mostrarCancelados || !ESTADOS_OCULTOS.includes(t.estado) || (t.motivo||"").includes("BLOQUEADO") || t.estado === "bloqueado"))
            .filter(t => {
              if ((t.motivo||"").includes("BLOQUEADO")) return t.profesional === profKey;
              return t.profesional === profKey || (!t.profesional && profKey === "Lic. Cecilia Miatello");
            });
          const recs = data.recordatorios
            .filter(r => r.fecha === filtroFecha && !r.completado)
            .filter(r => !r.profesional || r.profesional === profKey);
          return [
            ...turnos.map(t => ({ ...t, _kind: ((t.motivo||"").includes("BLOQUEADO") || t.estado === "bloqueado") ? "bloqueo" : "turno" })),
            ...recs.map(r => ({ ...r, _kind: "recordatorio", hora: r.hora || "08:00" })),
          ];
        }

        return (
          <div>
            {/* Selector de fecha para agenda */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <button type="button" onClick={() => setFiltroFecha(addDays(filtroFecha, -1))} style={{ ...btnSecondary, padding: "6px 10px" }}>‹</button>
              <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
              <button type="button" onClick={() => setFiltroFecha(addDays(filtroFecha, 1))} style={{ ...btnSecondary, padding: "6px 10px" }}>›</button>
              <button type="button" onClick={() => setFiltroFecha(today())} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>Hoy</button>
              <span style={{ fontSize: 13, color: "#888", marginLeft: 4 }}>
                {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][new Date(filtroFecha + "T12:00:00").getDay()]} {numDia(filtroFecha)} {mesCorto(filtroFecha)}
              </span>
            </div>

            <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, background: "#fff", overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)", WebkitOverflowScrolling: "touch" }}>
              {/* Header profesionales sticky */}
              <div style={{ display: "grid", gridTemplateColumns: `44px ${filtroProfesional === "todas" ? "1fr 1fr" : "1fr"}`, borderBottom: "2px solid #E5E7EB", position: "sticky", top: 0, zIndex: 20, background: "#fff", minWidth: 320 }}>
                <div style={{ background: "#F8FAFC", borderRight: "1.5px solid #E5E7EB" }} />
                {PROFS.filter(p => filtroProfesional === "todas" || p.key === filtroProfesional).map(prof => {
                  const ents = entradasProf(prof.key);
                  const bloqueos = ents.filter(e => e._kind === "bloqueo");
                  const normales = ents.filter(e => e._kind !== "bloqueo");
                  return (
                    <div key={prof.key} style={{ background: bloqueos.length > 0 ? "#FEE2E2" : prof.bg, padding: "10px 14px", borderRight: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: bloqueos.length > 0 ? "#991B1B" : prof.color }}>{prof.label}</div>
                        <div style={{ fontSize: 11, color: bloqueos.length > 0 ? "#DC2626" : prof.color, opacity: 0.8 }}>
                          {bloqueos.length > 0 && "🔒 "}
                          {normales.length} entrada{normales.length !== 1 ? "s" : ""}
                          {bloqueos.length > 0 && " · bloqueado"}
                        </div>
                      </div>
                      <button type="button" onClick={() => abrirNueva(filtroFecha, "09:00")}
                        style={{ background: prof.color, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Turno</button>
                    </div>
                  );
                })}
              </div>

              {/* Cuerpo dual */}
              <div style={{ display: "grid", gridTemplateColumns: `44px ${filtroProfesional === "todas" ? "1fr 1fr" : "1fr"}`, minWidth: 320 }}>
                {/* Columna horas */}
                <ColumnaHoras slotH={SLOT_H_AG} />

                {/* Columna por profesional */}
                {PROFS.map(prof => {
                  const ents = entradasProf(prof.key);
                  const conCols = asignarCols(ents);

                  return (
                    <div key={prof.key} style={{ borderRight: "1px solid #EFEFEF", position: "relative", height: totalHeight }}>
                      {/* Líneas de fondo */}
                      {HORAS.map((h, i) => {
                        const esM = i % 2 !== 0;
                        return (
                          <div key={h}
                            onClick={() => { abrirNueva(filtroFecha, h); setFormEntrada(f => ({ ...f, profesional: prof.key })); }}
                            style={{ position: "absolute", top: i * SLOT_H_AG, left: 0, right: 0, height: SLOT_H_AG,
                              borderBottom: `1px solid ${esM ? "#F5F5F5" : "#E5E7EB"}`,
                              background: esM ? "#FAFAFA" : "#fff", zIndex: 1, cursor: "pointer" }}
                            onMouseEnter={e => e.currentTarget.style.background = prof.bg + "88"}
                            onMouseLeave={e => e.currentTarget.style.background = esM ? "#FAFAFA" : "#fff"}
                          />
                        );
                      })}

                      {/* Bloqueos como fondo semitransparente */}
                      {ents.filter(e => e._kind === "bloqueo").map(e => {
                        const ini = horaAMin(e.hora);
                        const fin = e.hora_fin ? horaAMin(e.hora_fin) : ini + (HORA_FIN - HORA_INICIO) * 60;
                        const top = (ini - HORA_INICIO * 60) / 30 * SLOT_H_AG;
                        const height = Math.max((fin - ini) / 30 * SLOT_H_AG, SLOT_H_AG);
                        return (
                          <div key={"blq-"+e.id} style={{
                            position: "absolute", top, left: 0, right: 0, height,
                            background: "repeating-linear-gradient(45deg,#FEE2E2,#FEE2E2 5px,rgba(255,255,255,0.7) 5px,rgba(255,255,255,0.7) 10px)",
                            borderTop: "2px solid #FECACA", borderBottom: "2px solid #FECACA",
                            zIndex: 2, display: "flex", alignItems: "flex-start", padding: "4px 8px", pointerEvents: "none"
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#991B1B", background: "rgba(255,255,255,0.85)", borderRadius: 4, padding: "2px 6px" }}>
                              🔒 {e.hora?.slice(0,5)}{e.hora_fin ? `–${e.hora_fin.slice(0,5)}` : ""} · {(e.motivo||"").replace("🔒 BLOQUEADO: ","")}
                            </span>
                          </div>
                        );
                      })}

                      {/* Turnos normales sobre el fondo */}
                      {conCols.filter(e => e._kind !== "bloqueo").map(e => (
                        <ChipEntrada key={e._kind + e.id} entrada={e} slotH={SLOT_H_AG}
                          col={e._col || 0} totalCols={e._totalCols || 1}
                          onEdit={() => abrirEditar(e)}
                          onDelete={() => eliminarEntrada(e)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal bloqueo ─────────────────────────────────────────────────────── */}
      {modalBloqueo && <ModalBloqueo onClose={() => setModalBloqueo(false)} db={db} fechaInicial={vista === "dia" ? filtroFecha : today()} />}

      {fichaPacienteId && (
        <FichaPaciente
          pacienteId={fichaPacienteId}
          data={data}
          db={db}
          usuario={usuario}
          onClose={() => setFichaPacienteId(null)}
        />
      )}

      {/* ── HC rápida ─────────────────────────────────────────────────────────── */}
      {verHCTurno && (() => {
        const pac = pacientes.find(p => p.id === verHCTurno);
        if (!pac) return null;
        const historia = [...(pac.historia||[])].reverse();
        const comprasPac = data.compras.filter(c => c.paciente_id === verHCTurno).map(c => ({
          id: c.id, fecha: c.fecha, _tipo: "compra",
          descripcion: `Insumos: ${(c.insumos||[]).map(i=>i.nombre).join(", ")} · $${(parseFloat(c.total)||0).toLocaleString("es-AR")}`,
          tipo: c.estado === "pagado" ? "✅ Insumo pagado" : "🛍️ Insumo pendiente"
        }));
        const ventasPac = data.ventas.filter(v => v.paciente_id === verHCTurno).map(v => ({
          id: v.id, fecha: v.fecha, _tipo: "venta",
          descripcion: `${[v.marca_der,v.modelo_der].filter(Boolean).join(" ")||v.dispositivo||""} · $${(parseFloat(v.precio)||0).toLocaleString("es-AR")}`,
          tipo: `🛒 ${COLORES_VENTA[v.estado]?.label||v.estado}`
        }));
        const todo = [...historia.map(e=>({...e,_tipo:"hc"})), ...comprasPac, ...ventasPac]
          .filter(e=>e.fecha).sort((a,b)=>b.fecha.localeCompare(a.fecha));
        const colores = { hc:{bg:"#F0FDF4",border:"#BBF7D0"}, compra:{bg:"#FEF3C7",border:"#FDE68A"}, venta:{bg:"#E0F2FE",border:"#BAE6FD"} };

        return (
          <Modal title={`HC · ${pac.apellido}, ${pac.nombre}`} onClose={() => setVerHCTurno(null)}>
            {/* Datos del paciente editables */}
            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Datos del paciente</span>
                <button type="button" onClick={() => {
                  cerrarModal();
                  setVerHCTurno(null);
                  if (onEditarPaciente) onEditarPaciente(pac.id);
                }} style={{ background: "#EEF2FF", color: "#4338CA", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ✏️ Editar ficha completa
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>📞 {pac.telefono||"—"}{pac.telefono && <CopyButton text={pac.telefono} label="tel"/>}</div>
                <div>🏥 {pac.obraSocial||pac.obra_social||"Particular"}</div>
                {pac.diagnostico && <div style={{ gridColumn:"span 2" }}>🩺 {pac.diagnostico}</div>}
                {pac.audifono && <div style={{ gridColumn:"span 2" }}>👂 {pac.audifono}</div>}
                {(pac.derivadoPor||pac.derivado_por) && <div style={{ gridColumn:"span 2" }}>Derivado: {pac.derivadoPor||pac.derivado_por}</div>}
              </div>
            </div>

            {/* Historial */}
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Historial completo</div>
            {todo.length === 0
              ? <div style={{ textAlign:"center", color:"#aaa", padding: 20 }}>Sin entradas</div>
              : <div style={{ display:"flex", flexDirection:"column", gap: 8, maxHeight: 380, overflowY:"auto" }}>
                {todo.map(ev => {
                  const c = colores[ev._tipo] || colores.hc;
                  return (
                    <div key={ev._tipo+ev.id} style={{ background: c.bg, border:`1px solid ${c.border}`, borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{ev.tipo}</span>
                        <span style={{ fontSize: 11, color: "#888" }}>{formatFecha(ev.fecha)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13 }}>{ev.descripcion}</p>
                      {ev.profesional && <div style={{ fontSize: 11, color:"#888", marginTop:3 }}>{ev.profesional}</div>}
                    </div>
                  );
                })}
              </div>
            }
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop: 14 }}>
              <button onClick={() => setVerHCTurno(null)} style={btnSecondary}>Cerrar</button>
            </div>
          </Modal>
        );
      })()}

      {/* ── Modal nueva/editar entrada ────────────────────────────────────────── */}
      {modalEntrada && (
        <Modal title={modalEntrada.editando ? "Editar entrada" : "Nueva entrada"} onClose={cerrarModal}>
          {/* Selector tipo */}
          {!modalEntrada.editando && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Tipo de entrada</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(TIPOS_ENTRADA).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setTipoEntrada(k)} style={{
                    background: tipoEntrada === k ? v.bg : "#F3F4F6",
                    color: tipoEntrada === k ? v.color : "#6B7280",
                    border: tipoEntrada === k ? `2px solid ${v.color}` : "2px solid #E5E7EB",
                    borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}>{v.emoji} {v.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Fecha y hora */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Fecha *"><input type="date" style={inputStyle} value={formEntrada.fecha || ""} onChange={e => setFormEntrada(f => ({ ...f, fecha: e.target.value }))} /></Field>
            <Field label="Hora inicio *"><input type="time" style={inputStyle} value={formEntrada.hora || ""} onChange={e => setFormEntrada(f => ({ ...f, hora: e.target.value, hora_fin: calcularHoraFin(e.target.value, f.practicas?.[0] || "") }))} /></Field>
            {tipoEntrada !== "recordatorio" && <Field label="Hora fin"><input type="time" style={inputStyle} value={formEntrada.hora_fin || ""} onChange={e => setFormEntrada(f => ({ ...f, hora_fin: e.target.value }))} /></Field>}
          </div>

          {/* Según tipo */}
          {tipoEntrada === "turno" && (
            <>
              {/* Selector de paciente con búsqueda y creación */}
              <div style={{ background: "#F8FAFC", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>👤 Paciente</span>
                  {!mostrarNuevoPacEntrada && (
                    <button type="button" onClick={() => { setMostrarNuevoPacEntrada(true); setFormEntrada(f => ({ ...f, paciente_id: "" })); }}
                      style={{ background: "#EEF2FF", color: "#4338CA", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Crear nuevo</button>
                  )}
                </div>
                {!mostrarNuevoPacEntrada ? (
                  formEntrada.paciente_id ? (
                    <div>
                      {(() => { const p = pacientes.find(x => x.id === formEntrada.paciente_id); return p ? (
                        <div style={{ background: "#EEF2FF", borderRadius: 8, padding: "10px 14px", position: "relative" }}>
                          <button type="button" onClick={() => { setFormEntrada(f => ({ ...f, paciente_id: "" })); setBusquedaEntrada(""); }}
                            style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#6366F1", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#3730A3", marginBottom: 6 }}>{p.apellido}, {p.nombre}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12 }}>
                            <div style={{ color: "#4338CA" }}>📞 {p.telefono || "Sin teléfono"}{p.telefono && <CopyButton text={p.telefono} label="tel" />}</div>
                            <div style={{ color: "#4338CA" }}>🏥 {p.obraSocial || p.obra_social || "Particular"}</div>
                            {(p.fechaNac || p.fecha_nac) && calcEdad(p.fechaNac || p.fecha_nac) !== null && (
                              <div style={{ color: "#6366F1" }}>🎂 {calcEdad(p.fechaNac || p.fecha_nac)} años</div>
                            )}
                            {(p.derivadoPor || p.derivado_por) && (
                              <div style={{ color: "#6366F1" }}>👨‍⚕️ {p.derivadoPor || p.derivado_por}</div>
                            )}
                            {p.diagnostico && (
                              <div style={{ color: "#4338CA", gridColumn: "span 2" }}>🩺 {p.diagnostico}</div>
                            )}
                            {(p.audifono_der || p.audifono) && (
                              <div style={{ color: "#4338CA", gridColumn: "span 2" }}>👂 {p.audifono_der || p.audifono}{p.audifono_der_anio ? ` (${p.audifono_der_anio})` : ""}</div>
                            )}
                          </div>
                        </div>
                      ) : null; })()}
                    </div>
                  ) : (
                    <>
                      <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Buscar por nombre o DNI..."
                        value={busquedaEntrada} onChange={e => setBusquedaEntrada(e.target.value)} />
                      {busquedaEntrada.length > 1 && (
                        <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, maxHeight: 160, overflowY: "auto", background: "#fff" }}>
                          {pacientes.filter(p => `${p.nombre} ${p.apellido} ${p.dni||""}`.toLowerCase().includes(busquedaEntrada.toLowerCase())).length === 0
                            ? <div style={{ padding: "10px 14px", fontSize: 13, color: "#aaa" }}>No encontrado.
                                <button type="button" onClick={() => setMostrarNuevoPacEntrada(true)}
                                  style={{ background: "none", border: "none", color: "#4338CA", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>¿Crear nuevo?</button>
                              </div>
                            : pacientes.filter(p => `${p.nombre} ${p.apellido} ${p.dni||""}`.toLowerCase().includes(busquedaEntrada.toLowerCase())).map(p => (
                              <div key={p.id} onClick={() => { setFormEntrada(f => ({ ...f, paciente_id: p.id })); setBusquedaEntrada(""); }}
                                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", fontSize: 14 }}
                                onMouseEnter={e => e.currentTarget.style.background = "#F0F4FF"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <span style={{ fontWeight: 600 }}>{p.apellido}, {p.nombre}</span>
                                <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>DNI: {p.dni||"—"}</span>
                              </div>
                            ))
                          }
                        </div>
                      )}
                      {busquedaEntrada.length === 0 && (
                        <div style={{ fontSize: 12, color: "#aaa" }}>
                          Escribí para buscar · o dejá vacío para visita/reunión sin paciente
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>✦ Nuevo paciente</span>
                      <button type="button" onClick={() => { setMostrarNuevoPacEntrada(false); setFormNuevoPac(FORM_PAC_VACIO); }}
                        style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer" }}>← Volver</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="Nombre *"><input style={inputStyle} value={formNuevoPac.nombre} onChange={e => setFormNuevoPac(f => ({ ...f, nombre: e.target.value }))} /></Field>
                      <Field label="Apellido *"><input style={inputStyle} value={formNuevoPac.apellido} onChange={e => setFormNuevoPac(f => ({ ...f, apellido: e.target.value }))} /></Field>
                      <Field label="DNI"><input style={inputStyle} value={formNuevoPac.dni} onChange={e => setFormNuevoPac(f => ({ ...f, dni: e.target.value }))} /></Field>
                      <Field label="Teléfono"><input style={inputStyle} value={formNuevoPac.telefono} onChange={e => setFormNuevoPac(f => ({ ...f, telefono: e.target.value }))} /></Field>
                      <Field label="Obra social"><input style={inputStyle} value={formNuevoPac.obraSocial} onChange={e => setFormNuevoPac(f => ({ ...f, obraSocial: e.target.value }))} /></Field>
                      <Field label="Fecha de nac."><input type="date" style={inputStyle} value={formNuevoPac.fechaNac} onChange={e => setFormNuevoPac(f => ({ ...f, fechaNac: e.target.value }))} /></Field>
                    </div>
                    <Field label="Derivado por">
                      <DerivadoPorSelector value={formNuevoPac.derivadoPor || ""} onChange={v => setFormNuevoPac(f => ({ ...f, derivadoPor: v }))} />
                    </Field>
                    <button type="button" disabled={savingPac} onClick={async () => {
                      if (!formNuevoPac.nombre || !formNuevoPac.apellido) return alert("Nombre y apellido son obligatorios.");
                      setSavingPac(true);
                      try {
                        const np = await db.agregarPaciente({ ...formNuevoPac, historia: [], creado_por: usuario?.nombre || "" });
                        if (np) { setFormEntrada(f => ({ ...f, paciente_id: np.id })); }
                        setMostrarNuevoPacEntrada(false);
                        setFormNuevoPac(FORM_PAC_VACIO);
                      } finally { setSavingPac(false); }
                    }} style={{ ...btnPrimary, background: "linear-gradient(135deg,#065F46,#059669)", width: "100%", marginTop: 8 }}>
                      {savingPac ? "Creando..." : "✓ Crear y asignar al turno"}
                    </button>
                  </div>
                )}
              </div>
              <Field label="Prácticas">
                <SelectorPracticas
                  seleccionadas={Array.isArray(formEntrada.practicas) ? formEntrada.practicas : []}
                  onChange={practicas => setFormEntrada(f => ({ ...f, practicas: [...practicas] }))}
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Profesional">
                  <select style={selectStyle} value={formEntrada.profesional || ""} onChange={e => setFormEntrada(f => ({ ...f, profesional: e.target.value }))}>
                    <option value="">— Sin asignar —</option>
                    <option>Lic. Cecilia Miatello</option>
                    <option>Lic. Graciela Valles</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select style={selectStyle} value={formEntrada.estado || "pendiente"} onChange={e => setFormEntrada(f => ({ ...f, estado: e.target.value }))}>
                    {Object.entries(COLORES_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {tipoEntrada === "recordatorio" && (
            <>
              <Field label="Título *"><input style={inputStyle} value={formEntrada.titulo || ""} onChange={e => setFormEntrada(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Llamar a paciente, Control audífono..." /></Field>
              <Field label="Paciente (opcional)">
                <select style={selectStyle} value={formEntrada.paciente_id || ""} onChange={e => setFormEntrada(f => ({ ...f, paciente_id: e.target.value }))}>
                  <option value="">— General —</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
                </select>
              </Field>
            </>
          )}

          {tipoEntrada === "visita" && (
            <>
              <Field label="Título / Nombre *"><input style={inputStyle} value={formEntrada.titulo || formEntrada.motivo || ""} onChange={e => setFormEntrada(f => ({ ...f, titulo: e.target.value, motivo: e.target.value }))} placeholder="Ej: Reunión con Dr. Pérez..." /></Field>
              <Field label="Profesional">
                <select style={selectStyle} value={formEntrada.profesional || ""} onChange={e => setFormEntrada(f => ({ ...f, profesional: e.target.value }))}>
                  <option value="">— Sin asignar —</option>
                  <option>Lic. Cecilia Miatello</option>
                  <option>Lic. Graciela Valles</option>
                  <option value="ambas">Ambas profesionales</option>
                </select>
              </Field>
            </>
          )}

          {tipoEntrada === "bloqueo" && (
            <>
              <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 8, fontSize: 13, color: "#991B1B", fontWeight: 600 }}>
                🔒 Este horario quedará bloqueado — no se podrán asignar turnos
              </div>
              {modalEntrada?.editando?.notas?.startsWith("serie:") && (
                <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B", marginBottom: 6 }}>Este bloqueo es parte de una serie repetida</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={async () => {
                      if (window.confirm("¿Eliminar TODOS los bloqueos de esta serie?")) {
                        const serieId = modalEntrada.editando.notas;
                        const serie = data.turnos.filter(t => t.notas === serieId && t.estado === "bloqueado");
                        await Promise.all(serie.map(t => db.eliminarTurno(t.id)));
                        cerrarModal();
                      }
                    }} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      🗑️ Eliminar toda la serie ({data.turnos.filter(t => t.notas === modalEntrada.editando.notas && t.estado === "bloqueado").length} bloqueos)
                    </button>
                    <button type="button" onClick={async () => {
                      if (window.confirm("¿Eliminar solo este bloqueo?")) {
                        await db.eliminarTurno(modalEntrada.editando.id);
                        cerrarModal();
                      }
                    }} style={{ ...btnSecondary, fontSize: 12, padding: "5px 12px" }}>
                      Eliminar solo este día
                    </button>
                  </div>
                </div>
              )}
              <Field label="Motivo (opcional)">
                <input style={inputStyle} value={formEntrada.titulo || ""} onChange={e => setFormEntrada(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Capacitación, Feriado, Personal..." />
              </Field>
              <Field label="Profesional a bloquear *">
                <select style={selectStyle} value={formEntrada.profesional || ""} onChange={e => setFormEntrada(f => ({ ...f, profesional: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  <option>Lic. Cecilia Miatello</option>
                  <option>Lic. Graciela Valles</option>
                  <option value="ambas">Ambas profesionales</option>
                </select>
              </Field>
            </>
          )}

          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={formEntrada.notas || ""} onChange={e => setFormEntrada(f => ({ ...f, notas: e.target.value }))} /></Field>

          {/* Sección realizado */}
          {modalEntrada.editando && formEntrada.paciente_id && tipoEntrada === "turno" && formEntrada.estado === "realizado" && (
            <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46", marginBottom: 10 }}>✅ Registrar en Historia Clínica</div>
              <Field label="Prácticas realizadas">
                <SelectorPracticas
                  seleccionadas={Array.isArray(formEntrada.hcPracticas) ? formEntrada.hcPracticas : (Array.isArray(formEntrada.practicas) ? formEntrada.practicas : [])}
                  onChange={hcPracticas => setFormEntrada(f => ({ ...f, hcPracticas: [...hcPracticas] }))}
                />
              </Field>
              <Field label="Descripción / evolución">
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70, borderColor: "#BBF7D0" }}
                  value={formEntrada.hcDescripcion || ""}
                  onChange={e => setFormEntrada(f => ({ ...f, hcDescripcion: e.target.value }))}
                  placeholder="Evolución, indicaciones, observaciones..." />
              </Field>
            </div>
          )}

          {/* Botón ficha paciente destacado */}
          {formEntrada.paciente_id && tipoEntrada === "turno" && (
            <div style={{ marginBottom: 8 }}>
              <button type="button" onClick={() => { cerrarModal(); setFichaPacienteId(formEntrada.paciente_id); }}
                style={{ width: "100%", background: "linear-gradient(135deg, #1a6b6b, #145555)", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>📋</span>
                <span>Abrir ficha completa del paciente</span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>HC · Insumos · Ventas · Datos</span>
              </button>
            </div>
          )}

          {/* Acciones rápidas secundarias */}
          {modalEntrada.editando && formEntrada.paciente_id && tipoEntrada === "turno" && (
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={async () => {
                  const pac = pacientes.find(p => p.id === formEntrada.paciente_id);
                  const nombre = pac ? `${pac.apellido}, ${pac.nombre}` : "Paciente";
                  await db.agregarRecordatorio({ titulo: `${Array.isArray(formEntrada.practicas) && formEntrada.practicas[0] ? formEntrada.practicas[0] : "Consulta"} · ${nombre}`, fecha: formEntrada.fecha, hora: formEntrada.hora || "09:00", tipo: "control", paciente_id: formEntrada.paciente_id, descripcion: "", completado: false });
                  cerrarModal();
                  alert("✅ Pasado a recordatorio.");
                }} style={{ ...btnSecondary, padding: "5px 10px", fontSize: 12, background: "#EDE9FE", color: "#5B21B6" }}>🔔 Pasar a recordatorio</button>
              </div>

              {mostrarInsumos && (
                <div style={{ marginTop: 10, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                    <Field label="Insumo">
                      <select style={selectStyle} value={insumoActualT.nombre} onChange={e => setInsumoActualT(i => ({ ...i, nombre: e.target.value }))}>
                        {INSUMOS_LISTA.map(ins => <option key={ins}>{ins}</option>)}
                      </select>
                    </Field>
                    <Field label="Cant."><input type="number" min="1" style={inputStyle} value={insumoActualT.cantidad} onChange={e => setInsumoActualT(i => ({ ...i, cantidad: parseInt(e.target.value)||1 }))} /></Field>
                    <Field label="$"><input type="number" style={inputStyle} value={insumoActualT.precio} onChange={e => setInsumoActualT(i => ({ ...i, precio: e.target.value }))} /></Field>
                    <button type="button" onClick={() => {
                      const nuevo = { ...insumoActualT, id: uid() };
                      const nuevos = [...insumoFormT.insumos, nuevo];
                      const total = nuevos.reduce((s, i) => s + (parseFloat(i.precio)||0) * (parseInt(i.cantidad)||1), 0);
                      setInsumoFormT(f => ({ ...f, insumos: nuevos, total: total > 0 ? String(total) : f.total }));
                      setInsumoActualT({ nombre: "Pilas", cantidad: 1, precio: "" });
                    }} style={{ ...btnPrimary, padding: "8px 12px", marginBottom: 14 }}>+</button>
                  </div>
                  {insumoFormT.insumos.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", background: "#fff", borderRadius: 6, padding: "4px 8px", marginBottom: 4, fontSize: 12 }}>
                      <span>{i.nombre} x{i.cantidad}{i.precio ? ` · $${parseFloat(i.precio).toLocaleString("es-AR")}` : ""}</span>
                      <button type="button" onClick={() => {
                        const nuevos = insumoFormT.insumos.filter(x => x.id !== i.id);
                        const total = nuevos.reduce((s, x) => s + (parseFloat(x.precio)||0) * (parseInt(x.cantidad)||1), 0);
                        setInsumoFormT(f => ({ ...f, insumos: nuevos, total: total > 0 ? String(total) : "" }));
                      }} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer" }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                    <Field label="Total ($)"><input type="number" style={inputStyle} value={insumoFormT.total} onChange={e => setInsumoFormT(f => ({ ...f, total: e.target.value }))} /></Field>
                    <Field label="Seña ($)"><input type="number" style={inputStyle} value={insumoFormT.seña} onChange={e => {
                      const seña = e.target.value;
                      const total = parseFloat(insumoFormT.total) || 0;
                      const estado = total > 0 && parseFloat(seña) >= total ? "pagado" : "pendiente";
                      setInsumoFormT(f => ({ ...f, seña, estado }));
                    }} /></Field>
                    <Field label="Estado">
                      <select style={selectStyle} value={insumoFormT.estado} onChange={e => setInsumoFormT(f => ({ ...f, estado: e.target.value }))}>
                        <option value="pendiente">Pendiente</option>
                        <option value="pagado">Pagado</option>
                      </select>
                    </Field>
                  </div>
                  <button type="button" onClick={async () => {
                    if (insumoFormT.insumos.length === 0) return alert("Agregá insumos.");
                    await db.agregarCompra({ ...insumoFormT, paciente_id: formEntrada.paciente_id, total: parseFloat(insumoFormT.total)||0, seña: parseFloat(insumoFormT.seña)||0, fecha: formEntrada.fecha });
                    setMostrarInsumos(false);
                    setInsumoFormT({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
                    alert("✅ Insumo guardado.");
                  }} style={{ ...btnPrimary, width: "100%", marginTop: 8, background: "linear-gradient(135deg,#92400E,#D97706)" }}>
                    🛍️ Guardar insumo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Color personalizado — al pie */}
          <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6 }}>Color de la entrada</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {COLORES_PRESET.map(c => (
                <button key={c} type="button" onClick={() => setColorEntrada(colorEntrada === c ? "" : c)}
                  style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: colorEntrada === c ? "3px solid #1a1a2e" : "2px solid #fff", boxShadow: "0 0 0 1.5px #ccc", cursor: "pointer", padding: 0 }} />
              ))}
              {colorEntrada && <button type="button" onClick={() => setColorEntrada("")} style={{ fontSize: 11, background: "none", border: "none", color: "#DC2626", cursor: "pointer" }}>✕ Quitar color</button>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={cerrarModal} style={btnSecondary}>Cancelar</button>
            <button type="button" onClick={guardarEntrada} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ─── PACIENTES ────────────────────────────────────────────────────────────────
// ─── FICHA PACIENTE MODAL ─────────────────────────────────────────────────────
function FichaPaciente({ pacienteId, data, db, usuario, onClose }) {
  const [tab, setTab] = useState("hc");
  const [saving, setSaving] = useState(false);

  // HC state
  const [evModal, setEvModal] = useState(false);
  const [evForm, setEvForm] = useState({ fecha: today(), practicas: [], tipo: "", descripcion: "", profesional: "" });

  // Insumos state
  const [insumoForm, setInsumoForm] = useState({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
  const [insumoActual, setInsumoActual] = useState({ nombre: "Pilas", cantidad: 1, precio: "" });

  // Datos state
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});

  const pac = data.pacientes.find(p => p.id === pacienteId);
  if (!pac) return null;

  // Historial unificado
  const historia = [...(pac.historia || [])].reverse();
  const comprasPac = data.compras.filter(c => c.paciente_id === pacienteId).map(c => ({
    id: c.id, fecha: c.fecha, _tipo: "compra",
    descripcion: `${(c.insumos||[]).map(i => `${i.nombre} x${i.cantidad}`).join(", ")} · $${(parseFloat(c.total)||0).toLocaleString("es-AR")}`,
    tipo: c.estado === "pagado" ? "✅ Insumo pagado" : "🛍️ Insumo pendiente",
    notas: c.notas
  }));
  const ventasPac = data.ventas.filter(v => v.paciente_id === pacienteId).map(v => ({
    id: v.id, fecha: v.fecha, _tipo: "venta",
    descripcion: `${[v.marca_der, v.modelo_der].filter(Boolean).join(" ")||"Dispositivo"} · $${(parseFloat(v.precio)||0).toLocaleString("es-AR")}`,
    tipo: `🛒 ${COLORES_VENTA[v.estado]?.label || v.estado}`
  }));
  const todaHC = [...historia.map(e => ({...e,_tipo:"hc"})), ...comprasPac, ...ventasPac]
    .sort((a,b) => (b.fecha||"").localeCompare(a.fecha||""));

  async function agregarEvento() {
    if (!evForm.descripcion) return alert("Escribí una descripción.");
    setSaving(true);
    try {
      const practicas = Array.isArray(evForm.practicas) ? evForm.practicas : [];
      await db.agregarEntradaHC(pacienteId, {
        ...evForm,
        tipo: practicas.length > 0 ? practicas.join(", ") : (evForm.tipo || "Consulta"),
      });
      setEvModal(false);
      setEvForm({ fecha: today(), practicas: [], tipo: "", descripcion: "", profesional: "" });
    } finally { setSaving(false); }
  }

  function agregarInsumoItem() {
    if (!insumoActual.nombre) return;
    const nuevo = { ...insumoActual, id: uid() };
    setInsumoForm(f => {
      const nuevos = [...f.insumos, nuevo];
      const total = nuevos.reduce((s,i) => s + (parseFloat(i.precio)||0) * (parseInt(i.cantidad)||1), 0);
      return { ...f, insumos: nuevos, total: total > 0 ? String(total) : f.total };
    });
    setInsumoActual({ nombre: "Pilas", cantidad: 1, precio: "" });
  }

  async function guardarInsumo() {
    if (insumoForm.insumos.length === 0) return alert("Agregá al menos un insumo.");
    setSaving(true);
    try {
      await db.agregarCompra({ ...insumoForm, paciente_id: pacienteId, total: parseFloat(insumoForm.total)||0, seña: parseFloat(insumoForm.seña)||0 });
      setInsumoForm({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
      alert("✅ Insumo guardado.");
    } finally { setSaving(false); }
  }

  async function guardarDatos() {
    setSaving(true);
    try {
      await db.actualizarPaciente({ ...pac, ...form });
      setEditando(false);
      alert("✅ Datos actualizados.");
    } finally { setSaving(false); }
  }

  const coloresHC = { hc:{bg:"#F0FDF4",border:"#BBF7D0"}, compra:{bg:"#FEF3C7",border:"#FDE68A"}, venta:{bg:"#E0F2FE",border:"#BAE6FD"} };

  const TABS_FICHA = [
    { id: "hc",      label: "📋 Historia clínica",  color: "#065F46" },
    { id: "insumos", label: "🛍️ Insumos",            color: "#92400E" },
    { id: "ventas",  label: "🛒 Ventas",              color: "#1E40AF" },
    { id: "datos",   label: "👤 Datos del paciente",  color: "#4338CA" },
  ];

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "2px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e" }}>{pac.apellido}, {pac.nombre}</div>
            <div style={{ fontSize: 12, color: "#888", display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
              {pac.dni && <span>DNI: {pac.dni}</span>}
              {(pac.fechaNac || pac.fecha_nac) && calcEdad(pac.fechaNac || pac.fecha_nac) !== null && <span>🎂 {calcEdad(pac.fechaNac || pac.fecha_nac)} años</span>}
              {(pac.obraSocial || pac.obra_social) && <span>🏥 {pac.obraSocial || pac.obra_social}</span>}
              {pac.telefono && <span>📞 {pac.telefono}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: "pointer", color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB", padding: "0 16px", overflowX: "auto" }}>
          {TABS_FICHA.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", borderBottom: tab === t.id ? `3px solid ${t.color}` : "3px solid transparent",
              color: tab === t.id ? t.color : "#888", fontWeight: tab === t.id ? 700 : 400,
              padding: "10px 14px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap"
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {/* ── HISTORIA CLÍNICA ── */}
          {tab === "hc" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={() => setEvModal(!evModal)} style={{ ...btnPrimary, padding: "7px 14px", fontSize: 13 }}>
                  {evModal ? "▲ Cerrar" : "+ Nueva evolución"}
                </button>
              </div>
              {evModal && (
                <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <Field label="Fecha"><input type="date" style={inputStyle} value={evForm.fecha} onChange={e => setEvForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
                  <Field label="Prácticas">
                    <SelectorPracticas seleccionadas={evForm.practicas || []} onChange={practicas => setEvForm(f => ({ ...f, practicas }))} />
                  </Field>
                  <Field label="Descripción / evolución *">
                    <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} value={evForm.descripcion} onChange={e => setEvForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Evolución, indicaciones, observaciones..." />
                  </Field>
                  <Field label="Profesional">
                    <select style={selectStyle} value={evForm.profesional} onChange={e => setEvForm(f => ({ ...f, profesional: e.target.value }))}>
                      <option value="">— Sin asignar —</option>
                      <option>Lic. Cecilia Miatello</option>
                      <option>Lic. Graciela Valles</option>
                    </select>
                  </Field>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => setEvModal(false)} style={btnSecondary}>Cancelar</button>
                    <button onClick={agregarEvento} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar evolución"}</button>
                  </div>
                </div>
              )}
              {todaHC.length === 0
                ? <div style={{ textAlign: "center", color: "#aaa", padding: 30 }}>Sin entradas en la historia clínica</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {todaHC.map(ev => {
                    const c = coloresHC[ev._tipo] || coloresHC.hc;
                    return (
                      <div key={ev._tipo + ev.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{ev.tipo}</span>
                          <span style={{ fontSize: 11, color: "#888" }}>{formatFecha(ev.fecha)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#374151" }}>{ev.descripcion}</div>
                        {ev.profesional && <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{ev.profesional}</div>}
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          )}

          {/* ── INSUMOS ── */}
          {tab === "insumos" && (
            <div>
              <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 12 }}>🛍️ Cargar nuevo insumo</div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                  <Field label="Insumo">
                    <select style={selectStyle} value={insumoActual.nombre} onChange={e => setInsumoActual(i => ({ ...i, nombre: e.target.value }))}>
                      {INSUMOS_LISTA.map(ins => <option key={ins}>{ins}</option>)}
                    </select>
                  </Field>
                  <Field label="Cant."><input type="number" min="1" style={inputStyle} value={insumoActual.cantidad} onChange={e => setInsumoActual(i => ({ ...i, cantidad: parseInt(e.target.value)||1 }))} /></Field>
                  <Field label="Precio $"><input type="number" style={inputStyle} value={insumoActual.precio} onChange={e => setInsumoActual(i => ({ ...i, precio: e.target.value }))} /></Field>
                  <button type="button" onClick={agregarInsumoItem} style={{ ...btnPrimary, padding: "8px 12px", marginBottom: 14 }}>+</button>
                </div>
                {insumoForm.insumos.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {insumoForm.insumos.map(i => (
                      <div key={i.id} style={{ display: "flex", justifyContent: "space-between", background: "#fff", borderRadius: 6, padding: "5px 10px", marginBottom: 4, fontSize: 13 }}>
                        <span>{i.nombre} x{i.cantidad}{i.precio ? ` · $${parseFloat(i.precio).toLocaleString("es-AR")}` : ""}</span>
                        <button type="button" onClick={() => setInsumoForm(f => {
                          const nuevos = f.insumos.filter(x => x.id !== i.id);
                          const total = nuevos.reduce((s,x) => s + (parseFloat(x.precio)||0) * (parseInt(x.cantidad)||1), 0);
                          return { ...f, insumos: nuevos, total: total > 0 ? String(total) : "" };
                        })} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <Field label="Total ($)"><input type="number" style={inputStyle} value={insumoForm.total} onChange={e => setInsumoForm(f => ({ ...f, total: e.target.value }))} /></Field>
                  <Field label="Seña ($)"><input type="number" style={inputStyle} value={insumoForm.seña} onChange={e => {
                    const seña = e.target.value;
                    const total = parseFloat(insumoForm.total) || 0;
                    const estado = total > 0 && parseFloat(seña) >= total ? "pagado" : "pendiente";
                    setInsumoForm(f => ({ ...f, seña, estado }));
                  }} /></Field>
                  <Field label="Estado">
                    <select style={selectStyle} value={insumoForm.estado} onChange={e => setInsumoForm(f => ({ ...f, estado: e.target.value }))}>
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                    </select>
                  </Field>
                </div>
                <button onClick={guardarInsumo} disabled={saving} style={{ ...btnPrimary, width: "100%", marginTop: 10, background: "linear-gradient(135deg,#92400E,#D97706)" }}>
                  {saving ? "Guardando..." : "🛍️ Guardar insumo"}
                </button>
              </div>
              {/* Historial insumos */}
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Historial de insumos</div>
              {comprasPac.length === 0
                ? <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Sin insumos registrados</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.compras.filter(c => c.paciente_id === pacienteId).sort((a,b) => b.fecha.localeCompare(a.fecha)).map(c => (
                    <div key={c.id} style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{c.estado === "pagado" ? "✅ Pagado" : "🛍️ Pendiente"}</span>
                        <span style={{ fontSize: 11, color: "#888" }}>{formatFecha(c.fecha)}</span>
                      </div>
                      <div style={{ fontSize: 13 }}>{(c.insumos||[]).map(i => `${i.nombre} x${i.cantidad}`).join(", ")}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginTop: 4 }}>
                        Total: ${(parseFloat(c.total)||0).toLocaleString("es-AR")}
                        {parseFloat(c.seña) > 0 && ` · Señado: $${parseFloat(c.seña).toLocaleString("es-AR")}`}
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* ── VENTAS ── */}
          {tab === "ventas" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={() => window.alert("Usá la solapa Ventas para cargar un nuevo presupuesto para este paciente.")} style={btnPrimary}>+ Nueva venta</button>
              </div>
              {ventasPac.length === 0
                ? <div style={{ textAlign: "center", color: "#aaa", padding: 30 }}>Sin ventas registradas</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.ventas.filter(v => v.paciente_id === pacienteId).sort((a,b) => b.fecha.localeCompare(a.fecha)).map(v => {
                    const cv = COLORES_VENTA[v.estado] || { bg: "#F3F4F6", color: "#374151", label: v.estado };
                    const pagos = Array.isArray(v.pagos) ? v.pagos : [];
                    const totalPagado = pagos.reduce((s,p) => s + (parseFloat(p.monto)||0), 0);
                    const saldo = (parseFloat(v.precio)||0) - totalPagado;
                    return (
                      <div key={v.id} style={{ background: cv.bg, border: `1.5px solid ${cv.color}33`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <span style={{ background: cv.color, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{cv.label}</span>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{formatFecha(v.fecha)}</div>
                          </div>
                          {v.precio && <div style={{ fontWeight: 700, color: cv.color }}>${parseFloat(v.precio).toLocaleString("es-AR")}</div>}
                        </div>
                        {(v.marca_der || v.marca_izq) && (
                          <div style={{ fontSize: 13, marginTop: 6 }}>
                            {v.marca_der && <div>👂 Der: {[v.marca_der, v.modelo_der].filter(Boolean).join(" ")}</div>}
                            {v.marca_izq && <div>👂 Izq: {[v.marca_izq, v.modelo_izq].filter(Boolean).join(" ")}</div>}
                          </div>
                        )}
                        {saldo > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginTop: 4 }}>💰 Saldo: ${saldo.toLocaleString("es-AR")}</div>}
                        {pagos.length > 0 && <div style={{ fontSize: 11, color: "#888" }}>{pagos.length} pago{pagos.length > 1 ? "s" : ""} registrado{pagos.length > 1 ? "s" : ""}</div>}
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          )}

          {/* ── DATOS DEL PACIENTE ── */}
          {tab === "datos" && (
            <div>
              {!editando ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <button onClick={() => { setForm({ nombre: pac.nombre||"", apellido: pac.apellido||"", dni: pac.dni||"", telefono: pac.telefono||"", email: pac.email||"", fechaNac: pac.fechaNac||pac.fecha_nac||"", obraSocial: pac.obraSocial||pac.obra_social||"", nroAfiliado: pac.nroAfiliado||pac.nro_afiliado||"", derivadoPor: pac.derivadoPor||pac.derivado_por||"", diagnostico: pac.diagnostico||"", antecedentes: pac.antecedentes||"", notas: pac.notas||"", audifono_der: pac.audifono_der||pac.audifono||"", audifono_der_anio: pac.audifono_der_anio||"", audifono_izq: pac.audifono_izq||"", audifono_izq_anio: pac.audifono_izq_anio||"" }); setEditando(true); }} style={{ ...btnSecondary, background: "#EEF2FF", color: "#4338CA" }}>✏️ Editar datos</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      ["Nombre", pac.nombre], ["Apellido", pac.apellido],
                      ["DNI", pac.dni], ["Teléfono", pac.telefono],
                      ["Email", pac.email], ["Obra social", pac.obraSocial || pac.obra_social],
                      ["Nro. afiliado", pac.nroAfiliado || pac.nro_afiliado],
                      ["Fecha nac.", pac.fechaNac || pac.fecha_nac ? `${formatFecha(pac.fechaNac || pac.fecha_nac)} (${calcEdad(pac.fechaNac || pac.fecha_nac)} años)` : "—"],
                      ["Derivado por", pac.derivadoPor || pac.derivado_por],
                      ["Diagnóstico", pac.diagnostico],
                    ].map(([label, val]) => val ? (
                      <div key={label} style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, color: "#1a1a2e" }}>{val}</div>
                      </div>
                    ) : null)}
                  </div>
                  {/* Audífonos */}
                  {(pac.audifono_der || pac.audifono_izq || pac.audifono) && (
                    <div style={{ background: "#EEF2FF", borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", marginBottom: 6, textTransform: "uppercase" }}>👂 Audífonos actuales</div>
                      {(pac.audifono_der || pac.audifono) && <div style={{ fontSize: 13 }}>Der: {pac.audifono_der || pac.audifono}{pac.audifono_der_anio ? ` (${pac.audifono_der_anio})` : ""}</div>}
                      {pac.audifono_izq && <div style={{ fontSize: 13 }}>Izq: {pac.audifono_izq}{pac.audifono_izq_anio ? ` (${pac.audifono_izq_anio})` : ""}</div>}
                    </div>
                  )}
                  {pac.antecedentes && (
                    <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>Antecedentes</div>
                      <div style={{ fontSize: 13 }}>{pac.antecedentes}</div>
                    </div>
                  )}
                  {pac.notas && (
                    <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>Notas</div>
                      <div style={{ fontSize: 13 }}>{pac.notas}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Nombre"><input style={inputStyle} value={form.nombre||""} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} /></Field>
                    <Field label="Apellido"><input style={inputStyle} value={form.apellido||""} onChange={e => setForm(f => ({...f, apellido: e.target.value}))} /></Field>
                    <Field label="DNI"><input style={inputStyle} value={form.dni||""} onChange={e => setForm(f => ({...f, dni: e.target.value}))} /></Field>
                    <Field label="Teléfono"><input style={inputStyle} value={form.telefono||""} onChange={e => setForm(f => ({...f, telefono: e.target.value}))} /></Field>
                    <Field label="Email"><input style={inputStyle} value={form.email||""} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></Field>
                    <Field label="Fecha nac."><input type="date" style={inputStyle} value={form.fechaNac||form.fecha_nac||""} onChange={e => setForm(f => ({...f, fechaNac: e.target.value}))} /></Field>
                    <Field label="Obra social"><input style={inputStyle} value={form.obraSocial||form.obra_social||""} onChange={e => setForm(f => ({...f, obraSocial: e.target.value}))} /></Field>
                    <Field label="Nro. afiliado"><input style={inputStyle} value={form.nroAfiliado||form.nro_afiliado||""} onChange={e => setForm(f => ({...f, nroAfiliado: e.target.value}))} /></Field>
                  </div>
                  <Field label="Derivado por"><DerivadoPorSelector value={form.derivadoPor||form.derivado_por||""} onChange={v => setForm(f => ({...f, derivadoPor: v}))} /></Field>
                  <Field label="Diagnóstico"><input style={inputStyle} value={form.diagnostico||""} onChange={e => setForm(f => ({...f, diagnostico: e.target.value}))} /></Field>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", margin: "12px 0 8px" }}>👂 Audífonos</div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 80px auto 1fr 80px", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Der:</span>
                    <input style={inputStyle} value={form.audifono_der||""} onChange={e => setForm(f => ({...f, audifono_der: e.target.value}))} placeholder="Marca/Modelo" />
                    <input style={inputStyle} value={form.audifono_der_anio||""} onChange={e => setForm(f => ({...f, audifono_der_anio: e.target.value}))} placeholder="Año" />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Izq:</span>
                    <input style={inputStyle} value={form.audifono_izq||""} onChange={e => setForm(f => ({...f, audifono_izq: e.target.value}))} placeholder="Marca/Modelo" />
                    <input style={inputStyle} value={form.audifono_izq_anio||""} onChange={e => setForm(f => ({...f, audifono_izq_anio: e.target.value}))} placeholder="Año" />
                  </div>
                  <Field label="Antecedentes"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.antecedentes||""} onChange={e => setForm(f => ({...f, antecedentes: e.target.value}))} /></Field>
                  <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.notas||""} onChange={e => setForm(f => ({...f, notas: e.target.value}))} /></Field>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                    <button onClick={() => setEditando(false)} style={btnSecondary}>Cancelar</button>
                    <button onClick={guardarDatos} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar cambios"}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function Pacientes({ data, db, usuario, pacienteAEditar, onPacienteEditado }) {
  const [modal, setModal] = useState(null);
  const [verHC, setVerHC] = useState(null);
  const [verRapido, setVerRapido] = useState(null);
  const [fichaAbierta, setFichaAbierta] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "", apellido: "", dni: "", fechaNac: "", telefono: "", email: "",
    obraSocial: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "",
    derivadoPor: "", audifono: "",
    audifono_der: "", audifono_der_anio: "", audifono_izq: "", audifono_izq_anio: "",
    etiquetas: []
  });
  const [evModal, setEvModal] = useState(false);
  const [evForm, setEvForm] = useState({ fecha: today(), tipo: "consulta", descripcion: "", profesional: "" });
  const [insumoModal, setInsumoModal] = useState(false);
  const [ventaModal, setVentaModal] = useState(false);
  const [ventaForm, setVentaForm] = useState({ fecha: today(), marca_der: "", modelo_der: "", marca_izq: "", modelo_izq: "", precio: "", obraSocialCubre: "", condicion_pago_os: "", saldoPaciente: "", condicion_pago_paciente: "", estado: "presupuestado", observaciones: "" });
  const [editPacModal, setEditPacModal] = useState(false);
  const [insumoForm, setInsumoForm] = useState({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
  const [insumoActual, setInsumoActual] = useState({ nombre: "Pilas", cantidad: 1, precio: "" });

  const [etiquetasCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem("etiquetas_custom") || "[]"); } catch { return []; }
  });
  const todasEtiquetas = [...ETIQUETAS_DEFAULT, ...etiquetasCustom];

  const pacientes = data.pacientes.filter(p => {
    const matchBusqueda = busqueda === "" || `${p.nombre} ${p.apellido} ${p.dni || ""}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchEtiqueta = filtroEtiqueta === "" || (p.etiquetas || []).includes(filtroEtiqueta);
    return matchBusqueda && matchEtiqueta;
  });

  async function guardar() {
    if (!form.nombre || !form.apellido) return alert("Nombre y apellido son obligatorios.");
    setSaving(true);
    try {
      const etiquetas = Array.isArray(form.etiquetas) ? [...form.etiquetas] : [];
      const payload = { ...form, etiquetas, email: form.email || "" };
      if (modal === "nuevo") {
        await db.agregarPaciente({ ...payload, historia: [] });
      } else {
        const pacExistente = data.pacientes.find(p => p.id === modal) || {};
        await db.actualizarPaciente({ ...pacExistente, ...payload, etiquetas });
      }
      setModal(null);
    } finally { setSaving(false); }
  }

  function editar(p) {
    setForm({
      nombre: p.nombre, apellido: p.apellido, dni: p.dni || "", fechaNac: p.fechaNac || p.fecha_nac || "",
      telefono: p.telefono || "", email: p.email || "", obraSocial: p.obraSocial || p.obra_social || "",
      nroAfiliado: p.nroAfiliado || p.nro_afiliado || "", diagnostico: p.diagnostico || "",
      antecedentes: p.antecedentes || "", notas: p.notas || "",
      derivadoPor: p.derivadoPor || p.derivado_por || "",
      audifono: p.audifono || "",
      audifono_der: p.audifono_der || p.audifono || "",
      audifono_der_anio: p.audifono_der_anio || "",
      audifono_izq: p.audifono_izq || "",
      audifono_izq_anio: p.audifono_izq_anio || "",
      etiquetas: Array.isArray(p.etiquetas) ? [...p.etiquetas] : []
    });
    setModal(p.id);
  }

  useEffect(() => {
    if (pacienteAEditar) {
      const p = data.pacientes.find(x => x.id === pacienteAEditar);
      if (p) { editar(p); if (onPacienteEditado) onPacienteEditado(); }
    }
  }, [pacienteAEditar]);

  async function agregarEvento() {
    if (!evForm.descripcion) return alert("Escribí una descripción.");
    setSaving(true);
    try {
      const practicas = Array.isArray(evForm.practicas) ? evForm.practicas : [];
      await db.agregarEntradaHC(verHC, {
        ...evForm,
        tipo: practicas.length > 0 ? practicas.join(", ") : (evForm.tipo || "Consulta"),
      });
      setEvModal(false);
      setEvForm({ fecha: today(), tipo: "consulta", practicas: [], descripcion: "", profesional: "" });
    } finally { setSaving(false); }
  }

  function agregarInsumoItem() {
    if (!insumoActual.nombre) return;
    const nuevo = { ...insumoActual, id: uid() };
    setInsumoForm(f => {
      const nuevos = [...f.insumos, nuevo];
      const total = nuevos.reduce((s, i) => s + (parseFloat(i.precio)||0) * (parseInt(i.cantidad)||1), 0);
      return { ...f, insumos: nuevos, total: total > 0 ? String(total) : f.total };
    });
    setInsumoActual({ nombre: "Pilas", cantidad: 1, precio: "" });
  }

  function quitarInsumoItem(id) {
    setInsumoForm(f => {
      const nuevos = f.insumos.filter(i => i.id !== id);
      const nuevoTotal = nuevos.reduce((s, i) => s + (parseFloat(i.precio)||0) * (parseInt(i.cantidad)||1), 0);
      return { ...f, insumos: nuevos, total: nuevoTotal > 0 ? String(nuevoTotal) : "" };
    });
  }

  async function guardarInsumo() {
    if (!verHC) return;
    if (insumoForm.insumos.length === 0) return alert("Agregá al menos un insumo.");
    setSaving(true);
    try {
      await db.agregarCompra({
        ...insumoForm,
        paciente_id: verHC,
        total: parseFloat(insumoForm.total) || 0,
        seña: parseFloat(insumoForm.seña) || 0,
      });
      setInsumoModal(false);
      setInsumoForm({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
    } finally { setSaving(false); }
  }

  async function guardarVentaHC() {
    if (!verHC) return;
    setSaving(true);
    try {
      await db.agregarVenta({ ...ventaForm, paciente_id: verHC });
      setVentaModal(false);
      setVentaForm({ fecha: today(), marca_der: "", modelo_der: "", marca_izq: "", modelo_izq: "", precio: "", obraSocialCubre: "", condicion_pago_os: "", saldoPaciente: "", condicion_pago_paciente: "", estado: "presupuestado", observaciones: "" });
    } finally { setSaving(false); }
  }

  async function guardarEditPac() {
    const pac = data.pacientes.find(p => p.id === verHC);
    if (!pac) return;
    setSaving(true);
    try {
      await db.actualizarPaciente({ ...pac, ...form });
      setEditPacModal(false);
    } finally { setSaving(false); }
  }

  const pacienteHC = data.pacientes.find(p => p.id === verHC);
  const TIPO_HC = { consulta: "🩺", estudio: "📋", adaptacion: "👂", venta: "🛒", otro: "📌" };

  return (
    <div>
      {/* Barra de búsqueda y filtros */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input style={{ ...inputStyle, maxWidth: 300 }} placeholder="Buscar por nombre o DNI..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {/* Filtro por etiqueta */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <button onClick={() => setFiltroEtiqueta("")} style={{
              background: filtroEtiqueta === "" ? "#1a1a2e" : "#F3F4F6",
              color: filtroEtiqueta === "" ? "#fff" : "#6B7280",
              border: "none", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer"
            }}>Todos</button>
            {todasEtiquetas.map(e => (
              <button key={e.id} onClick={() => setFiltroEtiqueta(filtroEtiqueta === e.id ? "" : e.id)} style={{
                background: filtroEtiqueta === e.id ? e.bg : "#F3F4F6",
                color: filtroEtiqueta === e.id ? e.color : "#6B7280",
                border: filtroEtiqueta === e.id ? `1.5px solid ${e.color}44` : "1.5px solid #E5E7EB",
                borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}>{e.label}</button>
            ))}
          </div>
        </div>
        <button onClick={() => {
          setForm({ nombre: "", apellido: "", dni: "", fechaNac: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "", derivadoPor: "", audifono: "", etiquetas: [] });
          setModal("nuevo");
        }} style={btnPrimary}>+ Nuevo paciente</button>
      </div>

      {pacientes.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>👤</div><div>No hay pacientes</div></div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {pacientes.map(p => {
            const abierto = verRapido === p.id;
            const turnosPac = data.turnos.filter(t => t.paciente_id === p.id).sort((a,b) => (b.fecha+b.hora).localeCompare(a.fecha+a.hora));
            const proximoTurno = data.turnos.filter(t => t.paciente_id === p.id && t.fecha >= today()).sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora))[0];
            const saldo = data.compras.filter(c => c.paciente_id === p.id && c.estado === "pendiente").reduce((s,c) => s + ((parseFloat(c.total)||0) - (parseFloat(c.seña)||0)), 0);
            return (
            <div key={p.id} style={{ background: "#fff", border: `1.5px solid ${abierto ? "#6366F1" : "#F0F0F0"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s" }}>
              {/* Header siempre visible — click para expandir */}
              <div onClick={() => setVerRapido(abierto ? null : p.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: abierto ? "#EEF2FF" : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#4338CA", flexShrink: 0, border: abierto ? "2px solid #6366F1" : "2px solid #E5E7EB" }}>
                  {(p.nombre?.[0] || "?")}{(p.apellido?.[0] || "?")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{p.apellido}, {p.nombre}</div>
                  <div style={{ fontSize: 12, color: "#888", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {p.dni && <span>DNI: {p.dni}</span>}
                    {(p.obraSocial || p.obra_social) && <span>🏥 {p.obraSocial || p.obra_social}</span>}
                    {(p.fechaNac || p.fecha_nac) && (p.fechaNac || p.fecha_nac) && <span>{calcEdad(p.fechaNac || p.fecha_nac) ?? ""} años</span>}
                    {proximoTurno && <span style={{ color: "#4338CA" }}>📅 {formatFecha(proximoTurno.fecha)} {proximoTurno.hora?.slice(0,5)}</span>}
                    {saldo > 0 && <span style={{ color: "#D97706", fontWeight: 600 }}>💰 Debe ${saldo.toLocaleString("es-AR")}</span>}
                  </div>
                </div>
                {/* Etiquetas */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 120 }}>
                  {(p.etiquetas || []).slice(0,2).map(eid => {
                    const et = getEtiquetaInfo(eid);
                    return et ? <EtiquetaBadge key={eid} etiqueta={et} /> : null;
                  })}
                </div>
                <span style={{ fontSize: 16, color: "#aaa", flexShrink: 0 }}>{abierto ? "▲" : "▼"}</span>
              </div>

              {/* Panel expandido con todos los datos */}
              {abierto && (
                <div style={{ borderTop: "1px solid #F0F0F0", padding: "14px 16px", background: "#FAFBFF" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, alignItems: "start" }}>
                    {/* Contacto */}
                    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #F0F0F0" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", marginBottom: 6, textTransform: "uppercase" }}>Contacto</div>
                      <div style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                        📞 {p.telefono || "—"} {p.telefono && <CopyButton text={p.telefono} label="tel" />}
                      </div>
                      <div style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>
                        ✉️ {p.email || "—"} {p.email && <CopyButton text={p.email} label="email" />}
                      </div>
                    </div>
                    {/* Cobertura */}
                    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #F0F0F0" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", marginBottom: 6, textTransform: "uppercase" }}>Cobertura</div>
                      <div style={{ fontSize: 13, color: "#555", marginBottom: 3 }}>🏥 {p.obraSocial || p.obra_social || "Particular"}</div>
                      {(p.nroAfiliado || p.nro_afiliado) && <div style={{ fontSize: 12, color: "#888" }}>Nro: {p.nroAfiliado || p.nro_afiliado}</div>}
                      {(p.fechaNac || p.fecha_nac) && (
                        <div style={{ fontSize: 12, color: "#888" }}>
                          Nac: {formatFecha(p.fechaNac || p.fecha_nac)}
                          {calcEdad(p.fechaNac || p.fecha_nac) !== null ? ` · ${calcEdad(p.fechaNac || p.fecha_nac)} años` : ""}
                        </div>
                      )}
                    </div>
                    {/* Clínico */}
                    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #F0F0F0" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", marginBottom: 6, textTransform: "uppercase" }}>Clínico</div>
                      {p.diagnostico && <div style={{ fontSize: 13, color: "#555", marginBottom: 3 }}>🩺 {p.diagnostico}</div>}
                      {p.audifono && <div style={{ fontSize: 13, color: "#555", marginBottom: 3 }}>👂 {p.audifono}</div>}
                      {(p.derivadoPor || p.derivado_por) && <div style={{ fontSize: 12, color: "#888" }}>Derivado: {p.derivadoPor || p.derivado_por}</div>}
                      {!p.diagnostico && !p.audifono && <div style={{ fontSize: 12, color: "#aaa" }}>Sin datos clínicos</div>}
                    </div>
                    {/* Turnos */}
                    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #F0F0F0" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", marginBottom: 6, textTransform: "uppercase" }}>Turnos ({turnosPac.length})</div>
                      {turnosPac.slice(0,3).map(t => (
                        <div key={t.id} style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>
                          <span style={{ fontWeight: 600 }}>{formatFecha(t.fecha)}</span> {t.hora?.slice(0,5)} · {t.motivo || (Array.isArray(t.practicas) && t.practicas[0]) || "—"}
                        </div>
                      ))}
                      {turnosPac.length === 0 && <div style={{ fontSize: 12, color: "#aaa" }}>Sin turnos</div>}
                    </div>
                  </div>

                  {/* Antecedentes y notas si existen */}
                  {(p.antecedentes || p.notas) && (
                    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #F0F0F0", marginBottom: 12 }}>
                      {p.antecedentes && <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Antecedentes:</span> {p.antecedentes}</div>}
                      {p.notas && <div style={{ fontSize: 13, color: "#555" }}><span style={{ fontWeight: 600 }}>Notas:</span> {p.notas}</div>}
                    </div>
                  )}

                  {/* Etiquetas completas */}
                  {(p.etiquetas || []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                      {(p.etiquetas || []).map(eid => {
                        const et = getEtiquetaInfo(eid);
                        return et ? <EtiquetaBadge key={eid} etiqueta={et} /> : null;
                      })}
                    </div>
                  )}

                  {/* Botones */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setFichaAbierta(p.id)} style={{ ...btnPrimary, padding: "7px 12px", fontSize: 12, flex: 1 }}>📋 Ficha paciente</button>
                    <button onClick={() => editar(p)} style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12 }}>✏️ Editar</button>
                    <button onClick={() => { if (window.confirm("¿Eliminar?")) db.eliminarPaciente(p.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>}

      {/* Modal nuevo/editar paciente */}
      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo paciente" : "Editar paciente"} onClose={() => setModal(null)}>

          {/* ── Datos personales ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Datos personales</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <Field label="Nombre *"><input style={inputStyle} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
            <Field label="Apellido *"><input style={inputStyle} value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} /></Field>
            <Field label="DNI"><input style={inputStyle} value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} /></Field>
            <Field label="Fecha de nacimiento"><input type="date" style={inputStyle} value={form.fechaNac} onChange={e => setForm(f => ({ ...f, fechaNac: e.target.value }))} /></Field>
            <Field label="Teléfono"><input style={inputStyle} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></Field>
            <Field label="Email"><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ejemplo@mail.com" /></Field>
          </div>

          {/* ── Cobertura ── */}
          <div style={{ height: 1, background: "#F0F0F0", margin: "12px 0 14px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Cobertura</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <Field label="Obra social"><input style={inputStyle} value={form.obraSocial} onChange={e => setForm(f => ({ ...f, obraSocial: e.target.value }))} /></Field>
            <Field label="Nro. afiliado"><input style={inputStyle} value={form.nroAfiliado} onChange={e => setForm(f => ({ ...f, nroAfiliado: e.target.value }))} /></Field>
          </div>

          {/* ── Derivación ── */}
          <div style={{ height: 1, background: "#F0F0F0", margin: "12px 0 14px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Derivación</div>
          <Field label="Derivado por">
            <DerivadoPorSelector
              value={form.derivadoPor || ""}
              onChange={v => setForm(f => ({ ...f, derivadoPor: v }))}
            />
          </Field>

          {/* ── Clínico ── */}
          <div style={{ height: 1, background: "#F0F0F0", margin: "12px 0 14px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Datos clínicos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Diagnóstico audiológico"><input style={inputStyle} value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} /></Field>
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>👂 Audífonos actuales</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 1fr 1fr 80px", gap: 8 }}>
                <div style={{ gridColumn: "span 6", display: "grid", gridTemplateColumns: "auto 1fr 80px auto 1fr 80px", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>🦻 Der:</span>
                  <input style={inputStyle} value={form.audifono_der || ""} onChange={e => setForm(f => ({ ...f, audifono_der: e.target.value }))} placeholder="Marca / Modelo" />
                  <input style={inputStyle} value={form.audifono_der_anio || ""} onChange={e => setForm(f => ({ ...f, audifono_der_anio: e.target.value }))} placeholder="Año" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>🦻 Izq:</span>
                  <input style={inputStyle} value={form.audifono_izq || ""} onChange={e => setForm(f => ({ ...f, audifono_izq: e.target.value }))} placeholder="Marca / Modelo" />
                  <input style={inputStyle} value={form.audifono_izq_anio || ""} onChange={e => setForm(f => ({ ...f, audifono_izq_anio: e.target.value }))} placeholder="Año" />
                </div>
              </div>
            </div>
          </div>
          <Field label="Antecedentes"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.antecedentes} onChange={e => setForm(f => ({ ...f, antecedentes: e.target.value }))} /></Field>
          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>

          {/* ── Etiquetas ── */}
          <div style={{ height: 1, background: "#F0F0F0", margin: "12px 0 14px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Etiquetas</div>
          <EtiquetasInline
            seleccionadas={form.etiquetas || []}
            onChange={nuevas => setForm(f => ({ ...f, etiquetas: [...nuevas] }))}
          />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar paciente"}</button>
          </div>
        </Modal>
      )}

      {/* Historia clínica */}
      {fichaAbierta && (
        <FichaPaciente
          pacienteId={fichaAbierta}
          data={data}
          db={db}
          usuario={usuario}
          onClose={() => setFichaAbierta(null)}
        />
      )}

      {verHC && pacienteHC && (
        <Modal title={`Historia clínica · ${pacienteHC.apellido}, ${pacienteHC.nombre}`} onClose={() => setVerHC(null)}>
          <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
              <div><b>DNI:</b> {pacienteHC.dni || "—"}</div>
              <div><b>Nacimiento:</b> {formatFecha(pacienteHC.fechaNac || pacienteHC.fecha_nac)}{calcEdad(pacienteHC.fechaNac || pacienteHC.fecha_nac) !== null ? ` (${calcEdad(pacienteHC.fechaNac || pacienteHC.fecha_nac)} años)` : ""}</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <b>Teléfono:</b>&nbsp;{pacienteHC.telefono || "—"}
                {pacienteHC.telefono && <CopyButton text={pacienteHC.telefono} label="teléfono" />}
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <b>Email:</b>&nbsp;{pacienteHC.email || "—"}
                {pacienteHC.email && <CopyButton text={pacienteHC.email} label="email" />}
              </div>
              <div><b>Obra social:</b> {pacienteHC.obraSocial || "Particular"}</div>
              {pacienteHC.diagnostico && <div style={{ gridColumn: "span 2" }}><b>Diagnóstico:</b> {pacienteHC.diagnostico}</div>}
            </div>
            {(pacienteHC.etiquetas || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {(pacienteHC.etiquetas || []).map(eid => {
                  const et = getEtiquetaInfo(eid);
                  return et ? <EtiquetaBadge key={eid} etiqueta={et} /> : null;
                })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Evolución clínica</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => { editar(data.pacientes.find(p => p.id === verHC)); setEditPacModal(true); }} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12, background: "#EEF2FF", color: "#4338CA", border: "1.5px solid #C7D2FE" }}>✏️ Editar paciente</button>
              <button onClick={() => setVentaModal(true)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12, background: "#D1FAE5", color: "#065F46", border: "1.5px solid #A7F3D0" }}>🛒 Cargar venta</button>
              <button onClick={() => setInsumoModal(true)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12, background: "#FEF3C7", color: "#92400E", border: "1.5px solid #FDE68A" }}>🛍️ Cargar insumo</button>
              <button onClick={() => setEvModal(true)} style={{ ...btnPrimary, padding: "6px 14px", fontSize: 13 }}>+ Entrada</button>
            </div>
          </div>
          {(() => {
            // Unify all activity for this patient
            const entradas = (pacienteHC.historia || []).map(e => ({ ...e, _tipo: "hc" }));
            const comprasPac = data.compras.filter(c => c.paciente_id === pacienteHC.id).map(c => ({
              id: c.id, fecha: c.fecha, _tipo: "compra",
              descripcion: `Insumos: ${(c.insumos||[]).map(i => i.nombre).join(", ")} · Total: $${(parseFloat(c.total)||0).toLocaleString("es-AR")}`,
              tipo: c.estado === "pagado" ? "✅ Insumo pagado" : "🛍️ Insumo pendiente"
            }));
            const recsPac = data.recordatorios.filter(r => r.paciente_id === pacienteHC.id).map(r => ({
              id: r.id, fecha: r.fecha, _tipo: "rec",
              descripcion: r.descripcion || r.titulo,
              tipo: `🔔 ${r.titulo}`
            }));
            const ventasPac = data.ventas.filter(v => v.paciente_id === pacienteHC.id).map(v => ({
              id: v.id, fecha: v.fecha, _tipo: "venta",
              descripcion: `${v.dispositivo || ""} ${v.marca || ""} ${v.modelo || ""} · $${(parseFloat(v.precio)||0).toLocaleString("es-AR")}`,
              tipo: `🛒 Venta: ${v.estado}`
            }));
            const todo = [...entradas, ...comprasPac, ...recsPac, ...ventasPac]
              .filter(e => e.fecha)
              .sort((a, b) => b.fecha.localeCompare(a.fecha));
            if (todo.length === 0) return <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Sin entradas aún</div>;
            const colores = { hc: { bg: "#F0FDF4", border: "#BBF7D0", icon: "🩺" }, compra: { bg: "#FEF3C7", border: "#FDE68A", icon: "🛍️" }, rec: { bg: "#EDE9FE", border: "#C4B5FD", icon: "🔔" }, venta: { bg: "#E0F2FE", border: "#BAE6FD", icon: "🛒" } };
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todo.map(ev => {
                  const c = colores[ev._tipo] || colores.hc;
                  return (
                    <div key={ev._tipo + ev.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{ev.tipo}</span>
                        <span style={{ fontSize: 12, color: "#888" }}>{formatFecha(ev.fecha)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14 }}>{ev.descripcion}</p>
                      {ev.profesional && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{ev.profesional}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {/* Modal editar paciente desde HC */}
          {editPacModal && (
            <div style={{ marginTop: 16, background: "#EEF2FF", border: "1.5px solid #C7D2FE", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 12px", color: "#4338CA" }}>✏️ Editar datos del paciente</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Nombre *"><input style={inputStyle} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
                <Field label="Apellido *"><input style={inputStyle} value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} /></Field>
                <Field label="Teléfono"><input style={inputStyle} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></Field>
                <Field label="Email"><input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
                <Field label="Obra social"><input style={inputStyle} value={form.obraSocial} onChange={e => setForm(f => ({ ...f, obraSocial: e.target.value }))} /></Field>
                <Field label="Nro. afiliado"><input style={inputStyle} value={form.nroAfiliado} onChange={e => setForm(f => ({ ...f, nroAfiliado: e.target.value }))} /></Field>
                <Field label="Audífono actual"><input style={inputStyle} value={form.audifono || ""} onChange={e => setForm(f => ({ ...f, audifono: e.target.value }))} /></Field>
                <Field label="Fecha de nac."><input type="date" style={inputStyle} value={form.fechaNac} onChange={e => setForm(f => ({ ...f, fechaNac: e.target.value }))} /></Field>
              </div>
              <Field label="Derivado por">
                <DerivadoPorSelector value={form.derivadoPor || ""} onChange={v => setForm(f => ({ ...f, derivadoPor: v }))} />
              </Field>
              <Field label="Diagnóstico"><input style={inputStyle} value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} /></Field>
              <Field label="Antecedentes"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={form.antecedentes} onChange={e => setForm(f => ({ ...f, antecedentes: e.target.value }))} /></Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => setEditPacModal(false)} style={btnSecondary}>Cancelar</button>
                <button onClick={guardarEditPac} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </div>
          )}

          {/* Modal venta desde HC */}
          {ventaModal && (
            <div style={{ marginTop: 16, background: "#ECFDF5", border: "1.5px solid #A7F3D0", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 12px", color: "#065F46" }}>🛒 Nueva venta / presupuesto</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Fecha"><input type="date" style={inputStyle} value={ventaForm.fecha} onChange={e => setVentaForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
                <Field label="Estado">
                  <select style={selectStyle} value={ventaForm.estado} onChange={e => setVentaForm(f => ({ ...f, estado: e.target.value }))}>
                    {Object.entries(COLORES_VENTA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", margin: "8px 0 6px" }}>👂 Oído derecho</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Marca"><input style={inputStyle} value={ventaForm.marca_der} onChange={e => setVentaForm(f => ({ ...f, marca_der: e.target.value }))} /></Field>
                <Field label="Modelo"><input style={inputStyle} value={ventaForm.modelo_der} onChange={e => setVentaForm(f => ({ ...f, modelo_der: e.target.value }))} /></Field>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", margin: "8px 0 6px" }}>👂 Oído izquierdo</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Marca"><input style={inputStyle} value={ventaForm.marca_izq} onChange={e => setVentaForm(f => ({ ...f, marca_izq: e.target.value }))} /></Field>
                <Field label="Modelo"><input style={inputStyle} value={ventaForm.modelo_izq} onChange={e => setVentaForm(f => ({ ...f, modelo_izq: e.target.value }))} /></Field>
              </div>
              <Field label="Precio total ($)"><input type="number" style={inputStyle} value={ventaForm.precio} onChange={e => setVentaForm(f => ({ ...f, precio: e.target.value }))} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Cobertura OS ($)"><input type="number" style={inputStyle} value={ventaForm.obraSocialCubre} onChange={e => setVentaForm(f => ({ ...f, obraSocialCubre: e.target.value }))} /></Field>
                <Field label="Condición pago OS">
                  <select style={selectStyle} value={ventaForm.condicion_pago_os} onChange={e => setVentaForm(f => ({ ...f, condicion_pago_os: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {CONDICIONES_PAGO.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Saldo paciente ($)"><input type="number" style={inputStyle} value={ventaForm.saldoPaciente} onChange={e => setVentaForm(f => ({ ...f, saldoPaciente: e.target.value }))} /></Field>
                <Field label="Condición pago pac.">
                  <select style={selectStyle} value={ventaForm.condicion_pago_paciente} onChange={e => setVentaForm(f => ({ ...f, condicion_pago_paciente: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {CONDICIONES_PAGO.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Observaciones"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={ventaForm.observaciones} onChange={e => setVentaForm(f => ({ ...f, observaciones: e.target.value }))} /></Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setVentaModal(false)} style={btnSecondary}>Cancelar</button>
                <button onClick={guardarVentaHC} disabled={saving} style={{ ...btnPrimary, background: "linear-gradient(135deg,#065F46,#059669)" }}>{saving ? "Guardando..." : "🛒 Guardar venta"}</button>
              </div>
            </div>
          )}

          {evModal && (
            <div style={{ marginTop: 16, background: "#F8FAFC", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 12px" }}>Nueva entrada clínica</h4>
              <Field label="Fecha"><input type="date" style={inputStyle} value={evForm.fecha} onChange={e => setEvForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
              <Field label="Prácticas (puede seleccionar varias)">
                <SelectorPracticas
                  seleccionadas={Array.isArray(evForm.practicas) ? evForm.practicas : (evForm.tipo ? [evForm.tipo] : [])}
                  onChange={practicas => setEvForm(f => ({ ...f, practicas, tipo: practicas[0] || "" }))}
                />
              </Field>
              <Field label="Descripción *"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} value={evForm.descripcion} onChange={e => setEvForm(f => ({ ...f, descripcion: e.target.value }))} /></Field>
              <Field label="Profesional">
                <select style={selectStyle} value={evForm.profesional} onChange={e => setEvForm(f => ({ ...f, profesional: e.target.value }))}>
                  <option value="">— Sin asignar —</option>
                  <option>Lic. Cecilia Miatello</option>
                  <option>Lic. Graciela Valles</option>
                </select>
              </Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setEvModal(false)} style={btnSecondary}>Cancelar</button>
                <button onClick={agregarEvento} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Agregar"}</button>
              </div>
            </div>
          )}

          {insumoModal && (
            <div style={{ marginTop: 16, background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 12px", color: "#92400E" }}>🛍️ Cargar insumo al paciente</h4>
              <Field label="Fecha"><input type="date" style={inputStyle} value={insumoForm.fecha} onChange={e => setInsumoForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
              {/* Agregar insumos */}
              <div style={{ background: "#fff", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                  <Field label="Insumo">
                    <select style={selectStyle} value={insumoActual.nombre} onChange={e => setInsumoActual(i => ({ ...i, nombre: e.target.value }))}>
                      {INSUMOS_LISTA.map(ins => <option key={ins}>{ins}</option>)}
                    </select>
                  </Field>
                  <Field label="Cant."><input type="number" min="1" style={inputStyle} value={insumoActual.cantidad} onChange={e => setInsumoActual(i => ({ ...i, cantidad: parseInt(e.target.value)||1 }))} /></Field>
                  <Field label="Precio $"><input type="number" style={inputStyle} value={insumoActual.precio} onChange={e => setInsumoActual(i => ({ ...i, precio: e.target.value }))} /></Field>
                  <button type="button" onClick={agregarInsumoItem} style={{ ...btnPrimary, padding: "8px 12px", marginBottom: 14 }}>+</button>
                </div>
                {insumoForm.insumos.length === 0
                  ? <div style={{ fontSize: 12, color: "#aaa", textAlign: "center" }}>Agregá insumos con +</div>
                  : insumoForm.insumos.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFBEB", borderRadius: 6, padding: "5px 10px", marginBottom: 4, fontSize: 13 }}>
                      <span>{i.nombre} x{i.cantidad}{i.precio ? ` · $${parseFloat(i.precio).toLocaleString("es-AR")}` : ""}</span>
                      <button onClick={() => quitarInsumoItem(i.id)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16 }}>×</button>
                    </div>
                  ))
                }
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Total ($)"><input type="number" style={inputStyle} value={insumoForm.total} onChange={e => setInsumoForm(f => ({ ...f, total: e.target.value }))} /></Field>
                <Field label="Seña / pagado ($)"><input type="number" style={inputStyle} value={insumoForm.seña} onChange={e => setInsumoForm(f => ({ ...f, seña: e.target.value }))} /></Field>
              </div>
              {parseFloat(insumoForm.total) > 0 && (
                <div style={{ background: (parseFloat(insumoForm.total) - parseFloat(insumoForm.seña||0)) > 0 ? "#FEF3C7" : "#D1FAE5", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: (parseFloat(insumoForm.total) - parseFloat(insumoForm.seña||0)) > 0 ? "#92400E" : "#065F46", marginBottom: 10 }}>
                  Saldo: ${((parseFloat(insumoForm.total)||0) - (parseFloat(insumoForm.seña)||0)).toLocaleString("es-AR")}
                </div>
              )}
              <Field label="Estado">
                <select style={selectStyle} value={insumoForm.estado} onChange={e => setInsumoForm(f => ({ ...f, estado: e.target.value }))}>
                  <option value="pendiente">Pendiente de pago</option>
                  <option value="pagado">Pagado</option>
                </select>
              </Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setInsumoModal(false)} style={btnSecondary}>Cancelar</button>
                <button onClick={guardarInsumo} disabled={saving} style={{ ...btnPrimary, background: "linear-gradient(135deg,#92400E,#D97706)" }}>{saving ? "Guardando..." : "🛍️ Guardar insumo"}</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────

function Ventas({ data, db, usuario }) {
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(null); // null | "nuevo" | venta.id
  const [verDetalle, setVerDetalle] = useState(null); // venta.id abierto en panel
  const [saving, setSaving] = useState(false);

  const FORM_VACIO = {
    paciente_id: "", fecha: today(), dispositivo: "Audífono",
    marca_der: "", modelo_der: "", marca_izq: "", modelo_izq: "",
    oido: "bilateral", precio: "", obraSocialCubre: "", condicion_pago_os: "",
    saldoPaciente: "", condicion_pago_paciente: "", estado: "presupuestado",
    observaciones: "", seguimiento: [], pagos: []
  };
  const [form, setForm] = useState(FORM_VACIO);

  // Seguimiento
  const [segForm, setSegForm] = useState({ fecha: today(), tipo: "Llamada", descripcion: "", responsable: usuario?.nombre || "" });
  // Pago
  const [pagoForm, setPagoForm] = useState({ fecha: today(), monto: "", descripcion: "" });

  const pacNombre = id => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : "—"; };

  const ventas = data.ventas.filter(v => {
    const matchEstado = !filtroEstado || v.estado === filtroEstado;
    const matchBusq = !busqueda || pacNombre(v.paciente_id).toLowerCase().includes(busqueda.toLowerCase()) ||
      (v.marca_der||"").toLowerCase().includes(busqueda.toLowerCase()) ||
      (v.modelo_der||"").toLowerCase().includes(busqueda.toLowerCase()) ||
      (v.observaciones||"").toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusq;
  }).sort((a,b) => b.fecha.localeCompare(a.fecha));

  const totalVendido = data.ventas.filter(v => v.estado === "vendido").reduce((s,v) => s + (parseFloat(v.precio)||0), 0);
  const ventaActual = verDetalle ? data.ventas.find(v => v.id === verDetalle) : null;

  // Calcular saldo real de una venta (precio - pagos registrados)
  function saldoReal(v) {
    const pagos = Array.isArray(v.pagos) ? v.pagos : [];
    const totalPagado = pagos.reduce((s,p) => s + (parseFloat(p.monto)||0), 0);
    return (parseFloat(v.precio)||0) - totalPagado;
  }

  async function guardar() {
    if (!form.paciente_id) return alert("Seleccioná un paciente.");
    setSaving(true);
    try {
      const esNueva = modal === "nuevo";
      const ventaAnterior = !esNueva && data.ventas.find(v => v.id === modal);
      const generarRec = form.estado === "vendido" && ventaAnterior?.estado !== "vendido";
      if (esNueva) await db.agregarVenta({ ...form, seguimiento: [], pagos: [] });
      else await db.actualizarVenta({ ...form, id: modal });
      if (generarRec) {
        const pac = data.pacientes.find(p => p.id === form.paciente_id);
        const nombre = pac ? `${pac.apellido}, ${pac.nombre}` : "Paciente";
        await db.agregarRecordatorio({ titulo: `Control 3 meses · ${nombre}`, fecha: sumarMeses(form.fecha, 3), hora: "09:00", tipo: "control", paciente_id: form.paciente_id, descripcion: `Control 3 meses. Venta: ${formatFecha(form.fecha)}.`, completado: false });
        await db.agregarRecordatorio({ titulo: `Control anual · ${nombre}`, fecha: sumarMeses(form.fecha, 12), hora: "09:00", tipo: "control", paciente_id: form.paciente_id, descripcion: `Control anual. Venta: ${formatFecha(form.fecha)}.`, completado: false });
      }
      setModal(null);
      if (esNueva) setVerDetalle(null);
    } finally { setSaving(false); }
  }

  async function agregarSeguimiento(ventaId) {
    if (!segForm.descripcion) return alert("Escribí una descripción.");
    const v = data.ventas.find(x => x.id === ventaId);
    if (!v) return;
    const nuevaSeg = [...(Array.isArray(v.seguimiento) ? v.seguimiento : []), { ...segForm, id: uid(), fecha: segForm.fecha }];
    await db.actualizarVenta({ ...v, seguimiento: nuevaSeg });
    setSegForm({ fecha: today(), tipo: "Llamada", descripcion: "", responsable: usuario?.nombre || "" });
  }

  async function agregarPago(ventaId) {
    if (!pagoForm.monto || parseFloat(pagoForm.monto) <= 0) return alert("Ingresá un monto válido.");
    const v = data.ventas.find(x => x.id === ventaId);
    if (!v) return;
    const nuevosPagos = [...(Array.isArray(v.pagos) ? v.pagos : []), { ...pagoForm, id: uid() }];
    const totalPagado = nuevosPagos.reduce((s,p) => s + (parseFloat(p.monto)||0), 0);
    const saldo = (parseFloat(v.precio)||0) - totalPagado;
    const nuevoEstado = saldo <= 0 && v.estado === "vendido" ? "vendido" : v.estado;
    await db.actualizarVenta({ ...v, pagos: nuevosPagos, estado: nuevoEstado });
    setPagoForm({ fecha: today(), monto: "", descripcion: "" });
    if (saldo <= 0) alert("✅ ¡Venta saldada completamente!");
  }

  const TIPOS_SEG = ["Llamada", "Email", "WhatsApp", "Visita", "Nota interna", "Reunión"];

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 160px)", minHeight: 500 }}>
      {/* ── Panel izquierdo: lista ── */}
      <div style={{ width: verDetalle ? 340 : "100%", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            ["presupuestado","Presupuestos"],["aprobado","Aprobados"],["vendido","Vendidos"],["perdido","Perdidos"]
          ].map(([k,l]) => {
            const cv = COLORES_VENTA[k];
            return (
              <div key={k} onClick={() => setFiltroEstado(filtroEstado === k ? "" : k)}
                style={{ background: filtroEstado === k ? cv.bg : "#F8FAFC", border: `1.5px solid ${filtroEstado === k ? cv.color : "#E5E7EB"}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: cv.color }}>{data.ventas.filter(v => v.estado === k).length}</div>
                <div style={{ fontSize: 10, color: cv.color, fontWeight: 600 }}>{l}</div>
              </div>
            );
          })}
        </div>

        {/* Buscador + nuevo */}
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="🔍 Buscar paciente, dispositivo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <button onClick={() => { setForm(FORM_VACIO); setModal("nuevo"); }} style={btnPrimary}>+ Nuevo</button>
        </div>

        {/* Filtro estados */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button onClick={() => setFiltroEstado("")} style={{ ...btnSecondary, fontSize: 11, padding: "3px 8px", background: !filtroEstado ? "#1a6b6b" : "#F3F4F6", color: !filtroEstado ? "#fff" : "#555" }}>Todos</button>
          {Object.entries(COLORES_VENTA).map(([k,v]) => (
            <button key={k} onClick={() => setFiltroEstado(filtroEstado === k ? "" : k)}
              style={{ ...btnSecondary, fontSize: 11, padding: "3px 8px", background: filtroEstado === k ? v.color : "#F3F4F6", color: filtroEstado === k ? "#fff" : "#555" }}>
              {v.label} ({data.ventas.filter(x => x.estado === k).length})
            </button>
          ))}
        </div>

        {/* Lista ventas */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {ventas.length === 0
            ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 36 }}>🛒</div><div>No hay ventas</div></div>
            : ventas.map(v => {
              const cv = COLORES_VENTA[v.estado] || { bg: "#F3F4F6", color: "#374151", label: v.estado };
              const derInfo = [v.marca_der, v.modelo_der].filter(Boolean).join(" ");
              const izqInfo = [v.marca_izq, v.modelo_izq].filter(Boolean).join(" ");
              const saldo = saldoReal(v);
              const pagos = Array.isArray(v.pagos) ? v.pagos : [];
              const segs = Array.isArray(v.seguimiento) ? v.seguimiento : [];
              const saldado = saldo <= 0 && parseFloat(v.precio) > 0;
              const activo = verDetalle === v.id;
              return (
                <div key={v.id} onClick={() => setVerDetalle(activo ? null : v.id)}
                  style={{ background: "#fff", border: `2px solid ${activo ? "#1a6b6b" : cv.color + "33"}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{pacNombre(v.paciente_id)}</span>
                        <span style={{ background: cv.bg, color: cv.color, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{cv.label}</span>
                        {saldado && <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>✅ Saldado</span>}
                        {!saldado && saldo > 0 && parseFloat(v.precio) > 0 && <span style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>💰 Debe ${saldo.toLocaleString("es-AR")}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {derInfo && <span>👂D: {derInfo}</span>}
                        {izqInfo && <span>👂I: {izqInfo}</span>}
                        <span>{formatFecha(v.fecha)}</span>
                        {parseFloat(v.precio) > 0 && <span style={{ color: "#166534", fontWeight: 600 }}>${parseFloat(v.precio).toLocaleString("es-AR")}</span>}
                      </div>
                      {(segs.length > 0 || pagos.length > 0) && (
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
                          {segs.length > 0 && `${segs.length} seguimiento${segs.length > 1 ? "s" : ""}`}
                          {segs.length > 0 && pagos.length > 0 && " · "}
                          {pagos.length > 0 && `${pagos.length} pago${pagos.length > 1 ? "s" : ""}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* ── Panel derecho: detalle + CRM ── */}
      {verDetalle && ventaActual && (
        <div style={{ flex: 1, overflowY: "auto", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 14, padding: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{pacNombre(ventaActual.paciente_id)}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{formatFecha(ventaActual.fecha)}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setForm({ ...FORM_VACIO, ...ventaActual, obraSocialCubre: ventaActual.obra_social_cubre || ventaActual.obraSocialCubre || "", saldoPaciente: ventaActual.saldo_paciente || ventaActual.saldoPaciente || "" }); setModal(ventaActual.id); }} style={{ ...btnSecondary, fontSize: 12, padding: "5px 12px" }}>✎ Editar</button>
              <button onClick={() => { if(window.confirm("¿Eliminar?")) { db.eliminarVenta(ventaActual.id); setVerDetalle(null); } }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
              <button onClick={() => setVerDetalle(null)} style={{ ...btnSecondary, fontSize: 16, padding: "5px 10px" }}>×</button>
            </div>
          </div>

          {/* Estado + precio */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Estado", value: COLORES_VENTA[ventaActual.estado]?.label || ventaActual.estado, color: COLORES_VENTA[ventaActual.estado]?.color },
              { label: "Precio total", value: ventaActual.precio ? `$${parseFloat(ventaActual.precio).toLocaleString("es-AR")}` : "—", color: "#166534" },
              { label: "Saldo pendiente", value: `$${Math.max(0, saldoReal(ventaActual)).toLocaleString("es-AR")}`, color: saldoReal(ventaActual) <= 0 ? "#065F46" : "#92400E" },
            ].map(item => (
              <div key={item.label} style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: item.color || "#1a1a2e" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Dispositivos */}
          {(ventaActual.marca_der || ventaActual.marca_izq) && (
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13 }}>
              {ventaActual.marca_der && <div>👂 Der: {[ventaActual.marca_der, ventaActual.modelo_der].filter(Boolean).join(" ")}</div>}
              {ventaActual.marca_izq && <div>👂 Izq: {[ventaActual.marca_izq, ventaActual.modelo_izq].filter(Boolean).join(" ")}</div>}
              {ventaActual.condicion_pago_os && <div style={{ color: "#1E40AF", marginTop: 4 }}>OS: ${parseFloat(ventaActual.obra_social_cubre||0).toLocaleString("es-AR")} · {ventaActual.condicion_pago_os}</div>}
              {ventaActual.condicion_pago_paciente && <div style={{ color: "#92400E" }}>Pac: ${parseFloat(ventaActual.saldo_paciente||0).toLocaleString("es-AR")} · {ventaActual.condicion_pago_paciente}</div>}
            </div>
          )}

          {/* ── COBRANZA ── */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a6b6b", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>💰 Cobranza</span>
              <span style={{ fontSize: 12, color: saldoReal(ventaActual) <= 0 ? "#065F46" : "#92400E", fontWeight: 700 }}>
                {saldoReal(ventaActual) <= 0 ? "✅ Saldado" : `Saldo: $${Math.max(0, saldoReal(ventaActual)).toLocaleString("es-AR")}`}
              </span>
            </div>
            {/* Pagos registrados */}
            {(Array.isArray(ventaActual.pagos) ? ventaActual.pagos : []).length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {(ventaActual.pagos||[]).map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "5px 10px", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: "#888" }}>{formatFecha(p.fecha)}</span>
                    <span style={{ fontWeight: 700, color: "#065F46" }}>+${parseFloat(p.monto).toLocaleString("es-AR")}</span>
                    <span style={{ color: "#555" }}>{p.descripcion || "Pago"}</span>
                  </div>
                ))}
                <div style={{ fontSize: 12, fontWeight: 700, color: "#065F46", textAlign: "right", marginTop: 4 }}>
                  Total pagado: ${(ventaActual.pagos||[]).reduce((s,p) => s + (parseFloat(p.monto)||0), 0).toLocaleString("es-AR")}
                </div>
              </div>
            )}
            {/* Nuevo pago */}
            {saldoReal(ventaActual) > 0 && (
              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46", marginBottom: 8 }}>+ Registrar pago</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 8, alignItems: "end" }}>
                  <Field label="Fecha"><input type="date" style={inputStyle} value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
                  <Field label="Monto $"><input type="number" style={inputStyle} value={pagoForm.monto} onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))} placeholder="0" /></Field>
                  <Field label="Descripción"><input style={inputStyle} value={pagoForm.descripcion} onChange={e => setPagoForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Seña, Cuota 1..." /></Field>
                  <button onClick={() => agregarPago(ventaActual.id)} style={{ ...btnPrimary, background: "linear-gradient(135deg,#065F46,#059669)", padding: "8px 12px", marginBottom: 14 }}>✓</button>
                </div>
              </div>
            )}
          </div>

          {/* ── SEGUIMIENTO CRM ── */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a6b6b", marginBottom: 10 }}>📋 Seguimiento</div>
            {/* Historial */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, maxHeight: 220, overflowY: "auto" }}>
              {(Array.isArray(ventaActual.seguimiento) ? [...ventaActual.seguimiento] : []).reverse().map(s => (
                <div key={s.id} style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, flexWrap: "wrap", gap: 4 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ background: "#EEF2FF", color: "#4338CA", borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{s.tipo}</span>
                      {s.responsable && <span style={{ fontSize: 10, color: "#aaa" }}>por {s.responsable}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: "#aaa" }}>{formatFecha(s.fecha)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{s.descripcion}</div>
                </div>
              ))}
              {(!ventaActual.seguimiento || ventaActual.seguimiento.length === 0) && (
                <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", padding: 12 }}>Sin entradas de seguimiento</div>
              )}
            </div>
            {/* Nueva entrada */}
            <div style={{ background: "#F0F4FF", border: "1px solid #C7D2FE", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4338CA", marginBottom: 8 }}>+ Nueva entrada</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <Field label="Fecha"><input type="date" style={inputStyle} value={segForm.fecha} onChange={e => setSegForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
                <Field label="Tipo">
                  <select style={selectStyle} value={segForm.tipo} onChange={e => setSegForm(f => ({ ...f, tipo: e.target.value }))}>
                    {TIPOS_SEG.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Nota / Descripción">
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 55 }} value={segForm.descripcion} onChange={e => setSegForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Se llamó al paciente, confirmó que está interesado..." />
              </Field>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "#888" }}>Por: {usuario?.nombre || "—"}</span>
                <button onClick={() => agregarSeguimiento(ventaActual.id)} style={{ ...btnPrimary, padding: "7px 16px", fontSize: 12 }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo/editar ── */}
      {modal && (
        <Modal title={modal === "nuevo" ? "Nueva venta / presupuesto" : "Editar venta"} onClose={() => setModal(null)}>
          <Field label="Paciente *">
            <select style={selectStyle} value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {data.pacientes.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Fecha"><input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
            <Field label="Estado">
              <select style={selectStyle} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                {Object.entries(COLORES_VENTA).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          {form.estado === "vendido" && modal !== "nuevo" && (() => {
            const anterior = data.ventas.find(v => v.id === modal);
            if (anterior?.estado === "vendido") return null;
            return (
              <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", marginBottom: 4, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "#1D4ED8" }}>🔔 Se crearán recordatorios automáticos de control</div>
              </div>
            );
          })()}
          <div style={{ height: 1, background: "#F0F0F0", margin: "10px 0 12px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>👂 Oído derecho</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <Field label="Marca"><input style={inputStyle} value={form.marca_der || ""} onChange={e => setForm(f => ({ ...f, marca_der: e.target.value }))} /></Field>
            <Field label="Modelo"><input style={inputStyle} value={form.modelo_der || ""} onChange={e => setForm(f => ({ ...f, modelo_der: e.target.value }))} /></Field>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>👂 Oído izquierdo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <Field label="Marca"><input style={inputStyle} value={form.marca_izq || ""} onChange={e => setForm(f => ({ ...f, marca_izq: e.target.value }))} /></Field>
            <Field label="Modelo"><input style={inputStyle} value={form.modelo_izq || ""} onChange={e => setForm(f => ({ ...f, modelo_izq: e.target.value }))} /></Field>
          </div>
          <div style={{ height: 1, background: "#F0F0F0", margin: "10px 0 12px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>💰 Precios</div>
          <Field label="Precio total ($)"><input type="number" style={inputStyle} value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} /></Field>
          <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", marginBottom: 8 }}>Cobertura Obra Social</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Monto OS ($)"><input type="number" style={inputStyle} value={form.obraSocialCubre} onChange={e => setForm(f => ({ ...f, obraSocialCubre: e.target.value }))} /></Field>
              <Field label="Condición pago OS">
                <select style={selectStyle} value={form.condicion_pago_os || ""} onChange={e => setForm(f => ({ ...f, condicion_pago_os: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {CONDICIONES_PAGO.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div style={{ background: "#FEF9EC", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>Saldo Paciente</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Monto paciente ($)"><input type="number" style={inputStyle} value={form.saldoPaciente} onChange={e => setForm(f => ({ ...f, saldoPaciente: e.target.value }))} /></Field>
              <Field label="Condición pago paciente">
                <select style={selectStyle} value={form.condicion_pago_paciente || ""} onChange={e => setForm(f => ({ ...f, condicion_pago_paciente: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {CONDICIONES_PAGO.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <Field label="Observaciones"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 55 }} value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ─── COMPRAS ──────────────────────────────────────────────────────────────────

function Compras({ data, db, usuario }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtroPac, setFiltroPac] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [form, setForm] = useState({ paciente_id: "", fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
  const [insumoActual, setInsumoActual] = useState({ nombre: "Pilas", cantidad: 1, precio: "" });

  const compras = data.compras
    .filter(c => !filtroEstado || c.estado === filtroEstado)
    .filter(c => !filtroPac || c.paciente_id === filtroPac);

  const pacNombre = (id) => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : "—"; };

  function agregarInsumo() {
    if (!insumoActual.nombre) return;
    const nuevo = { ...insumoActual, id: uid() };
    setForm(f => {
      const nuevos = [...f.insumos, nuevo];
      const total = nuevos.reduce((s, i) => s + (parseFloat(i.precio)||0) * (parseInt(i.cantidad)||1), 0);
      return { ...f, insumos: nuevos, total: total > 0 ? String(total) : f.total };
    });
    setInsumoActual({ nombre: "Pilas", cantidad: 1, precio: "" });
  }

  function quitarInsumo(id) {
    setForm(f => {
      const nuevos = f.insumos.filter(i => i.id !== id);
      const total = nuevos.reduce((s, i) => s + (parseFloat(i.precio)||0) * (parseInt(i.cantidad)||1), 0);
      return { ...f, insumos: nuevos, total: total > 0 ? String(total) : "" };
    });
  }

  async function guardar() {
    if (!form.paciente_id) return alert("Seleccioná un paciente.");
    if (form.insumos.length === 0) return alert("Agregá al menos un insumo.");
    setSaving(true);
    try {
      const compra = { ...form, total: parseFloat(form.total) || 0, seña: parseFloat(form.seña) || 0 };
      if (modal === "nuevo") await db.agregarCompra({ ...compra, creado_por: usuario?.nombre || "" });
      else await db.actualizarCompra({ ...compra, id: modal });
      setModal(null);
    } finally { setSaving(false); }
  }

  function editar(c) {
    setForm({ paciente_id: c.paciente_id || "", fecha: c.fecha, insumos: c.insumos || [], total: c.total || "", seña: c.seña || "", estado: c.estado, notas: c.notas || "" });
    setModal(c.id);
  }

  const totalPendiente = data.compras.filter(c => c.estado === "pendiente").reduce((s, c) => s + ((parseFloat(c.total) || 0) - (parseFloat(c.seña) || 0)), 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "#FEF3C7", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#92400E" }}>{data.compras.filter(c => c.estado === "pendiente").length}</div>
          <div style={{ fontSize: 12, color: "#92400E" }}>Con saldo pendiente</div>
        </div>
        <div style={{ background: "#FEE2E2", border: "1.5px solid #FECACA", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#991B1B" }}>${totalPendiente.toLocaleString("es-AR")}</div>
          <div style={{ fontSize: 12, color: "#991B1B" }}>Total adeudado</div>
        </div>
        <div style={{ background: "#D1FAE5", border: "1.5px solid #A7F3D0", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#065F46" }}>{data.compras.filter(c => c.estado === "pagado").length}</div>
          <div style={{ fontSize: 12, color: "#065F46" }}>Pagadas</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select style={{ ...inputStyle, width: "auto", fontSize: 13 }} value={filtroPac} onChange={e => setFiltroPac(e.target.value)}>
            <option value="">Todos los pacientes</option>
            {data.pacientes.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
          </select>
          <button onClick={() => setFiltroEstado("")} style={{ ...btnSecondary, background: filtroEstado === "" ? "#1a1a2e" : "#F3F4F6", color: filtroEstado === "" ? "#fff" : "#374151", padding: "6px 14px", fontSize: 13 }}>Todos</button>
          <button onClick={() => setFiltroEstado("pendiente")} style={{ ...btnSecondary, background: filtroEstado === "pendiente" ? "#1a1a2e" : "#F3F4F6", color: filtroEstado === "pendiente" ? "#fff" : "#374151", padding: "6px 14px", fontSize: 13 }}>Pendientes</button>
          <button onClick={() => setFiltroEstado("pagado")} style={{ ...btnSecondary, background: filtroEstado === "pagado" ? "#1a1a2e" : "#F3F4F6", color: filtroEstado === "pagado" ? "#fff" : "#374151", padding: "6px 14px", fontSize: 13 }}>Pagados</button>
        </div>
        <button onClick={() => { setForm({ paciente_id: "", fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" }); setModal("nuevo"); }} style={btnPrimary}>+ Nueva compra</button>
      </div>
      {compras.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>🛍️</div><div>No hay compras registradas</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {compras.map(c => {
            const saldo = (parseFloat(c.total) || 0) - (parseFloat(c.seña) || 0);
            return (
              <div key={c.id} style={{ background: "#fff", border: `1.5px solid ${saldo > 0 ? "#FDE68A" : "#D1FAE5"}`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{pacNombre(c.paciente_id)}</div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                    {(c.insumos || []).map(i => `${i.nombre}${i.cantidad > 1 ? ` x${i.cantidad}` : ""}`).join(" · ")}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4, display: "flex", gap: 12 }}>
                    <span style={{ color: "#374151" }}>Total: <b>${(parseFloat(c.total) || 0).toLocaleString("es-AR")}</b></span>
                    {parseFloat(c.seña) > 0 && <span style={{ color: "#059669" }}>Seña: <b>${(parseFloat(c.seña) || 0).toLocaleString("es-AR")}</b></span>}
                    {saldo > 0 && <span style={{ color: "#DC2626", fontWeight: 700 }}>Debe: ${saldo.toLocaleString("es-AR")}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{formatFecha(c.fecha)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ background: saldo > 0 ? "#FEF3C7" : "#D1FAE5", color: saldo > 0 ? "#92400E" : "#065F46", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                    {saldo > 0 ? "Pendiente" : "Pagado"}
                  </span>
                  <button onClick={() => editar(c)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 13 }}>Editar</button>
                  <button onClick={() => { if (window.confirm("¿Eliminar?")) db.eliminarCompra(c.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>}

      {modal && (
        <Modal title={modal === "nuevo" ? "Nueva compra de insumos" : "Editar compra"} onClose={() => setModal(null)}>
          <Field label="Paciente *">
            <select style={selectStyle} value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {data.pacientes.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
          <div style={{ background: "#F8FAFC", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>🛍️ Insumos</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
              <Field label="Insumo">
                <select style={selectStyle} value={insumoActual.nombre} onChange={e => setInsumoActual(i => ({ ...i, nombre: e.target.value }))}>
                  {INSUMOS_LISTA.map(ins => <option key={ins}>{ins}</option>)}
                </select>
              </Field>
              <Field label="Cantidad"><input type="number" min="1" style={inputStyle} value={insumoActual.cantidad} onChange={e => setInsumoActual(i => ({ ...i, cantidad: parseInt(e.target.value) || 1 }))} /></Field>
              <Field label="Precio unit."><input type="number" style={inputStyle} value={insumoActual.precio} onChange={e => setInsumoActual(i => ({ ...i, precio: e.target.value }))} placeholder="$" /></Field>
              <button onClick={agregarInsumo} style={{ ...btnPrimary, padding: "8px 14px", marginBottom: 14 }}>+</button>
            </div>
            {form.insumos.length === 0
              ? <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "8px 0" }}>Agregá insumos con el botón "+"</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {form.insumos.map(i => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: 8, padding: "6px 10px", border: "1px solid #E5E7EB" }}>
                    <span style={{ fontSize: 14 }}>{i.nombre} x{i.cantidad} {i.precio ? `— $${parseFloat(i.precio).toLocaleString("es-AR")}` : ""}</span>
                    <button onClick={() => quitarInsumo(i.id)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                ))}
              </div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Total ($)"><input type="number" style={inputStyle} value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} /></Field>
            <Field label="Seña / pagado ($)"><input type="number" style={inputStyle} value={form.seña} onChange={e => setForm(f => ({ ...f, seña: e.target.value }))} /></Field>
          </div>
          {(parseFloat(form.total) > 0) && (
            <div style={{ background: (parseFloat(form.total) - parseFloat(form.seña || 0)) > 0 ? "#FEF3C7" : "#D1FAE5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 14, fontWeight: 600, color: (parseFloat(form.total) - parseFloat(form.seña || 0)) > 0 ? "#92400E" : "#065F46" }}>
              Saldo a cobrar: ${((parseFloat(form.total) || 0) - (parseFloat(form.seña) || 0)).toLocaleString("es-AR")}
            </div>
          )}
          <Field label="Estado">
            <select style={selectStyle} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
              <option value="pendiente">Pendiente de pago</option>
              <option value="pagado">Pagado</option>
            </select>
          </Field>
          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────

// ─── ESTADÍSTICAS ─────────────────────────────────────────────────────────────
function Estadisticas({ data }) {
  const [profExternos, setProfExternos] = useState([]);
  useEffect(() => {
    supabase.from("profesionales_externos").select("*").order("nombre")
      .then(({ data: d }) => { if (d) setProfExternos(d); });
  }, []);
  const [periodo, setPeriodo] = useState(6); // meses a mostrar

  function getMesLabel(dateStr) {
    if (!dateStr) return "";
    const [y, m] = dateStr.split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${meses[parseInt(m)-1]} ${y}`;
  }

  function getMesKey(dateStr) {
    if (!dateStr) return "";
    return dateStr.slice(0, 7);
  }

  // Generar últimos N meses
  function ultimosMeses(n) {
    const meses = [];
    const hoy = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = getMesLabel(key + "-01");
      meses.push({ key, label });
    }
    return meses;
  }

  const meses = ultimosMeses(periodo);

  // ── Turnos por mes ──
  const turnosPorMes = meses.map(m => ({
    ...m,
    total: data.turnos.filter(t => getMesKey(t.fecha) === m.key).length,
    realizados: data.turnos.filter(t => getMesKey(t.fecha) === m.key && t.estado === "realizado").length,
    cancelados: data.turnos.filter(t => getMesKey(t.fecha) === m.key && t.estado === "cancelado").length,
    ausentes: data.turnos.filter(t => getMesKey(t.fecha) === m.key && t.estado === "ausente").length,
  }));

  // ── Turnos por profesional ──
  const profesionales = [...new Set(data.turnos.map(t => t.profesional).filter(Boolean))];
  const turnosPorProf = profesionales.map(p => ({
    nombre: p,
    total: data.turnos.filter(t => t.profesional === p).length,
    realizados: data.turnos.filter(t => t.profesional === p && t.estado === "realizado").length,
  }));

  // ── Turnos por motivo ──
  const motivosMap = {};
  data.turnos.forEach(t => {
    const m = t.motivo || "Sin especificar";
    motivosMap[m] = (motivosMap[m] || 0) + 1;
  });
  const turnosPorMotivo = Object.entries(motivosMap).sort((a,b) => b[1]-a[1]).slice(0,8);

  // ── Tasa de ausentismo ──
  const totalRealizadosYAusentes = data.turnos.filter(t => ["realizado","ausente","cancelado"].includes(t.estado)).length;
  const totalAusentes = data.turnos.filter(t => t.estado === "ausente").length;
  const totalCancelados = data.turnos.filter(t => t.estado === "cancelado").length;
  const tasaAusentismo = totalRealizadosYAusentes > 0 ? Math.round((totalAusentes / totalRealizadosYAusentes) * 100) : 0;
  const tasaCancelacion = totalRealizadosYAusentes > 0 ? Math.round((totalCancelados / totalRealizadosYAusentes) * 100) : 0;

  // ── Pacientes nuevos por mes ──
  const pacientesPorMes = meses.map(m => ({
    ...m,
    total: data.pacientes.filter(p => p.created_at && getMesKey(p.created_at) === m.key).length,
  }));

  // ── Ventas por mes ──
  const ventasPorMes = meses.map(m => ({
    ...m,
    total: data.ventas.filter(v => getMesKey(v.fecha) === m.key && v.estado === "vendido").length,
    monto: data.ventas.filter(v => getMesKey(v.fecha) === m.key && v.estado === "vendido").reduce((s,v) => s + (parseFloat(v.precio)||0), 0),
  }));

  const totalVendidoGeneral = data.ventas.filter(v => v.estado === "vendido").reduce((s,v) => s + (parseFloat(v.precio)||0), 0);
  const maxTurnos = Math.max(...turnosPorMes.map(m => m.total), 1);
  const maxVentas = Math.max(...ventasPorMes.map(m => m.monto), 1);

  const cardStyle = { background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "18px 20px", marginBottom: 16 };
  const sectionTitle = { fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 14 };

  function BarChart({ datos, campo, color, formatVal }) {
    const max = Math.max(...datos.map(d => d[campo]), 1);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
        {datos.map(d => (
          <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: 9, color: "#888", fontWeight: 600 }}>
              {formatVal ? formatVal(d[campo]) : d[campo]}
            </div>
            <div style={{
              width: "100%", background: color || "#4338CA", borderRadius: "4px 4px 0 0",
              height: `${Math.max((d[campo] / max) * 56, d[campo] > 0 ? 4 : 0)}px`,
              transition: "height 0.3s"
            }} />
            <div style={{ fontSize: 9, color: "#888", textAlign: "center", lineHeight: 1.2 }}>{d.label}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Selector período */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>📊 Estadísticas e informes</div>
        <div style={{ display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 9, padding: 3 }}>
          {[[3,"3M"],[6,"6M"],[12,"1A"]].map(([v,l]) => (
            <button key={v} onClick={() => setPeriodo(v)} style={{
              background: periodo === v ? "#1a1a2e" : "transparent", color: periodo === v ? "#fff" : "#555",
              border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total pacientes", value: data.pacientes.length, color: "#4338CA", bg: "#EEF2FF", icon: "👤" },
          { label: "Total turnos", value: data.turnos.length, color: "#0891B2", bg: "#E0F2FE", icon: "📅" },
          { label: "Tasa ausentismo", value: `${tasaAusentismo}%`, color: "#DC2626", bg: "#FEE2E2", icon: "❌" },
          { label: "Tasa cancelación", value: `${tasaCancelacion}%`, color: "#D97706", bg: "#FEF3C7", icon: "🚫" },
          { label: "Total vendido", value: `$${totalVendidoGeneral.toLocaleString("es-AR")}`, color: "#166534", bg: "#F0FDF4", icon: "💰" },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: c.color, opacity: 0.8 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Turnos por mes */}
      <div style={cardStyle}>
        <div style={sectionTitle}>📅 Turnos por mes</div>
        <BarChart datos={turnosPorMes} campo="total" color="#4338CA" />
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          {turnosPorMes.map(m => (
            <div key={m.key} style={{ fontSize: 12, color: "#555" }}>
              <span style={{ fontWeight: 700 }}>{m.label}:</span> {m.total} turnos
              {m.ausentes > 0 && <span style={{ color: "#DC2626" }}> · {m.ausentes} ausentes</span>}
              {m.cancelados > 0 && <span style={{ color: "#D97706" }}> · {m.cancelados} cancelados</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Ventas por mes */}
        <div style={cardStyle}>
          <div style={sectionTitle}>💰 Ventas por mes</div>
          <BarChart datos={ventasPorMes} campo="monto" color="#166534"
            formatVal={v => v > 0 ? `$${(v/1000).toFixed(0)}k` : "0"} />
          <div style={{ marginTop: 12 }}>
            {ventasPorMes.filter(m => m.total > 0).map(m => (
              <div key={m.key} style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>
                <span style={{ fontWeight: 700 }}>{m.label}:</span> {m.total} ventas · <span style={{ color: "#166534", fontWeight: 600 }}>${m.monto.toLocaleString("es-AR")}</span>
              </div>
            ))}
            {ventasPorMes.every(m => m.total === 0) && <div style={{ color: "#aaa", fontSize: 13 }}>Sin ventas en el período</div>}
          </div>
        </div>

        {/* Pacientes nuevos */}
        <div style={cardStyle}>
          <div style={sectionTitle}>👤 Pacientes nuevos por mes</div>
          <BarChart datos={pacientesPorMes} campo="total" color="#0891B2" />
          <div style={{ marginTop: 12 }}>
            {pacientesPorMes.filter(m => m.total > 0).map(m => (
              <div key={m.key} style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>
                <span style={{ fontWeight: 700 }}>{m.label}:</span> {m.total} pacientes nuevos
              </div>
            ))}
            {pacientesPorMes.every(m => m.total === 0) && <div style={{ color: "#aaa", fontSize: 13 }}>Sin datos de fecha de creación</div>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Por profesional */}
        <div style={cardStyle}>
          <div style={sectionTitle}>👩‍⚕️ Turnos por profesional</div>
          {turnosPorProf.length === 0
            ? <div style={{ color: "#aaa", fontSize: 13 }}>Sin datos</div>
            : turnosPorProf.map(p => (
              <div key={p.nombre} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</span>
                  <span style={{ fontSize: 13, color: "#555" }}>{p.total} turnos</span>
                </div>
                <div style={{ background: "#F3F4F6", borderRadius: 6, height: 8, overflow: "hidden" }}>
                  <div style={{ background: "#4338CA", height: "100%", width: `${(p.total / data.turnos.length) * 100}%`, borderRadius: 6 }} />
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{p.realizados} realizados</div>
              </div>
            ))
          }
        </div>

        {/* Por motivo */}
        <div style={cardStyle}>
          <div style={sectionTitle}>🎯 Turnos por motivo</div>
          {turnosPorMotivo.length === 0
            ? <div style={{ color: "#aaa", fontSize: 13 }}>Sin datos</div>
            : turnosPorMotivo.map(([motivo, cant]) => (
              <div key={motivo} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{motivo}</span>
                  <span style={{ fontSize: 12, color: "#555", fontWeight: 700 }}>{cant}</span>
                </div>
                <div style={{ background: "#F3F4F6", borderRadius: 6, height: 6, overflow: "hidden" }}>
                  <div style={{ background: "#0891B2", height: "100%", width: `${(cant / data.turnos.length) * 100}%`, borderRadius: 6 }} />
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Estados de turnos */}
      <div style={cardStyle}>
        <div style={sectionTitle}>📋 Resumen de estados</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {Object.entries(COLORES_ESTADO).map(([estado, c]) => {
            const cant = data.turnos.filter(t => t.estado === estado).length;
            const pct = data.turnos.length > 0 ? Math.round((cant / data.turnos.length) * 100) : 0;
            return (
              <div key={estado} style={{ background: c.bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{cant}</div>
                <div style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: 10, color: c.color, opacity: 0.7 }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Etiquetas de pacientes */}
      {(() => {
        try {
          const custom = JSON.parse(localStorage.getItem("etiquetas_custom") || "[]");
          const todas = [...ETIQUETAS_DEFAULT, ...custom];
          const conEtiquetas = todas.map(e => ({
            ...e,
            total: data.pacientes.filter(p => (p.etiquetas||[]).includes(e.id)).length
          })).filter(e => e.total > 0);
          if (conEtiquetas.length === 0) return null;
          return (
            <div style={cardStyle}>
              <div style={sectionTitle}>🏷️ Pacientes por etiqueta</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {conEtiquetas.map(e => (
                  <div key={e.id} style={{ background: e.bg, border: `1.5px solid ${e.color}33`, borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: e.color }}>{e.total}</div>
                    <div style={{ fontSize: 12, color: e.color, fontWeight: 600 }}>{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        } catch { return null; }
      })()}

      {/* Derivaciones por profesional */}
      {(() => {
        try {
          const profs = profExternos || [];
          if (profs.length === 0) return null;
          const conDerivaciones = profs.map(p => ({
            ...p,
            pacientes: data.pacientes.filter(pac =>
              (pac.derivado_por || pac.derivadoPor || "").toLowerCase().includes(p.nombre.toLowerCase())
            )
          })).filter(p => p.pacientes.length > 0).sort((a, b) => b.pacientes.length - a.pacientes.length);
          if (conDerivaciones.length === 0) return null;
          return (
            <div style={cardStyle}>
              <div style={sectionTitle}>🏥 Derivaciones por profesional externo</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {conDerivaciones.map(p => (
                  <div key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre}</span>
                        {p.especialidad && <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{p.especialidad}</span>}
                      </div>
                      <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{p.pacientes.length} paciente{p.pacientes.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ background: "#F3F4F6", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ background: "#059669", height: "100%", borderRadius: 6, width: `${(p.pacientes.length / data.pacientes.length) * 100}%` }} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {p.pacientes.slice(0, 6).map(pac => (
                        <span key={pac.id} style={{ background: "#F0FDF4", color: "#065F46", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
                          {pac.apellido}, {pac.nombre}
                        </span>
                      ))}
                      {p.pacientes.length > 6 && <span style={{ fontSize: 11, color: "#aaa" }}>+{p.pacientes.length - 6} más</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        } catch { return null; }
      })()}
    </div>
  );
}


// ─── PROFESIONALES ────────────────────────────────────────────────────────────
// ─── PROFESIONALES EXTERNOS ───────────────────────────────────────────────────
function useProfesionalesExternos() {
  const [profesionales, setProfesionales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
    // Realtime
    const chName = "realtime-prof-" + Math.random().toString(36).slice(2,7);
    const ch = supabase.channel(chName)
      .on("postgres_changes", { event: "*", schema: "public", table: "profesionales_externos" }, () => cargar())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function cargar() {
    const { data } = await supabase.from("profesionales_externos").select("*").order("nombre");
    if (data) setProfesionales(data);
    setLoading(false);
  }

  async function agregar(prof) {
    const { data: row } = await supabase.from("profesionales_externos")
      .insert({ ...prof, seguimiento: prof.seguimiento || [] }).select().single();
    if (row) setProfesionales(p => [...p, row]);
    return row;
  }

  async function actualizar(prof) {
    await supabase.from("profesionales_externos").update(prof).eq("id", prof.id);
    setProfesionales(p => p.map(x => x.id === prof.id ? prof : x));
  }

  async function eliminar(id) {
    await supabase.from("profesionales_externos").delete().eq("id", id);
    setProfesionales(p => p.filter(x => x.id !== id));
  }

  async function agregarSeguimiento(profId, entrada) {
    const prof = profesionales.find(p => p.id === profId);
    if (!prof) return;
    const nuevaSeg = [...(prof.seguimiento || []), { ...entrada, id: uid() }];
    await actualizar({ ...prof, seguimiento: nuevaSeg });
  }

  return { profesionales, loading, agregar, actualizar, eliminar, agregarSeguimiento };
}

const FORM_PROF_VACIO = { nombre: "", especialidad: "", institucion: "", telefono: "", email: "", localidad: "", alias_cbu: "", notas: "" };
const TIPOS_SEGUIMIENTO_PROF = ["Visita", "Llamada", "Email", "Derivación recibida", "Derivación enviada", "Reunión", "Otro"];
const ESPECIALIDADES = ["Médico clínico", "Fonoaudiólogo/a", "Otorrinolaringólogo/a", "Neurólogo/a", "Pediatra", "Geriatra", "Psicólogo/a", "Kinesiólogo/a", "Otro"];

function Profesionales({ data }) {
  const { profesionales, loading: loadingProf, agregar, actualizar, eliminar, agregarSeguimiento } = useProfesionalesExternos();
  const [modal, setModal] = useState(null); // null | "nuevo" | id
  const [verSeg, setVerSeg] = useState(null); // id del prof
  const [verDerivados, setVerDerivados] = useState(null); // id del prof
  const [busqueda, setBusqueda] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_PROF_VACIO);
  const [segForm, setSegForm] = useState({ fecha: today(), tipo: "Visita", descripcion: "", proxContacto: "" });
  const [segModal, setSegModal] = useState(false);

  const lista = profesionales.filter(p =>
    busqueda === "" || `${p.nombre} ${p.especialidad} ${p.institucion || ""}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  function abrirNuevo() {
    setForm(FORM_PROF_VACIO);
    setModal("nuevo");
  }

  function abrirEditar(p) {
    setForm({ nombre: p.nombre, especialidad: p.especialidad || "", institucion: p.institucion || "", telefono: p.telefono || "", email: p.email || "", localidad: p.localidad || "", alias_cbu: p.alias_cbu || "", notas: p.notas || "" });
    setModal(p.id);
  }

  async function guardar() {
    if (!form.nombre) return alert("El nombre es obligatorio.");
    setSaving(true);
    try {
      if (modal === "nuevo") agregar(form);
      else actualizar({ ...profesionales.find(p => p.id === modal), ...form });
      setModal(null);
    } finally { setSaving(false); }
  }

  function guardarSeguimiento() {
    if (!segForm.descripcion) return alert("Escribí una descripción.");
    agregarSeguimiento(verSeg, segForm);
    setSegModal(false);
    setSegForm({ fecha: today(), tipo: "Visita", descripcion: "", proxContacto: "" });
  }

  const profActual = profesionales.find(p => p.id === verSeg);
  // Count derivaciones from pacientes
  const derivacionesPorProf = (profNombre) =>
    data.pacientes.filter(p => (p.derivado_por || p.derivadoPor || "").toLowerCase().includes(profNombre.toLowerCase())).length;

  const pacientesPorProf = (profNombre) =>
    data.pacientes.filter(p => (p.derivado_por || p.derivadoPor || "").toLowerCase().includes(profNombre.toLowerCase()));

  const TIPO_COLOR_SEG = {
    "Visita": { bg: "#EEF2FF", c: "#4338CA" },
    "Llamada": { bg: "#DBEAFE", c: "#1E40AF" },
    "Email": { bg: "#E0F2FE", c: "#075985" },
    "Derivación recibida": { bg: "#D1FAE5", c: "#065F46" },
    "Derivación enviada": { bg: "#FEF3C7", c: "#92400E" },
    "Reunión": { bg: "#EDE9FE", c: "#5B21B6" },
    "Otro": { bg: "#F3F4F6", c: "#374151" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>🏥 Profesionales externos</div>
        <button onClick={abrirNuevo} style={btnPrimary}>+ Nuevo profesional</button>
      </div>

      <input style={{ ...inputStyle, maxWidth: 320, marginBottom: 16 }} placeholder="Buscar por nombre, especialidad..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />

      {loadingProf
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 30 }}>⏳</div><div>Cargando...</div></div>
        : lista.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>🏥</div><div>No hay profesionales cargados</div></div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
          {lista.map(p => {
            const derivaciones = derivacionesPorProf(p.nombre);
            const ultSeg = (p.seguimiento || []).slice(-1)[0];
            return (
              <div key={p.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#1a6b6b", flexShrink: 0 }}>
                    {p.nombre.split(" ").filter(w => w.length > 1).map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nombre}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{p.especialidad || "—"}</div>
                    {p.institucion && <div style={{ fontSize: 12, color: "#aaa" }}>{p.institucion}</div>}
                  </div>
                </div>

                {derivaciones > 0 && (
                  <div onClick={() => setVerDerivados(verDerivados === p.id ? null : p.id)}
                    style={{ background: "#D1FAE5", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, color: "#065F46", marginBottom: 8, display: "inline-block", cursor: "pointer" }}>
                    👥 {derivaciones} paciente{derivaciones !== 1 ? "s" : ""} derivado{derivaciones !== 1 ? "s" : ""} {verDerivados === p.id ? "▲" : "▼"}
                  </div>
                )}
                {verDerivados === p.id && (
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Pacientes derivados</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {pacientesPorProf(p.nombre).map(pac => (
                        <div key={pac.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: 6, padding: "5px 8px", fontSize: 12 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "#1a1a2e" }}>{pac.apellido}, {pac.nombre}</div>
                            <div style={{ color: "#888", fontSize: 11 }}>{pac.obraSocial || pac.obra_social || "Particular"}</div>
                          </div>
                          {pac.telefono && (
                            <div style={{ color: "#1a6b6b", fontSize: 11, display: "flex", alignItems: "center", gap: 2 }}>
                              📞 {pac.telefono}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {p.telefono && (
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 3, display: "flex", alignItems: "center" }}>
                    📞 {p.telefono} <CopyButton text={p.telefono} label="teléfono" />
                  </div>
                )}
                {p.email && (
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 3, display: "flex", alignItems: "center" }}>
                    ✉️ {p.email} <CopyButton text={p.email} label="email" />
                  </div>
                )}
                {p.localidad && <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>📍 {p.localidad}</div>}

                {ultSeg && (
                  <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#555", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>Último contacto:</span> {formatFecha(ultSeg.fecha)} · {ultSeg.tipo}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => setVerSeg(p.id)} style={{ ...btnPrimary, padding: "6px 12px", fontSize: 12, flex: 1 }}>Seguimiento ({(p.seguimiento||[]).length})</button>
                  <button onClick={() => abrirEditar(p)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>Editar</button>
                  <button onClick={() => { if (window.confirm("¿Eliminar?")) eliminar(p.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>}

      {/* Modal nuevo/editar */}
      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo profesional externo" : "Editar profesional"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Nombre completo *" ><input style={inputStyle} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Dr. Juan Pérez" /></Field>
            <Field label="Especialidad">
              <select style={selectStyle} value={form.especialidad} onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))}>
                <option value="">— Seleccionar —</option>
                {ESPECIALIDADES.map(e => <option key={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="Institución / Hospital"><input style={inputStyle} value={form.institucion} onChange={e => setForm(f => ({ ...f, institucion: e.target.value }))} placeholder="Hospital, clínica, consultorio..." /></Field>
            <Field label="Localidad"><input style={inputStyle} value={form.localidad} onChange={e => setForm(f => ({ ...f, localidad: e.target.value }))} /></Field>
            <Field label="Teléfono"><input style={inputStyle} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></Field>
            <Field label="Email"><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          </div>
          <Field label="Alias / CBU (para transferencias)">
            <input style={inputStyle} value={form.alias_cbu || ""} onChange={e => setForm(f => ({ ...f, alias_cbu: e.target.value }))} placeholder="Ej: alias.banco o CBU 0000000..." />
          </Field>
          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones, vínculo, frecuencia de contacto..." /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}

      {/* Modal seguimiento */}
      {verSeg && profActual && (
        <Modal title={`Seguimiento · ${profActual.nombre}`} onClose={() => setVerSeg(null)}>
          <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{profActual.nombre}</div>
            <div style={{ color: "#888" }}>{profActual.especialidad}{profActual.institucion ? ` · ${profActual.institucion}` : ""}</div>
            {profActual.telefono && <div style={{ display: "flex", alignItems: "center", marginTop: 4 }}>📞 {profActual.telefono} <CopyButton text={profActual.telefono} label="teléfono" /></div>}
            {profActual.email && <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>✉️ {profActual.email} <CopyButton text={profActual.email} label="email" /></div>}
            {(() => { const d = derivacionesPorProf(profActual.nombre); return d > 0 ? <div style={{ marginTop: 6, background: "#D1FAE5", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: "#065F46", display: "inline-block" }}>👥 {d} paciente{d !== 1 ? "s" : ""} derivado{d !== 1 ? "s" : ""}</div> : null; })()}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Historial de contactos</span>
            <button onClick={() => setSegModal(true)} style={{ ...btnPrimary, padding: "6px 14px", fontSize: 13 }}>+ Agregar</button>
          </div>

          {(profActual.seguimiento || []).length === 0
            ? <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Sin contactos registrados</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...(profActual.seguimiento || [])].reverse().map(s => {
                const tc = TIPO_COLOR_SEG[s.tipo] || TIPO_COLOR_SEG["Otro"];
                return (
                  <div key={s.id} style={{ background: tc.bg, border: `1px solid ${tc.c}22`, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: tc.c }}>{s.tipo}</span>
                      <span style={{ fontSize: 12, color: "#888" }}>{formatFecha(s.fecha)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14 }}>{s.descripcion}</p>
                    {s.proxContacto && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>📅 Próximo contacto: {formatFecha(s.proxContacto)}</div>}
                  </div>
                );
              })}
            </div>}

          {segModal && (
            <div style={{ marginTop: 16, background: "#F8FAFC", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Nuevo contacto</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Fecha"><input type="date" style={inputStyle} value={segForm.fecha} onChange={e => setSegForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
                <Field label="Tipo">
                  <select style={selectStyle} value={segForm.tipo} onChange={e => setSegForm(f => ({ ...f, tipo: e.target.value }))}>
                    {TIPOS_SEGUIMIENTO_PROF.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Descripción *"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} value={segForm.descripcion} onChange={e => setSegForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Detalles del contacto, acuerdos, observaciones..." /></Field>
              <Field label="Próximo contacto (opcional)"><input type="date" style={inputStyle} value={segForm.proxContacto} onChange={e => setSegForm(f => ({ ...f, proxContacto: e.target.value }))} /></Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setSegModal(false)} style={btnSecondary}>Cancelar</button>
                <button onClick={guardarSeguimiento} style={btnPrimary}>Guardar</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}


// ─── BLOQUEO DE AGENDA ────────────────────────────────────────────────────────
function ModalBloqueo({ onClose, db, fechaInicial }) {
  const [form, setForm] = useState({
    profesional: "ambas",
    fechaDesde: fechaInicial || today(),
    fechaHasta: fechaInicial || today(),
    horaDesde: "08:00",
    horaHasta: "18:00",
    motivo: "Licencia",
    repeticion: "ninguna",       // ninguna | diaria | semanal | mensual
    diasSemana: [],               // para repeticion semanal: [0,1,2,3,4,5,6] lun=0
    cantRepeticiones: 4,          // cuántas veces repetir
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState([]);

  const DIAS_LABELS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  function generarFechas() {
    const fechas = [];
    const desde = new Date(form.fechaDesde + "T12:00:00");
    const hasta = new Date(form.fechaHasta + "T12:00:00");

    if (form.repeticion === "ninguna") {
      let d = new Date(desde);
      while (d <= hasta) {
        fechas.push(d.toISOString().split("T")[0]);
        d.setDate(d.getDate() + 1);
      }
    } else if (form.repeticion === "diaria") {
      let d = new Date(desde);
      for (let i = 0; i < form.cantRepeticiones; i++) {
        fechas.push(d.toISOString().split("T")[0]);
        d.setDate(d.getDate() + 1);
      }
    } else if (form.repeticion === "semanal") {
      const diasSel = form.diasSemana.length > 0 ? form.diasSemana : [desde.getDay() === 0 ? 6 : desde.getDay() - 1];
      let semana = 0;
      let d = new Date(desde);
      // go to start of week
      while (semana < form.cantRepeticiones) {
        const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
        if (diasSel.includes(dayOfWeek)) {
          fechas.push(d.toISOString().split("T")[0]);
        }
        d.setDate(d.getDate() + 1);
        if (d.getDay() === 1) semana++; // new week on monday
      }
    } else if (form.repeticion === "mensual") {
      let d = new Date(desde);
      for (let i = 0; i < form.cantRepeticiones; i++) {
        fechas.push(d.toISOString().split("T")[0]);
        d.setMonth(d.getMonth() + 1);
      }
    }
    return [...new Set(fechas)].sort();
  }

  useEffect(() => {
    setPreview(generarFechas().slice(0, 10));
  }, [form.fechaDesde, form.fechaHasta, form.repeticion, form.cantRepeticiones, form.diasSemana.join(",")]);

  async function guardar() {
    if (!form.fechaDesde) return alert("Completá la fecha de inicio.");
    setSaving(true);
    try {
      const profs = form.profesional === "ambas"
        ? ["Lic. Cecilia Miatello", "Lic. Graciela Valles"]
        : form.profesional === "miatello"
        ? ["Lic. Cecilia Miatello"]
        : ["Lic. Graciela Valles"];

      const fechas = generarFechas();
      const serieId = form.repeticion !== "ninguna" ? `serie-${Date.now()}` : null;
      const promises = [];
      for (const fecha of fechas) {
        for (const prof of profs) {
          promises.push(db.agregarTurno({
            fecha,
            hora: form.horaDesde,
            hora_fin: form.horaHasta,
            motivo: `🔒 BLOQUEADO: ${form.motivo}`,
            profesional: prof,
            estado: "bloqueado",
            notas: serieId ? `serie:${serieId}` : `Bloqueo de agenda`,
          }));
        }
      }
      await Promise.all(promises);
      onClose();
    } finally { setSaving(false); }
  }

  const totalDias = generarFechas().length;

  return (
    <Modal title="🔒 Bloquear agenda" onClose={onClose}>
      <Field label="Profesional">
        <select style={selectStyle} value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))}>
          <option value="miatello">Lic. Cecilia Miatello</option>
          <option value="valles">Lic. Graciela Valles</option>
          <option value="ambas">Ambas profesionales</option>
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Hora inicio"><input type="time" style={inputStyle} value={form.horaDesde} onChange={e => setForm(f => ({ ...f, horaDesde: e.target.value }))} /></Field>
        <Field label="Hora fin"><input type="time" style={inputStyle} value={form.horaHasta} onChange={e => setForm(f => ({ ...f, horaHasta: e.target.value }))} /></Field>
      </div>

      <Field label="Motivo">
        <select style={selectStyle} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}>
          <option>Licencia</option>
          <option>Feriado</option>
          <option>Capacitación</option>
          <option>Congreso</option>
          <option>Otro</option>
        </select>
      </Field>

      {/* Repetición */}
      <Field label="Repetición">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["ninguna","Una vez"],["diaria","Diaria"],["semanal","Semanal"],["mensual","Mensual"]].map(([v, l]) => (
            <button type="button" key={v} onClick={() => setForm(f => ({ ...f, repeticion: v }))} style={{
              background: form.repeticion === v ? "#1a1a2e" : "#F3F4F6",
              color: form.repeticion === v ? "#fff" : "#374151",
              border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>{l}</button>
          ))}
        </div>
      </Field>

      {/* Una vez o diaria: mostrar rango de fechas */}
      {(form.repeticion === "ninguna" || form.repeticion === "diaria") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Desde"><input type="date" style={inputStyle} value={form.fechaDesde} onChange={e => setForm(f => ({ ...f, fechaDesde: e.target.value, fechaHasta: e.target.value > f.fechaHasta ? e.target.value : f.fechaHasta }))} /></Field>
          {form.repeticion === "ninguna"
            ? <Field label="Hasta"><input type="date" style={inputStyle} value={form.fechaHasta} onChange={e => setForm(f => ({ ...f, fechaHasta: e.target.value }))} /></Field>
            : <Field label="Cantidad de días"><input type="number" min={1} max={365} style={inputStyle} value={form.cantRepeticiones} onChange={e => setForm(f => ({ ...f, cantRepeticiones: parseInt(e.target.value)||1 }))} /></Field>
          }
        </div>
      )}

      {/* Semanal: elegir días de la semana */}
      {form.repeticion === "semanal" && (
        <>
          <Field label="Fecha de inicio"><input type="date" style={inputStyle} value={form.fechaDesde} onChange={e => setForm(f => ({ ...f, fechaDesde: e.target.value }))} /></Field>
          <Field label="Días de la semana">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DIAS_LABELS.map((d, i) => (
                <button type="button" key={i} onClick={() => {
                  const ya = form.diasSemana.includes(i);
                  setForm(f => ({ ...f, diasSemana: ya ? f.diasSemana.filter(x => x !== i) : [...f.diasSemana, i] }));
                }} style={{
                  background: form.diasSemana.includes(i) ? "#DC2626" : "#F3F4F6",
                  color: form.diasSemana.includes(i) ? "#fff" : "#374151",
                  border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}>{d}</button>
              ))}
            </div>
          </Field>
          <Field label="Cantidad de semanas"><input type="number" min={1} max={52} style={inputStyle} value={form.cantRepeticiones} onChange={e => setForm(f => ({ ...f, cantRepeticiones: parseInt(e.target.value)||1 }))} /></Field>
        </>
      )}

      {/* Mensual */}
      {form.repeticion === "mensual" && (
        <>
          <Field label="Fecha de inicio"><input type="date" style={inputStyle} value={form.fechaDesde} onChange={e => setForm(f => ({ ...f, fechaDesde: e.target.value }))} /></Field>
          <Field label="Cantidad de meses"><input type="number" min={1} max={24} style={inputStyle} value={form.cantRepeticiones} onChange={e => setForm(f => ({ ...f, cantRepeticiones: parseInt(e.target.value)||1 }))} /></Field>
        </>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div style={{ background: "#1f2937", borderRadius: 10, padding: "12px 14px", marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#FCA5A5", marginBottom: 8 }}>
            🔒 Vista previa — {totalDias} día{totalDias !== 1 ? "s" : ""} a bloquear
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {preview.map(f => (
              <span key={f} style={{ background: "#374151", color: "#FCA5A5", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{formatFecha(f)}</span>
            ))}
            {totalDias > 10 && <span style={{ color: "#9CA3AF", fontSize: 11 }}>...y {totalDias - 10} más</span>}
          </div>
        </div>
      )}

      <div style={{ background: "#FEF3C7", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400E", margin: "12px 0 8px" }}>
        ⚠️ Se crearán <strong>{totalDias}</strong> bloqueo{totalDias !== 1 ? "s" : ""} en total.
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={guardar} disabled={saving} style={{ ...btnPrimary, background: "linear-gradient(135deg,#991B1B,#DC2626)" }}>
          {saving ? "Bloqueando..." : `🔒 Bloquear ${totalDias} día${totalDias !== 1 ? "s" : ""}`}
        </button>
      </div>
    </Modal>
  );
}


// ─── LOGIN ────────────────────────────────────────────────────────────────────
const USUARIOS = [
  { nombre: "Cecilia Miatello",  pass: "Ceci2025",   rol: "profesional", color: "#1a6b6b", bg: "#e0f4f4", inicial: "CM" },
  { nombre: "Graciela Valles",   pass: "Gra2025",    rol: "profesional", color: "#4338CA", bg: "#EEF2FF", inicial: "GV" },
  { nombre: "Ayudante",          pass: "Sonara2025", rol: "ayudante",    color: "#6B7280", bg: "#F3F4F6", inicial: "AY" },
];

function LoginScreen({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  function intentar() {
    const u = USUARIOS.find(u => u.nombre === usuario && u.pass === pass);
    if (u) {
      sessionStorage.setItem("sonara_auth", "1");
      sessionStorage.setItem("sonara_usuario", JSON.stringify(u));
      onLogin(u);
    } else {
      setError(true);
      setPass("");
      setTimeout(() => setError(false), 2500);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #e0f4f4 0%, #f0f9f0 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(26,107,107,0.15)", textAlign: "center" }}>
        <img src="/logo-sonara.png" alt="Sonara Audiología" style={{ height: 70, objectFit: "contain", marginBottom: 24 }} />
        <div style={{ fontSize: 15, color: "#1a6b6b", fontWeight: 600, marginBottom: 28, opacity: 0.7 }}>Sistema de Gestión</div>

        <div style={{ marginBottom: 14, textAlign: "left" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Usuario</label>
          <select value={usuario} onChange={e => setUsuario(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `2px solid ${error ? "#DC2626" : "#E5E7EB"}`, fontSize: 14, outline: "none", background: "#FAFAFA", boxSizing: "border-box" }}>
            <option value="">— Seleccioná tu usuario —</option>
            {USUARIOS.map(u => <option key={u.nombre} value={u.nombre}>{u.nombre}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 20, textAlign: "left" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Contraseña</label>
          <div style={{ position: "relative" }}>
            <input
              type={mostrar ? "text" : "password"}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && intentar()}
              placeholder="Ingresá tu contraseña"
              style={{ width: "100%", padding: "12px 44px 12px 14px", borderRadius: 10, border: `2px solid ${error ? "#DC2626" : "#E5E7EB"}`, fontSize: 15, outline: "none", boxSizing: "border-box", background: error ? "#FEF2F2" : "#FAFAFA" }}
            />
            <button type="button" onClick={() => setMostrar(!mostrar)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>
              {mostrar ? "🙈" : "👁️"}
            </button>
          </div>
          {error && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 6, fontWeight: 600 }}>Usuario o contraseña incorrectos</div>}
        </div>

        <button onClick={intentar} style={{ width: "100%", background: "linear-gradient(135deg, #1a6b6b, #145555)", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Ingresar →
        </button>
      </div>
    </div>
  );
}


// ─── FERIADOS ARGENTINA ────────────────────────────────────────────────────────
function getFeriadosArgentina(anio) {
  // Feriados fijos
  const fijos = [
    `${anio}-01-01`, // Año nuevo
    `${anio}-02-24`, // Carnaval (aprox)
    `${anio}-02-25`, // Carnaval (aprox)
    `${anio}-03-24`, // Día de la memoria
    `${anio}-04-02`, // Malvinas
    `${anio}-05-01`, // Día del trabajador
    `${anio}-05-25`, // Revolución de Mayo
    `${anio}-06-20`, // Paso a la Inmortalidad del Gral. Belgrano
    `${anio}-07-09`, // Independencia
    `${anio}-08-17`, // Paso a la Inmortalidad del Gral. San Martín
    `${anio}-10-12`, // Día del Respeto a la Diversidad
    `${anio}-11-20`, // Día de la Soberanía Nacional
    `${anio}-12-08`, // Inmaculada Concepción
    `${anio}-12-25`, // Navidad
  ];
  // Semana Santa (cálculo aproximado)
  const easter = calcEaster(anio);
  fijos.push(addDays(easter, -2)); // Viernes Santo
  fijos.push(addDays(easter, -1)); // Sábado Santo
  return fijos;
}

function calcEaster(year) {
  const a = year % 19, b = Math.floor(year/100), c = year % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4;
  const l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31);
  const day = ((h+l-7*m+114) % 31) + 1;
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

const DIAS_SEMANA = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function useDisponibilidad() {
  const [disps, setDisps] = useState([]);

  useEffect(() => {
    cargar();
    const ch = supabase.channel("realtime-disponibilidad-" + Math.random().toString(36).slice(2,6))
      .on("postgres_changes", { event: "*", schema: "public", table: "disponibilidad" }, cargar)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function cargar() {
    const { data } = await supabase.from("disponibilidad").select("*");
    if (data) setDisps(data);
  }

  async function guardar(prof, mes, anio, dias_horarios) {
    const existing = disps.find(d => d.profesional === prof && d.mes === mes && d.anio === anio);
    if (existing) {
      await supabase.from("disponibilidad").update({ dias_horarios }).eq("id", existing.id);
    } else {
      await supabase.from("disponibilidad").insert({ profesional: prof, mes, anio, dias_horarios });
    }
    cargar();
  }

  function getDisp(prof, mes, anio) {
    const d = disps.find(d => d.profesional === prof && d.mes === mes && d.anio === anio);
    return d?.dias_horarios || [];
  }

  return { disps, guardar, getDisp };
}

function Disponibilidad({ usuario }) {
  const hoy = new Date();
  const [mesActual, setMesActual] = useState(hoy.getMonth() + 1);
  const [anioActual, setAnioActual] = useState(hoy.getFullYear());
  const [profSelec, setProfSelec] = useState("Lic. Cecilia Miatello");
  const { guardar, getDisp } = useDisponibilidad();
  const [saving, setSaving] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null); // { fecha, d, dispDia }
  const [excepcionForm, setExcepcionForm] = useState({ activo: true, horaDesde: "08:00", horaHasta: "18:00" });

  const PROFS_DISP = [
    { key: "Lic. Cecilia Miatello", label: "Cecilia Miatello", color: "#1a6b6b", bg: "#e0f4f4" },
    { key: "Lic. Graciela Valles",  label: "Graciela Valles",  color: "#4338CA", bg: "#EEF2FF" },
  ];

  const diasHorarios = getDisp(profSelec, mesActual, anioActual);

  function getDiaDisp(diaSemana) {
    return diasHorarios.find(d => d.dia === diaSemana) || { dia: diaSemana, activo: false, horaDesde: "08:00", horaHasta: "18:00", pausas: [] };
  }

  function updateDia(diaSemana, cambios) {
    const actual = getDiaDisp(diaSemana);
    const nuevos = diasHorarios.filter(d => d.dia !== diaSemana);
    const nuevo = { ...actual, ...cambios };
    guardarLocal([...nuevos, nuevo]);
  }

  const [localDisp, setLocalDisp] = useState(null);
  const dispActual = localDisp !== null ? localDisp : diasHorarios;

  function getDiaDispLocal(diaSemana) {
    return (dispActual || []).find(d => d.dia === diaSemana) || { dia: diaSemana, activo: false, horaDesde: "08:00", horaHasta: "18:00" };
  }

  function updateDiaLocal(diaSemana, cambios) {
    const actual = getDiaDispLocal(diaSemana);
    const nuevos = (dispActual || []).filter(d => d.dia !== diaSemana);
    setLocalDisp([...nuevos, { ...actual, ...cambios }]);
  }

  function guardarLocal(lista) { setLocalDisp(lista); }

  useEffect(() => { setLocalDisp(null); }, [mesActual, anioActual, profSelec]);

  async function guardarDisp() {
    setSaving(true);
    try {
      await guardar(profSelec, mesActual, anioActual, dispActual || []);
      setLocalDisp(null);
      alert("✅ Disponibilidad guardada correctamente.");
    } finally { setSaving(false); }
  }

  // Generar días del mes para vista previa
  function getDiasDelMes() {
    const dias = [];
    const ultimoDia = new Date(anioActual, mesActual, 0);
    const feriadosAnio = getFeriadosArgentina(anioActual);

    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(anioActual, mesActual - 1, d);
      const diaSemana = fecha.getDay();
      const diasSemanaIdx = diaSemana === 0 ? 6 : diaSemana - 1;
      const fechaStr = `${anioActual}-${String(mesActual).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const esFeriado = feriadosAnio.includes(fechaStr);
      const esDomingo = diaSemana === 0;
      // Check for date-specific exception first
      const excepcion = (dispActual || []).find(x => x.fecha === fechaStr);
      const dispDia = excepcion || getDiaDispLocal(DIAS_SEMANA[diasSemanaIdx]);
      dias.push({ d, fecha: fechaStr, diaSemana, diasSemanaIdx, esFeriado, esDomingo, dispDia, tieneExcepcion: !!excepcion });
    }
    return dias;
  }

  const diasMes = getDiasDelMes();
  const feriados = getFeriadosArgentina(anioActual);
  const prof = PROFS_DISP.find(p => p.key === profSelec);

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 20 }}>📅 Disponibilidad de agenda</div>

      {/* Selector profesional */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {PROFS_DISP.map(p => (
          <button key={p.key} type="button" onClick={() => setProfSelec(p.key)} style={{
            background: profSelec === p.key ? p.bg : "#F3F4F6",
            color: profSelec === p.key ? p.color : "#6B7280",
            border: profSelec === p.key ? `2px solid ${p.color}` : "2px solid #E5E7EB",
            borderRadius: 10, padding: "8px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer"
          }}>{p.label}</button>
        ))}
      </div>

      {/* Selector mes/año */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <button type="button" onClick={() => { if (mesActual === 1) { setMesActual(12); setAnioActual(a => a-1); } else setMesActual(m => m-1); }}
          style={{ ...btnSecondary, padding: "6px 12px" }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 700, minWidth: 160, textAlign: "center" }}>{MESES[mesActual-1]} {anioActual}</span>
        <button type="button" onClick={() => { if (mesActual === 12) { setMesActual(1); setAnioActual(a => a+1); } else setMesActual(m => m+1); }}
          style={{ ...btnSecondary, padding: "6px 12px" }}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* ── Configuración días ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: prof?.color, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            Horarios disponibles — {MESES[mesActual-1]}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DIAS_SEMANA.map(dia => {
              const d = getDiaDispLocal(dia);
              return (
                <div key={dia} style={{ background: d.activo ? prof?.bg : "#F8FAFC", border: `1.5px solid ${d.activo ? prof?.color + "44" : "#E5E7EB"}`, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: d.activo ? 10 : 0 }}>
                    <input type="checkbox" checked={d.activo || false} onChange={e => updateDiaLocal(dia, { activo: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: prof?.color }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: d.activo ? prof?.color : "#888" }}>{dia}</span>
                    {!d.activo && <span style={{ fontSize: 12, color: "#aaa" }}>Sin atención</span>}
                  </div>
                  {d.activo && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginLeft: 26 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 3 }}>Desde</label>
                        <input type="time" value={d.horaDesde || "08:00"} onChange={e => updateDiaLocal(dia, { horaDesde: e.target.value })}
                          style={{ ...inputStyle, fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 3 }}>Hasta</label>
                        <input type="time" value={d.horaHasta || "18:00"} onChange={e => updateDiaLocal(dia, { horaHasta: e.target.value })}
                          style={{ ...inputStyle, fontSize: 13 }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={guardarDisp} disabled={saving} style={{ ...btnPrimary, width: "100%", marginTop: 16, padding: "12px" }}>
            {saving ? "Guardando..." : `✅ Guardar disponibilidad de ${MESES[mesActual-1]}`}
          </button>
        </div>

        {/* ── Vista previa del mes ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            Vista previa del mes
          </div>
          {/* Leyenda */}
          <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: prof?.bg, border: `1.5px solid ${prof?.color}` }} />
              <span>Disponible</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#FEE2E2", border: "1.5px solid #FECACA" }} />
              <span>Feriado</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#F3F4F6", border: "1.5px solid #E5E7EB" }} />
              <span>Sin atención</span>
            </div>
          </div>

          {/* Grilla del mes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {["L","M","X","J","V","S","D"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#888", padding: "4px 0" }}>{d}</div>
            ))}
            {/* Espacios vacíos hasta el primer día */}
            {Array.from({ length: diasMes[0]?.diasSemanaIdx === 6 ? 6 : diasMes[0]?.diasSemanaIdx || 0 }).map((_, i) => (
              <div key={"empty"+i} />
            ))}
            {diasMes.map(({ d, fecha, esFeriado, esDomingo, diasSemanaIdx, dispDia }) => {
              const tieneExcepcion = (dispActual || []).find(x => x.fecha === fecha);
              const dispEfectiva = tieneExcepcion || dispDia;
              const disponible = !esFeriado && !esDomingo && dispEfectiva?.activo;
              const seleccionado = diaSeleccionado?.fecha === fecha;
              return (
                <div key={d} onClick={() => {
                  if (esFeriado || esDomingo) return;
                  if (seleccionado) { setDiaSeleccionado(null); return; }
                  setDiaSeleccionado({ fecha, d, dispDia: dispEfectiva });
                  setExcepcionForm({
                    activo: dispEfectiva?.activo ?? true,
                    horaDesde: dispEfectiva?.horaDesde || "08:00",
                    horaHasta: dispEfectiva?.horaHasta || "18:00"
                  });
                }} style={{
                  textAlign: "center", padding: "5px 2px", borderRadius: 6, fontSize: 11, fontWeight: disponible ? 700 : 400,
                  background: seleccionado ? prof?.color : esFeriado ? "#FEE2E2" : esDomingo ? "#F9FAFB" : disponible ? prof?.bg : "#F3F4F6",
                  color: seleccionado ? "#fff" : esFeriado ? "#991B1B" : esDomingo ? "#ddd" : disponible ? prof?.color : "#aaa",
                  border: seleccionado ? `2px solid ${prof?.color}` : esFeriado ? "1px solid #FECACA" : disponible ? `1px solid ${prof?.color}33` : "1px solid transparent",
                  cursor: esFeriado || esDomingo ? "default" : "pointer",
                  position: "relative",
                }}>
                  {d}
                  {tieneExcepcion && !esFeriado && !esDomingo && (
                    <div style={{ position: "absolute", top: 1, right: 2, width: 5, height: 5, borderRadius: "50%", background: "#F59E0B" }} title="Excepción individual" />
                  )}
                  {esFeriado && <div style={{ fontSize: 7, color: seleccionado ? "#fff" : "#DC2626", lineHeight: 1 }}>fer.</div>}
                  {!esFeriado && !esDomingo && <div style={{ fontSize: 7, color: seleccionado ? "rgba(255,255,255,0.8)" : prof?.color, lineHeight: 1 }}>{disponible ? (dispEfectiva?.horaDesde?.slice(0,5) || "") : "—"}</div>}
                </div>
              );
            })}
          </div>

          {/* Panel excepción día seleccionado */}
          {diaSeleccionado && (
            <div style={{ marginTop: 14, background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
                  ✏️ Excepción para el {diaSeleccionado.d} de {MESES[mesActual-1]}
                </div>
                <button onClick={() => setDiaSeleccionado(null)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#aaa" }}>×</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <input type="checkbox" checked={excepcionForm.activo} onChange={e => setExcepcionForm(f => ({ ...f, activo: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: prof?.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: excepcionForm.activo ? prof?.color : "#888" }}>
                  {excepcionForm.activo ? "Disponible este día" : "Sin atención este día"}
                </span>
              </div>
              {excepcionForm.activo && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 3 }}>Desde</label>
                    <input type="time" value={excepcionForm.horaDesde} onChange={e => setExcepcionForm(f => ({ ...f, horaDesde: e.target.value }))} style={{ ...inputStyle, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 3 }}>Hasta</label>
                    <input type="time" value={excepcionForm.horaHasta} onChange={e => setExcepcionForm(f => ({ ...f, horaHasta: e.target.value }))} style={{ ...inputStyle, fontSize: 13 }} />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => {
                  // Save exception as a date-specific entry
                  const nuevaExcepcion = { fecha: diaSeleccionado.fecha, ...excepcionForm };
                  const sinEstaFecha = (dispActual || []).filter(x => x.fecha !== diaSeleccionado.fecha);
                  const nuevaDisp = [...sinEstaFecha, nuevaExcepcion];
                  setLocalDisp(nuevaDisp);
                  await guardar(profSelec, mesActual, anioActual, nuevaDisp);
                  setDiaSeleccionado(null);
                  alert(`✅ Excepción guardada para el ${diaSeleccionado.d}/${mesActual}`);
                }} style={{ ...btnPrimary, flex: 1, background: "linear-gradient(135deg,#92400E,#D97706)" }}>
                  Guardar excepción
                </button>
                {(dispActual || []).find(x => x.fecha === diaSeleccionado.fecha) && (
                  <button onClick={async () => {
                    const sinEstaFecha = (dispActual || []).filter(x => x.fecha !== diaSeleccionado.fecha);
                    setLocalDisp(sinEstaFecha);
                    await guardar(profSelec, mesActual, anioActual, sinEstaFecha);
                    setDiaSeleccionado(null);
                    alert("✅ Excepción eliminada, vuelve al horario semanal.");
                  }} style={{ ...btnSecondary, fontSize: 12 }}>
                    Quitar excepción
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Leyenda excepciones */}
          <div style={{ marginTop: 10, fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F59E0B" }} />
            Punto naranja = excepción individual guardada para ese día
          </div>

          {/* Feriados del mes */}
          {(() => {
            const feriadosMes = feriados.filter(f => f.startsWith(`${anioActual}-${String(mesActual).padStart(2,"0")}`));
            if (feriadosMes.length === 0) return null;
            return (
              <div style={{ marginTop: 14, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B", marginBottom: 6 }}>🗓️ Feriados del mes</div>
                {feriadosMes.map(f => (
                  <div key={f} style={{ fontSize: 12, color: "#DC2626" }}>• {formatFecha(f)}</div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}


// ─── FECHAS ESPECIALES ────────────────────────────────────────────────────────
function useFechasEspeciales() {
  const [fechas, setFechas] = useState([]);
  useEffect(() => {
    cargar();
    const ch = supabase.channel("realtime-fechas-" + Math.random().toString(36).slice(2,6))
      .on("postgres_changes", { event: "*", schema: "public", table: "fechas_especiales" }, cargar)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);
  async function cargar() {
    const { data } = await supabase.from("fechas_especiales").select("*").order("fecha_mes").order("fecha_dia");
    if (data) setFechas(data);
  }
  async function agregar(fe) {
    const { data: row } = await supabase.from("fechas_especiales").insert(fe).select().single();
    if (row) setFechas(f => [...f, row]);
  }
  async function actualizar(fe) {
    await supabase.from("fechas_especiales").update(fe).eq("id", fe.id);
    setFechas(f => f.map(x => x.id === fe.id ? fe : x));
  }
  async function eliminar(id) {
    await supabase.from("fechas_especiales").delete().eq("id", id);
    setFechas(f => f.filter(x => x.id !== id));
  }
  return { fechas, agregar, actualizar, eliminar };
}

const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_FESTIVOS_PROFESION = [
  { nombre: "Día del Médico / Médica", dia: 3, mes: 12 },
  { nombre: "Día de la Fonoaudiología", dia: 1, mes: 3 },
  { nombre: "Día del Audiólogo", dia: 1, mes: 3 },
  { nombre: "Día Internacional de la Audición", dia: 3, mes: 3 },
  { nombre: "Día Mundial de la Salud", dia: 7, mes: 4 },
];

function FechasEspeciales({ usuario }) {
  const { fechas, agregar, actualizar, eliminar } = useFechasEspeciales();
  const [tab, setTab] = useState("cumpleanos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ tipo: "cumpleaños", nombre: "", fecha_dia: "", fecha_mes: "", anio: "", descripcion: "", categoria: "profesional" });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const mesHoy = hoy.getMonth() + 1;

  function diasHastaCumple(dia, mes) {
    const anioActual = hoy.getFullYear();
    let cumple = new Date(anioActual, mes - 1, dia);
    if (cumple < hoy) cumple = new Date(anioActual + 1, mes - 1, dia);
    const diff = Math.ceil((cumple - hoy) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function esHoy(dia, mes) { return dia === diaHoy && mes === mesHoy; }
  function esPróximo(dia, mes) { const d = diasHastaCumple(dia, mes); return d <= 7 && d > 0; }

  const cumpleanos = fechas
    .filter(f => f.tipo === "cumpleaños" && (busqueda === "" || f.nombre.toLowerCase().includes(busqueda.toLowerCase())))
    .sort((a, b) => diasHastaCumple(a.fecha_dia, a.fecha_mes) - diasHastaCumple(b.fecha_dia, b.fecha_mes));

  const diasFestivos = [
    ...DIAS_FESTIVOS_PROFESION,
    ...fechas.filter(f => f.tipo === "festivo"),
  ].sort((a, b) => {
    const ma = a.mes || a.fecha_mes;
    const mb = b.mes || b.fecha_mes;
    const da = a.dia || a.fecha_dia;
    const db = b.dia || b.fecha_dia;
    return ma !== mb ? ma - mb : da - db;
  });

  async function guardar() {
    if (!form.nombre || !form.fecha_dia || !form.fecha_mes) return alert("Completá nombre y fecha.");
    setSaving(true);
    try {
      const payload = { ...form, fecha_dia: parseInt(form.fecha_dia), fecha_mes: parseInt(form.fecha_mes), anio: form.anio ? parseInt(form.anio) : null, creado_por: usuario?.nombre || "" };
      if (editId) { await actualizar({ ...payload, id: editId }); setEditId(null); }
      else await agregar(payload);
      setModal(false);
      setForm({ tipo: "cumpleaños", nombre: "", fecha_dia: "", fecha_mes: "", anio: "", descripcion: "", categoria: "profesional" });
    } finally { setSaving(false); }
  }

  function abrirEditar(fe) {
    setForm({ tipo: fe.tipo, nombre: fe.nombre, fecha_dia: fe.fecha_dia, fecha_mes: fe.fecha_mes, anio: fe.anio || "", descripcion: fe.descripcion || "", categoria: fe.categoria || "profesional" });
    setEditId(fe.id);
    setModal(true);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>🎂 Fechas especiales</div>
        <button onClick={() => { setForm({ tipo: tab === "cumpleanos" ? "cumpleaños" : "festivo", nombre: "", fecha_dia: "", fecha_mes: "", anio: "", descripcion: "", categoria: "profesional" }); setEditId(null); setModal(true); }} style={btnPrimary}>+ Agregar</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 10, padding: 4, marginBottom: 16, width: "fit-content" }}>
        {[["cumpleanos","🎂 Cumpleaños"],["festivos","🏥 Días especiales"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? "#1a6b6b" : "transparent", color: tab === id ? "#fff" : "#555", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {/* ── CUMPLEAÑOS ── */}
      {tab === "cumpleanos" && (
        <div>
          {/* Alertas hoy */}
          {cumpleanos.filter(f => esHoy(f.fecha_dia, f.fecha_mes)).length > 0 && (
            <div style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", border: "2px solid #FCD34D", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#92400E", marginBottom: 8 }}>🎉 ¡Hoy es el cumpleaños de!</div>
              {cumpleanos.filter(f => esHoy(f.fecha_dia, f.fecha_mes)).map(f => (
                <div key={f.id} style={{ fontWeight: 700, fontSize: 16, color: "#92400E" }}>🎂 {f.nombre}</div>
              ))}
            </div>
          )}

          {/* Próximos 7 días */}
          {cumpleanos.filter(f => esPróximo(f.fecha_dia, f.fecha_mes)).length > 0 && (
            <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", marginBottom: 6 }}>📅 Próximos 7 días</div>
              {cumpleanos.filter(f => esPróximo(f.fecha_dia, f.fecha_mes)).map(f => (
                <div key={f.id} style={{ fontSize: 13, color: "#1E40AF", marginBottom: 3 }}>
                  {f.nombre} — {f.fecha_dia}/{f.fecha_mes} (en {diasHastaCumple(f.fecha_dia, f.fecha_mes)} días)
                </div>
              ))}
            </div>
          )}

          <input style={{ ...inputStyle, maxWidth: 300, marginBottom: 14 }} placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />

          {/* Lista por mes */}
          {MESES_NOMBRES.map((mes, mi) => {
            const delMes = cumpleanos.filter(f => f.fecha_mes === mi + 1);
            if (delMes.length === 0) return null;
            return (
              <div key={mes} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, borderBottom: "1px solid #E5E7EB", paddingBottom: 4 }}>{mes}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {delMes.sort((a,b) => a.fecha_dia - b.fecha_dia).map(f => {
                    const hoyEs = esHoy(f.fecha_dia, f.fecha_mes);
                    const proximo = esPróximo(f.fecha_dia, f.fecha_mes);
                    const dias = diasHastaCumple(f.fecha_dia, f.fecha_mes);
                    const edad = f.anio ? hoy.getFullYear() - f.anio + (mesHoy > f.fecha_mes || (mesHoy === f.fecha_mes && diaHoy >= f.fecha_dia) ? 0 : -1) : null;
                    return (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: hoyEs ? "#FEF3C7" : proximo ? "#EFF6FF" : "#F8FAFC", border: `1.5px solid ${hoyEs ? "#FCD34D" : proximo ? "#BFDBFE" : "#E5E7EB"}`, borderRadius: 10, padding: "10px 14px" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: hoyEs ? "#FCD34D" : "#e0f4f4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {hoyEs ? "🎉" : "🎂"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{f.nombre}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>
                            {f.fecha_dia} de {MESES_NOMBRES[f.fecha_mes - 1]}
                            {edad !== null && ` · cumple ${edad + 1} años`}
                            {f.descripcion && ` · ${f.descripcion}`}
                          </div>
                          <div style={{ fontSize: 11, color: hoyEs ? "#92400E" : proximo ? "#1D4ED8" : "#aaa", fontWeight: 600, marginTop: 2 }}>
                            {hoyEs ? "¡Hoy!" : proximo ? `En ${dias} días` : `En ${dias} días`}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => abrirEditar(f)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }}>✎</button>
                          <button onClick={() => { if (window.confirm("¿Eliminar?")) eliminar(f.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {cumpleanos.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
              <div style={{ fontSize: 40 }}>🎂</div>
              <div>No hay cumpleaños cargados</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Agregá los cumpleaños de tus profesionales derivantes</div>
            </div>
          )}
        </div>
      )}

      {/* ── DÍAS FESTIVOS ── */}
      {tab === "festivos" && (
        <div>
          {/* Hoy */}
          {diasFestivos.filter(f => esHoy(f.dia || f.fecha_dia, f.mes || f.fecha_mes)).length > 0 && (
            <div style={{ background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)", border: "2px solid #34D399", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#065F46", marginBottom: 4 }}>🏥 ¡Hoy se celebra!</div>
              {diasFestivos.filter(f => esHoy(f.dia || f.fecha_dia, f.mes || f.fecha_mes)).map((f, i) => (
                <div key={i} style={{ fontWeight: 700, fontSize: 15, color: "#065F46" }}>{f.nombre}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {diasFestivos.map((f, i) => {
              const dia = f.dia || f.fecha_dia;
              const mes = f.mes || f.fecha_mes;
              const hoyEs = esHoy(dia, mes);
              const proximo = esPróximo(dia, mes);
              const esCustom = !!f.id;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: hoyEs ? "#D1FAE5" : proximo ? "#EFF6FF" : "#F8FAFC", border: `1.5px solid ${hoyEs ? "#34D399" : proximo ? "#BFDBFE" : "#E5E7EB"}`, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: hoyEs ? "#34D399" : "#e0f4f4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    🏥
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f.nombre}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{dia} de {MESES_NOMBRES[mes - 1]}{f.descripcion ? ` · ${f.descripcion}` : ""}</div>
                    {(hoyEs || proximo) && (
                      <div style={{ fontSize: 11, color: hoyEs ? "#065F46" : "#1D4ED8", fontWeight: 600, marginTop: 2 }}>
                        {hoyEs ? "¡Hoy!" : `En ${diasHastaCumple(dia, mes)} días`}
                      </div>
                    )}
                  </div>
                  {esCustom && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => abrirEditar(f)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }}>✎</button>
                      <button onClick={() => { if (window.confirm("¿Eliminar?")) eliminar(f.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal agregar/editar */}
      {modal && (
        <Modal title={editId ? "Editar fecha" : "Nueva fecha especial"} onClose={() => { setModal(false); setEditId(null); }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["cumpleaños","🎂 Cumpleaños"],["festivo","🏥 Día especial"]].map(([v,l]) => (
              <button key={v} type="button" onClick={() => setForm(f => ({ ...f, tipo: v }))}
                style={{ flex: 1, background: form.tipo === v ? "#1a6b6b" : "#F3F4F6", color: form.tipo === v ? "#fff" : "#555", border: "none", borderRadius: 8, padding: "8px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <Field label="Nombre *"><input style={inputStyle} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder={form.tipo === "cumpleaños" ? "Ej: Dr. García" : "Ej: Día del Fonoaudiólogo"} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Día *"><input type="number" min="1" max="31" style={inputStyle} value={form.fecha_dia} onChange={e => setForm(f => ({ ...f, fecha_dia: e.target.value }))} /></Field>
            <Field label="Mes *">
              <select style={selectStyle} value={form.fecha_mes} onChange={e => setForm(f => ({ ...f, fecha_mes: e.target.value }))}>
                <option value="">— Mes —</option>
                {MESES_NOMBRES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </Field>
            {form.tipo === "cumpleaños" && (
              <Field label="Año nac."><input type="number" min="1920" max="2010" style={inputStyle} value={form.anio} onChange={e => setForm(f => ({ ...f, anio: e.target.value }))} placeholder="Opcional" /></Field>
            )}
          </div>
          {form.tipo === "cumpleaños" && (
            <Field label="Categoría">
              <select style={selectStyle} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                <option value="profesional">Profesional derivante</option>
                <option value="paciente">Paciente</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
          )}
          <Field label="Descripción / Nota"><input style={inputStyle} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional" /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => { setModal(false); setEditId(null); }} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


function AppInner() {
  const [autenticado, setAutenticado] = useState(() => sessionStorage.getItem("sonara_auth") === "1");
  const [usuarioActual, setUsuarioActual] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("sonara_usuario") || "null"); } catch { return null; }
  });
  const [tab, setTab] = useState("turnos");
  const [pacienteAEditar, setPacienteAEditar] = useState(null);
  const db = useSupabase();
  const { data, loading, error } = db;

  if (!autenticado || !usuarioActual) return <LoginScreen onLogin={u => { setAutenticado(true); setUsuarioActual(u); }} />;
  // expose db for UndoButton

  const recVencidos = data.recordatorios.filter(r => !r.completado && r.fecha < today()).length;
  const turnosHoy = data.turnos.filter(t => t.fecha === today()).length;
  const deudaPendiente = data.compras.filter(c => c.estado === "pendiente").length;

  const TABS = [
    { id: "dashboard", label: "Inicio", icon: "🏠" },
    { id: "turnos", label: "Turnos", icon: "📅", badge: turnosHoy > 0 ? turnosHoy : null },
    { id: "pacientes", label: "Pacientes", icon: "👤" },
    { id: "ventas", label: "Ventas", icon: "🛒" },
    { id: "compras", label: "Insumos", icon: "🛍️", badge: deudaPendiente > 0 ? deudaPendiente : null, badgeColor: "#D97706" },

    { id: "estadisticas", label: "Estadísticas", icon: "📊" },
    { id: "profesionales",  label: "Profesionales",  icon: "👩‍⚕️" },
    { id: "disponibilidad", label: "Disponibilidad", icon: "🗓️" },
    { id: "fechas",         label: "Cumpleaños",    icon: "🎂" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", background: "#f0f7f7" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/logo-sonara.png" alt="Sonara Audiología" style={{ height: 90, objectFit: "contain", marginBottom: 24 }} />
        <div style={{ fontSize: 14, color: "#1a6b6b", marginTop: 8, fontWeight: 600 }}>Cargando...</div>
        <div style={{ width: 200, height: 3, background: "#e0f0f0", borderRadius: 10, margin: "12px auto 0", overflow: "hidden" }}>
          <div style={{ width: "60%", height: "100%", background: "#b5cc2e", borderRadius: 10, animation: "none" }} />
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#DC2626" }}>Error de conexión</div>
        <div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>No se pudo conectar con la base de datos.</div>
        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", marginTop: 16, fontSize: 12, color: "#555", textAlign: "left" }}>{error}</div>
      </div>
    </div>
  );

  const saldoPaciente = (pacId) => data.compras
    .filter(c => c.paciente_id === pacId && c.estado === "pendiente")
    .reduce((s, c) => s + ((parseFloat(c.total) || 0) - (parseFloat(c.seña) || 0)), 0);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 960, margin: "0 auto", paddingBottom: 40, minWidth: 0 }}>
      <div style={{ background: "#fff", padding: "12px 28px", borderBottom: "3px solid #1a6b6b", boxShadow: "0 2px 12px rgba(26,107,107,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/logo-sonara.png" alt="Sonara Audiología" style={{ height: 56, objectFit: "contain" }} />
          <div style={{ width: 1, height: 36, background: "#e0f0f0" }} />
          <div style={{ color: "#1a6b6b", fontSize: 12, letterSpacing: 1, fontWeight: 600, opacity: 0.7 }}>Sistema de Gestión</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "10px 16px", background: "#fff", borderBottom: "2px solid #e0f0f0", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ position: "relative", background: tab === t.id ? "#1a6b6b" : "transparent", color: tab === t.id ? "#fff" : "#555", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
            {t.badge && <span style={{ position: "absolute", top: 2, right: 2, background: t.badgeColor || "#4338CA", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>{t.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding: "12px 10px" }}>
        {tab === "dashboard"     && <Dashboard data={data} onNavigate={id => setTab(id === "turno" ? "turnos" : id === "paciente" ? "pacientes" : "turnos")} />}
        {tab === "turnos"        && <Turnos data={data} db={db} saldoPaciente={saldoPaciente} usuario={usuarioActual} onNavigate={setTab} onEditarPaciente={id => { setPacienteAEditar(id); setTab("pacientes"); }} />}
        {tab === "pacientes"     && <Pacientes data={data} db={db} usuario={usuarioActual} pacienteAEditar={pacienteAEditar} onPacienteEditado={() => setPacienteAEditar(null)} />}
        {tab === "ventas"        && <Ventas data={data} db={db} usuario={usuarioActual} />}
        {tab === "compras"       && <Compras data={data} db={db} usuario={usuarioActual} />}

        {tab === "estadisticas"  && <Estadisticas data={data} />}
        {tab === "profesionales" && <Profesionales data={data} />}
        {tab === "disponibilidad" && <Disponibilidad usuario={usuarioActual} />}
        {tab === "fechas"         && <FechasEspeciales usuario={usuarioActual} />}
      </div>
    </div>
  );
}


// ─── UNDO BUTTON ──────────────────────────────────────────────────────────────
function UndoButton({ db }) {
  const [ultimo, setUltimo] = React.useState(null);

  React.useEffect(() => {
    function update() {
      const stack = window.__sonaraUndo || [];
      setUltimo(stack[0] || null);
    }
    window.addEventListener("sonara-undo-update", update);
    update();
    return () => window.removeEventListener("sonara-undo-update", update);
  }, []);

  if (!ultimo) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button onClick={() => db.deshacerUltima()}
        style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.background = "#1a6b6b"}
        onMouseLeave={e => e.currentTarget.style.background = "#1a1a2e"}>
        ↩ Deshacer
      </button>
      <div style={{ background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 11, maxWidth: 250, textAlign: "right" }}>
        {ultimo.descripcion}
      </div>
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
