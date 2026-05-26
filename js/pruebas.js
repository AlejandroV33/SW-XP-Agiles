// js/pruebas.js

let currentIterationId = null;
const iterationSelect = document.getElementById('iteration-select-tests');
const modalTest = document.getElementById('modal-test');

// js/pruebas.js (Busca esta sección y actualízala)

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const userInfoEl = document.getElementById('user-info');
    if (user && userInfoEl) userInfoEl.textContent = user.email;

    const iterations = await API.getIterations();
    if(iterations.length > 0) {
        iterations.forEach(iter => {
            const option = document.createElement('option');
            option.value = iter.id;
            option.textContent = iter.nombre;
            iterationSelect.appendChild(option);
        });

        // --- MAGIA DE LOCALSTORAGE ---
        const savedIteration = localStorage.getItem('xp_current_iteration');
        const iterationExists = iterations.some(i => i.id === savedIteration);

        if (savedIteration && iterationExists) {
            currentIterationId = savedIteration;
            iterationSelect.value = savedIteration;
        } else {
            currentIterationId = iterations[0].id;
            localStorage.setItem('xp_current_iteration', currentIterationId);
        }
        // -----------------------------
    }
    await renderTests();
});

iterationSelect.addEventListener('change', async (e) => {
    currentIterationId = e.target.value;
    localStorage.setItem('xp_current_iteration', currentIterationId); // Guardamos la preferencia
    await renderTests();
});

/*// Escuchar cambios en la iteración
iterationSelect.addEventListener('change', async (e) => {
    currentIterationId = e.target.value;
    await renderTests();
});*/

// 3. Renderizar las dos listas
async function renderTests() {
    if(!currentIterationId) return;

    const listAceptacion = document.getElementById('list-aceptacion');
    const listUnitaria = document.getElementById('list-unitaria');

    listAceptacion.innerHTML = '<p class="text-sm text-gray-500">Cargando...</p>';
    listUnitaria.innerHTML = '<p class="text-sm text-gray-500">Cargando...</p>';

    const tests = await API.getTests(currentIterationId);

    // Limpiamos
    listAceptacion.innerHTML = '';
    listUnitaria.innerHTML = '';

    const aceptacionTests = tests.filter(t => t.tipo === 'Aceptacion');
    const unitariaTests = tests.filter(t => t.tipo === 'Unitaria');

    if(aceptacionTests.length === 0) listAceptacion.innerHTML = '<p class="text-sm text-gray-400 italic">No hay pruebas de aceptación.</p>';
    if(unitariaTests.length === 0) listUnitaria.innerHTML = '<p class="text-sm text-gray-400 italic">No hay pruebas unitarias.</p>';

    aceptacionTests.forEach(t => listAceptacion.innerHTML += createTestCardHTML(t));
    unitariaTests.forEach(t => listUnitaria.innerHTML += createTestCardHTML(t));
}

// 4. Plantilla HTML para cada prueba
function createTestCardHTML(test) {
    // Definir colores según el estado
    let bgStatus = 'bg-gray-100 text-gray-600';
    let iconStatus = '<i class="fa-regular fa-circle"></i> Pendiente';

    if(test.estado === 'Pasada') { bgStatus = 'bg-green-100 text-green-700'; iconStatus = '<i class="fa-solid fa-check-circle"></i> Pasada'; }
    if(test.estado === 'Fallida') { bgStatus = 'bg-red-100 text-red-700'; iconStatus = '<i class="fa-solid fa-circle-xmark"></i> Fallida'; }

    return `
        <div class="p-4 border rounded-lg shadow-sm bg-gray-50 flex flex-col gap-3">
            <div class="flex justify-between items-start">
                <p class="text-sm text-gray-800 font-medium leading-tight flex-1 mr-4">${test.descripcion}</p>
                <span class="${bgStatus} text-xs font-bold px-2 py-1 rounded whitespace-nowrap">${iconStatus}</span>
            </div>
            
            <div class="flex justify-between items-center pt-2 border-t border-gray-200">
                <div class="flex space-x-2">
                    <button onclick="changeTestStatus('${test.id}', 'Pasada')" class="text-xs bg-green-50 hover:bg-green-100 text-green-600 font-bold py-1 px-2 rounded border border-green-200 transition">Pasó</button>
                    <button onclick="changeTestStatus('${test.id}', 'Fallida')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1 px-2 rounded border border-red-200 transition">Falló</button>
                </div>
                <div class="flex space-x-3 text-gray-400">
                    <button onclick="openEditTest('${test.id}', \`${test.descripcion.replace(/`/g, "'")}\`, '${test.tipo}')" class="hover:text-blue-500 transition" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteTest('${test.id}')" class="hover:text-red-500 transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        </div>
    `;
}

// 5. Controles del Formulario (Crear/Editar)
document.getElementById('btn-new-test').addEventListener('click', () => {
    document.getElementById('form-test').reset();
    document.getElementById('test-id').value = '';
    modalTest.classList.remove('hidden');
});

document.getElementById('close-modal-test').addEventListener('click', () => modalTest.classList.add('hidden'));

document.getElementById('form-test').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Guardando...'; btn.disabled = true;

    try {
        await API.saveTest({
            id: document.getElementById('test-id').value,
            tipo: document.getElementById('test-tipo').value,
            descripcion: document.getElementById('test-desc').value,
            iteration_id: currentIterationId
        });
        modalTest.classList.add('hidden');
        await renderTests();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.textContent = 'Guardar Prueba'; btn.disabled = false;
    }
});

// 6. Funciones Globales para botones de cada tarjeta
window.openEditTest = function(id, desc, tipo) {
    document.getElementById('test-id').value = id;
    document.getElementById('test-desc').value = desc;
    document.getElementById('test-tipo').value = tipo;
    modalTest.classList.remove('hidden');
}

window.deleteTest = async function(id) {
    if(confirm('¿Eliminar esta prueba?')) {
        await API.deleteTest(id);
        await renderTests();
    }
}

window.changeTestStatus = async function(id, estado) {
    await API.updateTestStatus(id, estado);
    await renderTests(); // Recargar para ver el cambio de color
}