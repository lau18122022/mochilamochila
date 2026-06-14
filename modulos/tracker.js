const container = document.getElementById('tracker-app-container');

// 1. ESTRUCTURA DE DATOS Y MIGRACIÓN
const TIPOS_MANTENIMIENTO = ["Aceite", "Filtro Aire", "Frenos", "Cubiertas", "Transmisión", "Bujías", "General"];

// Inicializamos o recuperamos la flota
let flotaRaw = JSON.parse(localStorage.getItem('flotaVehiculos')) || [
    { id: 'moto-dr160', marca: "Haojue", modelo: "DR 160", tipoVehiculo: "moto", kmActual: 0, intervalos: { "Aceite": 3000, "Filtro Aire": 6000, "Frenos": 10000, "Cubiertas": 15000, "Transmisión": 1000 }, services: [] },
    { id: 'auto-ecosport', marca: "Ford", modelo: "EcoSport", tipoVehiculo: "auto", kmActual: 0, intervalos: { "Aceite": 10000, "Filtro Aire": 15000, "Frenos": 30000, "Cubiertas": 50000, "Bujías": 40000 }, services: [] }
];

// Migración para adaptar datos viejos a la nueva estructura profesional
let flota = flotaRaw.map(v => {
    if (v.kmActual === undefined) v.kmActual = v.services.length > 0 ? Math.max(...v.services.map(s => s.km)) : 0;
    if (!v.intervalos) v.intervalos = { "Aceite": v.intervalAceite || 5000, "Frenos": 15000, "Cubiertas": 20000, "Transmisión": 15000 };
    v.services = v.services.map(s => ({ ...s, tipos: Array.isArray(s.tipo) ? s.tipo : [s.tipo || "General"] }));
    return v;
});

// Variables de estado de la interfaz
let vistaActiva = 'dashboard'; // 'dashboard', 'form-service', 'form-config'
let vehiculoSeleccionadoId = null;

function guardarEnStorage() {
    localStorage.setItem('flotaVehiculos', JSON.stringify(flota));
}

// 2. MOTOR DE CÁLCULO DE DESGASTE
function calcularDesgaste(vehiculo) {
    let desgastes = [];
    
    // Solo calculamos las piezas que tengan un intervalo configurado mayor a 0 en este vehículo
    Object.keys(vehiculo.intervalos).forEach(tipo => {
        let interval = vehiculo.intervalos[tipo];
        if (!interval || interval <= 0) return;

        // Buscamos cuándo fue la última vez que se le hizo esto
        let servicesDeEsteTipo = vehiculo.services.filter(s => s.tipos.includes(tipo));
        servicesDeEsteTipo.sort((a, b) => b.km - a.km);
        
        let kmUltimo = servicesDeEsteTipo.length > 0 ? servicesDeEsteTipo[0].km : 0;
        let kmProximo = kmUltimo + interval;
        let kmRestantes = kmProximo - vehiculo.kmActual;
        
        // Calcular porcentaje para la barra visual (0% es recién cambiado, 100% es para cambiar)
        let porcentaje = ((vehiculo.kmActual - kmUltimo) / interval) * 100;
        if (kmUltimo === 0 && vehiculo.kmActual === 0) porcentaje = 0; // Vehículo 0km
        porcentaje = Math.max(0, Math.min(porcentaje, 100)); // Tope entre 0 y 100

        desgastes.push({
            tipo, kmProximo, kmRestantes, porcentaje, sinDatos: servicesDeEsteTipo.length === 0
        });
    });

    // Ordenar de más urgente (menos km restantes) a menos urgente
    return desgastes.sort((a, b) => a.kmRestantes - b.kmRestantes);
}

function obtenerColorBarra(porcentaje) {
    if (porcentaje >= 90) return 'bg-rose-500';
    if (porcentaje >= 75) return 'bg-amber-400';
    return 'bg-emerald-500';
}

