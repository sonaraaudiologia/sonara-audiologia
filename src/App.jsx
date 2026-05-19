import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "clinica-auditiva-data";

const CALENDAR_DATA = {
  pacientes: [
    { id: "pac001", nombre: "Sandra", apellido: "Cano", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac002", nombre: "Aylin Naiara", apellido: "Gomez", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac003", nombre: "Marcela", apellido: "Vera", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac004", nombre: "Irina", apellido: "Canelli", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac005", nombre: "María de los Ángeles", apellido: "Beltrán", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac006", nombre: "Edgardo", apellido: "Leiva", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac007", nombre: "Virginia", apellido: "Fabregat", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac008", nombre: "Wenseslaw", apellido: "Ortega", dni: "", telefono: "", email: "", obraSocial: "Particular", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Audio + Logo. $55.000", historia: [] },
    { id: "pac009", nombre: "Rubén", apellido: "Arbelo", dni: "", telefono: "", email: "", obraSocial: "Ministerio", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Calibración", historia: [] },
    { id: "pac010", nombre: "Mirta", apellido: "Vecchio", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Toma de molde", historia: [] },
    { id: "pac011", nombre: "Cecilia", apellido: "Ordasso", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Control", historia: [] },
    { id: "pac012", nombre: "Franco", apellido: "Gándara", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac013", nombre: "Rubén", apellido: "Pons", dni: "", telefono: "", email: "", obraSocial: "IAPOS", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Pedir segundo OTA IAPOS", historia: [] },
    { id: "pac014", nombre: "", apellido: "Mainieri", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Control", historia: [] },
    { id: "pac015", nombre: "Emilia", apellido: "Aguirre", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Retira molde", historia: [] },
    { id: "pac016", nombre: "Alberto", apellido: "Ramos", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Calibración - trae AT", historia: [] },
    { id: "pac017", nombre: "Roberto", apellido: "López", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Importado desde Google Calendar", historia: [] },
    { id: "pac018", nombre: "Mirta", apellido: "Aconetani", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Control - deriva Castagna", historia: [] },
    { id: "pac019", nombre: "Lucía", apellido: "Indelicato", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Control", historia: [] },
    { id: "pac020", nombre: "Felipe", apellido: "Meneguello", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Impresión de moldes", historia: [] },
    { id: "pac021", nombre: "Laureano", apellido: "Monaco", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Calibración", historia: [] },
    { id: "pac022", nombre: "Germán", apellido: "Vega", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Toma de moldes", historia: [] },
    { id: "pac023", nombre: "Liliana", apellido: "Vidal", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Control", historia: [] },
    { id: "pac024", nombre: "Fabián", apellido: "Bueno", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Rehacer molde", historia: [] },
    { id: "pac025", nombre: "Mirta y Eliana", apellido: "Gómez", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Selecciones - deriva Grossi", historia: [] },
    { id: "pac026", nombre: "Lucca", apellido: "Coronel", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Molde", historia: [] },
    { id: "pac027", nombre: "Liliana", apellido: "Gallardo", dni: "", telefono: "", email: "", obraSocial: "OSPAC / IAPOS", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Selección + AT", historia: [] },
    { id: "pac028", nombre: "", apellido: "Cornejo", dni: "", telefono: "", email: "", obraSocial: "Ministerio", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "Control ministerio", historia: [] },
    { id: "pac029", nombre: "Carla", apellido: "Márquez", dni: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", fechaNac: "", diagnostico: "", antecedentes: "", notas: "1ra vez", historia: [] },
  ],
  turnos: [
    { id: "t001", pacienteId: "pac001", fecha: "2026-05-12", hora: "09:00", motivo: "Control", profesional: "", estado: "confirmado", notas: "" },
    { id: "t002", pacienteId: "pac002", fecha: "2026-05-12", hora: "12:00", motivo: "", profesional: "", estado: "confirmado", notas: "" },
    { id: "t003", pacienteId: "pac003", fecha: "2026-05-12", hora: "15:00", motivo: "", profesional: "", estado: "confirmado", notas: "" },
    { id: "t004", pacienteId: "pac004", fecha: "2026-05-12", hora: "16:00", motivo: "", profesional: "", estado: "confirmado", notas: "" },
    { id: "t005", pacienteId: "pac005", fecha: "2026-05-12", hora: "16:00", motivo: "", profesional: "", estado: "confirmado", notas: "" },
    { id: "t006", pacienteId: "pac006", fecha: "2026-05-12", hora: "16:00", motivo: "", profesional: "", estado: "confirmado", notas: "" },
    { id: "t007", pacienteId: "pac007", fecha: "2026-05-13", hora: "08:30", motivo: "Control", profesional: "", estado: "confirmado", notas: "" },
    { id: "t008", pacienteId: "pac008", fecha: "2026-05-13", hora: "09:30", motivo: "Audio + Logo", profesional: "", estado: "confirmado", notas: "Particular - $55.000" },
    { id: "t009", pacienteId: "pac009", fecha: "2026-05-13", hora: "10:00", motivo: "Calibración", profesional: "", estado: "confirmado", notas: "Ministerio" },
    { id: "t010", pacienteId: "pac010", fecha: "2026-05-13", hora: "11:00", motivo: "Toma de molde", profesional: "", estado: "confirmado", notas: "" },
    { id: "t011", pacienteId: "pac011", fecha: "2026-05-14", hora: "09:00", motivo: "Control", profesional: "", estado: "confirmado", notas: "" },
    { id: "t012", pacienteId: "pac012", fecha: "2026-05-14", hora: "10:00", motivo: "", profesional: "", estado: "confirmado", notas: "" },
    { id: "t013", pacienteId: "pac013", fecha: "2026-05-14", hora: "11:00", motivo: "Pedir 2do OTA IAPOS", profesional: "", estado: "confirmado", notas: "" },
    { id: "t014", pacienteId: "pac014", fecha: "2026-05-14", hora: "11:30", motivo: "Control", profesional: "", estado: "confirmado", notas: "" },
    { id: "t015", pacienteId: "pac015", fecha: "2026-05-14", hora: "12:30", motivo: "Retira molde", profesional: "", estado: "confirmado", notas: "" },
    { id: "t016", pacienteId: "pac016", fecha: "2026-05-15", hora: "08:30", motivo: "Calibración", profesional: "", estado: "confirmado", notas: "Trae AT" },
    { id: "t017", pacienteId: "pac017", fecha: "2026-05-15", hora: "10:00", motivo: "", profesional: "", estado: "confirmado", notas: "" },
    { id: "t018", pacienteId: "pac018", fecha: "2026-05-15", hora: "10:30", motivo: "Control", profesional: "", estado: "confirmado", notas: "Deriva Castagna" },
    { id: "t019", pacienteId: "pac019", fecha: "2026-05-15", hora: "11:00", motivo: "Control", profesional: "", estado: "confirmado", notas: "" },
    { id: "t020", pacienteId: "pac020", fecha: "2026-05-15", hora: "12:00", motivo: "Impresión de moldes", profesional: "", estado: "confirmado", notas: "" },
    { id: "t021", pacienteId: "pac021", fecha: "2026-05-15", hora: "12:00", motivo: "Calibración", profesional: "", estado: "confirmado", notas: "" },
    { id: "t022", pacienteId: "pac022", fecha: "2026-05-15", hora: "15:15", motivo: "Toma de moldes", profesional: "", estado: "confirmado", notas: "" },
    { id: "t023", pacienteId: "pac023", fecha: "2026-05-15", hora: "16:15", motivo: "Control", profesional: "", estado: "confirmado", notas: "" },
    { id: "t024", pacienteId: "pac024", fecha: "2026-05-19", hora: "09:00", motivo: "Rehacer molde", profesional: "", estado: "confirmado", notas: "" },
    { id: "t025", pacienteId: "pac027", fecha: "2026-05-18", hora: "11:00", motivo: "Selección + AT", profesional: "", estado: "confirmado", notas: "OSPAC + IAPOS" },
    { id: "t026", pacienteId: "pac025", fecha: "2026-05-19", hora: "11:00", motivo: "Selecciones", profesional: "", estado: "confirmado", notas: "Deriva Grossi" },
    { id: "t027", pacienteId: "pac026", fecha: "2026-05-19", hora: "12:30", motivo: "Molde", profesional: "", estado: "confirmado", notas: "" },
    { id: "t028", pacienteId: "pac028", fecha: "2026-05-19", hora: "15:00", motivo: "Control", profesional: "", estado: "confirmado", notas: "Ministerio" },
    { id: "t029", pacienteId: "pac029", fecha: "2026-05-19", hora: "15:30", motivo: "Primera consulta", profesional: "", estado: "confirmado", notas: "" },
  ],
  ventas: [],
  recordatorios: [
    { id: "r001", titulo: "Llevar regalos", fecha: "2026-05-12", hora: "13:00", tipo: "otro", pacienteId: "", descripcion: "Recordatorio del calendario", completado: false },
    { id: "r002", titulo: "Caro - Asesoría empresa", fecha: "2026-05-13", hora: "12:30", tipo: "otro", pacienteId: "", descripcion: "Reunión asesoría", completado: false },
    { id: "r003", titulo: "Ale: buscar moldes y llevar a Mediser con plata para retirar", fecha: "2026-05-13", hora: "08:00", tipo: "otro", pacienteId: "", descripcion: "Llevar a Mediser con plata para retirar", completado: false },
    { id: "r004", titulo: "¿Están los dos? Resto en efectivo?", fecha: "2026-05-13", hora: "14:00", tipo: "seguimiento", pacienteId: "", descripcion: "Verificar pago", completado: false },
    { id: "r005", titulo: "Escribir a Eva Martínez", fecha: "2026-05-13", hora: "14:30", tipo: "llamada", pacienteId: "", descripcion: "", completado: false },
    { id: "r006", titulo: "Desayuno Colegio", fecha: "2026-05-16", hora: "09:00", tipo: "otro", pacienteId: "", descripcion: "", completado: false },
    { id: "r007", titulo: "Reunión Community - Florencia Sartorelli (Uh!)", fecha: "2026-05-18", hora: "09:00", tipo: "otro", pacienteId: "", descripcion: "", completado: false },
    { id: "r008", titulo: "Ir a Galeno", fecha: "2026-05-18", hora: "13:00", tipo: "otro", pacienteId: "", descripcion: "", completado: false },
    { id: "r009", titulo: "Escribirle a Lucas por Mirko", fecha: "2026-05-18", hora: "13:30", tipo: "llamada", pacienteId: "", descripcion: "", completado: false },
    { id: "r010", titulo: "¿Llegó acrílico a Quilmes?", fecha: "2026-05-14", hora: "13:30", tipo: "seguimiento", pacienteId: "", descripcion: "", completado: false },
    { id: "r011", titulo: "Pedir 2do OTA - Bartolini Alejandro", fecha: "2026-05-19", hora: "13:30", tipo: "seguimiento", pacienteId: "", descripcion: "", completado: false },
  ],
};

const initialData = {
  pacientes: [],
  turnos: [],
  ventas: [],
  recordatorios: [],
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatFecha(str) {
  if (!str) return "-";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}
function today() {
  return new Date().toISOString().split("T")[0];
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

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
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      {c.label}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #F0F0F0" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
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

const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#FAFAFA" };
const selectStyle = { ...inputStyle };
const btnPrimary = { background: "linear-gradient(135deg, #1a1a2e, #16213e)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnSecondary = { background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" };

// ─── HELPERS SEMANA ──────────────────────────────────────────────────────────
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
function nombreDia(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d.getDay()];
}
function numDia(dateStr) {
  return parseInt(dateStr.split("-")[2], 10);
}
function mesCorto(dateStr) {
  const m = parseInt(dateStr.split("-")[1], 10) - 1;
  return ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][m];
}

// ─── TURNOS ───────────────────────────────────────────────────────────────────
const FORM_PAC_VACIO = { nombre: "", apellido: "", dni: "", telefono: "", obraSocial: "", fechaNac: "", email: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "", historia: [] };

function TarjetaTurno({ t, pacNombre, onEditar, onEliminar, mostrarFecha }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 10, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
        <div style={{ background: "#EEF2FF", borderRadius: 7, padding: "6px 10px", textAlign: "center", minWidth: 52, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#4338CA" }}>{t.hora}{t.horaFin ? `–${t.horaFin}` : ""}</div>
          {mostrarFecha && <div style={{ fontSize: 10, color: "#6366F1" }}>{formatFecha(t.fecha)}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pacNombre(t.pacienteId)}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{t.motivo || "Sin motivo"}{t.profesional ? ` · ${t.profesional}` : ""}</div>
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

function Turnos({ data, setData }) {
  const [vista, setVista] = useState("dia"); // "dia" | "semana" | "todos"
  const [filtroFecha, setFiltroFecha] = useState(today());
  const [semanaBase, setSemanaBase] = useState(getLunes(today()));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ pacienteId: "", fecha: today(), hora: "09:00", horaFin: "09:30", motivo: "", profesional: "", estado: "pendiente", notas: "" });
  const [mostrarNuevoPac, setMostrarNuevoPac] = useState(false);
  const [formPac, setFormPac] = useState(FORM_PAC_VACIO);
  const [busquedaPac, setBusquedaPac] = useState("");
  const [hcForm, setHcForm] = useState({ tipo: "consulta", descripcion: "", profesional: "" });
  const [hcGuardada, setHcGuardada] = useState(false);

  const pacientes = data.pacientes;

  const pacientesFiltrados = pacientes.filter(p =>
    busquedaPac === "" ||
    `${p.nombre} ${p.apellido} ${p.dni || ""}`.toLowerCase().includes(busquedaPac.toLowerCase())
  );

  const diasSemana = Array.from({ length: 6 }, (_, i) => addDays(semanaBase, i)); // lun a sab

  function turnosDia(fecha) {
    return data.turnos.filter(t => t.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora));
  }

  const turnosFiltrados = vista === "dia"
    ? data.turnos.filter(t => t.fecha === filtroFecha).sort((a, b) => a.hora.localeCompare(b.hora))
    : vista === "todos"
    ? [...data.turnos].sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))
    : [];

  const DURACION_MOTIVO = {
    "Selección de audífonos": 60,
    "Asesoramiento comercial": 60,
  };
  const DURACION_DEFAULT = 30;

  function calcularHoraFin(horaInicio, motivo) {
    if (!horaInicio) return "";
    const mins = DURACION_MOTIVO[motivo] !== undefined ? DURACION_MOTIVO[motivo] : DURACION_DEFAULT;
    const [h, m] = horaInicio.split(":").map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function guardar() {
    if (!form.pacienteId || !form.fecha || !form.hora) return alert("Completá paciente, fecha y hora.");
    if (modal === "nuevo") {
      setData(d => ({ ...d, turnos: [...d.turnos, { ...form, id: uid() }] }));
    } else {
      setData(d => ({ ...d, turnos: d.turnos.map(t => t.id === modal ? { ...form, id: modal } : t) }));
    }
    // Si el estado es "realizado" y hay descripción en HC, guardarla
    if (form.estado === "realizado" && hcForm.descripcion.trim() && form.pacienteId) {
      const entradaHC = { id: uid(), fecha: form.fecha, tipo: hcForm.tipo, descripcion: hcForm.descripcion, profesional: hcForm.profesional };
      setData(d => ({
        ...d,
        pacientes: d.pacientes.map(p => p.id === form.pacienteId
          ? { ...p, historia: [...(p.historia || []), entradaHC] }
          : p)
      }));
    }
    setModal(null); setMostrarNuevoPac(false); setBusquedaPac("");
    setHcForm({ tipo: "consulta", descripcion: "", profesional: "" }); setHcGuardada(false);
  }

  function crearPacienteYSeleccionar() {
    if (!formPac.nombre || !formPac.apellido) return alert("Nombre y apellido son obligatorios.");
    const np = { ...formPac, id: uid() };
    setData(d => ({ ...d, pacientes: [...d.pacientes, np] }));
    setForm(f => ({ ...f, pacienteId: np.id }));
    setMostrarNuevoPac(false); setFormPac(FORM_PAC_VACIO);
    setBusquedaPac(`${np.apellido} ${np.nombre}`);
  }

  function eliminar(id) {
    if (confirm("¿Eliminar este turno?")) setData(d => ({ ...d, turnos: d.turnos.filter(t => t.id !== id) }));
  }

  function editar(t) {
    setForm({ horaFin: "", ...t }); setMostrarNuevoPac(false); setBusquedaPac(""); setModal(t.id);
    setHcForm({ tipo: "consulta", descripcion: "", profesional: "" }); setHcGuardada(false);
  }

  function nuevo(fechaPreset) {
    const horaInicio = "09:00";
    setForm({ pacienteId: "", fecha: fechaPreset || (vista === "dia" ? filtroFecha : today()), hora: horaInicio, horaFin: calcularHoraFin(horaInicio, ""), motivo: "", profesional: "", estado: "pendiente", notas: "" });
    setMostrarNuevoPac(false); setFormPac(FORM_PAC_VACIO); setBusquedaPac("");
    setHcForm({ tipo: "consulta", descripcion: "", profesional: "" }); setHcGuardada(false);
    setModal("nuevo");
  }

  const pacNombre = (id) => {
    const p = pacientes.find(p => p.id === id);
    return p ? `${p.nombre} ${p.apellido}` : "—";
  };

  const pacSeleccionado = pacientes.find(p => p.id === form.pacienteId);

  // ── Encabezado semana ──
  const semanaLabel = (() => {
    const fin = addDays(semanaBase, 5);
    const msBase = parseInt(semanaBase.split("-")[1], 10);
    const msFin = parseInt(fin.split("-")[1], 10);
    if (msBase === msFin) return `${numDia(semanaBase)} – ${numDia(fin)} ${mesCorto(fin)}`;
    return `${numDia(semanaBase)} ${mesCorto(semanaBase)} – ${numDia(fin)} ${mesCorto(fin)}`;
  })();

  const esHoy = (f) => f === today();

  return (
    <div>
      {/* ── TOOLBAR ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 9, padding: 3 }}>
          {[["dia","Día"],["semana","Semana"],["todos","Todos"]].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)} style={{ background: vista === v ? "#1a1a2e" : "transparent", color: vista === v ? "#fff" : "#555", border: "none", borderRadius: 7, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {vista === "dia" && (
            <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
          )}
          {vista === "semana" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setSemanaBase(addDays(semanaBase, -7))} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 16, lineHeight: 1 }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", minWidth: 130, textAlign: "center" }}>{semanaLabel}</span>
              <button onClick={() => setSemanaBase(addDays(semanaBase, 7))} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 16, lineHeight: 1 }}>›</button>
              <button onClick={() => setSemanaBase(getLunes(today()))} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>Hoy</button>
            </div>
          )}
          <button onClick={() => nuevo()} style={btnPrimary}>+ Nuevo turno</button>
        </div>
      </div>

      {/* ── VISTA DÍA ── */}
      {vista === "dia" && (
        turnosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
            <div style={{ fontSize: 40 }}>📅</div>
            <div style={{ marginTop: 8 }}>No hay turnos para esta fecha</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {turnosFiltrados.map(t => <TarjetaTurno key={t.id} t={t} pacNombre={pacNombre} onEditar={editar} onEliminar={eliminar} mostrarFecha={false} />)}
          </div>
        )
      )}

      {/* ── VISTA SEMANA ── */}
      {vista === "semana" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {diasSemana.map(fecha => {
            const ts = turnosDia(fecha);
            const hoy = esHoy(fecha);
            return (
              <div key={fecha} style={{ minWidth: 0 }}>
                {/* cabecera día */}
                <div onClick={() => { setVista("dia"); setFiltroFecha(fecha); }}
                  style={{ background: hoy ? "#1a1a2e" : "#F8FAFC", border: hoy ? "none" : "1.5px solid #E5E7EB", borderRadius: 9, padding: "8px 6px", textAlign: "center", marginBottom: 6, cursor: "pointer" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: hoy ? "rgba(255,255,255,0.7)" : "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{nombreDia(fecha)}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: hoy ? "#fff" : "#1a1a2e", lineHeight: 1.2 }}>{numDia(fecha)}</div>
                  {ts.length > 0 && <div style={{ fontSize: 10, color: hoy ? "rgba(255,255,255,0.6)" : "#6366F1", marginTop: 2 }}>{ts.length} turno{ts.length !== 1 ? "s" : ""}</div>}
                </div>
                {/* turnos del día */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {ts.map(t => {
                    const pac = pacientes.find(p => p.id === t.pacienteId);
                    const nombre = pac ? `${pac.apellido}` : "—";
                    const ce = COLORES_ESTADO[t.estado] || COLORES_ESTADO.pendiente;
                    return (
                      <div key={t.id} onClick={() => editar(t)}
                        style={{ background: ce.bg, border: `1.5px solid ${ce.bg}`, borderRadius: 7, padding: "6px 8px", cursor: "pointer", overflow: "hidden" }}
                        title={`${t.hora} · ${pacNombre(t.pacienteId)}${t.motivo ? " · " + t.motivo : ""}`}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: ce.color }}>{t.hora}</div>
                        <div style={{ fontSize: 11, color: ce.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombre}</div>
                        {t.motivo && <div style={{ fontSize: 10, color: ce.color, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.motivo}</div>}
                      </div>
                    );
                  })}
                  {/* botón agregar en día vacío */}
                  <button onClick={() => nuevo(fecha)}
                    style={{ background: "transparent", border: "1.5px dashed #D1D5DB", borderRadius: 7, padding: "5px", fontSize: 11, color: "#9CA3AF", cursor: "pointer", textAlign: "center" }}>
                    + turno
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VISTA TODOS ── */}
      {vista === "todos" && (
        turnosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
            <div style={{ fontSize: 40 }}>📅</div>
            <div style={{ marginTop: 8 }}>No hay turnos cargados</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {turnosFiltrados.map(t => <TarjetaTurno key={t.id} t={t} pacNombre={pacNombre} onEditar={editar} onEliminar={eliminar} mostrarFecha={true} />)}
          </div>
        )
      )}

      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo turno" : "Editar turno"} onClose={() => { setModal(null); setMostrarNuevoPac(false); setBusquedaPac(""); }}>

          {/* ── SECCIÓN PACIENTE ── */}
          <div style={{ background: "#F8FAFC", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>👤 Paciente *</span>
              {!mostrarNuevoPac && (
                <button onClick={() => { setMostrarNuevoPac(true); setForm(f => ({ ...f, pacienteId: "" })); setBusquedaPac(""); }}
                  style={{ background: "#EEF2FF", color: "#4338CA", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  + Crear nuevo paciente
                </button>
              )}
            </div>

            {!mostrarNuevoPac ? (
              <>
                {pacSeleccionado ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#EEF2FF", borderRadius: 8, padding: "10px 14px" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#3730A3" }}>{pacSeleccionado.apellido}, {pacSeleccionado.nombre}</div>
                      <div style={{ fontSize: 12, color: "#6366F1" }}>DNI: {pacSeleccionado.dni || "—"} · {pacSeleccionado.telefono || "Sin teléfono"}</div>
                    </div>
                    <button onClick={() => { setForm(f => ({ ...f, pacienteId: "" })); setBusquedaPac(""); }}
                      style={{ background: "none", border: "none", color: "#6366F1", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <>
                    <input
                      style={{ ...inputStyle, marginBottom: 8 }}
                      placeholder="Buscar por nombre o DNI..."
                      value={busquedaPac}
                      onChange={e => setBusquedaPac(e.target.value)}
                    />
                    {busquedaPac.length > 0 && (
                      <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, maxHeight: 180, overflowY: "auto", background: "#fff" }}>
                        {pacientesFiltrados.length === 0 ? (
                          <div style={{ padding: "10px 14px", fontSize: 13, color: "#aaa" }}>
                            No se encontraron pacientes.{" "}
                            <button onClick={() => setMostrarNuevoPac(true)} style={{ background: "none", border: "none", color: "#4338CA", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>
                              ¿Crear nuevo?
                            </button>
                          </div>
                        ) : (
                          pacientesFiltrados.map(p => (
                            <div key={p.id}
                              onClick={() => { setForm(f => ({ ...f, pacienteId: p.id })); setBusquedaPac(""); }}
                              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", fontSize: 14 }}
                              onMouseEnter={e => e.currentTarget.style.background = "#F0F4FF"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              <span style={{ fontWeight: 600 }}>{p.apellido}, {p.nombre}</span>
                              <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>DNI: {p.dni || "—"}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {busquedaPac.length === 0 && pacientes.length > 0 && (
                      <div style={{ fontSize: 12, color: "#aaa" }}>Escribí para buscar entre {pacientes.length} paciente{pacientes.length !== 1 ? "s" : ""} registrado{pacientes.length !== 1 ? "s" : ""}.</div>
                    )}
                    {pacientes.length === 0 && (
                      <div style={{ fontSize: 12, color: "#aaa" }}>No hay pacientes registrados aún.</div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* ── FORMULARIO NUEVO PACIENTE INLINE ── */
              <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>✦ Nuevo paciente</span>
                  <button onClick={() => setMostrarNuevoPac(false)} style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer" }}>← Volver a buscar</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Nombre *"><input style={inputStyle} value={formPac.nombre} onChange={e => setFormPac(f => ({ ...f, nombre: e.target.value }))} /></Field>
                  <Field label="Apellido *"><input style={inputStyle} value={formPac.apellido} onChange={e => setFormPac(f => ({ ...f, apellido: e.target.value }))} /></Field>
                  <Field label="DNI"><input style={inputStyle} value={formPac.dni} onChange={e => setFormPac(f => ({ ...f, dni: e.target.value }))} /></Field>
                  <Field label="Teléfono"><input style={inputStyle} value={formPac.telefono} onChange={e => setFormPac(f => ({ ...f, telefono: e.target.value }))} /></Field>
                  <Field label="Obra social"><input style={inputStyle} value={formPac.obraSocial} onChange={e => setFormPac(f => ({ ...f, obraSocial: e.target.value }))} /></Field>
                  <Field label="Fecha de nacimiento"><input type="date" style={inputStyle} value={formPac.fechaNac} onChange={e => setFormPac(f => ({ ...f, fechaNac: e.target.value }))} /></Field>
                </div>
                <Field label="Diagnóstico audiológico"><input style={inputStyle} value={formPac.diagnostico} onChange={e => setFormPac(f => ({ ...f, diagnostico: e.target.value }))} placeholder="Ej: Hipoacusia bilateral leve" /></Field>
                <button onClick={crearPacienteYSeleccionar} style={{ ...btnPrimary, background: "linear-gradient(135deg, #065F46, #059669)", width: "100%", marginTop: 4 }}>
                  ✓ Crear paciente y asignar al turno
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Fecha *"><input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
            <Field label="Hora inicio *"><input type="time" style={inputStyle} value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value, horaFin: calcularHoraFin(e.target.value, f.motivo) }))} /></Field>
            <Field label="Hora fin"><input type="time" style={inputStyle} value={form.horaFin || ""} onChange={e => setForm(f => ({ ...f, horaFin: e.target.value }))} /></Field>
          </div>
          <Field label="Motivo">
            <select style={selectStyle} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value, horaFin: calcularHoraFin(f.hora, e.target.value) }))}>
              <option value="">— Sin especificar —</option>
              <option value="Audiometría y logoaudiometría">Audiometría y logoaudiometría</option>
              <option value="Control">Control</option>
              <option value="Calibración">Calibración</option>
              <option value="Selección de audífonos">Selección de audífonos</option>
              <option value="Toma de impresión para molde">Toma de impresión para molde</option>
              <option value="Entrega de molde">Entrega de molde</option>
              <option value="Asesoramiento comercial">Asesoramiento comercial</option>
              <option value="Reunión con profesionales">Reunión con profesionales</option>
              <option value="Entrega de audífonos">Entrega de audífonos</option>
            </select>
          </Field>
          <Field label="Profesional">
            <select style={selectStyle} value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))}>
              <option value="">— Sin asignar —</option>
              <option value="Lic. Cecilia Miatello">Lic. Cecilia Miatello</option>
              <option value="Lic. Graciela Valles">Lic. Graciela Valles</option>
            </select>
          </Field>
          <Field label="Estado">
            <select style={selectStyle} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
              {Object.entries(COLORES_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>

          {/* ── HISTORIA CLÍNICA INLINE (solo cuando estado = realizado) ── */}
          {form.estado === "realizado" && form.pacienteId && (
            <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "14px 16px", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>Registrar en historia clínica</div>
                  <div style={{ fontSize: 12, color: "#16A34A" }}>Podés completar la evolución de esta consulta antes de guardar</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <Field label="Tipo de registro">
                  <select style={{ ...selectStyle, borderColor: "#BBF7D0", background: "#fff" }} value={hcForm.tipo} onChange={e => setHcForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="Audiometría y logoaudiometría">Audiometría y logoaudiometría</option>
                    <option value="Control">Control</option>
                    <option value="Calibración">Calibración</option>
                    <option value="Selección de audífonos">Selección de audífonos</option>
                    <option value="Toma de impresión para molde">Toma de impresión para molde</option>
                    <option value="Entrega de molde">Entrega de molde</option>
                    <option value="Asesoramiento comercial">Asesoramiento comercial</option>
                    <option value="Reunión con profesionales">Reunión con profesionales</option>
                    <option value="Entrega de audífonos">Entrega de audífonos</option>
                    <option value="Otro">Otro</option>
                  </select>
                </Field>
                <Field label="Profesional">
                  <select style={{ ...selectStyle, borderColor: "#BBF7D0", background: "#fff" }} value={hcForm.profesional} onChange={e => setHcForm(f => ({ ...f, profesional: e.target.value }))}>
                    <option value="">— Sin asignar —</option>
                    <option value="Lic. Cecilia Miatello">Lic. Cecilia Miatello</option>
                    <option value="Lic. Graciela Valles">Lic. Graciela Valles</option>
                  </select>
                </Field>
              </div>
              <Field label="Descripción / evolución">
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70, borderColor: "#BBF7D0", background: "#fff" }}
                  value={hcForm.descripcion}
                  onChange={e => setHcForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describí la evolución, indicaciones, observaciones del turno..." />
              </Field>
              {hcForm.descripcion.trim() === "" && (
                <div style={{ fontSize: 12, color: "#16A34A", marginTop: -6 }}>Si no completás descripción, el turno se guarda igual pero sin entrada en la historia.</div>
              )}
            </div>
          )}
          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} style={btnPrimary}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── PACIENTES ────────────────────────────────────────────────────────────────
function Pacientes({ data, setData }) {
  const [modal, setModal] = useState(null);
  const [verHC, setVerHC] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({ nombre: "", apellido: "", dni: "", fechaNac: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "" });
  const [evModal, setEvModal] = useState(null);
  const [evForm, setEvForm] = useState({ fecha: today(), tipo: "consulta", descripcion: "", profesional: "", archivo: "" });

  const pacientes = data.pacientes.filter(p =>
    busqueda === "" ||
    `${p.nombre} ${p.apellido} ${p.dni}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  function guardar() {
    if (!form.nombre || !form.apellido) return alert("Nombre y apellido son obligatorios.");
    if (modal === "nuevo") {
      setData(d => ({ ...d, pacientes: [...d.pacientes, { ...form, id: uid(), historia: [] }] }));
    } else {
      setData(d => ({ ...d, pacientes: d.pacientes.map(p => p.id === modal ? { ...p, ...form } : p) }));
    }
    setModal(null);
  }

  function editar(p) {
    setForm({ nombre: p.nombre, apellido: p.apellido, dni: p.dni || "", fechaNac: p.fechaNac || "", telefono: p.telefono || "", email: p.email || "", obraSocial: p.obraSocial || "", nroAfiliado: p.nroAfiliado || "", diagnostico: p.diagnostico || "", antecedentes: p.antecedentes || "", notas: p.notas || "" });
    setModal(p.id);
  }

  function eliminar(id) {
    if (confirm("¿Eliminar este paciente?")) setData(d => ({ ...d, pacientes: d.pacientes.filter(p => p.id !== id) }));
  }

  function agregarEvento() {
    if (!evForm.descripcion) return alert("Escribí una descripción.");
    setData(d => ({
      ...d,
      pacientes: d.pacientes.map(p => p.id === verHC
        ? { ...p, historia: [...(p.historia || []), { ...evForm, id: uid() }] }
        : p)
    }));
    setEvModal(null);
    setEvForm({ fecha: today(), tipo: "consulta", descripcion: "", profesional: "", archivo: "" });
  }

  const pacienteHC = data.pacientes.find(p => p.id === verHC);

  const TIPO_HC = { consulta: "🩺", estudio: "📋", adaptacion: "👂", venta: "🛒", otro: "📌" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <input style={{ ...inputStyle, maxWidth: 300 }} placeholder="Buscar por nombre o DNI..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <button onClick={() => { setForm({ nombre: "", apellido: "", dni: "", fechaNac: "", telefono: "", email: "", obraSocial: "", nroAfiliado: "", diagnostico: "", antecedentes: "", notas: "" }); setModal("nuevo"); }} style={btnPrimary}>+ Nuevo paciente</button>
      </div>

      {pacientes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>👤</div><div style={{ marginTop: 8 }}>No hay pacientes</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {pacientes.map(p => (
            <div key={p.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#4338CA", flexShrink: 0 }}>
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{p.apellido}, {p.nombre}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>DNI: {p.dni || "—"}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>📞 {p.telefono || "—"}</div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>🏥 {p.obraSocial || "Particular"}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setVerHC(p.id)} style={{ ...btnPrimary, padding: "6px 12px", fontSize: 12, flex: 1 }}>Historia clínica</button>
                <button onClick={() => editar(p)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>Editar</button>
                <button onClick={() => eliminar(p.id)} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NUEVO/EDITAR PACIENTE */}
      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo paciente" : "Editar paciente"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Nombre *"><input style={inputStyle} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
            <Field label="Apellido *"><input style={inputStyle} value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} /></Field>
            <Field label="DNI"><input style={inputStyle} value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} /></Field>
            <Field label="Fecha de nacimiento"><input type="date" style={inputStyle} value={form.fechaNac} onChange={e => setForm(f => ({ ...f, fechaNac: e.target.value }))} /></Field>
            <Field label="Teléfono"><input style={inputStyle} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></Field>
            <Field label="Email"><input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
            <Field label="Obra social"><input style={inputStyle} value={form.obraSocial} onChange={e => setForm(f => ({ ...f, obraSocial: e.target.value }))} /></Field>
            <Field label="Nro. afiliado"><input style={inputStyle} value={form.nroAfiliado} onChange={e => setForm(f => ({ ...f, nroAfiliado: e.target.value }))} /></Field>
          </div>
          <Field label="Diagnóstico audiológico"><input style={inputStyle} value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} placeholder="Ej: Hipoacusia bilateral leve" /></Field>
          <Field label="Antecedentes"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.antecedentes} onChange={e => setForm(f => ({ ...f, antecedentes: e.target.value }))} /></Field>
          <Field label="Notas"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} style={btnPrimary}>Guardar</button>
          </div>
        </Modal>
      )}

      {/* HISTORIA CLÍNICA */}
      {verHC && pacienteHC && (
        <Modal title={`Historia clínica · ${pacienteHC.apellido}, ${pacienteHC.nombre}`} onClose={() => setVerHC(null)}>
          <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div><b>DNI:</b> {pacienteHC.dni || "—"}</div>
            <div><b>Nacimiento:</b> {formatFecha(pacienteHC.fechaNac)}</div>
            <div><b>Teléfono:</b> {pacienteHC.telefono || "—"}</div>
            <div><b>Obra social:</b> {pacienteHC.obraSocial || "Particular"}</div>
            {pacienteHC.diagnostico && <div style={{ gridColumn: "span 2" }}><b>Diagnóstico:</b> {pacienteHC.diagnostico}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Evolución clínica</span>
            <button onClick={() => setEvModal(true)} style={{ ...btnPrimary, padding: "6px 14px", fontSize: 13 }}>+ Agregar entrada</button>
          </div>
          {(pacienteHC.historia || []).length === 0 ? (
            <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Sin entradas aún</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...(pacienteHC.historia || [])].reverse().map(ev => (
                <div key={ev.id} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{TIPO_HC[ev.tipo] || "📌"} {ev.tipo}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{formatFecha(ev.fecha)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: "#333" }}>{ev.descripcion}</p>
                  {ev.profesional && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Dr/a. {ev.profesional}</div>}
                </div>
              ))}
            </div>
          )}

          {evModal && (
            <div style={{ marginTop: 20, background: "#F8FAFC", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>Nueva entrada</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Fecha"><input type="date" style={inputStyle} value={evForm.fecha} onChange={e => setEvForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
                <Field label="Tipo">
                  <select style={selectStyle} value={evForm.tipo} onChange={e => setEvForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="Audiometría y logoaudiometría">Audiometría y logoaudiometría</option>
                    <option value="Control">Control</option>
                    <option value="Calibración">Calibración</option>
                    <option value="Selección de audífonos">Selección de audífonos</option>
                    <option value="Toma de impresión para molde">Toma de impresión para molde</option>
                    <option value="Entrega de molde">Entrega de molde</option>
                    <option value="Asesoramiento comercial">Asesoramiento comercial</option>
                    <option value="Reunión con profesionales">Reunión con profesionales</option>
                    <option value="Entrega de audífonos">Entrega de audífonos</option>
                    <option value="Otro">Otro</option>
                  </select>
                </Field>
              </div>
              <Field label="Descripción *"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} value={evForm.descripcion} onChange={e => setEvForm(f => ({ ...f, descripcion: e.target.value }))} /></Field>
              <Field label="Profesional"><input style={inputStyle} value={evForm.profesional} onChange={e => setEvForm(f => ({ ...f, profesional: e.target.value }))} /></Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setEvModal(null)} style={btnSecondary}>Cancelar</button>
                <button onClick={agregarEvento} style={btnPrimary}>Agregar</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────
function Ventas({ data, setData }) {
  const [modal, setModal] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [form, setForm] = useState({ pacienteId: "", fecha: today(), dispositivo: "", marca: "", modelo: "", oido: "bilateral", precio: "", obraSocialCubre: "", saldoPaciente: "", estado: "presupuesto", observaciones: "" });

  const ventas = data.ventas
    .filter(v => !filtroEstado || v.estado === filtroEstado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const pacNombre = (id) => {
    const p = data.pacientes.find(p => p.id === id);
    return p ? `${p.apellido}, ${p.nombre}` : "—";
  };

  function sumarMeses(fechaStr, meses) {
    const d = new Date(fechaStr + "T12:00:00");
    d.setMonth(d.getMonth() + meses);
    return d.toISOString().split("T")[0];
  }

  function guardar() {
    if (!form.pacienteId || !form.dispositivo) return alert("Completá paciente y dispositivo.");

    const esNueva = modal === "nuevo";
    const ventaAnterior = !esNueva && data.ventas.find(v => v.id === modal);
    const yaEraVendido = ventaAnterior?.estado === "vendido";
    const ahoraVendido = form.estado === "vendido";
    const generarRecordatorios = ahoraVendido && !yaEraVendido;

    if (esNueva) {
      setData(d => ({ ...d, ventas: [...d.ventas, { ...form, id: uid() }] }));
    } else {
      setData(d => ({ ...d, ventas: d.ventas.map(v => v.id === modal ? { ...form, id: modal } : v) }));
    }

    if (generarRecordatorios && form.pacienteId) {
      const pac = data.pacientes.find(p => p.id === form.pacienteId);
      const nombrePac = pac ? `${pac.apellido}, ${pac.nombre}` : "Paciente";
      const dispositivo = form.dispositivo || "audífono";
      const fecha3m = sumarMeses(form.fecha, 3);
      const fecha12m = sumarMeses(form.fecha, 12);

      const rec3m = {
        id: uid(),
        titulo: `Control 3 meses · ${nombrePac}`,
        fecha: fecha3m,
        hora: "09:00",
        tipo: "control",
        pacienteId: form.pacienteId,
        descripcion: `Control de uso y adaptación del ${dispositivo}. Venta registrada el ${formatFecha(form.fecha)}.`,
        completado: false,
      };
      const rec12m = {
        id: uid(),
        titulo: `Control anual · ${nombrePac}`,
        fecha: fecha12m,
        hora: "09:00",
        tipo: "control",
        pacienteId: form.pacienteId,
        descripcion: `Control anual del ${dispositivo}. Venta registrada el ${formatFecha(form.fecha)}.`,
        completado: false,
      };

      setData(d => ({ ...d, recordatorios: [...d.recordatorios, rec3m, rec12m] }));
    }

    setModal(null);
  }

  function editar(v) { setForm({ ...v }); setModal(v.id); }
  function eliminar(id) { if (confirm("¿Eliminar esta venta?")) setData(d => ({ ...d, ventas: d.ventas.filter(v => v.id !== id) })); }

  const totalVendido = data.ventas.filter(v => v.estado === "vendido").reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[["vendido", "Vendidas"], ["en_proceso", "En proceso"], ["presupuesto", "Presupuestos"]].map(([e, l]) => (
          <div key={e} style={{ background: "#F8FAFC", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>{data.ventas.filter(v => v.estado === e).length}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{l}</div>
          </div>
        ))}
        <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#166534" }}>${totalVendido.toLocaleString("es-AR")}</div>
          <div style={{ fontSize: 12, color: "#15803D" }}>Total vendido</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setFiltroEstado("")} style={{ ...btnSecondary, background: filtroEstado === "" ? "#1a1a2e" : "#F3F4F6", color: filtroEstado === "" ? "#fff" : "#374151", padding: "6px 14px", fontSize: 13 }}>Todos</button>
          {Object.entries(COLORES_VENTA).map(([k, v]) => (
            <button key={k} onClick={() => setFiltroEstado(k)} style={{ ...btnSecondary, background: filtroEstado === k ? "#1a1a2e" : "#F3F4F6", color: filtroEstado === k ? "#fff" : "#374151", padding: "6px 14px", fontSize: 13 }}>{v.label}</button>
          ))}
        </div>
        <button onClick={() => { setForm({ pacienteId: "", fecha: today(), dispositivo: "", marca: "", modelo: "", oido: "bilateral", precio: "", obraSocialCubre: "", saldoPaciente: "", estado: "presupuesto", observaciones: "" }); setModal("nuevo"); }} style={btnPrimary}>+ Nueva venta</button>
      </div>

      {ventas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>🛒</div><div style={{ marginTop: 8 }}>No hay ventas</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ventas.map(v => (
            <div key={v.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{pacNombre(v.pacienteId)}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{v.marca} {v.modelo} · {v.dispositivo} · {formatFecha(v.fecha)}</div>
                  {v.precio && <div style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginTop: 2 }}>${parseFloat(v.precio).toLocaleString("es-AR")} {v.saldoPaciente ? `· Saldo pac: $${parseFloat(v.saldoPaciente).toLocaleString("es-AR")}` : ""}</div>}
                </div>
                <Badge estado={v.estado} tipo="venta" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => editar(v)} style={{ ...btnSecondary, padding: "6px 14px", fontSize: 13 }}>Editar</button>
                <button onClick={() => eliminar(v.id)} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === "nuevo" ? "Nueva venta / presupuesto" : "Editar venta"} onClose={() => setModal(null)}>
          <Field label="Paciente *">
            <select style={selectStyle} value={form.pacienteId} onChange={e => setForm(f => ({ ...f, pacienteId: e.target.value }))}>
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
            const ventaAnterior = modal !== "nuevo" && data.ventas.find(v => v.id === modal);
            const yaEraVendido = ventaAnterior?.estado === "vendido";
            if (yaEraVendido) return null;
            const f3m = form.fecha ? sumarMeses(form.fecha, 3) : "—";
            const f12m = form.fecha ? sumarMeses(form.fecha, 12) : "—";
            return (
              <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>🔔</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>Se crearán recordatorios automáticos</span>
                </div>
                <div style={{ fontSize: 13, color: "#1E40AF", display: "flex", flexDirection: "column", gap: 3 }}>
                  <div>📅 <b>Control 3 meses</b> · {formatFecha(f3m)}</div>
                  <div>📅 <b>Control anual</b> · {formatFecha(f12m)}</div>
                </div>
              </div>
            );
          })()}
          <Field label="Dispositivo / descripción *"><input style={inputStyle} value={form.dispositivo} onChange={e => setForm(f => ({ ...f, dispositivo: e.target.value }))} placeholder="Ej: Audífono retroauricular" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Marca"><input style={inputStyle} value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ej: Phonak" /></Field>
            <Field label="Modelo"><input style={inputStyle} value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} /></Field>
            <Field label="Oído">
              <select style={selectStyle} value={form.oido} onChange={e => setForm(f => ({ ...f, oido: e.target.value }))}>
                <option value="bilateral">Bilateral</option>
                <option value="derecho">Derecho</option>
                <option value="izquierdo">Izquierdo</option>
              </select>
            </Field>
            <Field label="Precio total ($)"><input style={inputStyle} type="number" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} /></Field>
            <Field label="Cobertura OS ($)"><input style={inputStyle} type="number" value={form.obraSocialCubre} onChange={e => setForm(f => ({ ...f, obraSocialCubre: e.target.value }))} /></Field>
            <Field label="Saldo paciente ($)"><input style={inputStyle} type="number" value={form.saldoPaciente} onChange={e => setForm(f => ({ ...f, saldoPaciente: e.target.value }))} /></Field>
          </div>
          <Field label="Observaciones"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} style={btnPrimary}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── RECORDATORIOS ────────────────────────────────────────────────────────────
function Recordatorios({ data, setData }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ titulo: "", fecha: today(), hora: "09:00", tipo: "seguimiento", pacienteId: "", descripcion: "", completado: false });

  const recs = [...data.recordatorios].sort((a, b) => {
    if (a.completado !== b.completado) return a.completado ? 1 : -1;
    return `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`);
  });

  const pacNombre = (id) => {
    const p = data.pacientes.find(p => p.id === id);
    return p ? `${p.apellido}, ${p.nombre}` : null;
  };

  function guardar() {
    if (!form.titulo) return alert("Escribí un título.");
    if (modal === "nuevo") {
      setData(d => ({ ...d, recordatorios: [...d.recordatorios, { ...form, id: uid() }] }));
    } else {
      setData(d => ({ ...d, recordatorios: d.recordatorios.map(r => r.id === modal ? { ...form, id: modal } : r) }));
    }
    setModal(null);
  }

  function toggle(id) {
    setData(d => ({ ...d, recordatorios: d.recordatorios.map(r => r.id === id ? { ...r, completado: !r.completado } : r) }));
  }

  function eliminar(id) {
    if (confirm("¿Eliminar este recordatorio?")) setData(d => ({ ...d, recordatorios: d.recordatorios.filter(r => r.id !== id) }));
  }

  const TIPO_COLOR = {
    seguimiento: { bg: "#EDE9FE", c: "#5B21B6", label: "Seguimiento" },
    llamada:     { bg: "#DBEAFE", c: "#1E40AF", label: "Llamada" },
    control:     { bg: "#D1FAE5", c: "#065F46", label: "Control" },
    entrega:     { bg: "#FEF3C7", c: "#92400E", label: "Entrega" },
    otro:        { bg: "#F3F4F6", c: "#374151", label: "Otro" },
  };

  const hoy = today();
  const proximos = recs.filter(r => !r.completado && r.fecha >= hoy);
  const vencidos = recs.filter(r => !r.completado && r.fecha < hoy);
  const completados = recs.filter(r => r.completado);

  const RSection = ({ title, items, accent }) => items.length === 0 ? null : (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent || "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{title} · {items.length}</div>
      {items.map(r => {
        const tc = TIPO_COLOR[r.tipo] || TIPO_COLOR.otro;
        const pac = pacNombre(r.pacienteId);
        return (
          <div key={r.id} style={{ background: "#fff", border: r.completado ? "1.5px solid #F0F0F0" : "1.5px solid #E5E7EB", borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, opacity: r.completado ? 0.6 : 1 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <input type="checkbox" checked={r.completado} onChange={() => toggle(r.id)} style={{ marginTop: 3, cursor: "pointer", width: 16, height: 16 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e", textDecoration: r.completado ? "line-through" : "none" }}>{r.titulo}</div>
                {pac && <div style={{ fontSize: 12, color: "#888" }}>👤 {pac}</div>}
                <div style={{ fontSize: 12, color: "#888" }}>📅 {formatFecha(r.fecha)} {r.hora}</div>
                {r.descripcion && <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{r.descripcion}</div>}
                <span style={{ background: tc.bg, color: tc.c, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600, marginTop: 4, display: "inline-block" }}>{tc.label}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => { setForm({ ...r }); setModal(r.id); }} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }}>Editar</button>
              <button onClick={() => eliminar(r.id)} style={{ background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => { setForm({ titulo: "", fecha: today(), hora: "09:00", tipo: "seguimiento", pacienteId: "", descripcion: "", completado: false }); setModal("nuevo"); }} style={btnPrimary}>+ Nuevo recordatorio</button>
      </div>
      <RSection title="Vencidos" items={vencidos} accent="#DC2626" />
      <RSection title="Próximos" items={proximos} accent="#059669" />
      <RSection title="Completados" items={completados} accent="#9CA3AF" />
      {recs.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 40 }}>🔔</div><div style={{ marginTop: 8 }}>Sin recordatorios</div></div>
      )}

      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo recordatorio" : "Editar recordatorio"} onClose={() => setModal(null)}>
          <Field label="Título *"><input style={inputStyle} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Llamar a María para seguimiento" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Fecha"><input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
            <Field label="Hora"><input type="time" style={inputStyle} value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tipo">
              <select style={selectStyle} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_COLOR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Paciente (opcional)">
              <select style={selectStyle} value={form.pacienteId} onChange={e => setForm(f => ({ ...f, pacienteId: e.target.value }))}>
                <option value="">General</option>
                {data.pacientes.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Descripción"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => setModal(null)} style={btnSecondary}>Cancelar</button>
            <button onClick={guardar} style={btnPrimary}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data }) {
  const hoy = today();
  const turnosHoy = data.turnos.filter(t => t.fecha === hoy).length;
  const recVencidos = data.recordatorios.filter(r => !r.completado && r.fecha < hoy).length;
  const ventasActivas = data.ventas.filter(v => v.estado === "en_proceso").length;
  const totalVendido = data.ventas.filter(v => v.estado === "vendido").reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);

  const proximosTurnos = data.turnos.filter(t => t.fecha >= hoy).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0, 5);
  const pacNombre = (id) => { const p = data.pacientes.find(p => p.id === id); return p ? `${p.apellido}, ${p.nombre}` : "—"; };
  const proximosRec = data.recordatorios.filter(r => !r.completado && r.fecha >= hoy).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0, 5);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Turnos hoy", value: turnosHoy, color: "#4338CA", bg: "#EEF2FF" },
          { label: "Pacientes", value: data.pacientes.length, color: "#0891B2", bg: "#E0F2FE" },
          { label: "Ventas en proceso", value: ventasActivas, color: "#D97706", bg: "#FEF3C7", warn: ventasActivas > 0 },
          { label: "Alertas vencidas", value: recVencidos, color: "#DC2626", bg: "#FEE2E2", warn: recVencidos > 0 },
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
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: "#1a1a2e" }}>📅 Próximos turnos</div>
          {proximosTurnos.length === 0 ? <div style={{ color: "#aaa", fontSize: 14 }}>Sin turnos próximos</div> : proximosTurnos.map(t => (
            <div key={t.id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{pacNombre(t.pacienteId)}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{formatFecha(t.fecha)} · {t.hora} · {t.motivo || "—"}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: "#1a1a2e" }}>🔔 Recordatorios pendientes</div>
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

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [data, setDataRaw] = useState(initialData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.storage?.get(STORAGE_KEY).then(res => {
      if (res?.value) {
        try {
          const saved = JSON.parse(res.value);
          if (saved.pacientes?.length > 0 || saved.turnos?.length > 0) {
            setDataRaw(saved);
          } else {
            setDataRaw(CALENDAR_DATA);
            window.storage?.set(STORAGE_KEY, JSON.stringify(CALENDAR_DATA)).catch(() => {});
          }
        } catch { setDataRaw(CALENDAR_DATA); }
      } else {
        setDataRaw(CALENDAR_DATA);
        window.storage?.set(STORAGE_KEY, JSON.stringify(CALENDAR_DATA)).catch(() => {});
      }
      setLoaded(true);
    }).catch(() => { setDataRaw(CALENDAR_DATA); setLoaded(true); });
  }, []);

  const setData = useCallback((updater) => {
    setDataRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      window.storage?.set(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const recVencidos = data.recordatorios.filter(r => !r.completado && r.fecha < today()).length;
  const turnosHoy = data.turnos.filter(t => t.fecha === today()).length;

  const TABS = [
    { id: "dashboard", label: "Inicio", icon: "🏠" },
    { id: "turnos", label: "Turnos", icon: "📅", badge: turnosHoy > 0 ? turnosHoy : null },
    { id: "pacientes", label: "Pacientes", icon: "👤" },
    { id: "ventas", label: "Ventas", icon: "🛒" },
    { id: "recordatorios", label: "Recordatorios", icon: "🔔", badge: recVencidos > 0 ? recVencidos : null, badgeColor: "#DC2626" },
  ];

  if (!loaded) return <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Cargando...</div>;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "0 0 40px" }}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", padding: "20px 28px", borderRadius: "0 0 16px 16px", marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>👂</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>AudioClinic</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Sistema de Gestión · Dispositivos Auditivos</div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div style={{ display: "flex", gap: 4, padding: "12px 16px", background: "#F8FAFC", borderBottom: "1px solid #E5E7EB", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ position: "relative", background: tab === t.id ? "#1a1a2e" : "transparent", color: tab === t.id ? "#fff" : "#555", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}>
            {t.icon} {t.label}
            {t.badge && (
              <span style={{ position: "absolute", top: 2, right: 2, background: t.badgeColor || "#4338CA", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 5px", lineHeight: 1.4 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div style={{ padding: "20px 16px" }}>
        {tab === "dashboard" && <Dashboard data={data} />}
        {tab === "turnos" && <Turnos data={data} setData={setData} />}
        {tab === "pacientes" && <Pacientes data={data} setData={setData} />}
        {tab === "ventas" && <Ventas data={data} setData={setData} />}
        {tab === "recordatorios" && <Recordatorios data={data} setData={setData} />}
      </div>
    </div>
  );
}

