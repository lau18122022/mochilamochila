const container = document.getElementById('truco-app-container');

// Estado inicial del partido
let puntajes = { nosotros: 0, ellos: 0 };
const limitePuntos = 30;

function vibrar() {
    // API nativa: vibra 40 milisegundos para dar feedback táctil en el celular
    if (navigator.vibrate) navigator.vibrate(40);
}

function cambiarPuntaje(bando, valor) {
    vibrar();
    puntajes[bando] += valor;
    
    // Validaciones para que no baje de 0 ni pase de 30
    if (puntajes[bando] < 0) puntajes[bando] = 0;
    if (puntajes[bando] > limitePuntos) puntajes[bando] = limitePuntos;
    
    renderizarTruco();
    
    // Si alguien llega a 30, tiramos la alerta (con un mini delay para que llegue a pintar el número 30 en pantalla)
    if (puntajes[bando] === limitePuntos) {
        setTimeout(() => alert(`¡Ganó ${bando.toUpperCase()}! 🎉`), 50);
    }
}

function reiniciarPartida() {
    vibrar();
    if (confirm("¿Querés reiniciar el partido a 0?")) {
        puntajes.nosotros = 0;
        puntajes.ellos = 0;
        renderizarTruco();
    }
}

// Función que genera visualmente los "fósforos" de a 5 puntos
function generarFosforosHTML(puntos) {
    if (puntos === 0) {
        return `<span class="text-xs text-slate-600 italic">Cero puntos</span>`;
    }

    let html = '';
    const cajasDeCinco = Math.floor(puntos / 5);
    const resto = puntos % 5;

    // Dibujamos las cajas completas de 5 puntos
    for (let i = 0; i < cajasDeCinco; i++) {
        html += `
            <div class="w-8 h-8 flex items-center justify-center border-2 border-emerald-500/50 rounded bg-emerald-500/10 text-emerald-400 font-bold text-lg select-none">
                卌
            </div>
        `;
    }

    // Dibujamos los palitos sueltos que sobran
    if (resto > 0) {
        // Repite la letra 'I' la cantidad de veces que marque el resto
        let palitos = 'I'.repeat(resto).split('').join(' ');
        html += `
            <div class="w-8 h-8 flex items-center justify-center border border-dashed border-slate-600 rounded text-amber-400 font-mono font-bold text-sm tracking-widest select-none">
                ${palitos}
            </div>
        `;
    }

    return `<div class="flex flex-wrap gap-2 justify-center min-h-[32px]">${html}</div>`;
}

function renderizarTruco() {
    // Referencias rápidas
    const n = puntajes.nosotros;
    const e = puntajes.ellos;

    container.innerHTML = `
        <div class="w-full flex flex-col gap-4">
            
            <div class="flex justify-between items-center bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-sm">
                <span class="text-xs font-bold text-slate-400 uppercase pl-2">Partido a 30 puntos</span>
                <button id="btn-reset-truco" class="bg-slate-800 hover:bg-red-950 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition font-medium border border-slate-700 hover:border-red-900">
                    Reiniciar Chico
                </button>
            </div>

            <div class="grid grid-cols-2 gap-4">
                
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between shadow-md">
                    <h2 class="text-base font-black text-emerald-400 tracking-wide">NOSOTROS</h2>
                    <div class="text-6xl font-black font-mono my-4 text-white drop-shadow-md">${n}</div>
                    
                    <div class="w-full mb-6">
                        <p class="text-[10px] text-center text-slate-500 uppercase font-bold tracking-wider mb-2">Buenas / Malas</p>
                        ${generarFosforosHTML(n)}
                    </div>

                    <div class="flex gap-2 w-full mt-auto">
                        <button id="btn-nos-menos" class="flex-1 bg-slate-800 active:bg-slate-700 py-3 rounded-xl font-bold text-xl text-slate-300 transition border border-slate-700">-1</button>
                        <button id="btn-nos-mas" class="flex-[2] bg-emerald-600 active:bg-emerald-500 py-3 rounded-xl font-black text-2xl text-white transition shadow-lg shadow-emerald-900/20 border border-emerald-500">+1</button>
                    </div>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between shadow-md">
                    <h2 class="text-base font-black text-rose-400 tracking-wide">ELLOS</h2>
                    <div class="text-6xl font-black font-mono my-4 text-white drop-shadow-md">${e}</div>
                    
                    <div class="w-full mb-6">
                        <p class="text-[10px] text-center text-slate-500 uppercase font-bold tracking-wider mb-2">Buenas / Malas</p>
                        ${generarFosforosHTML(e)}
                    </div>

                    <div class="flex gap-2 w-full mt-auto">
                        <button id="btn-ell-menos" class="flex-1 bg-slate-800 active:bg-slate-700 py-3 rounded-xl font-bold text-xl text-slate-300 transition border border-slate-700">-1</button>
                        <button id="btn-ell-mas" class="flex-[2] bg-rose-600 active:bg-rose-500 py-3 rounded-xl font-black text-2xl text-white transition shadow-lg shadow-rose-900/20 border border-rose-500">+1</button>
                    </div>
                </div>

            </div>
        </div>
    `;

    // Asignación de los "Event Listeners" a los botones recién inyectados
    document.getElementById('btn-reset-truco').addEventListener('click', reiniciarPartida);
    document.getElementById('btn-nos-mas').addEventListener('click', () => cambiarPuntaje('nosotros', 1));
    document.getElementById('btn-nos-menos').addEventListener('click', () => cambiarPuntaje('nosotros', -1));
    document.getElementById('btn-ell-mas').addEventListener('click', () => cambiarPuntaje('ellos', 1));
    document.getElementById('btn-ell-menos').addEventListener('click', () => cambiarPuntaje('ellos', -1));
}

// Ejecutamos el renderizado inicial la primera vez que se carga el script
renderizarTruco();