// js/metricas.js

let currentIterationId = null;
const iterationSelect = document.getElementById('iteration-select-metrics');

// js/metricas.js (Busca esta sección y actualízala)

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

        await loadDashboard();
    } else {
        alert("Primero debes crear una iteración en el Tablero.");
    }
});

iterationSelect.addEventListener('change', async (e) => {
    currentIterationId = e.target.value;
    localStorage.setItem('xp_current_iteration', currentIterationId); // Guardamos la preferencia
    await loadDashboard();
});

/*iterationSelect.addEventListener('change', async (e) => {
    currentIterationId = e.target.value;
    await loadDashboard();
});*/

// 2. Función principal que orquesta el cálculo de métricas
async function loadDashboard() {
    if(!currentIterationId) return;

    try {
        // Obtenemos las historias del Kanban y los detalles de la iteración
        const [stories, iterDetails] = await Promise.all([
            API.getStories(currentIterationId),
            API.getIterationDetails(currentIterationId)
        ]);

        // Variables acumuladoras
        let puntosTotales = 0;
        let puntosCompletados = 0;

        // Recorremos todas las historias del Sprint
        stories.forEach(story => {
            puntosTotales += story.puntos;
            // En XP, la Velocidad es la suma estricta de las historias "Hechas"
            if(story.estado === 'Hecho') {
                puntosCompletados += story.puntos;
            }
        });

        // 3. Pintar KPIs
        document.getElementById('kpi-total').textContent = puntosTotales;
        document.getElementById('kpi-velocidad').textContent = puntosCompletados;

        const velocidadObjetivo = iterDetails.velocidad_objetivo || 0;
        document.getElementById('kpi-objetivo').textContent = velocidadObjetivo;

        // 4. Llenar el formulario con los datos guardados
        document.getElementById('plan-velocidad').value = velocidadObjetivo;
        document.getElementById('plan-notas').value = iterDetails.notas_planeacion || '';

        // 5. Calcular y animar la Barra de Progreso
        let porcentaje = 0;
        if(puntosTotales > 0) {
            porcentaje = Math.round((puntosCompletados / puntosTotales) * 100);
        }

        document.getElementById('progress-text').textContent = porcentaje + '%';
        // Añadimos un pequeño timeout para que la transición CSS se note
        setTimeout(() => {
            document.getElementById('progress-bar').style.width = porcentaje + '%';

            // Cambiar el color de la barra si llegamos al 100%
            const bar = document.getElementById('progress-bar');
            if(porcentaje === 100) {
                bar.classList.remove('bg-blue-600');
                bar.classList.add('bg-green-500');
            } else {
                bar.classList.remove('bg-green-500');
                bar.classList.add('bg-blue-600');
            }
        }, 100);

    } catch (error) {
        console.error("Error calculando métricas:", error);
    }
}

// 6. Guardar los datos del formulario (Iteration Planning)
document.getElementById('form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    const velocidad = parseInt(document.getElementById('plan-velocidad').value) || 0;
    const notas = document.getElementById('plan-notas').value;

    try {
        await API.saveIterationPlan(currentIterationId, velocidad, notas);
        // Recargamos el dashboard para que el KPI de velocidad objetivo se actualice
        await loadDashboard();

        // Efecto visual de éxito
        btn.textContent = '¡Plan Guardado!';
        btn.classList.replace('bg-gray-800', 'bg-green-600');
        setTimeout(() => {
            btn.textContent = 'Guardar Plan de Iteración';
            btn.classList.replace('bg-green-600', 'bg-gray-800');
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        alert("Error al guardar el plan: " + error.message);
        btn.textContent = 'Guardar Plan de Iteración';
        btn.disabled = false;
    }
});