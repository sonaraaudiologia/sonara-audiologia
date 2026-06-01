import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

// ─── UTILS ────────────────────────────────────────────────────────────────────
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

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#FAFAFA" };
const selectStyle = { ...inputStyle };
const btnPrimary = { background: "linear-gradient(135deg, #1a6b6b, #145555)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnSecondary = { background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" };

const COLORES_ESTADO = {
  pendiente:  { bg: "#FEF3C7", color: "#92400E", label: "Pendiente" },
  confirmado: { bg: "#D1FAE5", color: "#065F46", label: "Confirmado" },
  cancelado:  { bg: "#FEE2E2", color: "#991B1B", label: "Cancelado" },
  realizado:  { bg: "#E0F2FE", color: "#075985", label: "Realizado" },
  ausente:    { bg: "#F3F4F6", color: "#4B5563", label: "Ausente" },
};
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
      fecha_nac: pac.fechaNac || pac.fecha_nac || null,
      telefono: pac.telefono || "",
      email: pac.email || "",
      obra_social: pac.obraSocial || pac.obra_social || "",
      nro_afiliado: pac.nroAfiliado || pac.nro_afiliado || "",
      diagnostico: pac.diagnostico || "",
      antecedentes: pac.antecedentes || "",
      notas: pac.notas || "",
      derivado_por: pac.derivadoPor || pac.derivado_por || "",
      audifono: pac.audifono || "",
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
    const { error } = await supabase.from("pacientes").delete().eq("id", id);
    if (!error) setData(d => ({ ...d, pacientes: d.pacientes.filter(p => p.id !== id) }));
  }, []);

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
    };
  }

  const agregarTurno = useCallback(async (turno) => {
    const payload = toDBTurno(turno);
    const { data: row, error } = await supabase.from("turnos").insert(payload).select().single();
    if (error) { console.error("Error turno:", error); return; }
    if (!error) setData(d => ({ ...d, turnos: [...d.turnos, row] }));
  }, []);

  const actualizarTurno = useCallback(async (turno) => {
    const payload = { ...toDBTurno(turno), id: turno.id };
    const { error } = await supabase.from("turnos").update(payload).eq("id", turno.id);
    if (!error) setData(d => ({ ...d, turnos: d.turnos.map(t => t.id === turno.id ? { ...t, ...payload } : t) }));
  }, []);

  const eliminarTurno = useCallback(async (id) => {
    const { error } = await supabase.from("turnos").delete().eq("id", id);
    if (!error) setData(d => ({ ...d, turnos: d.turnos.filter(t => t.id !== id) }));
  }, []);

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
    const { error } = await supabase.from("ventas").delete().eq("id", id);
    if (!error) setData(d => ({ ...d, ventas: d.ventas.filter(v => v.id !== id) }));
  }, []);

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
    const { error } = await supabase.from("compras").update(compra).eq("id", compra.id);
    if (!error) setData(d => ({ ...d, compras: d.compras.map(c => c.id === compra.id ? compra : c) }));
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
    agregarTurno, actualizarTurno, eliminarTurno,
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

