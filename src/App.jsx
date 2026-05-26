import { useState, useEffect, useCallback, useRef } from "react";
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

  const agregarPaciente = useCallback(async (pac) => {
    const payload = {
      ...pac,
      historia: pac.historia || [],
      etiquetas: Array.isArray(pac.etiquetas) ? pac.etiquetas : [],
    };
    const { data: row, error } = await supabase.from("pacientes").insert(payload).select().single();
    if (!error) setData(d => ({ ...d, pacientes: [...d.pacientes, row] }));
    return row;
  }, []);

  const actualizarPaciente = useCallback(async (pac) => {
    const payload = {
      ...pac,
      historia: Array.isArray(pac.historia) ? pac.historia : [],
      etiquetas: Array.isArray(pac.etiquetas) ? pac.etiquetas : [],
      email: pac.email || "",
    };
    const { error } = await supabase.from("pacientes").update(payload).eq("id", pac.id);
    if (!error) setData(d => ({ ...d, pacientes: d.pacientes.map(p => p.id === pac.id ? { ...p, ...payload } : p) }));
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

  const agregarRecordatorio = useCallback(async (rec) => {
    const { data: row, error } = await supabase.from("recordatorios").insert(rec).select().single();
    if (!error) setData(d => ({ ...d, recordatorios: [...d.recordatorios, row] }));
  }, []);

  const actualizarRecordatorio = useCallback(async (rec) => {
    const { error } = await supabase.from("recordatorios").update(rec).eq("id", rec.id);
    if (!error) setData(d => ({ ...d, recordatorios: d.recordatorios.map(r => r.id === rec.id ? rec : r) }));
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
function Dashboard({ data }) {
  const hoy = today();
  const turnosHoy = data.turnos.filter(t => t.fecha === hoy).length;
  const recVencidos = data.recordatorios.filter(r => !r.completado && r.fecha < hoy).length;
  const ventasActivas = data.ventas.filter(v => v.estado === "en_proceso").length;
  const totalVendido = data.ventas.filter(v => v.estado === "vendido").reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);
  const pacNombre = (id) => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : "—"; };
  const proximosTurnos = data.turnos.filter(t => t.fecha >= hoy).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0, 5);
  const proximosRec = data.recordatorios.filter(r => !r.completado && r.fecha >= hoy).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0, 5);

  return (
    <div>
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
                <div onClick={() => { setVista("dia"); setFiltroFecha(fecha); }}
                  style={{ background: hoy ? "#1a1a2e" : "#F8FAFC", border: hoy ? "none" : "1.5px solid #E5E7EB", borderRadius: 9, padding: "8px 6px", textAlign: "center", marginBottom: 6, cursor: "pointer" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: hoy ? "rgba(255,255,255,0.6)" : "#888", textTransform: "uppercase" }}>{nombreDia(fecha)}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: hoy ? "#fff" : "#1a1a2e" }}>{numDia(fecha)}</div>
                  {ts.length > 0 && <div style={{ fontSize: 10, color: hoy ? "rgba(255,255,255,0.6)" : "#6366F1" }}>{ts.length} turno{ts.length !== 1 ? "s" : ""}</div>}
                  {recs.length > 0 && <div style={{ fontSize: 10, color: hoy ? "rgba(255,255,255,0.6)" : "#D97706" }}>🔔 {recs.length}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {ts.map(t => {
                    const pac = pacientes.find(p => p.id === t.paciente_id);
                    const ce = COLORES_ESTADO[t.estado] || COLORES_ESTADO.pendiente;
                    return (
                      <div key={t.id} style={{ background: ce.bg, borderRadius: 7, padding: "6px 8px", position: "relative" }} title={`${t.hora} · ${pacNombre(t.paciente_id)}`}>
                        <div onClick={() => editar(t)} style={{ cursor: "pointer" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: ce.color }}>{t.hora}</div>
                          <div style={{ fontSize: 11, color: ce.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>{pac?.apellido || "—"}</div>
                          {t.motivo && <div style={{ fontSize: 10, color: ce.color, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.motivo}</div>}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); if (window.confirm(`¿Eliminar turno de ${pacNombre(t.paciente_id)}?`)) db.eliminarTurno(t.id); }}
                          style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.15)", border: "none", borderRadius: 4, width: 16, height: 16, fontSize: 10, cursor: "pointer", color: ce.color, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}
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
    etiquetas: []
  });
  const etiquetasRef = useRef([]);
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
      const etiquetasFinales = etiquetasRef.current;
      const payload = { ...form, etiquetas: etiquetasFinales, email: form.email || "" };
      if (modal === "nuevo") await db.agregarPaciente({ ...payload, historia: [] });
      else {
        const pacExistente = data.pacientes.find(p => p.id === modal) || {};
        await db.actualizarPaciente({ ...pacExistente, ...payload, etiquetas: etiquetasFinales });
      }
      setModal(null);
    } finally { setSaving(false); }
  }

  function editar(p) {
    const ets = Array.isArray(p.etiquetas) ? p.etiquetas : [];
    etiquetasRef.current = ets;
    setForm({
      nombre: p.nombre, apellido: p.apellido, dni: p.dni || "", fechaNac: p.fechaNac || "",
      telefono: p.telefono || "", email: p.email || "", obraSocial: p.obraSocial || "",
      nroAfiliado: p.nroAfiliado || "", diagnostico: p.diagnostico || "",
      antecedentes: p.antecedentes || "", notas: p.notas || "",
      etiquetas: ets
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
          etiquetasRef.current = [];
          setForm({ nombre: "", apellido: "", dni: "", fechaNac: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "", etiquetas: [] });
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
          <Field label="Diagnóstico audiológico"><input style={inputStyle} value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} /></Field>
          <Field label="Antecedentes"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.antecedentes} onChange={e => setForm(f => ({ ...f, antecedentes: e.target.value }))} /></Field>
          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>

          {/* ETIQUETAS */}
          <Field label="Etiquetas">
            <SelectorEtiquetas
              seleccionadas={form.etiquetas || []}
              onChange={etiquetas => {
                etiquetasRef.current = etiquetas;
                setForm(f => ({ ...f, etiquetas }));
              }}
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
          {(pacienteHC.historia || []).length === 0
            ? <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Sin entradas aún</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...(pacienteHC.historia || [])].reverse().map(ev => (
                <div key={ev.id} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{TIPO_HC[ev.tipo] || "📌"} {ev.tipo}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{formatFecha(ev.fecha)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14 }}>{ev.descripcion}</p>
                  {ev.profesional && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{ev.profesional}</div>}
                </div>
              ))}
            </div>}
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
        {tab === "dashboard"     && <Dashboard data={data} />}
        {tab === "turnos"        && <Turnos data={data} db={db} saldoPaciente={saldoPaciente} />}
        {tab === "pacientes"     && <Pacientes data={data} db={db} />}
        {tab === "ventas"        && <Ventas data={data} db={db} />}
        {tab === "compras"       && <Compras data={data} db={db} />}
        {tab === "recordatorios" && <Recordatorios data={data} db={db} />}
      </div>
    </div>
  );
}
