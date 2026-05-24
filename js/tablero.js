// js/tablero.js

// Variables de estado global
let currentIterationId = null;

// Referencias al DOM
const iterationSelect = document.getElementById('iteration-select');
const modalStory = document.getElementById('modal-story');
const formStory = document.getElementById('form-story');
const btnNewStory = document.getElementById('btn-new-story');
const btnCloseModal = document.getElementById('close-modal-story');

// Al cargar la página, inicializamos el tablero
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    await loadIterations();
    setupDragAndDrop();
});

// 1. Cargar datos del usuario logueado en el Navbar
async function loadUserInfo() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        document.getElementById('user-info').textContent = user.email;
    }
}

// 2. Cargar Sprints (Iteraciones) en el select superior
async function loadIterations() {
    const iterations = await API.getIterations();
    iterationSelect.innerHTML = ''; // Limpiar select

    if (iterations.length === 0) {
        iterationSelect.innerHTML = '<option value="">No hay iteraciones</option>';
        return;
    }

    iterations.forEach(iter => {
        const option = document.createElement('option');
        option.value = iter.id;
        option.textContent = iter.nombre;
        iterationSelect.appendChild(option);
    });

    // Seleccionamos la primera por defecto y cargamos sus historias
    currentIterationId = iterations[0].id;
    await renderStories();
}

// Escuchar cambios en el selector de iteración
iterationSelect.addEventListener('change', async (e) => {
    currentIterationId = e.target.value;
    await renderStories();
});