// 3. RENDERIZADO DEL DASHBOARD
function renderizarTracker() {
    if (vistaActiva === 'form-service') return renderizarFormularioService();
    if (vistaActiva === 'form-config') return renderizarFormularioConfig();

    container.innerHTML = `
        <div class="flex flex-col gap-5 w-full">
            ${flota.map(v => {
                const desgastes = calcularDesgaste(v);
                
                return `
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                        
                        <div class="p-4 bg-slate-800/50 flex justify-between items-start border-b border-slate-800">
                            <div>
                                <h2 class="font-black text-lg text-blue-400 tracking-wide">${v.marca} <span class="text-white">${v.modelo}</span></h2>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="font-mono font-bold text-slate-300 text-sm">${v.kmActual.toLocaleString()} km</span>
                                    <button onclick="actualizarKmRapido('${v.id}')" class="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-slate-300 transition">📝 Actualizar</button>
                                </div>
                            </div>
                            <button onclick="abrirConfig('${v.id}')" class="text-slate-400 hover:text-white transition text-xl p-1">⚙️</button>
                        </div>

                        <div class="p-4 space-y-4">
                            ${desgastes.length === 0 ? `<p class="text-xs text-slate-500 italic">No hay intervalos configurados.</p>` : ''}
                            
                            ${desgastes.map(d => `
                                <div>
                                    <div class="flex justify-between items-end mb-1">
                                        <span class="text-xs font-bold text-slate-300">${d.tipo}</span>
                                        <span class="text-[10px] font-mono ${d.kmRestantes <= 500 ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-500'}">
                                            ${d.sinDatos ? 'Faltan datos' : (d.kmRestantes <= 0 ? 'Vencido' : `Faltan ${d.kmRestantes.toLocaleString()} km`)}
                                        </span>
                                    </div>
                                    <div class="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                        <div class="h-full ${obtenerColorBarra(d.porcentaje)} transition-all duration-1000" style="width: ${d.porcentaje}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="p-4 pt-0">
                            <button onclick="abrirService('${v.id}')" class="w-full text-xs bg-blue-600 hover:bg-blue-500 font-bold px-3 py-3 rounded-xl transition text-white shadow-lg flex justify-center items-center gap-2">
                                <span>🔧</span> Registrar Mantenimiento
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// 4. RENDERIZADO: FORMULARIO DE SERVICE (Multi-tareas)
function renderizarFormularioService() {
    const v = flota.find(f => f.id === vehiculoSeleccionadoId);
    
    container.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-xl w-full">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                    <h3 class="font-bold text-sm text-blue-400 uppercase tracking-wider">Nuevo Service</h3>
                    <p class="text-xs text-slate-400">${v.marca} ${v.modelo}</p>
                </div>
                <button onclick="volverDashboard()" class="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 px-2 py-1 rounded">Volver</button>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="text-[10px] font-bold text-slate-400 block mb-1">Fecha</label>
                    <input id="st-fecha" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 block mb-1">Kilometraje del Service</label>
                    <input id="st-km" type="number" value="${v.kmActual}" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
                </div>
            </div>

            <div>
                <label class="text-[10px] font-bold text-slate-400 block mb-2">¿Qué se le hizo? (Podés marcar varias)</label>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    ${TIPOS_MANTENIMIENTO.map(t => `
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800 transition">
                            <input type="checkbox" value="${t}" class="st-tipos-checkbox w-4 h-4 accent-blue-500">
                            <span class="text-slate-300 font-medium">${t}</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div>
                <label class="text-[10px] font-bold text-slate-400 block mb-1">Notas, Repuestos, o Taller</label>
                <input id="st-notas" type="text" placeholder="Ej. Filtro original, Taller de Juan..." class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
            </div>

            <button onclick="guardarService()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg mt-2">
                Confirmar y Guardar
            </button>
        </div>
    `;
}

// 5. RENDERIZADO: CONFIGURACIÓN DEL MANUAL (Intervalos)
function renderizarFormularioConfig() {
    const v = flota.find(f => f.id === vehiculoSeleccionadoId);
    
    container.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-xl w-full">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                    <h3 class="font-bold text-sm text-slate-300 uppercase tracking-wider">Manual de Taller</h3>
                    <p class="text-xs text-slate-400">Intervalos de ${v.marca} ${v.modelo}</p>
                </div>
                <button onclick="volverDashboard()" class="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 px-2 py-1 rounded">Volver</button>
            </div>
            
            <p class="text-xs text-slate-400 italic mb-2">Indicá cada cuántos kilómetros se debe cambiar o revisar cada pieza. (Dejá en 0 lo que no quieras trackear).</p>

            <div class="space-y-3 max-h-80 overflow-y-auto pr-2">
                ${TIPOS_MANTENIMIENTO.map(t => `
                    <div class="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span class="text-sm font-medium text-slate-300 w-1/2">${t}</span>
                        <div class="flex items-center gap-2 w-1/2 justify-end">
                            <input type="number" id="cfg-${t}" value="${v.intervalos[t] || 0}" class="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white text-right outline-none focus:border-blue-500">
                            <span class="text-xs text-slate-500">km</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <button onclick="guardarConfig()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg mt-4">
                Guardar Manual
            </button>
        </div>
    `;
}

// 6. FUNCIONES DE ACCIÓN EXPORTADAS AL WINDOW
window.volverDashboard = function() {
    vistaActiva = 'dashboard';
    vehiculoSeleccionadoId = null;
    renderizarTracker();
};

window.abrirService = function(id) {
    vehiculoSeleccionadoId = id;
    vistaActiva = 'form-service';
    renderizarTracker();
};

window.abrirConfig = function(id) {
    vehiculoSeleccionadoId = id;
    vistaActiva = 'form-config';
    renderizarTracker();
};

window.actualizarKmRapido = function(id) {
    const v = flota.find(f => f.id === id);
    const nuevoKm = prompt(`Actualizar kilometraje actual de ${v.marca} ${v.modelo}:`, v.kmActual);
    if (nuevoKm && !isNaN(nuevoKm) && parseInt(nuevoKm) >= v.kmActual) {
        v.kmActual = parseInt(nuevoKm);
        guardarEnStorage();
        renderizarTracker();
    } else if (nuevoKm) {
        alert("El kilometraje debe ser un número válido y mayor o igual al actual.");
    }
};

window.guardarService = function() {
    const v = flota.find(f => f.id === vehiculoSeleccionadoId);
    const fecha = document.getElementById('st-fecha').value;
    const km = parseInt(document.getElementById('st-km').value);
    const notas = document.getElementById('st-notas').value.trim();
    
    // Recolectar checkboxes marcados
    const checkboxes = document.querySelectorAll('.st-tipos-checkbox:checked');
    const tipos = Array.from(checkboxes).map(cb => cb.value);

    if (!fecha || isNaN(km) || tipos.length === 0) {
        alert("Completá la fecha, los KM del service y marcá al menos una tarea realizada.");
        return;
    }

    // Actualizamos el KM actual del vehículo si el service es más nuevo
    if (km > v.kmActual) v.kmActual = km;

    v.services.push({ fecha, km, tipos, notas });
    guardarEnStorage();
    volverDashboard();
};

window.guardarConfig = function() {
    const v = flota.find(f => f.id === vehiculoSeleccionadoId);
    
    TIPOS_MANTENIMIENTO.forEach(t => {
        const val = parseInt(document.getElementById(`cfg-${t}`).value);
        v.intervalos[t] = isNaN(val) || val < 0 ? 0 : val;
    });

    guardarEnStorage();
    volverDashboard();
};

// Arrancar el motor visual
renderizarTracker();