function Turnos({ data, db, saldoPaciente }) {
  const [vista, setVista] = useState("dia");
  const [filtroFecha, setFiltroFecha] = useState(today());
  const [semanaBase, setSemanaBase] = useState(getLunes(today()));
  const [modal, setModal] = useState(null);
  const [modalBloqueo, setModalBloqueo] = useState(false);
  const [filtroProfesional, setFiltroProfesional] = useState("todas");
  const [verHCTurno, setVerHCTurno] = useState(null);
  const [editandoPacTurno, setEditandoPacTurno] = useState(false);
  const [saving, setSaving] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [form, setForm] = useState(FORM_TURNO_VACIO);
  const [mostrarInsumos, setMostrarInsumos] = useState(false);
  const [insumoFormT, setInsumoFormT] = useState({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
  const [insumoActualT, setInsumoActualT] = useState({ nombre: "Pilas", cantidad: 1, precio: "" });
  const [mostrarNuevoPac, setMostrarNuevoPac] = useState(false);
  const [formPac, setFormPac] = useState(FORM_PAC_VACIO);
  const [busquedaPac, setBusquedaPac] = useState("");
  const [hcForm, setHcForm] = useState({ tipo: "consulta", descripcion: "", profesional: "" });

  const pacientes = data.pacientes;
  const pacientesFiltrados = pacientes.filter(p =>
    busquedaPac === "" || `${p.nombre} ${p.apellido} ${p.dni || ""}`.toLowerCase().includes(busquedaPac.toLowerCase())
  );
  const diasSemana = Array.from({ length: 6 }, (_, i) => addDays(semanaBase, i));

  function turnosDia(fecha) {
    return data.turnos.filter(t => t.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora));
  }

  const filtrarPorProf = (lista) => {
    if (filtroProfesional === "todas") return lista;
    return lista.filter(t => (t.profesional || "") === filtroProfesional);
  };

  const turnosFiltrados = filtrarPorProf(
    vista === "dia"
      ? data.turnos.filter(t => t.fecha === filtroFecha).sort((a, b) => a.hora.localeCompare(b.hora))
      : vista === "todos"
      ? [...data.turnos].sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))
      : []
  );

  const pacNombre = (id) => { const p = pacientes.find(p => p.id === id); return p ? `${p.nombre} ${p.apellido}` : "—"; };
  const pacSeleccionado = pacientes.find(p => p.id === form.paciente_id);

  async function guardar() {
    if (!form.fecha) return alert("Completá la fecha.");
    if (!form.hora) return alert("Completá la hora.");
    setSaving(true);
    try {
      if (modal === "nuevo") {
        await db.agregarTurno(form);
      } else {
        await db.actualizarTurno({ ...form, id: modal });
      }
      if (form.estado === "realizado" && hcForm.descripcion.trim()) {
        await db.agregarEntradaHC(form.paciente_id, { fecha: form.fecha, tipo: hcForm.tipo, descripcion: hcForm.descripcion, profesional: hcForm.profesional });
      }
      cerrarModal();
    } finally { setSaving(false); }
  }

  async function crearPacienteYSeleccionar() {
    if (!formPac.nombre || !formPac.apellido) return alert("Nombre y apellido son obligatorios.");
    setSaving(true);
    try {
      const np = await db.agregarPaciente(formPac);
      if (np) {
        setForm(f => ({ ...f, paciente_id: np.id }));
        setBusquedaPac(`${np.apellido} ${np.nombre}`);
      }
      setMostrarNuevoPac(false);
      setFormPac(FORM_PAC_VACIO);
    } finally { setSaving(false); }
  }

  function cerrarModal() {
    setModal(null); setMostrarNuevoPac(false); setBusquedaPac("");
    setHcForm({ tipo: "consulta", descripcion: "", profesional: "" });
    setMostrarInsumos(false);
    setEditandoPacTurno(false);
    setInsumoFormT({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
  }

  function editar(t) { 
    const practicas = Array.isArray(t.practicas) && t.practicas.length > 0 
      ? t.practicas 
      : (t.motivo ? [t.motivo] : []);
    setForm({ ...t, paciente_id: t.paciente_id || "", practicas }); 
    cerrarModal(); 
    setModal(t.id); 
  }
  function nuevo(fechaPreset, horaPreset) {
    const f = fechaPreset || (vista === "dia" ? filtroFecha : today());
    const h = horaPreset || "09:00";
    setForm({ ...FORM_TURNO_VACIO, fecha: f, hora: h, hora_fin: calcularHoraFin(h, ""), practicas: [] });
    cerrarModal(); setModal("nuevo");
  }

  const semanaLabel = (() => {
    const fin = addDays(semanaBase, 5);
    return parseInt(semanaBase.split("-")[1]) === parseInt(fin.split("-")[1])
      ? `${numDia(semanaBase)} – ${numDia(fin)} ${mesCorto(fin)}`
      : `${numDia(semanaBase)} ${mesCorto(semanaBase)} – ${numDia(fin)} ${mesCorto(fin)}`;
  })();

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {/* Fila 1: vistas + fecha/semana */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 9, padding: 3 }}>
            {[["dia","Día"],["semana","Semana"],["todos","Todos"]].map(([v, l]) => (
              <button key={v} onClick={() => setVista(v)} style={{ background: vista === v ? "#1a6b6b" : "transparent", color: vista === v ? "#fff" : "#555", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          {vista === "dia" && <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} style={{ ...inputStyle, width: "auto", flex: 1, maxWidth: 160 }} />}
          {vista === "semana" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setSemanaBase(addDays(semanaBase, -7))} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 16 }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{semanaLabel}</span>
              <button onClick={() => setSemanaBase(addDays(semanaBase, 7))} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 16 }}>›</button>
              <button onClick={() => setSemanaBase(getLunes(today()))} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 11 }}>Hoy</button>
            </div>
          )}
        </div>
        {/* Fila 2: filtros + acciones */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", gap: 3, background: "#F3F4F6", borderRadius: 8, padding: 3 }}>
            {[["todas","Todas"],["Lic. Cecilia Miatello","Miatello"],["Lic. Graciela Valles","Valles"]].map(([v,l]) => (
              <button key={v} type="button" onClick={() => setFiltroProfesional(v)} style={{
                background: filtroProfesional === v ? "#1a6b6b" : "transparent",
                color: filtroProfesional === v ? "#fff" : "#555",
                border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer"
              }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setModalBloqueo(true)} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔒</button>
            <button onClick={() => nuevo()} style={{ ...btnPrimary, padding: "7px 14px", fontSize: 13 }}>+ Turno</button>
          </div>
        </div>
      </div>

      {vista === "dia" && (() => {
        const SLOT_H = 52; // px por cada media hora
        const HORA_INICIO = 8;
        const HORA_FIN = 20;
        const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * 2; // 24 slots de 30min
        const HORAS = Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
          const h = HORA_INICIO + Math.floor(i / 2);
          const m = i % 2 === 0 ? "00" : "30";
          return `${String(h).padStart(2,"0")}:${m}`;
        });

        // Calcular posición y altura de cada turno
        function turnoLayout(t) {
          const inicio = horaAMin(t.hora);
          const fin = t.hora_fin ? horaAMin(t.hora_fin) : inicio + 30;
          const top = (inicio - HORA_INICIO * 60) / 30 * SLOT_H;
          const height = Math.max((fin - inicio) / 30 * SLOT_H, SLOT_H);
          return { top, height };
        }

        // Detectar solapamientos y asignar columnas
        function asignarColumnas(turnos) {
          const sorted = [...turnos].sort((a, b) => horaAMin(a.hora) - horaAMin(b.hora));

          // Assign column index to each turno
          const colFin = []; // tracks when each column is free
          const withCols = sorted.map(t => {
            const ini = horaAMin(t.hora);
            const fin = t.hora_fin ? horaAMin(t.hora_fin) : ini + 30;
            let col = 0;
            while (colFin[col] !== undefined && colFin[col] > ini) col++;
            colFin[col] = fin;
            return { ...t, _col: col };
          });

          // For each turno, find max concurrent columns in its time range
          return withCols.map(t => {
            const ini = horaAMin(t.hora);
            const fin = t.hora_fin ? horaAMin(t.hora_fin) : ini + 30;
            const concurrent = withCols.filter(u => {
              const ui = horaAMin(u.hora);
              const uf = u.hora_fin ? horaAMin(u.hora_fin) : ui + 30;
              return ui < fin && uf > ini;
            });
            return { ...t, _totalCols: concurrent.length };
          });
        }

        const turnosConLayout = asignarColumnas(turnosFiltrados.filter(t => !(t.motivo||"").includes("BLOQUEADO")));
        const bloqueados = turnosFiltrados.filter(t => (t.motivo||"").includes("BLOQUEADO"));
        const recsDelDia = data.recordatorios.filter(r => r.fecha === filtroFecha && !r.completado);
        const totalHeight = TOTAL_SLOTS * SLOT_H;

        return (
          <div>
            <div style={{ display: "flex", gap: 12 }}>
              {/* Grilla principal */}
              <div style={{ flex: 1, border: "1.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                <div style={{ position: "relative", height: totalHeight }}>
                  {/* Líneas de hora */}
                  {HORAS.map((h, i) => {
                    const esMediaHora = i % 2 !== 0;
                    const top = i * SLOT_H;
                    return (
                      <div key={h} style={{ position: "absolute", top, left: 0, right: 0, height: SLOT_H, display: "flex", pointerEvents: "none", zIndex: 1 }}>
                        <div style={{ width: 52, flexShrink: 0, borderRight: "1.5px solid #E5E7EB", background: esMediaHora ? "#FAFAFA" : "#F8FAFC", display: "flex", alignItems: "flex-start", paddingTop: 4, paddingLeft: 8 }}>
                          {!esMediaHora && <span style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{h}</span>}
                        </div>
                        <div style={{ flex: 1, borderBottom: `1px solid ${esMediaHora ? "#F5F5F5" : "#E5E7EB"}`, background: esMediaHora ? "#FAFAFA" : "#fff" }} />
                      </div>
                    );
                  })}

                  {/* Zona clickeable para nuevo turno */}
                  {HORAS.map((h, i) => {
                    const esMediaHora = i % 2 !== 0;
                    const top = i * SLOT_H;
                    const hayTurno = turnosConLayout.some(t => (t.hora||"").slice(0,5) === h);
                    if (hayTurno) return null;
                    return (
                      <div key={"click-"+h} onClick={() => nuevo(filtroFecha, h)}
                        style={{ position: "absolute", top, left: 52, right: 0, height: SLOT_H, zIndex: 2, cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.opacity = "0.7"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "1"; }}
                      />
                    );
                  })}

                  {/* Bloqueados */}
                  {bloqueados.map(t => {
                    const { top, height } = turnoLayout(t);
                    return (
                      <div key={t.id} style={{ position: "absolute", top: top + 2, left: 54, right: 4, height: height - 4, zIndex: 3,
                        background: "repeating-linear-gradient(45deg,#FEE2E2,#FEE2E2 5px,#fff 5px,#fff 10px)",
                        border: "1.5px solid #FECACA", borderRadius: 8, padding: "4px 8px", overflow: "hidden", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#991B1B" }}>🔒 {t.hora?.slice(0,5)}–{t.hora_fin?.slice(0,5)} BLOQUEADO</div>
                          <div style={{ fontSize: 10, color: "#991B1B" }}>{t.profesional || "Ambas"}</div>
                        </div>
                        <button onClick={() => db.eliminarTurno(t.id)} style={{ background: "#FEE2E2", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#991B1B", cursor: "pointer" }}>✕</button>
                      </div>
                    );
                  })}

                  {/* Turnos con layout */}
                  {turnosConLayout.map(t => {
                    const { top, height } = turnoLayout(t);
                    const totalCols = Math.max(t._totalCols || 1, 1);
                    const col = t._col || 0;
                    const pctW = (100 / totalCols);
                    const leftVal = `calc(56px + ${col * pctW}% - ${col * 56 / totalCols}px)`;
                    const widthVal = `calc(${pctW}% - ${56 / totalCols}px - 3px)`;
                    const cm = colorPorMotivo(t.practicas, t.motivo);
                    const saldo = saldoPaciente ? saldoPaciente(t.paciente_id) : 0;
                    const practicasTexto = Array.isArray(t.practicas) && t.practicas.length > 0 ? t.practicas.join(" · ") : (t.motivo || "");
                    return (
                      <div key={t.id} style={{
                        position: "absolute", top: top + 2, left: leftVal, width: widthVal,
                        height: height - 4, zIndex: 4,
                        background: cm.bg, border: `1.5px solid ${saldo > 0 ? "#FCD34D" : cm.border}`,
                        borderRadius: 8, padding: "4px 8px", overflow: "hidden", cursor: "pointer",
                        boxSizing: "border-box",
                      }}>
                        <div onClick={() => editar(t)} style={{ height: "100%", overflow: "hidden" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: cm.text }}>
                            {t.hora?.slice(0,5)}{t.hora_fin ? `–${t.hora_fin.slice(0,5)}` : ""}
                            {saldo > 0 && <span style={{ marginLeft: 4, fontSize: 10 }}>💰</span>}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {pacNombre(t.paciente_id) !== "—" ? pacNombre(t.paciente_id) : "Sin paciente"}
                          </div>
                          {height > 50 && <div style={{ fontSize: 11, color: cm.text, opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{practicasTexto}</div>}
                          {height > 70 && t.profesional && <div style={{ fontSize: 10, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.profesional}</div>}
                        </div>
                        <div style={{ position: "absolute", top: 3, right: 3, display: "flex", gap: 2 }}>
                          <button onClick={e => { e.stopPropagation(); editar(t); }} style={{ background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 3, padding: "2px 6px", fontSize: 10, cursor: "pointer", color: cm.text, fontWeight: 700 }}>✎</button>
                          <button onClick={e => { e.stopPropagation(); if(window.confirm("¿Eliminar turno?")) db.eliminarTurno(t.id); }} style={{ background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 3, padding: "2px 6px", fontSize: 10, cursor: "pointer", color: "#DC2626", fontWeight: 700 }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recordatorios al pie */}
            {recsDelDia.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>🔔 Recordatorios del día</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {recsDelDia.sort((a,b) => (a.hora||"").localeCompare(b.hora||"")).map(r => (
                    <div key={r.id} style={{ background: "#F3F4F6", border: "1.5px solid #D1D5DB", borderRadius: 9, padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#4B5563" }}>🔔 {r.hora?.slice(0,5)} · {r.titulo}</div>
                        {r.descripcion && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{r.descripcion}</div>}
                      </div>
                      <button onClick={() => db.actualizarRecordatorio({ ...r, completado: true })} style={{ background: "#E5E7EB", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#374151", cursor: "pointer" }}>✓ Listo</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {vista === "semana" && (() => {
        const SLOT_H = 48;
        const HORA_INICIO = 8;
        const HORA_FIN = 20;
        const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * 2;
        const HORAS = Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
          const h = HORA_INICIO + Math.floor(i / 2);
          const m = i % 2 === 0 ? "00" : "30";
          return `${String(h).padStart(2,"0")}:${m}`;
        });
        const totalHeight = TOTAL_SLOTS * SLOT_H;

        function turnoLayoutS(t) {
          const inicio = horaAMin(t.hora);
          const fin = t.hora_fin ? horaAMin(t.hora_fin) : inicio + 30;
          const top = (inicio - HORA_INICIO * 60) / 30 * SLOT_H;
          const height = Math.max((fin - inicio) / 30 * SLOT_H, SLOT_H);
          return { top, height };
        }

        function asignarColsS(turnos) {
          const sorted = [...turnos].sort((a,b) => horaAMin(a.hora) - horaAMin(b.hora));
          const colFin = [];
          const withCols = sorted.map(t => {
            const ini = horaAMin(t.hora);
            const fin = t.hora_fin ? horaAMin(t.hora_fin) : ini + 30;
            let col = 0;
            while (colFin[col] !== undefined && colFin[col] > ini) col++;
            colFin[col] = fin;
            return { ...t, _col: col };
          });
          return withCols.map(t => {
            const ini = horaAMin(t.hora);
            const fin = t.hora_fin ? horaAMin(t.hora_fin) : ini + 30;
            const concurrent = withCols.filter(u => {
              const ui = horaAMin(u.hora); const uf = u.hora_fin ? horaAMin(u.hora_fin) : ui + 30;
              return ui < fin && uf > ini;
            });
            return { ...t, _totalCols: concurrent.length };
          });
        }

        return (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: Math.max(window.innerWidth - 32, 760), border: "1.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              {/* Header días */}
              <div style={{ display: "grid", gridTemplateColumns: "44px repeat(6, minmax(100px, 1fr))", borderBottom: "2px solid #E5E7EB" }}>
                <div style={{ background: "#F8FAFC", borderRight: "1.5px solid #E5E7EB" }} />
                {diasSemana.map(fecha => {
                  const hoy = fecha === today();
                  const ts = filtrarPorProf(data.turnos.filter(t => t.fecha === fecha));
                  const bloqueados = ts.filter(t => (t.motivo||"").includes("BLOQUEADO"));
                  const normales = ts.filter(t => !(t.motivo||"").includes("BLOQUEADO"));
                  return (
                    <div key={fecha} onClick={() => { setVista("dia"); setFiltroFecha(fecha); }}
                      style={{ background: hoy ? "#1a1a2e" : bloqueados.length > 0 ? "#FEE2E2" : "#F8FAFC", padding: "7px 4px", textAlign: "center", cursor: "pointer", borderRight: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: hoy ? "rgba(255,255,255,0.6)" : bloqueados.length > 0 ? "#991B1B" : "#888" }}>{nombreDia(fecha)}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: hoy ? "#fff" : bloqueados.length > 0 ? "#991B1B" : "#1a1a2e" }}>{numDia(fecha)}</div>
                      <div style={{ fontSize: 9, color: hoy ? "rgba(255,255,255,0.5)" : "#6366F1" }}>
                        {normales.length > 0 && `${normales.length}t`}{bloqueados.length > 0 && " 🔒"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cuerpo: posicionamiento absoluto por columna día */}
              <div style={{ display: "grid", gridTemplateColumns: "44px repeat(6, minmax(100px, 1fr))" }}>
                {/* Columna horas */}
                <div style={{ borderRight: "1.5px solid #E5E7EB", position: "relative", height: totalHeight, background: "#F8FAFC" }}>
                  {HORAS.map((h, i) => {
                    const esM = i % 2 !== 0;
                    return (
                      <div key={h} style={{ position: "absolute", top: i * SLOT_H, left: 0, right: 0, height: SLOT_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 4, paddingTop: 2, borderBottom: `1px solid ${esM ? "#F0F0F0" : "#E5E7EB"}`, background: esM ? "#FAFAFA" : "#F8FAFC" }}>
                        {!esM && <span style={{ fontSize: 9, fontWeight: 700, color: "#aaa" }}>{h}</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Columnas por día */}
                {diasSemana.map(fecha => {
                  const todosDelDia = filtrarPorProf(data.turnos.filter(t => t.fecha === fecha));
                  const normales = asignarColsS(todosDelDia.filter(t => !(t.motivo||"").includes("BLOQUEADO")));
                  const bloqueados = todosDelDia.filter(t => (t.motivo||"").includes("BLOQUEADO"));
                  const recsD = data.recordatorios.filter(r => r.fecha === fecha && !r.completado);
                  return (
                    <div key={fecha} style={{ position: "relative", height: totalHeight, borderRight: "1px solid #EFEFEF" }}>
                      {/* Líneas de fondo */}
                      {HORAS.map((h, i) => {
                        const esM = i % 2 !== 0;
                        return (
                          <div key={h} onClick={() => nuevo(fecha, h)}
                            style={{ position: "absolute", top: i * SLOT_H, left: 0, right: 0, height: SLOT_H, borderBottom: `1px solid ${esM ? "#F9F9F9" : "#F0F0F0"}`, background: esM ? "#FAFAFA" : "#fff", cursor: "pointer", zIndex: 1 }}
                            onMouseEnter={e => e.currentTarget.style.background = "#EEF2FF"}
                            onMouseLeave={e => e.currentTarget.style.background = esM ? "#FAFAFA" : "#fff"}
                          />
                        );
                      })}

                      {/* Bloqueados */}
                      {bloqueados.map(t => {
                        const { top, height } = turnoLayoutS(t);
                        return (
                          <div key={t.id} style={{ position: "absolute", top: top + 1, left: 1, right: 1, height: height - 2, zIndex: 3,
                            background: "repeating-linear-gradient(45deg,#FEE2E2,#FEE2E2 4px,#fff 4px,#fff 8px)",
                            border: "1px solid #FECACA", borderRadius: 5, overflow: "hidden", padding: "2px 4px" }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: "#991B1B" }}>🔒 {t.hora?.slice(0,5)}</div>
                          </div>
                        );
                      })}

                      {/* Turnos normales */}
                      {normales.map(t => {
                        const { top, height } = turnoLayoutS(t);
                        const totalCols = Math.max(t._totalCols || 1, 1);
                        const col = t._col || 0;
                        const pct = 100 / totalCols;
                        const cm = colorPorMotivo(t.practicas, t.motivo);
                        const pac = pacientes.find(p => p.id === t.paciente_id);
                        return (
                          <div key={t.id} style={{
                            position: "absolute",
                            top: top + 1,
                            left: `${col * pct}%`,
                            width: `calc(${pct}% - 2px)`,
                            height: height - 2,
                            zIndex: 4,
                            background: cm.bg,
                            border: `1.5px solid ${cm.border}`,
                            borderRadius: 5,
                            overflow: "hidden",
                            padding: "2px 4px",
                            cursor: "pointer",
                            boxSizing: "border-box",
                          }}>
                            <div onClick={() => editar(t)} style={{ position: "absolute", top: 1, left: 2, right: 2, bottom: 14, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 0 }}>
                              <div style={{ fontSize: 8, fontWeight: 800, color: cm.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                                {t.hora?.slice(0,5)}{t.hora_fin ? `–${t.hora_fin.slice(0,5)}` : ""}
                              </div>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                                {pac ? `${pac.apellido || ""} ${pac.nombre || ""}`.trim() || "Sin paciente" : "Sin paciente"}
                              </div>
                              <div style={{ fontSize: 8, color: cm.text, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2, fontWeight: 600 }}>
                                {Array.isArray(t.practicas) && t.practicas.length > 0 ? t.practicas[0] : (t.motivo || "")}
                              </div>
                            </div>
                            {/* Botones acción */}
                            <div style={{ position: "absolute", bottom: 1, left: 1, right: 1, display: "flex", gap: 2 }}>
                              <button onClick={e => { e.stopPropagation(); editar(t); }}
                                style={{ flex: 1, background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 2, fontSize: 8, cursor: "pointer", color: cm.text, padding: "1px 0", fontWeight: 700 }}>✎</button>
                              <button onClick={e => { e.stopPropagation(); if(window.confirm("¿Eliminar?")) db.eliminarTurno(t.id); }}
                                style={{ flex: 1, background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 2, fontSize: 8, cursor: "pointer", color: "#DC2626", padding: "1px 0", fontWeight: 700 }}>✕</button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Recordatorios — pequeño indicador al pie */}
                      {recsD.length > 0 && (
                        <div style={{ position: "absolute", bottom: 2, left: 2, right: 2, zIndex: 5 }}>
                          {recsD.slice(0,2).map(r => (
                            <div key={r.id} style={{ background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 3, padding: "1px 4px", fontSize: 8, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 1 }}>
                              🔔 {r.titulo}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {vista === "todos" && (turnosFiltrados.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>📅</div><div>No hay turnos</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{turnosFiltrados.map(t => <TarjetaTurno key={t.id} t={t} pacNombre={pacNombre} onEditar={editar} onEliminar={(id) => db.eliminarTurno(id)} mostrarFecha={true} saldoPaciente={saldoPaciente} />)}</div>
      )}

      {modalBloqueo && <ModalBloqueo onClose={() => setModalBloqueo(false)} db={db} fechaInicial={vista === "dia" ? filtroFecha : today()} />}

      {/* HC rápida desde turno */}
      {verHCTurno && (() => {
        const pac = pacientes.find(p => p.id === verHCTurno);
        if (!pac) return null;
        const TIPO_HC = { consulta: "🩺", estudio: "📋", adaptacion: "👂", venta: "🛒", otro: "📌" };
        const comprasPac = data.compras.filter(c => c.paciente_id === verHCTurno).map(c => ({
          id: c.id, fecha: c.fecha, _tipo: "compra",
          descripcion: `Insumos: ${(c.insumos||[]).map(i => i.nombre).join(", ")} · $${(parseFloat(c.total)||0).toLocaleString("es-AR")}`,
          tipo: c.estado === "pagado" ? "✅ Insumo pagado" : "🛍️ Insumo pendiente"
        }));
        const ventasPac = data.ventas.filter(v => v.paciente_id === verHCTurno).map(v => ({
          id: v.id, fecha: v.fecha, _tipo: "venta",
          descripcion: `${v.dispositivo||""} ${v.marca||""} ${v.modelo||""} · $${(parseFloat(v.precio)||0).toLocaleString("es-AR")}`,
          tipo: `🛒 Venta: ${v.estado}`
        }));
        const recsPac = data.recordatorios.filter(r => r.paciente_id === verHCTurno).map(r => ({
          id: r.id, fecha: r.fecha, _tipo: "rec",
          descripcion: r.descripcion || r.titulo,
          tipo: `🔔 ${r.titulo}`
        }));
        const historia = [...(pac.historia||[]).map(e => ({...e, _tipo:"hc"})), ...comprasPac, ...ventasPac, ...recsPac]
          .filter(e => e.fecha).sort((a,b) => b.fecha.localeCompare(a.fecha));
        const colores = { hc: { bg: "#F0FDF4", border: "#BBF7D0" }, compra: { bg: "#FEF3C7", border: "#FDE68A" }, rec: { bg: "#EDE9FE", border: "#C4B5FD" }, venta: { bg: "#E0F2FE", border: "#BAE6FD" } };
        return (
          <Modal title={`HC · ${pac.apellido}, ${pac.nombre}`} onClose={() => setVerHCTurno(null)}>
            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>📞 {pac.telefono||"—"}{pac.telefono && <CopyButton text={pac.telefono} label="tel" />}</div>
                <div>🏥 {pac.obraSocial||pac.obra_social||"Particular"}</div>
                {pac.diagnostico && <div style={{ gridColumn: "span 2" }}>🩺 {pac.diagnostico}</div>}
                {pac.audifono && <div style={{ gridColumn: "span 2" }}>👂 {pac.audifono}</div>}
                {(pac.derivadoPor||pac.derivado_por) && <div style={{ gridColumn: "span 2" }}>Derivado: {pac.derivadoPor||pac.derivado_por}</div>}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Historial completo</div>
            {historia.length === 0
              ? <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Sin entradas</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
                {historia.map(ev => {
                  const c = colores[ev._tipo] || colores.hc;
                  return (
                    <div key={ev._tipo+ev.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{ev.tipo}</span>
                        <span style={{ fontSize: 11, color: "#888" }}>{formatFecha(ev.fecha)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13 }}>{ev.descripcion}</p>
                      {ev.profesional && <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{ev.profesional}</div>}
                    </div>
                  );
                })}
              </div>
            }
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setVerHCTurno(null)} style={btnSecondary}>Cerrar</button>
            </div>
          </Modal>
        );
      })()}

      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo turno" : "Editar turno"} onClose={cerrarModal}>
          {/* Paciente */}
          <div style={{ background: "#F8FAFC", border: `1.5px solid ${!form.paciente_id && "nuevo" === modal ? "#FCA5A5" : "#E5E7EB"}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>👤 Paciente <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>(opcional para visitas/reuniones)</span></span>
              {!mostrarNuevoPac && <button onClick={() => { setMostrarNuevoPac(true); setForm(f => ({ ...f, paciente_id: "" })); }} style={{ background: "#EEF2FF", color: "#4338CA", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Crear nuevo</button>}
            </div>
            {!mostrarNuevoPac ? (
              pacSeleccionado ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#EEF2FF", borderRadius: 8, padding: "10px 14px" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#3730A3" }}>{pacSeleccionado.apellido}, {pacSeleccionado.nombre}</div>
                      <div style={{ fontSize: 12, color: "#6366F1" }}>DNI: {pacSeleccionado.dni || "—"} · {pacSeleccionado.telefono || "Sin teléfono"}</div>
                    </div>
                    <button onClick={() => { setForm(f => ({ ...f, paciente_id: "" })); setBusquedaPac(""); }} style={{ background: "none", border: "none", color: "#6366F1", fontSize: 18, cursor: "pointer" }}>×</button>
                  </div>
                  {/* Editar datos del paciente desde turno */}
                  <div style={{ marginTop: 8, background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#555" }}>Datos del paciente</div>
                      <button type="button" onClick={() => setEditandoPacTurno(!editandoPacTurno)}
                        style={{ background: editandoPacTurno ? "#EEF2FF" : "#F3F4F6", color: "#4338CA", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {editandoPacTurno ? "✓ Cerrar" : "✏️ Editar"}
                      </button>
                    </div>
                    {!editandoPacTurno ? (
                      <div style={{ fontSize: 12, color: "#555" }}>
                        <div>📞 {pacSeleccionado.telefono || "—"}</div>
                        <div>🏥 {pacSeleccionado.obraSocial || pacSeleccionado.obra_social || "Particular"}</div>
                        {(pacSeleccionado.derivadoPor || pacSeleccionado.derivado_por) && <div>Derivado: {pacSeleccionado.derivadoPor || pacSeleccionado.derivado_por}</div>}
                        {pacSeleccionado.audifono && <div>👂 {pacSeleccionado.audifono}</div>}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
                          <Field label="Teléfono"><input style={inputStyle} defaultValue={pacSeleccionado.telefono || ""} id="edit-tel-turno" /></Field>
                          <Field label="Email"><input style={inputStyle} defaultValue={pacSeleccionado.email || ""} id="edit-email-turno" /></Field>
                          <Field label="Obra social"><input style={inputStyle} defaultValue={pacSeleccionado.obraSocial || pacSeleccionado.obra_social || ""} id="edit-os-turno" /></Field>
                          <Field label="Audífono"><input style={inputStyle} defaultValue={pacSeleccionado.audifono || ""} id="edit-audio-turno" /></Field>
                        </div>
                        <Field label="Derivado por">
                          <DerivadoPorSelector
                            value={pacSeleccionado.derivadoPor || pacSeleccionado.derivado_por || ""}
                            onChange={async (v) => { await db.actualizarPaciente({ ...pacSeleccionado, derivadoPor: v }); }}
                          />
                        </Field>
                        <button type="button" onClick={async () => {
                          await db.actualizarPaciente({
                            ...pacSeleccionado,
                            telefono: document.getElementById("edit-tel-turno")?.value || pacSeleccionado.telefono,
                            email: document.getElementById("edit-email-turno")?.value || pacSeleccionado.email,
                            obraSocial: document.getElementById("edit-os-turno")?.value || pacSeleccionado.obraSocial,
                            audifono: document.getElementById("edit-audio-turno")?.value || pacSeleccionado.audifono,
                          });
                          setEditandoPacTurno(false);
                          alert("✅ Datos del paciente actualizados.");
                        }} style={{ ...btnPrimary, width: "100%", padding: "8px", fontSize: 12, marginTop: 6 }}>
                          Guardar cambios del paciente
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 6, background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6 }}>Etiquetas del paciente</div>
                    <EtiquetasInline
                      seleccionadas={pacSeleccionado.etiquetas || []}
                      onChange={async (nuevasEtiquetas) => {
                        await db.actualizarPaciente({ ...pacSeleccionado, etiquetas: nuevasEtiquetas });
                      }}
                    />
                  </div>
                  {saldoPaciente && saldoPaciente(pacSeleccionado.id) > 0 && (
                    <div style={{ background: "#FEF3C7", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "8px 14px", marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>💰</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Tiene saldo pendiente de insumos</div>
                        <div style={{ fontSize: 12, color: "#92400E" }}>Debe: ${saldoPaciente(pacSeleccionado.id).toLocaleString("es-AR")}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Buscar por nombre o DNI..." value={busquedaPac} onChange={e => setBusquedaPac(e.target.value)} />
                  {busquedaPac.length > 0 && (
                    <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, maxHeight: 160, overflowY: "auto", background: "#fff" }}>
                      {pacientesFiltrados.length === 0
                        ? <div style={{ padding: "10px 14px", fontSize: 13, color: "#aaa" }}>No encontrado. <button onClick={() => setMostrarNuevoPac(true)} style={{ background: "none", border: "none", color: "#4338CA", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>¿Crear nuevo?</button></div>
                        : pacientesFiltrados.map(p => {
                            const deuda = saldoPaciente ? saldoPaciente(p.id) : 0;
                            return (
                              <div key={p.id} onClick={() => { setForm(f => ({ ...f, paciente_id: p.id })); setBusquedaPac(""); }}
                                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", fontSize: 14, background: deuda > 0 ? "#FFFBEB" : "transparent" }}
                                onMouseEnter={e => e.currentTarget.style.background = deuda > 0 ? "#FEF3C7" : "#F0F4FF"}
                                onMouseLeave={e => e.currentTarget.style.background = deuda > 0 ? "#FFFBEB" : "transparent"}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div>
                                    <span style={{ fontWeight: 600 }}>{p.apellido}, {p.nombre}</span>
                                    <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>DNI: {p.dni || "—"}</span>
                                  </div>
                                  {deuda > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", background: "#FEF3C7", borderRadius: 6, padding: "2px 8px" }}>💰 Debe ${deuda.toLocaleString("es-AR")}</span>}
                                </div>
                              </div>
                            );
                          })}
                    </div>
                  )}
                  {busquedaPac.length === 0 && <div style={{ fontSize: 12, color: "#aaa" }}>Escribí para buscar entre {pacientes.length} paciente{pacientes.length !== 1 ? "s" : ""}.</div>}
                </>
              )
            ) : (
              <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>✦ Nuevo paciente</span>
                  <button onClick={() => setMostrarNuevoPac(false)} style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer" }}>← Volver</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Nombre *"><input style={inputStyle} value={formPac.nombre} onChange={e => setFormPac(f => ({ ...f, nombre: e.target.value }))} /></Field>
                  <Field label="Apellido *"><input style={inputStyle} value={formPac.apellido} onChange={e => setFormPac(f => ({ ...f, apellido: e.target.value }))} /></Field>
                  <Field label="DNI"><input style={inputStyle} value={formPac.dni} onChange={e => setFormPac(f => ({ ...f, dni: e.target.value }))} /></Field>
                  <Field label="Teléfono"><input style={inputStyle} value={formPac.telefono} onChange={e => setFormPac(f => ({ ...f, telefono: e.target.value }))} /></Field>
                  <Field label="Obra social"><input style={inputStyle} value={formPac.obraSocial} onChange={e => setFormPac(f => ({ ...f, obraSocial: e.target.value }))} /></Field>
                  <Field label="Fecha de nac."><input type="date" style={inputStyle} value={formPac.fechaNac} onChange={e => setFormPac(f => ({ ...f, fechaNac: e.target.value }))} /></Field>
                </div>
                <Field label="Diagnóstico"><input style={inputStyle} value={formPac.diagnostico} onChange={e => setFormPac(f => ({ ...f, diagnostico: e.target.value }))} /></Field>
                <Field label="Derivado por">
                  <DerivadoPorSelector
                    value={formPac.derivadoPor || ""}
                    onChange={v => setFormPac(f => ({ ...f, derivadoPor: v }))}
                  />
                </Field>
                <Field label="Audífono actual (marca/modelo)">
                  <input style={inputStyle} value={formPac.audifono || ""} onChange={e => setFormPac(f => ({ ...f, audifono: e.target.value }))} placeholder="Ej: Oticon More 1" />
                </Field>
                <button onClick={crearPacienteYSeleccionar} disabled={saving} style={{ ...btnPrimary, background: "linear-gradient(135deg,#065F46,#059669)", width: "100%", marginTop: 4 }}>✓ Crear y asignar al turno</button>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Fecha *"><input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
            <Field label="Hora inicio *"><input type="time" style={inputStyle} value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value, hora_fin: calcularHoraFin(e.target.value, f.motivo) }))} /></Field>
            <Field label="Hora fin"><input type="time" style={inputStyle} value={form.hora_fin || ""} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} /></Field>
          </div>
          <Field label="Prácticas">
            <SelectorPracticas
              seleccionadas={form.practicas || (form.motivo ? [form.motivo] : [])}
              onChange={practicas => setForm(f => ({ ...f, practicas, motivo: practicas[0] || "" }))}
            />
          </Field>
          <Field label="Profesional">
            <select style={selectStyle} value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))}>
              <option value="">— Sin asignar —</option>
              <option>Lic. Cecilia Miatello</option>
              <option>Lic. Graciela Valles</option>
            </select>
          </Field>
          <Field label="Estado">
            <select style={selectStyle} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
              {Object.entries(COLORES_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>

          {form.estado === "realizado" && form.paciente_id && (
            <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "14px 16px", marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>📋</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>Registrar en historia clínica</div>
                  <div style={{ fontSize: 12, color: "#16A34A" }}>Completá la evolución antes de guardar (opcional)</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <Field label="Tipo">
                  <select style={{ ...selectStyle, borderColor: "#BBF7D0", background: "#fff" }} value={hcForm.tipo} onChange={e => setHcForm(f => ({ ...f, tipo: e.target.value }))}>
                    {PRACTICAS_LISTA.map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Profesional">
                  <select style={{ ...selectStyle, borderColor: "#BBF7D0", background: "#fff" }} value={hcForm.profesional} onChange={e => setHcForm(f => ({ ...f, profesional: e.target.value }))}>
                    <option value="">— Sin asignar —</option>
                    <option>Lic. Cecilia Miatello</option>
                    <option>Lic. Graciela Valles</option>
                  </select>
                </Field>
              </div>
              <Field label="Descripción / evolución">
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70, borderColor: "#BBF7D0", background: "#fff" }} value={hcForm.descripcion} onChange={e => setHcForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Describí la evolución, indicaciones, observaciones..." />
              </Field>
              {/* Insumos inline */}
              {form.paciente_id && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#92400E" }}>¿Entregaste insumos en esta consulta?</span>
                    <button type="button" onClick={() => setMostrarInsumos(!mostrarInsumos)} style={{ background: mostrarInsumos ? "#FDE68A" : "#FEF3C7", color: "#92400E", border: "1.5px solid #FDE68A", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {mostrarInsumos ? "▲ Cerrar" : "🛍️ Cargar insumo"}
                    </button>
                  </div>
                  {mostrarInsumos && (
                    <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "12px", marginTop: 6 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                        <Field label="Insumo">
                          <select style={selectStyle} value={insumoActualT.nombre} onChange={e => setInsumoActualT(i => ({ ...i, nombre: e.target.value }))}>
                            {INSUMOS_LISTA.map(ins => <option key={ins}>{ins}</option>)}
                          </select>
                        </Field>
                        <Field label="Cant."><input type="number" min="1" style={inputStyle} value={insumoActualT.cantidad} onChange={e => setInsumoActualT(i => ({ ...i, cantidad: parseInt(e.target.value)||1 }))} /></Field>
                        <Field label="Precio $"><input type="number" style={inputStyle} value={insumoActualT.precio} onChange={e => setInsumoActualT(i => ({ ...i, precio: e.target.value }))} /></Field>
                        <button type="button" onClick={() => {
                          const nuevo = { ...insumoActualT, id: uid() };
                          const nuevosInsumos = [...insumoFormT.insumos, nuevo];
                          const nuevoTotal = nuevosInsumos.reduce((s, i) => s + (parseFloat(i.precio)||0) * (parseInt(i.cantidad)||1), 0);
                          setInsumoFormT(f => ({ ...f, insumos: nuevosInsumos, total: nuevoTotal > 0 ? String(nuevoTotal) : f.total }));
                          setInsumoActualT({ nombre: "Pilas", cantidad: 1, precio: "" });
                        }} style={{ ...btnPrimary, padding: "8px 12px", marginBottom: 14 }}>+</button>
                      </div>
                      {insumoFormT.insumos.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          {insumoFormT.insumos.map(i => (
                            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: 6, padding: "5px 10px", marginBottom: 4, fontSize: 13 }}>
                              <span>{i.nombre} x{i.cantidad}{i.precio ? ` · $${parseFloat(i.precio).toLocaleString("es-AR")}` : ""}</span>
                              <button type="button" onClick={() => {
                                const nuevos = insumoFormT.insumos.filter(x => x.id !== i.id);
                                const nuevoTotal = nuevos.reduce((s, x) => s + (parseFloat(x.precio)||0) * (parseInt(x.cantidad)||1), 0);
                                setInsumoFormT(f => ({ ...f, insumos: nuevos, total: nuevoTotal > 0 ? String(nuevoTotal) : "" }));
                              }} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16 }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <Field label="Total ($)"><input type="number" style={inputStyle} value={insumoFormT.total} onChange={e => setInsumoFormT(f => ({ ...f, total: e.target.value }))} /></Field>
                        <Field label="Seña ($)"><input type="number" style={inputStyle} value={insumoFormT.seña} onChange={e => setInsumoFormT(f => ({ ...f, seña: e.target.value }))} /></Field>
                        <Field label="Estado">
                          <select style={selectStyle} value={insumoFormT.estado} onChange={e => setInsumoFormT(f => ({ ...f, estado: e.target.value }))}>
                            <option value="pendiente">Pendiente</option>
                            <option value="pagado">Pagado</option>
                          </select>
                        </Field>
                      </div>
                      {parseFloat(insumoFormT.total) > 0 && (
                        <div style={{ background: (parseFloat(insumoFormT.total) - parseFloat(insumoFormT.seña||0)) > 0 ? "#FEF3C7" : "#D1FAE5", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: (parseFloat(insumoFormT.total) - parseFloat(insumoFormT.seña||0)) > 0 ? "#92400E" : "#065F46", marginBottom: 8 }}>
                          Saldo: ${((parseFloat(insumoFormT.total)||0) - (parseFloat(insumoFormT.seña)||0)).toLocaleString("es-AR")}
                        </div>
                      )}
                      <button type="button" onClick={async () => {
                        if (insumoFormT.insumos.length === 0) return alert("Agregá al menos un insumo.");
                        await db.agregarCompra({ ...insumoFormT, paciente_id: form.paciente_id, total: parseFloat(insumoFormT.total)||0, seña: parseFloat(insumoFormT.seña)||0, fecha: insumoFormT.fecha || form.fecha });
                        setMostrarInsumos(false);
                        setInsumoFormT({ fecha: today(), insumos: [], total: "", seña: "", estado: "pendiente", notas: "" });
                        alert("✅ Insumo guardado correctamente.");
                      }} style={{ ...btnPrimary, background: "linear-gradient(135deg,#92400E,#D97706)", width: "100%", padding: "9px" }}>
                        🛍️ Guardar insumo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
            <button onClick={cerrarModal} style={btnSecondary}>Cancelar</button>
            {form.paciente_id && (
              <button onClick={() => { cerrarModal(); setVerHCTurno(form.paciente_id); }}
                style={{ ...btnSecondary, background: "#EEF2FF", color: "#4338CA", border: "1.5px solid #C7D2FE", fontWeight: 700 }}>
                📋 Ver historia clínica
              </button>
            )}
            {modal !== "nuevo" && form.paciente_id && (
              <button onClick={async () => {
                const pac = pacientes.find(p => p.id === form.paciente_id);
                const nombre = pac ? `${pac.apellido}, ${pac.nombre}` : "Paciente";
                await db.agregarRecordatorio({
                  titulo: `Turno: ${Array.isArray(form.practicas) && form.practicas.length ? form.practicas[0] : (form.motivo || "Consulta")} · ${nombre}`,
                  fecha: form.fecha,
                  hora: form.hora || "09:00",
                  tipo: "control",
                  paciente_id: form.paciente_id,
                  descripcion: `Turno pasado a recordatorio. ${Array.isArray(form.practicas) ? form.practicas.join(", ") : ""}`,
                  completado: false,
                });
                cerrarModal();
                alert("✅ Turno pasado a recordatorio correctamente.");
              }} style={{ ...btnSecondary, background: "#EDE9FE", color: "#5B21B6", border: "1.5px solid #C4B5FD" }}>
                🔔 Pasar a recordatorio
              </button>
            )}
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── PACIENTES ────────────────────────────────────────────────────────────────
function Pacientes({ data, db }) {
  const [modal, setModal] = useState(null);
  const [verHC, setVerHC] = useState(null);
  const [verRapido, setVerRapido] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "", apellido: "", dni: "", fechaNac: "", telefono: "", email: "",
    obraSocial: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "",
    derivadoPor: "", audifono: "", etiquetas: []
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
      etiquetas: Array.isArray(p.etiquetas) ? [...p.etiquetas] : []
    });
    setModal(p.id);
  }

  async function agregarEvento() {
    if (!evForm.descripcion) return alert("Escribí una descripción.");
    setSaving(true);
    try {
      await db.agregarEntradaHC(verHC, evForm);
      setEvModal(false);
      setEvForm({ fecha: today(), tipo: "consulta", descripcion: "", profesional: "" });
    } finally { setSaving(false); }
  }

  function agregarInsumoItem() {
    if (!insumoActual.nombre) return;
    setInsumoForm(f => ({ ...f, insumos: [...f.insumos, { ...insumoActual, id: uid() }] }));
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
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
                      {p.fechaNac || p.fecha_nac ? <div style={{ fontSize: 12, color: "#888" }}>Nac: {formatFecha(p.fechaNac || p.fecha_nac)}</div> : null}
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
                    <button onClick={() => setVerHC(p.id)} style={{ ...btnPrimary, padding: "7px 12px", fontSize: 12, flex: 1 }}>📋 Historia clínica</button>
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
            <Field label="Audífono actual (marca/modelo)"><input style={inputStyle} value={form.audifono || ""} onChange={e => setForm(f => ({ ...f, audifono: e.target.value }))} placeholder="Ej: Oticon More 1" /></Field>
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
      {verHC && pacienteHC && (
        <Modal title={`Historia clínica · ${pacienteHC.apellido}, ${pacienteHC.nombre}`} onClose={() => setVerHC(null)}>
          <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
              <div><b>DNI:</b> {pacienteHC.dni || "—"}</div>
              <div><b>Nacimiento:</b> {formatFecha(pacienteHC.fechaNac)}</div>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Fecha"><input type="date" style={inputStyle} value={evForm.fecha} onChange={e => setEvForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
                <Field label="Tipo">
                  <select style={selectStyle} value={evForm.tipo} onChange={e => setEvForm(f => ({ ...f, tipo: e.target.value }))}>
                    {PRACTICAS_LISTA.map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
              </div>
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
const CONDICIONES_PAGO = ["Contado", "Cuotas sin interés", "Cuotas con interés", "Transferencia", "Cheque", "SIOS / OS directo", "Pendiente"];

function Ventas({ data, db }) {
  const [modal, setModal] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [saving, setSaving] = useState(false);
  const FORM_VENTA_VACIO = { paciente_id: "", fecha: today(), dispositivo: "Audífono", marca_der: "", modelo_der: "", marca_izq: "", modelo_izq: "", oido: "bilateral", precio: "", obraSocialCubre: "", condicion_pago_os: "", saldoPaciente: "", condicion_pago_paciente: "", estado: "presupuestado", observaciones: "" };
  const [form, setForm] = useState(FORM_VENTA_VACIO);

  const ventas = data.ventas.filter(v => !filtroEstado || v.estado === filtroEstado).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const pacNombre = (id) => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : "—"; };
  const totalVendido = data.ventas.filter(v => v.estado === "vendido").reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);

  async function guardar() {
    if (!form.paciente_id) return alert("Seleccioná un paciente.");
    setSaving(true);
    try {
      const esNueva = modal === "nuevo";
      const ventaAnterior = !esNueva && data.ventas.find(v => v.id === modal);
      const generarRec = form.estado === "vendido" && ventaAnterior?.estado !== "vendido";
      if (esNueva) await db.agregarVenta(form);
      else await db.actualizarVenta({ ...form, id: modal });
      if (generarRec) {
        const pac = data.pacientes.find(p => p.id === form.paciente_id);
        const nombre = pac ? `${pac.apellido}, ${pac.nombre}` : "Paciente";
        await db.agregarRecordatorio({ titulo: `Control 3 meses · ${nombre}`, fecha: sumarMeses(form.fecha, 3), hora: "09:00", tipo: "control", paciente_id: form.paciente_id, descripcion: `Control 3 meses. Venta: ${formatFecha(form.fecha)}.`, completado: false });
        await db.agregarRecordatorio({ titulo: `Control anual · ${nombre}`, fecha: sumarMeses(form.fecha, 12), hora: "09:00", tipo: "control", paciente_id: form.paciente_id, descripcion: `Control anual. Venta: ${formatFecha(form.fecha)}.`, completado: false });
      }
      setModal(null);
    } finally { setSaving(false); }
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
        {Object.entries(COLORES_VENTA).map(([k, v]) => (
          <div key={k} style={{ background: v.bg, border: `1.5px solid ${v.color}22`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", opacity: filtroEstado === k || filtroEstado === "" ? 1 : 0.5 }}
            onClick={() => setFiltroEstado(filtroEstado === k ? "" : k)}>
            <div style={{ fontSize: 20, fontWeight: 800, color: v.color }}>{data.ventas.filter(x => x.estado === k).length}</div>
            <div style={{ fontSize: 11, color: v.color, fontWeight: 600 }}>{v.label}</div>
          </div>
        ))}
        <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#166534" }}>${totalVendido.toLocaleString("es-AR")}</div>
          <div style={{ fontSize: 11, color: "#15803D", fontWeight: 600 }}>Total vendido</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => { setForm(FORM_VENTA_VACIO); setModal("nuevo"); }} style={btnPrimary}>+ Nueva venta</button>
      </div>

      {ventas.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>🛒</div><div>No hay ventas</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ventas.map(v => {
            const cv = COLORES_VENTA[v.estado] || { bg: "#F3F4F6", color: "#374151", label: v.estado };
            const derInfo = [v.marca_der, v.modelo_der].filter(Boolean).join(" ");
            const izqInfo = [v.marca_izq, v.modelo_izq].filter(Boolean).join(" ");
            const saldoTotal = (parseFloat(v.precio)||0) - (parseFloat(v.obraSocialCubre || v.obra_social_cubre)||0) - (parseFloat(v.saldoPaciente || v.saldo_paciente)||0);
            return (
              <div key={v.id} style={{ background: "#fff", border: `1.5px solid ${cv.color}33`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{pacNombre(v.paciente_id)}</div>
                      <span style={{ background: cv.bg, color: cv.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{cv.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#555" }}>
                      {derInfo && <span>👂D: {derInfo}</span>}
                      {izqInfo && <span>👂I: {izqInfo}</span>}
                      <span style={{ color: "#aaa" }}>{formatFecha(v.fecha)}</span>
                    </div>
                    {v.precio && (
                      <div style={{ fontSize: 13, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: "#166534" }}>Total: ${parseFloat(v.precio).toLocaleString("es-AR")}</span>
                        {(v.obraSocialCubre || v.obra_social_cubre) && <span style={{ color: "#1E40AF" }}>OS: ${parseFloat(v.obraSocialCubre || v.obra_social_cubre).toLocaleString("es-AR")}</span>}
                        {(v.saldoPaciente || v.saldo_paciente) && <span style={{ color: "#D97706" }}>Pac: ${parseFloat(v.saldoPaciente || v.saldo_paciente).toLocaleString("es-AR")}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setForm({ ...FORM_VENTA_VACIO, ...v, obraSocialCubre: v.obra_social_cubre || v.obraSocialCubre || "", saldoPaciente: v.saldo_paciente || v.saldoPaciente || "" }); setModal(v.id); }} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>Editar</button>
                    <button onClick={() => { if (window.confirm("¿Eliminar?")) db.eliminarVenta(v.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>}

      {modal && (
        <Modal title={modal === "nuevo" ? "Nueva venta / presupuesto" : "Editar venta"} onClose={() => setModal(null)}>
          {/* Paciente */}
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
                {Object.entries(COLORES_VENTA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>

          {form.estado === "vendido" && (() => {
            const anterior = modal !== "nuevo" && data.ventas.find(v => v.id === modal);
            if (anterior?.estado === "vendido") return null;
            return (
              <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8", marginBottom: 4 }}>🔔 Se crearán recordatorios automáticos</div>
                <div style={{ fontSize: 12, color: "#1E40AF" }}>
                  <div>📅 Control 3 meses · {form.fecha ? formatFecha(sumarMeses(form.fecha, 3)) : "—"}</div>
                  <div>📅 Control anual · {form.fecha ? formatFecha(sumarMeses(form.fecha, 12)) : "—"}</div>
                </div>
              </div>
            );
          })()}

          {/* Oído derecho */}
          <div style={{ height: 1, background: "#F0F0F0", margin: "10px 0 12px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>👂 Oído derecho</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <Field label="Marca"><input style={inputStyle} value={form.marca_der || ""} onChange={e => setForm(f => ({ ...f, marca_der: e.target.value }))} placeholder="Ej: Oticon" /></Field>
            <Field label="Modelo"><input style={inputStyle} value={form.modelo_der || ""} onChange={e => setForm(f => ({ ...f, modelo_der: e.target.value }))} placeholder="Ej: More 1" /></Field>
          </div>

          {/* Oído izquierdo */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>👂 Oído izquierdo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <Field label="Marca"><input style={inputStyle} value={form.marca_izq || ""} onChange={e => setForm(f => ({ ...f, marca_izq: e.target.value }))} placeholder="Ej: Oticon" /></Field>
            <Field label="Modelo"><input style={inputStyle} value={form.modelo_izq || ""} onChange={e => setForm(f => ({ ...f, modelo_izq: e.target.value }))} placeholder="Ej: More 1" /></Field>
          </div>

          {/* Precios */}
          <div style={{ height: 1, background: "#F0F0F0", margin: "10px 0 12px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>💰 Precios</div>
          <Field label="Precio total ($)"><input type="number" style={inputStyle} value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} /></Field>

          <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", marginBottom: 8 }}>Cobertura Obra Social</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Monto OS ($)"><input type="number" style={inputStyle} value={form.obraSocialCubre} onChange={e => setForm(f => ({ ...f, obraSocialCubre: e.target.value }))} /></Field>
              <Field label="Condición de pago OS">
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
              <Field label="Condición de pago paciente">
                <select style={selectStyle} value={form.condicion_pago_paciente || ""} onChange={e => setForm(f => ({ ...f, condicion_pago_paciente: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {CONDICIONES_PAGO.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Resumen */}
          {parseFloat(form.precio) > 0 && (
            <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: "#166534" }}>
                Saldo restante: ${Math.max(0, (parseFloat(form.precio)||0) - (parseFloat(form.obraSocialCubre)||0) - (parseFloat(form.saldoPaciente)||0)).toLocaleString("es-AR")}
              </span>
            </div>
          )}

          <Field label="Observaciones"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── RECORDATORIOS ────────────────────────────────────────────────────────────
function Recordatorios({ data, db }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo: "", fecha: today(), hora: "09:00", tipo: "seguimiento", paciente_id: "", descripcion: "", completado: false });

  const hoy = today();
  const recs = [...data.recordatorios].sort((a, b) => {
    if (a.completado !== b.completado) return a.completado ? 1 : -1;
    return `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`);
  });
  const pacNombre = (id) => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : null; };

  async function guardar() {
    if (!form.titulo) return alert("Escribí un título.");
    setSaving(true);
    try {
      if (modal === "nuevo") await db.agregarRecordatorio(form);
      else await db.actualizarRecordatorio({ ...form, id: modal });
      setModal(null);
    } finally { setSaving(false); }
  }

  const TIPO_COLOR = {
    seguimiento: { bg: "#EDE9FE", c: "#5B21B6", label: "Seguimiento" },
    llamada:     { bg: "#DBEAFE", c: "#1E40AF", label: "Llamada" },
    control:     { bg: "#D1FAE5", c: "#065F46", label: "Control" },
    entrega:     { bg: "#FEF3C7", c: "#92400E", label: "Entrega" },
    otro:        { bg: "#F3F4F6", c: "#374151", label: "Otro" },
  };

  const vencidos = recs.filter(r => !r.completado && r.fecha < hoy);
  const proximos = recs.filter(r => !r.completado && r.fecha >= hoy);
  const completados = recs.filter(r => r.completado);

  const RSection = ({ title, items, accent }) => items.length === 0 ? null : (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent || "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{title} · {items.length}</div>
      {items.map(r => {
        const tc = TIPO_COLOR[r.tipo] || TIPO_COLOR.otro;
        const pac = pacNombre(r.paciente_id);
        return (
          <div key={r.id} style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 10, opacity: r.completado ? 0.6 : 1 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <input type="checkbox" checked={r.completado} onChange={() => db.actualizarRecordatorio({ ...r, completado: !r.completado })} style={{ marginTop: 3, cursor: "pointer", width: 16, height: 16 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, textDecoration: r.completado ? "line-through" : "none" }}>{r.titulo}</div>
                {pac && <div style={{ fontSize: 12, color: "#888" }}>👤 {pac}</div>}
                <div style={{ fontSize: 12, color: "#888" }}>📅 {formatFecha(r.fecha)} {r.hora}</div>
                {r.descripcion && <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{r.descripcion}</div>}
                <span style={{ background: tc.bg, color: tc.c, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600, marginTop: 4, display: "inline-block" }}>{tc.label}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => { setForm({ ...r, paciente_id: r.paciente_id || "" }); setModal(r.id); }} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }}>Editar</button>
              <button onClick={() => { if (window.confirm("¿Eliminar?")) db.eliminarRecordatorio(r.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => { setForm({ titulo: "", fecha: today(), hora: "09:00", tipo: "seguimiento", paciente_id: "", descripcion: "", completado: false }); setModal("nuevo"); }} style={btnPrimary}>+ Nuevo recordatorio</button>
      </div>
      <RSection title="Vencidos" items={vencidos} accent="#DC2626" />
      <RSection title="Próximos" items={proximos} accent="#059669" />
      <RSection title="Completados" items={completados} accent="#9CA3AF" />
      {recs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>🔔</div><div>Sin recordatorios</div></div>}

      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo recordatorio" : "Editar recordatorio"} onClose={() => setModal(null)}>
          <Field label="Título *"><input style={inputStyle} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Fecha"><input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
            <Field label="Hora"><input type="time" style={inputStyle} value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} /></Field>
            <Field label="Tipo">
              <select style={selectStyle} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_COLOR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Paciente (opcional)">
              <select style={selectStyle} value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}>
                <option value="">General</option>
                {data.pacientes.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Descripción"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── COMPRAS ──────────────────────────────────────────────────────────────────
const INSUMOS_LISTA = ["Pilas", "Spaguetti", "Free tube", "Domo", "Codos", "Deshumidificador", "Molde", "Tapones auditivos", "Calibración", "Audiometría", "Logoaudiometría", "Otro"];

function Compras({ data, db }) {
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
      if (modal === "nuevo") await db.agregarCompra(compra);
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

const FORM_PROF_VACIO = { nombre: "", especialidad: "", institucion: "", telefono: "", email: "", localidad: "", notas: "" };
const TIPOS_SEGUIMIENTO_PROF = ["Visita", "Llamada", "Email", "Derivación recibida", "Derivación enviada", "Reunión", "Otro"];
const ESPECIALIDADES = ["Médico clínico", "Fonoaudiólogo/a", "Otorrinolaringólogo/a", "Neurólogo/a", "Pediatra", "Geriatra", "Psicólogo/a", "Kinesiólogo/a", "Otro"];

function Profesionales({ data }) {
  const { profesionales, loading: loadingProf, agregar, actualizar, eliminar, agregarSeguimiento } = useProfesionalesExternos();
  const [modal, setModal] = useState(null); // null | "nuevo" | id
  const [verSeg, setVerSeg] = useState(null); // id del prof
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
    setForm({ nombre: p.nombre, especialidad: p.especialidad || "", institucion: p.institucion || "", telefono: p.telefono || "", email: p.email || "", localidad: p.localidad || "", notas: p.notas || "" });
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
                  <div style={{ background: "#D1FAE5", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, color: "#065F46", marginBottom: 8, display: "inline-block" }}>
                    👥 {derivaciones} paciente{derivaciones !== 1 ? "s" : ""} derivado{derivaciones !== 1 ? "s" : ""}
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
      const promises = [];
      for (const fecha of fechas) {
        for (const prof of profs) {
          promises.push(db.agregarTurno({
            fecha,
            hora: form.horaDesde,
            hora_fin: form.horaHasta,
            motivo: `🔒 BLOQUEADO: ${form.motivo}`,
            profesional: prof,
            estado: "cancelado",
            notas: `Bloqueo de agenda · Repetición: ${form.repeticion}`,
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

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const db = useSupabase();
  const { data, loading, error } = db;

  const recVencidos = data.recordatorios.filter(r => !r.completado && r.fecha < today()).length;
  const turnosHoy = data.turnos.filter(t => t.fecha === today()).length;
  const deudaPendiente = data.compras.filter(c => c.estado === "pendiente").length;

  const TABS = [
    { id: "dashboard", label: "Inicio", icon: "🏠" },
    { id: "turnos", label: "Turnos", icon: "📅", badge: turnosHoy > 0 ? turnosHoy : null },
    { id: "pacientes", label: "Pacientes", icon: "👤" },
    { id: "ventas", label: "Ventas", icon: "🛒" },
    { id: "compras", label: "Insumos", icon: "🛍️", badge: deudaPendiente > 0 ? deudaPendiente : null, badgeColor: "#D97706" },
    { id: "recordatorios", label: "Recordatorios", icon: "🔔", badge: recVencidos > 0 ? recVencidos : null, badgeColor: "#DC2626" },
    { id: "estadisticas", label: "Estadísticas", icon: "📊" },
    { id: "profesionales", label: "Profesionales", icon: "👩‍⚕️" },
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
        {tab === "dashboard"     && <Dashboard data={data} onNavigate={id => setTab(id === "turno" ? "turnos" : id === "paciente" ? "pacientes" : "recordatorios")} />}
        {tab === "turnos"        && <Turnos data={data} db={db} saldoPaciente={saldoPaciente} />}
        {tab === "pacientes"     && <Pacientes data={data} db={db} />}
        {tab === "ventas"        && <Ventas data={data} db={db} />}
        {tab === "compras"       && <Compras data={data} db={db} />}
        {tab === "recordatorios" && <Recordatorios data={data} db={db} />}
        {tab === "estadisticas"  && <Estadisticas data={data} />}
        {tab === "profesionales" && <Profesionales data={data} />}
      </div>
    </div>
  );
}
