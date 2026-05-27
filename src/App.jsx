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

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#FAFAFA" };
const selectStyle = { ...inputStyle };
const btnPrimary = { background: "linear-gradient(135deg, #1a1a2e, #16213e)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnSecondary = { background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" };

const COLORES_ESTADO = {
  pendiente:  { bg: "#FEF3C7", color: "#92400E", label: "Pendiente" },
  confirmado: { bg: "#D1FAE5", color: "#065F46", label: "Confirmado" },
  cancelado:  { bg: "#FEE2E2", color: "#991B1B", label: "Cancelado" },
  realizado:  { bg: "#E0F2FE", color: "#075985", label: "Realizado" },
  ausente:    { bg: "#F3F4F6", color: "#4B5563", label: "Ausente" },
};
const COLORES_VENTA = {
  presupuesto: { bg: "#EDE9FE", color: "#4C1D95", label: "Presupuesto" },
  en_proceso:  { bg: "#FEF3C7", color: "#92400E", label: "En proceso" },
  vendido:     { bg: "#D1FAE5", color: "#065F46", label: "Vendido" },
  cancelado:   { bg: "#FEE2E2", color: "#991B1B", label: "Cancelado" },
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

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    try {
      setLoading(true);
      const [p, t, v, r, c] = await Promise.all([
        supabase.from("pacientes").select("*").order("apellido"),
        supabase.from("turnos").select("*").order("fecha").order("hora"),
        supabase.from("ventas").select("*").order("fecha", { ascending: false }),
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

  const agregarTurno = useCallback(async (turno) => {
    const { data: row, error } = await supabase.from("turnos").insert(turno).select().single();
    if (!error) setData(d => ({ ...d, turnos: [...d.turnos, row] }));
  }, []);

  const actualizarTurno = useCallback(async (turno) => {
    const { error } = await supabase.from("turnos").update(turno).eq("id", turno.id);
    if (!error) setData(d => ({ ...d, turnos: d.turnos.map(t => t.id === turno.id ? turno : t) }));
  }, []);

  const eliminarTurno = useCallback(async (id) => {
    const { error } = await supabase.from("turnos").delete().eq("id", id);
    if (!error) setData(d => ({ ...d, turnos: d.turnos.filter(t => t.id !== id) }));
  }, []);

  const agregarVenta = useCallback(async (venta) => {
    const { data: row, error } = await supabase.from("ventas").insert(venta).select().single();
    if (!error) setData(d => ({ ...d, ventas: [...d.ventas, row] }));
    return row;
  }, []);

  const actualizarVenta = useCallback(async (venta) => {
    const { error } = await supabase.from("ventas").update(venta).eq("id", venta.id);
    if (!error) setData(d => ({ ...d, ventas: d.ventas.map(v => v.id === venta.id ? venta : v) }));
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
const FORM_PAC_VACIO = { nombre: "", apellido: "", dni: "", telefono: "", obraSocial: "", fechaNac: "", email: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "", historia: [], etiquetas: [] };
const FORM_TURNO_VACIO = { paciente_id: "", fecha: today(), hora: "09:00", hora_fin: "09:30", motivo: "", profesional: "", estado: "pendiente", notas: "" };

const DURACION_MOTIVO = { "Selección de audífonos": 60, "Asesoramiento comercial": 60 };
function calcularHoraFin(horaInicio, motivo) {
  if (!horaInicio) return "";
  const mins = DURACION_MOTIVO[motivo] !== undefined ? DURACION_MOTIVO[motivo] : 30;
  const [h, m] = horaInicio.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function TarjetaTurno({ t, pacNombre, onEditar, onEliminar, mostrarFecha, saldoPaciente }) {
  const saldo = saldoPaciente ? saldoPaciente(t.paciente_id) : 0;
  const esBloqueado = (t.motivo || "").includes("BLOQUEADO");
  if (esBloqueado) {
    return (
      <div style={{
        background: "repeating-linear-gradient(45deg, #1a1a2e, #1a1a2e 5px, #374151 5px, #374151 10px)",
        border: "1.5px solid #DC2626", borderRadius: 10, padding: "11px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ background: "rgba(220,38,38,0.3)", borderRadius: 7, padding: "6px 10px", textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#FCA5A5" }}>🔒 {t.hora}</div>
            {t.hora_fin && <div style={{ fontSize: 10, color: "#FCA5A5" }}>hasta {t.hora_fin}</div>}
            {mostrarFecha && <div style={{ fontSize: 10, color: "#FCA5A5" }}>{formatFecha(t.fecha)}</div>}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#FCA5A5" }}>AGENDA BLOQUEADA</div>
            <div style={{ fontSize: 12, color: "#FDA4AF" }}>{t.profesional || "Ambas profesionales"}</div>
            <div style={{ fontSize: 11, color: "#FDA4AF" }}>{t.motivo.replace("🔒 BLOQUEADO: ", "")}</div>
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
          <div style={{ fontSize: 13, fontWeight: 800, color: "#4338CA" }}>{t.hora}{t.hora_fin ? `–${t.hora_fin}` : ""}</div>
          {mostrarFecha && <div style={{ fontSize: 10, color: "#6366F1" }}>{formatFecha(t.fecha)}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{pacNombre(t.paciente_id)}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{t.motivo || "Sin motivo"}{t.profesional ? ` · ${t.profesional}` : ""}</div>
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_TURNO_VACIO);
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

  const turnosFiltrados = vista === "dia"
    ? data.turnos.filter(t => t.fecha === filtroFecha).sort((a, b) => a.hora.localeCompare(b.hora))
    : vista === "todos"
    ? [...data.turnos].sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))
    : [];

  const pacNombre = (id) => { const p = pacientes.find(p => p.id === id); return p ? `${p.nombre} ${p.apellido}` : "—"; };
  const pacSeleccionado = pacientes.find(p => p.id === form.paciente_id);

  async function guardar() {
    // FIX: validación más clara
    if (!form.paciente_id) return alert("Seleccioná un paciente.");
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
  }

  function editar(t) { setForm({ ...t, paciente_id: t.paciente_id || "" }); cerrarModal(); setModal(t.id); }
  function nuevo(fechaPreset) {
    const f = fechaPreset || (vista === "dia" ? filtroFecha : today());
    setForm({ ...FORM_TURNO_VACIO, fecha: f, hora_fin: calcularHoraFin("09:00", "") });
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 9, padding: 3 }}>
          {[["dia","Día"],["semana","Semana"],["todos","Todos"]].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)} style={{ background: vista === v ? "#1a1a2e" : "transparent", color: vista === v ? "#fff" : "#555", border: "none", borderRadius: 7, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {vista === "dia" && <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} style={{ ...inputStyle, width: "auto" }} />}
          {vista === "semana" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setSemanaBase(addDays(semanaBase, -7))} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 16 }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 600, minWidth: 130, textAlign: "center" }}>{semanaLabel}</span>
              <button onClick={() => setSemanaBase(addDays(semanaBase, 7))} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 16 }}>›</button>
              <button onClick={() => setSemanaBase(getLunes(today()))} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>Hoy</button>
            </div>
          )}
          <button onClick={() => setModalBloqueo(true)} style={{ ...btnSecondary, background: "#FEE2E2", color: "#991B1B", border: "1.5px solid #FECACA" }}>🔒 Bloquear agenda</button>
          <button onClick={() => nuevo()} style={btnPrimary}>+ Nuevo turno</button>
        </div>
      </div>

      {vista === "dia" && (
        <div>
          {data.recordatorios.filter(r => r.fecha === filtroFecha && !r.completado).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#D97706", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>🔔 Recordatorios del día</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.recordatorios.filter(r => r.fecha === filtroFecha && !r.completado).sort((a,b) => a.hora.localeCompare(b.hora)).map(r => (
                  <div key={r.id} style={{ background: "#FEF3C7", border: "1.5px solid #FDE68A", borderRadius: 9, padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#92400E" }}>{r.hora} · {r.titulo}</div>
                      {r.descripcion && <div style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>{r.descripcion}</div>}
                    </div>
                    <button onClick={() => db.actualizarRecordatorio({ ...r, completado: true })} style={{ background: "#FDE68A", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#92400E", cursor: "pointer" }}>✓ Listo</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {turnosFiltrados.length === 0
            ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>📅</div><div>No hay turnos</div></div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{turnosFiltrados.map(t => <TarjetaTurno key={t.id} t={t} pacNombre={pacNombre} onEditar={editar} onEliminar={(id) => db.eliminarTurno(id)} mostrarFecha={false} saldoPaciente={saldoPaciente} />)}</div>
          }
        </div>
      )}

      {vista === "semana" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {diasSemana.map(fecha => {
            const ts = turnosDia(fecha);
            const recs = data.recordatorios.filter(r => r.fecha === fecha && !r.completado);
            const hoy = fecha === today();
            return (
              <div key={fecha}>
                {(() => {
                  const bloqueados = ts.filter(t => (t.motivo||"").includes("BLOQUEADO"));
                  const normales = ts.filter(t => !(t.motivo||"").includes("BLOQUEADO"));
                  return (
                    <div onClick={() => { setVista("dia"); setFiltroFecha(fecha); }}
                      style={{ background: hoy ? "#1a1a2e" : bloqueados.length > 0 ? "#1f2937" : "#F8FAFC", border: bloqueados.length > 0 ? "1.5px solid #DC2626" : hoy ? "none" : "1.5px solid #E5E7EB", borderRadius: 9, padding: "8px 6px", textAlign: "center", marginBottom: 6, cursor: "pointer" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: hoy || bloqueados.length > 0 ? "rgba(255,255,255,0.6)" : "#888", textTransform: "uppercase" }}>{nombreDia(fecha)}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: hoy || bloqueados.length > 0 ? "#fff" : "#1a1a2e" }}>{numDia(fecha)}</div>
                      {normales.length > 0 && <div style={{ fontSize: 10, color: hoy ? "rgba(255,255,255,0.6)" : "#6366F1" }}>{normales.length} turno{normales.length !== 1 ? "s" : ""}</div>}
                      {bloqueados.length > 0 && <div style={{ fontSize: 10, color: "#FCA5A5", fontWeight: 700 }}>🔒 Bloqueado</div>}
                      {recs.length > 0 && <div style={{ fontSize: 10, color: hoy ? "rgba(255,255,255,0.6)" : "#D97706" }}>🔔 {recs.length}</div>}
                    </div>
                  );
                })()}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {ts.map(t => {
                    const pac = pacientes.find(p => p.id === t.paciente_id);
                    const esBloqueado = (t.motivo || "").includes("BLOQUEADO");
                    const ce = esBloqueado
                      ? { bg: "#1a1a2e", color: "#fff" }
                      : COLORES_ESTADO[t.estado] || COLORES_ESTADO.pendiente;
                    return (
                      <div key={t.id} style={{
                        background: esBloqueado
                          ? "repeating-linear-gradient(45deg, #1a1a2e, #1a1a2e 4px, #374151 4px, #374151 8px)"
                          : ce.bg,
                        borderRadius: 7, padding: "6px 8px", position: "relative",
                        border: esBloqueado ? "1.5px solid #DC2626" : "none",
                      }} title={`${t.hora}–${t.hora_fin || ""} · ${t.motivo || ""}`}>
                        <div onClick={() => editar(t)} style={{ cursor: "pointer" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: esBloqueado ? "#FCA5A5" : ce.color }}>
                            🔒 {t.hora}{t.hora_fin ? `–${t.hora_fin}` : ""}
                          </div>
                          <div style={{ fontSize: 10, color: esBloqueado ? "#FCA5A5" : ce.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 14, fontWeight: esBloqueado ? 700 : 400 }}>
                            {esBloqueado ? (t.profesional || "Bloqueado") : (pac?.apellido || "—")}
                          </div>
                          {esBloqueado && t.motivo && (
                            <div style={{ fontSize: 9, color: "#FCA5A5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t.motivo.replace("🔒 BLOQUEADO: ", "")}
                            </div>
                          )}
                          {!esBloqueado && t.motivo && (
                            <div style={{ fontSize: 10, color: ce.color, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.motivo}</div>
                          )}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); if (window.confirm(`¿Eliminar este bloqueo/turno?`)) db.eliminarTurno(t.id); }}
                          style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.25)", border: "none", borderRadius: 4, width: 16, height: 16, fontSize: 10, cursor: "pointer", color: esBloqueado ? "#FCA5A5" : ce.color, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}
                        >×</button>
                      </div>
                    );
                  })}
                  <button onClick={() => nuevo(fecha)} style={{ background: "transparent", border: "1.5px dashed #D1D5DB", borderRadius: 7, padding: 5, fontSize: 11, color: "#9CA3AF", cursor: "pointer" }}>+ turno</button>
                  {recs.map(r => (
                    <div key={r.id} style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 7, padding: "5px 7px" }} title={`${r.hora} · ${r.titulo}`}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#D97706" }}>🔔 {r.hora}</div>
                      <div style={{ fontSize: 10, color: "#92400E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.titulo}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vista === "todos" && (turnosFiltrados.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>📅</div><div>No hay turnos</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{turnosFiltrados.map(t => <TarjetaTurno key={t.id} t={t} pacNombre={pacNombre} onEditar={editar} onEliminar={(id) => db.eliminarTurno(id)} mostrarFecha={true} saldoPaciente={saldoPaciente} />)}</div>
      )}

      {modalBloqueo && <ModalBloqueo onClose={() => setModalBloqueo(false)} db={db} fechaInicial={vista === "dia" ? filtroFecha : today()} />}

      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo turno" : "Editar turno"} onClose={cerrarModal}>
          {/* Paciente */}
          <div style={{ background: "#F8FAFC", border: `1.5px solid ${!form.paciente_id && "nuevo" === modal ? "#FCA5A5" : "#E5E7EB"}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>👤 Paciente *</span>
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
                <button onClick={crearPacienteYSeleccionar} disabled={saving} style={{ ...btnPrimary, background: "linear-gradient(135deg,#065F46,#059669)", width: "100%", marginTop: 4 }}>✓ Crear y asignar al turno</button>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Fecha *"><input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
            <Field label="Hora inicio *"><input type="time" style={inputStyle} value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value, hora_fin: calcularHoraFin(e.target.value, f.motivo) }))} /></Field>
            <Field label="Hora fin"><input type="time" style={inputStyle} value={form.hora_fin || ""} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} /></Field>
          </div>
          <Field label="Motivo">
            <select style={selectStyle} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value, hora_fin: calcularHoraFin(f.hora, e.target.value) }))}>
              <option value="">— Sin especificar —</option>
              <option>Audiometría y logoaudiometría</option>
              <option>Control</option>
              <option>Calibración</option>
              <option>Selección de audífonos</option>
              <option>Toma de impresión para molde</option>
              <option>Entrega de molde</option>
              <option>Asesoramiento comercial</option>
              <option>Reunión con profesionales</option>
              <option>Entrega de audífonos</option>
            </select>
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
                    <option>Audiometría y logoaudiometría</option>
                    <option>Control</option>
                    <option>Calibración</option>
                    <option>Selección de audífonos</option>
                    <option>Toma de impresión para molde</option>
                    <option>Entrega de molde</option>
                    <option>Asesoramiento comercial</option>
                    <option>Reunión con profesionales</option>
                    <option>Entrega de audífonos</option>
                    <option>Otro</option>
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
            </div>
          )}

          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={cerrarModal} style={btnSecondary}>Cancelar</button>
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
  const [busqueda, setBusqueda] = useState("");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "", apellido: "", dni: "", fechaNac: "", telefono: "", email: "",
    obraSocial: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "",
    derivadoPor: "", etiquetas: []
  });
  const [evModal, setEvModal] = useState(false);
  const [evForm, setEvForm] = useState({ fecha: today(), tipo: "consulta", descripcion: "", profesional: "" });

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
          setForm({ nombre: "", apellido: "", dni: "", fechaNac: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "", derivadoPor: "", etiquetas: [] });
          setModal("nuevo");
        }} style={btnPrimary}>+ Nuevo paciente</button>
      </div>

      {pacientes.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>👤</div><div>No hay pacientes</div></div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {pacientes.map(p => (
            <div key={p.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#4338CA", flexShrink: 0 }}>
                  {(p.nombre?.[0] || "?")}{(p.apellido?.[0] || "?")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.apellido}, {p.nombre}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>DNI: {p.dni || "—"}</div>
                </div>
              </div>

              {/* Etiquetas */}
              {(p.etiquetas || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                  {(p.etiquetas || []).map(eid => {
                    const et = getEtiquetaInfo(eid);
                    return et ? <EtiquetaBadge key={eid} etiqueta={et} /> : null;
                  })}
                </div>
              )}

              {/* Teléfono con botón copiar */}
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4, display: "flex", alignItems: "center" }}>
                📞 {p.telefono || "—"}
                {p.telefono && <CopyButton text={p.telefono} label="teléfono" />}
              </div>

              {/* Email con botón copiar */}
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                ✉️ <span style={{ marginLeft: 2 }}>{p.email || "—"}</span>
                {p.email && <CopyButton text={p.email} label="email" />}
              </div>

              <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>🏥 {p.obraSocial || "Particular"}</div>

              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setVerHC(p.id)} style={{ ...btnPrimary, padding: "6px 12px", fontSize: 12, flex: 1 }}>Historia clínica</button>
                <button onClick={() => editar(p)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>Editar</button>
                <button onClick={() => { if (window.confirm("¿Eliminar?")) db.eliminarPaciente(p.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>}

      {/* Modal nuevo/editar paciente */}
      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo paciente" : "Editar paciente"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Nombre *"><input style={inputStyle} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
            <Field label="Apellido *"><input style={inputStyle} value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} /></Field>
            <Field label="DNI"><input style={inputStyle} value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} /></Field>
            <Field label="Fecha de nacimiento"><input type="date" style={inputStyle} value={form.fechaNac} onChange={e => setForm(f => ({ ...f, fechaNac: e.target.value }))} /></Field>
            <Field label="Teléfono"><input style={inputStyle} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></Field>
            <Field label="Email"><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ejemplo@mail.com" /></Field>
            <Field label="Obra social"><input style={inputStyle} value={form.obraSocial} onChange={e => setForm(f => ({ ...f, obraSocial: e.target.value }))} /></Field>
            <Field label="Nro. afiliado"><input style={inputStyle} value={form.nroAfiliado} onChange={e => setForm(f => ({ ...f, nroAfiliado: e.target.value }))} /></Field>
          </div>
          <Field label="Derivado por"><input style={inputStyle} value={form.derivadoPor || ""} onChange={e => setForm(f => ({ ...f, derivadoPor: e.target.value }))} placeholder="Nombre del profesional derivante" /></Field>
          <Field label="Diagnóstico audiológico"><input style={inputStyle} value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} /></Field>
          <Field label="Antecedentes"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.antecedentes} onChange={e => setForm(f => ({ ...f, antecedentes: e.target.value }))} /></Field>
          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>

          {/* ETIQUETAS */}
          <Field label="Etiquetas">
            <EtiquetasInline
              seleccionadas={form.etiquetas || []}
              onChange={nuevas => setForm(f => ({ ...f, etiquetas: [...nuevas] }))}
            />
          </Field>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Guardar"}</button>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Evolución clínica</span>
            <button onClick={() => setEvModal(true)} style={{ ...btnPrimary, padding: "6px 14px", fontSize: 13 }}>+ Agregar entrada</button>
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
          {evModal && (
            <div style={{ marginTop: 20, background: "#F8FAFC", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 12px" }}>Nueva entrada</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Fecha"><input type="date" style={inputStyle} value={evForm.fecha} onChange={e => setEvForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
                <Field label="Tipo">
                  <select style={selectStyle} value={evForm.tipo} onChange={e => setEvForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option>Audiometría y logoaudiometría</option>
                    <option>Control</option>
                    <option>Calibración</option>
                    <option>Selección de audífonos</option>
                    <option>Toma de impresión para molde</option>
                    <option>Entrega de molde</option>
                    <option>Asesoramiento comercial</option>
                    <option>Reunión con profesionales</option>
                    <option>Entrega de audífonos</option>
                    <option>Otro</option>
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
        </Modal>
      )}
    </div>
  );
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────
function Ventas({ data, db }) {
  const [modal, setModal] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ paciente_id: "", fecha: today(), dispositivo: "", marca: "", modelo: "", oido: "bilateral", precio: "", obraSocialCubre: "", saldoPaciente: "", estado: "presupuesto", observaciones: "" });

  const ventas = data.ventas.filter(v => !filtroEstado || v.estado === filtroEstado).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const pacNombre = (id) => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : "—"; };
  const totalVendido = data.ventas.filter(v => v.estado === "vendido").reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);

  async function guardar() {
    if (!form.paciente_id || !form.dispositivo) return alert("Completá paciente y dispositivo.");
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
        const disp = form.dispositivo || "audífono";
        await db.agregarRecordatorio({ titulo: `Control 3 meses · ${nombre}`, fecha: sumarMeses(form.fecha, 3), hora: "09:00", tipo: "control", paciente_id: form.paciente_id, descripcion: `Control de uso del ${disp}. Venta: ${formatFecha(form.fecha)}.`, completado: false });
        await db.agregarRecordatorio({ titulo: `Control anual · ${nombre}`, fecha: sumarMeses(form.fecha, 12), hora: "09:00", tipo: "control", paciente_id: form.paciente_id, descripcion: `Control anual del ${disp}. Venta: ${formatFecha(form.fecha)}.`, completado: false });
      }
      setModal(null);
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[["vendido","Vendidas"],["en_proceso","En proceso"],["presupuesto","Presupuestos"]].map(([e, l]) => (
          <div key={e} style={{ background: "#F8FAFC", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{data.ventas.filter(v => v.estado === e).length}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{l}</div>
          </div>
        ))}
        <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#166534" }}>${totalVendido.toLocaleString("es-AR")}</div>
          <div style={{ fontSize: 12, color: "#15803D" }}>Total vendido</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setFiltroEstado("")} style={{ ...btnSecondary, background: filtroEstado === "" ? "#1a1a2e" : "#F3F4F6", color: filtroEstado === "" ? "#fff" : "#374151", padding: "6px 14px", fontSize: 13 }}>Todos</button>
          {Object.entries(COLORES_VENTA).map(([k, v]) => (
            <button key={k} onClick={() => setFiltroEstado(k)} style={{ ...btnSecondary, background: filtroEstado === k ? "#1a1a2e" : "#F3F4F6", color: filtroEstado === k ? "#fff" : "#374151", padding: "6px 14px", fontSize: 13 }}>{v.label}</button>
          ))}
        </div>
        <button onClick={() => { setForm({ paciente_id: "", fecha: today(), dispositivo: "", marca: "", modelo: "", oido: "bilateral", precio: "", obraSocialCubre: "", saldoPaciente: "", estado: "presupuesto", observaciones: "" }); setModal("nuevo"); }} style={btnPrimary}>+ Nueva venta</button>
      </div>
      {ventas.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>🛒</div><div>No hay ventas</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ventas.map(v => (
            <div key={v.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{pacNombre(v.paciente_id)}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{v.marca} {v.modelo} · {v.dispositivo} · {formatFecha(v.fecha)}</div>
                  {v.precio && <div style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>${parseFloat(v.precio).toLocaleString("es-AR")}</div>}
                </div>
                <Badge estado={v.estado} tipo="venta" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setForm({ ...v }); setModal(v.id); }} style={{ ...btnSecondary, padding: "6px 14px", fontSize: 13 }}>Editar</button>
                <button onClick={() => { if (window.confirm("¿Eliminar?")) db.eliminarVenta(v.id); }} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>}

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
                {Object.entries(COLORES_VENTA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          {form.estado === "vendido" && (() => {
            const anterior = modal !== "nuevo" && data.ventas.find(v => v.id === modal);
            if (anterior?.estado === "vendido") return null;
            return (
              <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8", marginBottom: 6 }}>🔔 Se crearán recordatorios automáticos</div>
                <div style={{ fontSize: 13, color: "#1E40AF" }}>
                  <div>📅 Control 3 meses · {form.fecha ? formatFecha(sumarMeses(form.fecha, 3)) : "—"}</div>
                  <div>📅 Control anual · {form.fecha ? formatFecha(sumarMeses(form.fecha, 12)) : "—"}</div>
                </div>
              </div>
            );
          })()}
          <Field label="Dispositivo *"><input style={inputStyle} value={form.dispositivo} onChange={e => setForm(f => ({ ...f, dispositivo: e.target.value }))} placeholder="Ej: Audífono retroauricular" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Marca"><input style={inputStyle} value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} /></Field>
            <Field label="Modelo"><input style={inputStyle} value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} /></Field>
            <Field label="Oído">
              <select style={selectStyle} value={form.oido} onChange={e => setForm(f => ({ ...f, oido: e.target.value }))}>
                <option value="bilateral">Bilateral</option>
                <option value="derecho">Derecho</option>
                <option value="izquierdo">Izquierdo</option>
              </select>
            </Field>
            <Field label="Precio ($)"><input type="number" style={inputStyle} value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} /></Field>
            <Field label="Cobertura OS ($)"><input type="number" style={inputStyle} value={form.obraSocialCubre} onChange={e => setForm(f => ({ ...f, obraSocialCubre: e.target.value }))} /></Field>
            <Field label="Saldo paciente ($)"><input type="number" style={inputStyle} value={form.saldoPaciente} onChange={e => setForm(f => ({ ...f, saldoPaciente: e.target.value }))} /></Field>
          </div>
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
const INSUMOS_LISTA = ["Pilas", "Spaguetti", "Free tube", "Domo", "Codos", "Deshumidificador", "Molde", "Tapones auditivos", "Otro"];

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
    setForm(f => ({ ...f, insumos: [...f.insumos, { ...insumoActual, id: uid() }] }));
    setInsumoActual({ nombre: "Pilas", cantidad: 1, precio: "" });
  }

  function quitarInsumo(id) {
    setForm(f => ({ ...f, insumos: f.insumos.filter(i => i.id !== id) }));
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
    </div>
  );
}


// ─── PROFESIONALES ────────────────────────────────────────────────────────────
const PROFESIONALES_LIST = [
  { id: "miatello", nombre: "Lic. Cecilia Miatello", especialidad: "Audióloga", color: "#4338CA", bg: "#EEF2FF" },
  { id: "valles",   nombre: "Lic. Graciela Valles",  especialidad: "Audióloga", color: "#065F46", bg: "#D1FAE5" },
];

function Profesionales({ data }) {
  const hoy = today();
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 20 }}>👩‍⚕️ Profesionales</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {PROFESIONALES_LIST.map(prof => {
          const turnosTotal = data.turnos.filter(t => t.profesional === prof.nombre).length;
          const turnosHoy = data.turnos.filter(t => t.profesional === prof.nombre && t.fecha === hoy).length;
          const turnosMes = data.turnos.filter(t => t.profesional === prof.nombre && t.fecha?.slice(0,7) === hoy.slice(0,7)).length;
          const realizados = data.turnos.filter(t => t.profesional === prof.nombre && t.estado === "realizado").length;
          const proximos = data.turnos.filter(t => t.profesional === prof.nombre && t.fecha >= hoy).sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora)).slice(0,3);
          return (
            <div key={prof.id} style={{ background: "#fff", border: `1.5px solid ${prof.bg}`, borderRadius: 14, padding: "20px" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: prof.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: prof.color }}>
                  {prof.nombre.split(" ").filter(w => w.length > 2).map(w => w[0]).slice(0,2).join("")}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{prof.nombre}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{prof.especialidad}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Hoy", value: turnosHoy, color: prof.color, bg: prof.bg },
                  { label: "Este mes", value: turnosMes, color: prof.color, bg: prof.bg },
                  { label: "Realizados", value: realizados, color: prof.color, bg: prof.bg },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: s.color, opacity: 0.8 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Próximos turnos</div>
              {proximos.length === 0
                ? <div style={{ fontSize: 13, color: "#aaa" }}>Sin turnos próximos</div>
                : proximos.map(t => (
                  <div key={t.id} style={{ background: "#F8FAFC", borderRadius: 8, padding: "7px 10px", marginBottom: 6, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: prof.color }}>{t.hora}</span>
                    <span style={{ color: "#555", marginLeft: 8 }}>{formatFecha(t.fecha)}</span>
                    <span style={{ color: "#888", marginLeft: 8 }}>{t.motivo || "Sin motivo"}</span>
                  </div>
                ))
              }
            </div>
          );
        })}
      </div>
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👂</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>Sonara Audiología</div>
        <div style={{ fontSize: 14, color: "#888", marginTop: 8 }}>Cargando...</div>
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
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 960, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", padding: "20px 28px", borderRadius: "0 0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>👂</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>Sonara Audiología</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Sistema de Gestión</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "12px 16px", background: "#F8FAFC", borderBottom: "1px solid #E5E7EB", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ position: "relative", background: tab === t.id ? "#1a1a2e" : "transparent", color: tab === t.id ? "#fff" : "#555", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
            {t.badge && <span style={{ position: "absolute", top: 2, right: 2, background: t.badgeColor || "#4338CA", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>{t.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding: "20px 16px" }}>
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
