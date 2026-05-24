// js/diseno.js

// Variables DOM
const crcGrid = document.getElementById('crc-grid');
const diagramsGrid = document.getElementById('diagrams-grid');
const modalCRC = document.getElementById('modal-crc');
const modalDiagram = document.getElementById('modal-diagram');

// Inicializar vista
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Mostrar usuario logueado
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) document.getElementById('user-info').textContent = user.email;

    // 2. Cargar datos
    await renderCRCCards();
    await renderDiagrams();
});

// ==========================================
// MÓDULO: TARJETAS CRC
// ==========================================

async function renderCRCCards() {
    crcGrid.innerHTML = '<p class="text-sm text-gray-500">Cargando tarjetas...</p>';
    const cards = await API.getCRCCards();
    crcGrid.innerHTML = '';

    if (cards.length === 0) {
        crcGrid.innerHTML = '<p class="text-sm text-gray-400 italic">No hay tarjetas CRC creadas aún.</p>';
        return;
    }

    cards.forEach(card => {
        // Convertimos los saltos de línea en <br> para el HTML
        const responsabilidadesHTML = card.responsabilidades.replace(/\n/g, '<br>• ');

        crcGrid.innerHTML += `
            <div class="crc-card p-4 rounded border border-yellow-200 text-gray-800 flex flex-col h-full">
                <h4 class="font-extrabold text-center border-b-2 border-yellow-400 pb-2 mb-2 text-lg underline decoration-yellow-400 decoration-2">${card.nombre_clase}</h4>
                <div class="flex-1">
                    <p class="text-xs font-bold uppercase text-yellow-700 mb-1">Responsabilidades</p>
                    <p class="text-sm mb-3 leading-tight">• ${responsabilidadesHTML}</p>
                </div>
                <div class="border-t border-yellow-400 pt-2 mt-auto">
                    <p class="text-xs font-bold uppercase text-yellow-700 mb-1">Colaboradores</p>
                    <p class="text-sm italic">${card.colaboradores || 'Ninguno'}</p>
                </div>
            </div>
        `;
    });
}

// Abrir/Cerrar Modal CRC
document.getElementById('btn-new-crc').addEventListener('click', () => modalCRC.classList.remove('hidden'));
document.getElementById('close-modal-crc').addEventListener('click', () => modalCRC.classList.add('hidden'));

// Guardar CRC
document.getElementById('form-crc').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    try {
        await API.saveCRCCard({
            nombre_clase: document.getElementById('crc-clase').value,
            responsabilidades: document.getElementById('crc-resp').value,
            colaboradores: document.getElementById('crc-colab').value
        });

        e.target.reset();
        modalCRC.classList.add('hidden');
        await renderCRCCards();
    } catch (error) {
        alert('Error al guardar: ' + error.message);
    } finally {
        btn.textContent = 'Pegar Tarjeta';
        btn.disabled = false;
    }
});

// ==========================================
// MÓDULO: PIZARRA Y DIAGRAMAS
// ==========================================

async function renderDiagrams() {
    diagramsGrid.innerHTML = '<p class="text-sm text-gray-500">Cargando diagramas...</p>';
    const diagrams = await API.getDiagrams();
    diagramsGrid.innerHTML = '';

    if (diagrams.length === 0) {
        diagramsGrid.innerHTML = '<p class="text-sm text-gray-400 italic">No hay diagramas subidos.</p>';
        return;
    }

    diagrams.forEach(diag => {
        const autor = diag.profiles ? diag.profiles.nombre : 'Usuario';
        diagramsGrid.innerHTML += `
            <div class="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition group">
                <a href="${diag.archivo_url}" target="_blank" class="block h-40 overflow-hidden bg-gray-100 flex items-center justify-center relative">
                    <img src="${diag.archivo_url}" alt="${diag.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                        <i class="fa-solid fa-up-right-and-down-left-from-center text-white opacity-0 group-hover:opacity-100 text-2xl drop-shadow-lg"></i>
                    </div>
                </a>
                <div class="p-3">
                    <h4 class="font-bold text-gray-800 text-sm truncate">${diag.titulo}</h4>
                    <p class="text-xs text-gray-500 mt-1">Subido por ${autor} • ${new Date(diag.fecha).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    });
}

// Abrir/Cerrar Modal Diagrama
document.getElementById('btn-new-diagram').addEventListener('click', () => modalDiagram.classList.remove('hidden'));
document.getElementById('close-modal-diagram').addEventListener('click', () => modalDiagram.classList.add('hidden'));

// Subir Diagrama
document.getElementById('form-diagram').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Subiendo imagen... (puede tardar)';
    btn.disabled = true;

    try {
        const titulo = document.getElementById('diag-titulo').value;
        const file = document.getElementById('diag-file').files[0];

        await API.uploadDiagram(titulo, file);

        e.target.reset();
        modalDiagram.classList.add('hidden');
        await renderDiagrams();
    } catch (error) {
        alert('Error al subir: ' + error.message);
    } finally {
        btn.textContent = 'Subir Imagen';
        btn.disabled = false;
    }
});

// js/diseno.js (Reemplaza la función existente)

async function renderCRCCards() {
    crcGrid.innerHTML = '<p class="text-sm text-gray-500">Cargando tarjetas...</p>';
    const cards = await API.getCRCCards();
    crcGrid.innerHTML = '';

    if (cards.length === 0) {
        crcGrid.innerHTML = '<p class="text-sm text-gray-400 italic">No hay tarjetas CRC creadas aún.</p>';
        return;
    }

    cards.forEach(card => {
        const responsabilidadesHTML = card.responsabilidades.replace(/\n/g, '<br>• ');

        crcGrid.innerHTML += `
            <div class="crc-card p-4 rounded border border-yellow-200 text-gray-800 flex flex-col h-full relative group">
                <!-- Botón de eliminar (Aparece al hacer hover) -->
                <button onclick="deleteCRC('${card.id}')" class="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition z-20" title="Eliminar tarjeta">
                    <i class="fa-solid fa-trash"></i>
                </button>

                <h4 class="font-extrabold text-center border-b-2 border-yellow-400 pb-2 mb-2 text-lg underline decoration-yellow-400 decoration-2 pr-6">${card.nombre_clase}</h4>
                <div class="flex-1">
                    <p class="text-xs font-bold uppercase text-yellow-700 mb-1">Responsabilidades</p>
                    <p class="text-sm mb-3 leading-tight">• ${responsabilidadesHTML}</p>
                </div>
                <div class="border-t border-yellow-400 pt-2 mt-auto">
                    <p class="text-xs font-bold uppercase text-yellow-700 mb-1">Colaboradores</p>
                    <p class="text-sm italic">${card.colaboradores || 'Ninguno'}</p>
                </div>
            </div>
        `;
    });
}

// Función global para eliminar la tarjeta
window.deleteCRC = async function(id) {
    // Confirmación simple para evitar borrados accidentales
    if (confirm("¿Estás seguro de que quieres eliminar esta Tarjeta CRC?")) {
        try {
            await API.deleteCRCCard(id);
            await renderCRCCards(); // Recargar la cuadrícula
        } catch (error) {
            alert('Error al eliminar la tarjeta: ' + error.message);
        }
    }
}