// 3. Pintar las tarjetas en las columnas (Render Kanban)
async function renderStories() {
    if (!currentIterationId) return;

    // Limpiar columnas
    document.querySelectorAll('.kanban-column').forEach(col => {
        col.innerHTML = '';
        // Actualizar contadores a 0 temporalmente
        col.previousElementSibling.querySelector('.count-badge').textContent = '0';
    });

    const stories = await API.getStories(currentIterationId);

    // Contadores por columna
    const counts = { 'Pendiente': 0, 'En Progreso': 0, 'Pruebas': 0, 'Hecho': 0 };

    stories.forEach(story => {
        counts[story.estado]++;

        // Crear el HTML de la tarjeta
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 cursor-move hover:shadow-md transition group';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', story.id);

        // Cambiar color del borde según estado
        if(story.estado === 'Hecho') card.classList.replace('border-blue-500', 'border-green-500');
        if(story.estado === 'Pruebas') card.classList.replace('border-blue-500', 'border-yellow-500');

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-sm text-gray-800 leading-tight">${story.titulo}</h4>
                <span class="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-full ml-2 shrink-0">${story.puntos} pts</span>
            </div>
            <p class="text-xs text-gray-500 line-clamp-2 italic mb-3">
                "Como <b>${story.rol_cliente}</b> quiero <b>${story.deseo}</b>..."
            </p>
            <div class="flex justify-between items-center text-xs text-gray-400 mt-2">
                <span><i class="fa-solid fa-clock"></i> ${new Date(story.creado_en).toLocaleDateString()}</span>
                <button class="text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition" onclick="openEditModal('${story.id}')">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
            </div>
        `;

        // Eventos de Drag para la tarjeta
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);

        // Insertar en la columna correspondiente
        const column = document.querySelector(`.kanban-column[data-status="${story.estado}"]`);
        if (column) column.appendChild(card);
    });

    // Actualizar las "píldoras" numéricas de cada columna
    document.querySelectorAll('.kanban-column').forEach(col => {
        const status = col.getAttribute('data-status');
        col.previousElementSibling.querySelector('.count-badge').textContent = counts[status];
    });
}

// 4. Lógica de Drag & Drop (Arrastrar y Soltar)
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault(); // Necesario para permitir el drop
            col.classList.add('drag-over');
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('drag-over');
        });

        col.addEventListener('drop', async e => {
            e.preventDefault();
            col.classList.remove('drag-over');

            const storyId = e.dataTransfer.getData('text/plain');
            const newStatus = col.getAttribute('data-status');

            if (storyId) {
                // Actualizar visualmente de inmediato para que se sienta rápido
                const card = document.querySelector(`[data-id="${storyId}"]`);
                col.appendChild(card);

                // Actualizar en base de datos
                await API.updateStoryStatus(storyId, newStatus);
                // Recargar para sincronizar colores y contadores
                await renderStories();
            }
        });
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
    e.target.classList.add('opacity-50'); // Efecto visual al arrastrar
}

function handleDragEnd(e) {
    e.target.classList.remove('opacity-50');
}

// 5. Gestión del Modal (Crear / Editar Historias)
btnNewStory.addEventListener('click', () => {
    formStory.reset();
    document.getElementById('story-id').value = '';
    modalStory.classList.remove('hidden');
});

btnCloseModal.addEventListener('click', () => {
    modalStory.classList.add('hidden');
});

formStory.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Bloquear botón para evitar doble clic
    const submitBtn = formStory.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Guardando...';
    submitBtn.disabled = true;

    const storyData = {
        id: document.getElementById('story-id').value,
        titulo: document.getElementById('story-title').value,
        rol_cliente: document.getElementById('story-role').value,
        deseo: document.getElementById('story-desire').value,
        beneficio: document.getElementById('story-benefit').value,
        puntos: parseInt(document.getElementById('story-points').value),
        iteration_id: currentIterationId
    };

    try {
        await API.saveStory(storyData);
        modalStory.classList.add('hidden');
        await renderStories(); // Recargar el tablero
    } catch (error) {
        alert('Error al guardar la historia: ' + error.message);
    } finally {
        submitBtn.textContent = 'Guardar Historia';
        submitBtn.disabled = false;
    }
});

// js/tablero.js (Reemplaza la función existente)

window.openEditModal = async function(id) {
    const story = await API.getStoryDetails(id);

    // Llenar cabecera y datos básicos
    document.getElementById('detail-title').textContent = story.titulo;
    document.getElementById('detail-status').textContent = story.estado;
    document.getElementById('detail-description').innerHTML = `Como <b>${story.rol_cliente}</b> quiero <b>${story.deseo}</b> para <b>${story.beneficio}</b>`;
    document.getElementById('detail-points').textContent = `Puntos de Esfuerzo: ${story.puntos}`;

    // Asignar ID a los formularios ocultos
    document.getElementById('pair-story-id').value = story.id;

    // NUEVO: Guardar los datos de la historia en el botón de edición para usarlos después
    const btnEditStory = document.getElementById('btn-edit-story-details');
    if(btnEditStory) {
        btnEditStory.dataset.story = JSON.stringify(story);
    }

    // Llenar Pair Programming si existe
    if (story.story_assignments && story.story_assignments.length > 0) {
        document.getElementById('select-piloto').value = story.story_assignments[0].piloto_id;
        document.getElementById('select-copiloto').value = story.story_assignments[0].copiloto_id || "";
    } else {
        document.getElementById('select-piloto').value = "";
        document.getElementById('select-copiloto').value = "";
    }

    // Pintar links de GitHub y el Timeline
    renderLinksList(story.traceability_links);
    await renderHistoryTimeline(story.id);

    // Mostrar modal de detalles
    modalDetails.classList.remove('hidden');
}

// js/tablero.js (AÑADIR AL FINAL)

// --- VARIABLES DEL NUEVO MODAL ---
const modalDetails = document.getElementById('modal-details');
const formPair = document.getElementById('form-pair');
const formLink = document.getElementById('form-link');

// 1. Cargar perfiles al inicio para los selectores
let allProfiles = [];
document.addEventListener('DOMContentLoaded', async () => {
    // (Asegúrate de que loadUserInfo, etc. sigan arriba)
    allProfiles = await API.getProfiles();
    populateProfileSelects();
});

function populateProfileSelects() {
    const pilotoSel = document.getElementById('select-piloto');
    const copilotoSel = document.getElementById('select-copiloto');

    let options = '';
    allProfiles.forEach(p => { options += `<option value="${p.id}">${p.nombre}</option>`; });

    pilotoSel.innerHTML = options;
    copilotoSel.innerHTML = '<option value="">-- Sin copiloto --</option>' + options;
}

// 2. LA FUNCIÓN PRINCIPAL QUE ABRE LOS DETALLES
window.openEditModal = async function(id) {
    const story = await API.getStoryDetails(id);

    // Llenar cabecera y datos básicos
    document.getElementById('detail-title').textContent = story.titulo;
    document.getElementById('detail-status').textContent = story.estado;
    document.getElementById('detail-description').innerHTML = `Como <b>${story.rol_cliente}</b> quiero <b>${story.deseo}</b> para <b>${story.beneficio}</b>`;
    document.getElementById('detail-points').textContent = `Puntos de Esfuerzo: ${story.puntos}`;

    // Asignar ID a los formularios ocultos
    document.getElementById('pair-story-id').value = story.id;

    // Llenar Pair Programming si existe
    if (story.story_assignments && story.story_assignments.length > 0) {
        document.getElementById('select-piloto').value = story.story_assignments[0].piloto_id;
        document.getElementById('select-copiloto').value = story.story_assignments[0].copiloto_id || "";
    } else {
        document.getElementById('select-piloto').value = "";
        document.getElementById('select-copiloto').value = "";
    }

    // Pintar links de GitHub
    renderLinksList(story.traceability_links);

    // Pintar Historial de Versionado
    await renderHistoryTimeline(story.id);

    // Mostrar modal
    modalDetails.classList.remove('hidden');
}

// Cerrar modal
document.getElementById('close-modal-details').addEventListener('click', () => {
    modalDetails.classList.add('hidden');
});

// 3. Guardar Pair Programming
formPair.addEventListener('submit', async (e) => {
    e.preventDefault();
    const storyId = document.getElementById('pair-story-id').value;
    const piloto = document.getElementById('select-piloto').value;
    const copiloto = document.getElementById('select-copiloto').value;

    const btn = formPair.querySelector('button');
    btn.textContent = "Asignando...";

    await API.savePairAssignment(storyId, piloto, copiloto);
    btn.textContent = "Par Asignado ✓";
    setTimeout(() => btn.textContent = "Asignar Par", 2000);
});

// 4. Guardar Link de GitHub
formLink.addEventListener('submit', async (e) => {
    e.preventDefault();
    const storyId = document.getElementById('pair-story-id').value;
    const url = document.getElementById('link-url').value;
    const tipo = document.getElementById('link-type').value;

    await API.saveTraceabilityLink(storyId, url, tipo);
    document.getElementById('link-url').value = ''; // Limpiar

    // Recargar links
    const story = await API.getStoryDetails(storyId);
    renderLinksList(story.traceability_links);
});

function renderLinksList(links) {
    const list = document.getElementById('links-list');
    list.innerHTML = '';
    if(!links || links.length === 0) {
        list.innerHTML = '<li class="text-gray-400 italic">No hay enlaces adjuntos.</li>';
        return;
    }
    links.forEach(l => {
        list.innerHTML += `
            <li class="bg-gray-50 p-2 rounded border flex justify-between items-center">
                <span class="font-bold text-gray-700">${l.tipo}:</span>
                <a href="${l.github_url}" target="_blank" class="text-blue-500 hover:underline truncate ml-2 max-w-xs">${l.github_url}</a>
            </li>`;
    });
}

// 5. Pintar la Línea de Tiempo (Versionado Automático)
async function renderHistoryTimeline(storyId) {
    const history = await API.getStoryHistory(storyId);
    const container = document.getElementById('history-timeline');
    container.innerHTML = '';

    if (history.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic text-center mt-4">Sin cambios previos registrados.</p>';
        return;
    }

    history.forEach(h => {
        // h.datos_anteriores contiene el JSON de cómo estaba la tarjeta ANTES del cambio
        const dataOld = h.datos_anteriores;
        const date = new Date(h.fecha).toLocaleString();

        container.innerHTML += `
            <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-4">
                <div class="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-blue-500 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                <div class="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded border shadow-sm text-xs">
                    <time class="font-bold text-gray-500">${date}</time>
                    <p class="text-gray-700 mt-1">Estado anterior: <span class="font-bold text-blue-600">${dataOld.estado}</span></p>
                    <p class="text-gray-500 mt-1 truncate">Puntos: ${dataOld.puntos}</p>
                </div>
            </div>
        `;
    });
}

// js/tablero.js (Agrega esto al final)

// Lógica para editar la historia desde el modal de detalles
const btnEditStoryDetails = document.getElementById('btn-edit-story-details');
if(btnEditStoryDetails) {
    btnEditStoryDetails.addEventListener('click', (e) => {
        // Obtenemos los datos que guardamos en el dataset
        const story = JSON.parse(e.currentTarget.dataset.story);

        // Llenamos el formulario pequeño con los datos actuales
        document.getElementById('story-id').value = story.id;
        document.getElementById('story-title').value = story.titulo;
        document.getElementById('story-role').value = story.rol_cliente;
        document.getElementById('story-desire').value = story.deseo;
        document.getElementById('story-benefit').value = story.beneficio;
        document.getElementById('story-points').value = story.puntos;

        // Ocultamos el modal de detalles y mostramos el de creación/edición
        modalDetails.classList.add('hidden');
        modalStory.classList.remove('hidden');
    });
}