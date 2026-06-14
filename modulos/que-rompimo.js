import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// Importamos la configuración protegida
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variables de estado del módulo
let roomId = null;
let grupoSincronizado = [];
let listaGastosAmigos = [];

// Contenedor base de la interfaz
const container = document.getElementById('qr-app-container');

// --- PANTALLA INICIAL: CREACIÓN DE SALA (Para cuando entrás vos limpio desde tu menú) ---
function renderizarFormularioInicial() {
    if (!container) return;
    container.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4 shadow-xl w-full">
            <h2 class="text-base font-black text-emerald-400 uppercase tracking-wider text-center">Crear Nueva Sala de Gastos</h2>
            <p class="text-xs text-slate-400 text-center">Creá un grupo para compartir el link con tus amigos y dividir los gastos en tiempo real.</p>
            <button onclick="crearNuevaSalaViaje()" class="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-xl text-sm transition shadow-lg mt-2 text-white">
                🚀 Generar Sala y Link Compartible
            </button>
        </div>
    `;
}

// --- FUNCIÓN ACTIVADA POR TU BOTÓN PARA CREAR SALAS SIN ROMPER EL MENÚ ---
window.crearNuevaSalaViaje = async function() {
    const nuevoId = 'viaje-' + Math.random().toString(36).substring(2, 11);
    
    // Generamos el link de invitación que va a apuntar a tu dominio de Vercel o localhost
    const linkCompartir = `${window.location.origin}${window.location.pathname}?room=${nuevoId}`;
    
    try {
        await navigator.clipboard.writeText(linkCompartir);
        alert("¡Sala creada en Firebase! El link de invitación se copió al portapapeles. Mandaselo a tus amigos por WhatsApp.");
    } catch (err) {
        // Resguardo por si el navegador bloquea el portapapeles por seguridad
        prompt("Sala creada. Copiá este link para mandarle a tus amigos:", linkCompartir);
    }

    // Nos conectamos a la sala en tu pantalla sin recargar la página entera
    conectarASalaFirebase(nuevoId);
};

// --- ESCUCHA DE DATOS ENCAPSULADA (Solo corre cuando hay una sala activa) ---
function conectarASalaFirebase(idSeleccionado) {
    roomId = idSeleccionado;

    onSnapshot(doc(db, "salas", roomId), (docSnap) => {
        if (docSnap.exists() && docSnap.data().integrantes) {
            grupoSincronizado = docSnap.data().integrantes;
            activarEscuchaGastos();
        } else {
            renderizarConfiguracionGrupo();
        }
    });
}

// --- PANTALLA A: CONFIGURACIÓN DE INTEGRANTES ---
function renderizarConfiguracionGrupo() {
    container.innerHTML = `
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
            <div class="border-b border-slate-800 pb-2">
                <h2 class="font-bold text-emerald-400 text-sm uppercase tracking-wider">Configurar Nuevo Viaje</h2>
                <p class="text-xs text-slate-400 mt-0.5">Definí quiénes van a compartir gastos este finde.</p>
            </div>
            <div class="flex gap-2">
                <input id="qr-setup-nombre" type="text" placeholder="Nombre (ej. LAU)" class="flex-grow bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white uppercase focus:outline-none focus:border-emerald-500">
                <button id="qr-btn-add-setup" class="bg-slate-700 hover:bg-slate-600 px-4 rounded-lg font-bold text-xl">+</button>
            </div>
            <div id="qr-setup-lista" class="flex flex-wrap gap-2 text-xs font-medium"></div>
            <button id="qr-btn-confirmar-viaje" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-lg text-sm transition shadow-lg hidden">
                Confirmar Grupo e Iniciar Viaje 🚀
            </button>
        </div>
    `;

    const input = document.getElementById('qr-setup-nombre');
    const btnAdd = document.getElementById('qr-btn-add-setup');
    const listaDiv = document.getElementById('qr-setup-lista');
    const btnConfirmar = document.getElementById('qr-btn-confirmar-viaje');
    let listaLocalAmigos = [];

    btnAdd.addEventListener('click', () => {
        const nombre = input.value.trim().toUpperCase();
        if(!nombre || listaLocalAmigos.includes(nombre)) return;
        listaLocalAmigos.push(nombre);
        input.value = '';
        
        listaDiv.innerHTML = listaLocalAmigos.map(n => `<span class="bg-slate-800 border border-slate-700 px-2 py-1 rounded-md text-slate-300">${n}</span>`).join('');
        if(listaLocalAmigos.length >= 2) btnConfirmar.classList.remove('hidden');
    });

    btnConfirmar.addEventListener('click', async () => {
        await setDoc(doc(db, "salas", roomId), { integrantes: listaLocalAmigos });
    });
}

// --- PANTALLA B: SEGUIMIENTO DEL VIAJE Y CARGA DE GASTOS ---
function activarEscuchaGastos() {
    const q = query(collection(db, "salas", roomId, "gastos"), orderBy("fecha", "desc"));
    onSnapshot(q, (snapshot) => {
        listaGastosAmigos = [];
        snapshot.forEach((doc) => listaGastosAmigos.push(doc.data()));
        renderizarInterfazOperativa();
    });
}

function renderizarInterfazOperativa() {
    const linkCompartir = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

    container.innerHTML = `
        <div class="bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-xl mb-4 flex justify-between items-center">
            <div class="text-xs text-indigo-200 truncate pr-2">
                <span class="font-bold text-emerald-400">¡Grupo Activo!</span> Compartí este link con tus amigos.
            </div>
            <button id="btn-copiar-link" class="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded text-xs font-bold transition shrink-0">Copiar Link</button>
        </div>
        
        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 mb-4">
            <h2 class="font-bold text-emerald-400 text-xs uppercase tracking-wider">Cargar Gasto</h2>
            
            <select id="qr-pagador" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="">¿Quién pagó?</option>
                ${grupoSincronizedMap()}
            </select>
            
            <input id="qr-monto" type="number" placeholder="Monto total ($)" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <input id="qr-detalle" type="text" placeholder="¿Qué se compró? (ej. Nafta, Peaje)" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            
            <div class="pt-2 border-t border-slate-800">
                <p class="text-[11px] text-slate-400 mb-2">¿Quiénes comparten este gasto?</p>
                <div id="qr-participantes-box" class="flex flex-wrap gap-2 text-xs">
                    ${grupoSincronizado.map(n => `
                        <label class="flex items-center gap-1.5 cursor-pointer bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                            <input type="checkbox" value="${n}" checked class="w-4 h-4 accent-emerald-500">
                            <span class="text-slate-300 font-medium">${n}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <button id="btn-subir-gasto" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition text-sm">Cargar Gasto</button>
        </div>

        <div class="bg-indigo-950/60 p-4 rounded-xl border border-indigo-900/60 mb-4">
            <h3 class="font-bold text-indigo-400 text-xs uppercase tracking-wider mb-2">Transferencias para liquidar</h3>
            <div id="qr-resultados" class="text-sm text-indigo-100 space-y-1.5 font-medium"></div>
        </div>

        <div class="space-y-2">
            <h3 class="font-bold text-slate-500 text-xs uppercase tracking-wider">Historial del Viaje</h3>
            <ul id="qr-historial-nube" class="space-y-2"></ul>
        </div>
    `;

    function grupoSincronizedMap() {
        return `<option value="">¿Quién pagó?</option>` + grupoSincronizado.map(n => `<option value="${n}">${n}</option>`).join('');
    }

    // Evento Copiar Link
    document.getElementById('btn-copiar-link').addEventListener('click', () => {
        navigator.clipboard.writeText(linkCompartir);
        alert('¡Link de viaje copiado! Pasalo al grupo de WhatsApp.');
    });

    // Evento Subir Gasto
    document.getElementById('btn-subir-gasto').addEventListener('click', async () => {
        const pagador = document.getElementById('qr-pagador').value;
        const monto = parseFloat(document.getElementById('qr-monto').value);
        const detalle = document.getElementById('qr-detalle').value.trim();
        const checkboxes = document.querySelectorAll('#qr-participantes-box input:checked');
        const participantes = Array.from(checkboxes).map(cb => cb.value);

        if (!pagador || isNaN(monto) || monto <= 0 || !detalle || participantes.length === 0) {
            alert("Completá todos los campos y marcá quiénes participaron.");
            return;
        }

        await addDoc(collection(db, "salas", roomId, "gastos"), {
            pagador, monto, detalle, participantes, fecha: new Date()
        });

        document.getElementById('qr-monto').value = '';
        document.getElementById('qr-detalle').value = '';
    });

    renderizarHistorialYCalculos();
}

// --- CALCULO MÓDULO DIVISOR DE GASTOS ---
function renderizarHistorialYCalculos() {
    const historialUL = document.getElementById('qr-historial-nube');
    const cajaResultados = document.getElementById('qr-resultados');

    if(listaGastosAmigos.length === 0) {
        historialUL.innerHTML = `<li class="text-xs text-slate-500 italic">No hay gastos registrados en este viaje.</li>`;
        cajaResultados.innerHTML = `<p class="text-slate-400 text-xs">Cargá un gasto para ver balances.</p>`;
        return;
    }

    historialUL.innerHTML = listaGastosAmigos.map(g => `
        <li class="bg-slate-900/60 p-3 rounded-xl flex flex-col border border-slate-800 text-sm">
            <div class="flex justify-between items-center">
                <span><strong class="text-emerald-400">${g.pagador}</strong> pagó ${g.detalle}</span>
                <span class="font-mono font-bold text-slate-200">$${g.monto}</span>
            </div>
            <div class="text-[10px] text-slate-500 mt-1">Compartido entre: ${g.participantes.join(', ')}</div>
        </li>
    `).join('');

    let balances = {};
    grupoSincronizado.forEach(n => balances[n] = 0);

    listaGastosAmigos.forEach(g => {
        balances[g.pagador] += g.monto;
        const cuota = g.monto / g.participantes.length;
        g.participantes.forEach(p => { if(balances[p] !== undefined) balances[p] -= cuota; });
    });

    let deudores = [], acreedores = [];
    for (let persona in balances) {
        let saldo = parseFloat(balances[persona].toFixed(2));
        if (saldo < -0.01) deudores.push({ nombre: persona, monto: Math.abs(saldo) });
        if (saldo > 0.01) acreedores.push({ nombre: persona, monto: saldo });
    }

    deudores.sort((a, b) => b.monto - a.monto);
    acreedores.sort((a, b) => b.monto - a.monto);

    let transferencias = [];
    let i = 0, j = 0;

    while (i < deudores.length && j < acreedores.length) {
        let deudor = deudores[i];
        let acreedor = acreedores[j];
        let pago = Math.min(deudor.monto, acreedor.monto);
        
        transferencias.push({ de: deudor.nombre, a: acreedor.nombre, monto: pago });

        deudor.monto -= pago;
        acreedor.monto -= pago;

        if (deudor.monto < 0.01) i++;
        if (acreedor.monto < 0.01) j++;
    }

    if (transferencias.length === 0) {
        cajaResultados.innerHTML = `<p class="text-emerald-400 text-xs">Cuentas saldadas a la perfección.</p>`;
    } else {
        cajaResultados.innerHTML = transferencias.map(t => 
            `<p>🔴 <strong>${t.de}</strong> le transfiere <strong>$${Math.ceil(t.monto)}</strong> a 🟢 <strong>${t.a}</strong></p>`
        ).join('');
    }
}

// --- GUARDIÁN DE ENTRADA MAESTRO (Se ejecuta al cargar la app) ---
const urlParamsCheck = new URLSearchParams(window.location.search);
if (urlParamsCheck.has('room')) {
    // Si viene con link de invitación, conecta directo al Firebase de esa sala
    conectarASalaFirebase(urlParamsCheck.get('room'));
} else {
    // Si entrás vos limpio, muestra la pantalla para crear un nuevo viaje
    renderizarFormularioInicial();
}