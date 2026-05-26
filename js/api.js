// js/api.js
// Objeto que concentra todas las consultas a Supabase
const API = {
    // 1. Obtener la iteración activa (Sprint)
    async getIterations() {
        const { data, error } = await supabaseClient
            .from('iterations')
            .select('*')
            .order('fecha_inicio', { ascending: false });

        if (error) { console.error('Error cargando iteraciones:', error); return []; }
        return data;
    },

    // 2. Obtener todas las historias de una iteración
    async getStories(iterationId) {
        const { data, error } = await supabaseClient
            .from('user_stories')
            .select(`
                *,
                profiles:creado_por (nombre, avatar_url)
            `)
            .eq('iteration_id', iterationId)
            .order('creado_en', { ascending: true });

        if (error) { console.error('Error cargando historias:', error); return []; }
        return data;
    },

    // AÑADE ESTA NUEVA FUNCIÓN: Crear nueva iteración
    async createIteration(nombre) {
        const { data, error } = await supabaseClient
            .from('iterations')
            .insert([{ nombre: nombre, estado: 'Activa' }])
            .select();
        if (error) throw error;
        return data[0];
    },

    // ACTUALIZA LA FUNCIÓN 3: Permitir modificar la fecha de creación
    async saveStory(storyData) {
        const isUpdate = storyData.id !== "";
        const payload = {
            titulo: storyData.titulo,
            rol_cliente: storyData.rol_cliente,
            deseo: storyData.deseo,
            beneficio: storyData.beneficio,
            puntos: storyData.puntos,
            iteration_id: storyData.iteration_id,
            creado_en: storyData.creado_en // <- AÑADIMOS LA FECHA EDITABLE
        };

        if (!isUpdate) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            payload.creado_por = user.id;
        }

        let query = supabaseClient.from('user_stories');
        if (isUpdate) query = query.update(payload).eq('id', storyData.id);
        else query = query.insert([payload]);

        const { data, error } = await query.select();
        if (error) throw error;
        return data[0];
    },

    // 4. Actualizar estado (Para el Drag and Drop)
    async updateStoryStatus(storyId, newStatus) {
        const { error } = await supabaseClient
            .from('user_stories')
            .update({ estado: newStatus })
            .eq('id', storyId);

        if (error) throw error;
    },

    // 5. Obtener todos los perfiles para el selector de Pair Programming
    async getProfiles() {
        const { data, error } = await supabaseClient.from('profiles').select('id, nombre, rol_id');
        if (error) { console.error('Error cargando perfiles:', error); return []; }
        return data;
    },

// 6. Obtener una historia específica con todos sus detalles (Links y Pairs)
    async getStoryDetails(storyId) {
        // Consultamos la historia, sus asignaciones y sus links en una sola petición
        const { data, error } = await supabaseClient
            .from('user_stories')
            .select(`
                *,
                story_assignments (piloto_id, copiloto_id),
                traceability_links (*)
            `)
            .eq('id', storyId)
            .single();
        if (error) throw error;
        return data;
    },

// 7. Guardar Pair Programming
    async savePairAssignment(storyId, pilotoId, copilotoId) {
        // Primero borramos si existía una asignación previa para esta historia
        await supabaseClient.from('story_assignments').delete().eq('story_id', storyId);

        // Insertamos la nueva
        const { error } = await supabaseClient.from('story_assignments').insert([{
            story_id: storyId,
            piloto_id: pilotoId,
            copiloto_id: copilotoId || null
        }]);
        if (error) throw error;
    },

// 8. Guardar un link de GitHub
    async saveTraceabilityLink(storyId, url, tipo) {
        const { error } = await supabaseClient.from('traceability_links').insert([{
            story_id: storyId,
            github_url: url,
            tipo: tipo
        }]);
        if (error) throw error;
    },

// 9. Obtener el historial de versionado (Corregido)
        async getStoryHistory(storyId) {
            const { data, error } = await supabaseClient
                .from('story_history')
                .select('*') // <- Quitamos la lectura bloqueada de auth.users
                .eq('story_id', storyId)
                .order('fecha', { ascending: false });
            if (error) throw error;
            return data;
        },

    // ... (código anterior de api.js)

    // ==========================================
    // MÓDULO DE DISEÑO (CRC y DIAGRAMAS)
    // ==========================================

    // ACTUALIZA LA FUNCIÓN 10: Filtrar CRC por Iteración
    async getCRCCards(iterationId) {
        const { data, error } = await supabaseClient
            .from('crc_cards')
            .select('*')
            .eq('iteration_id', iterationId) // <- FILTRO
            .order('creado_en', { ascending: false });
        if (error) { console.error('Error cargando CRC:', error); return []; }
        return data;
    },

    // ACTUALIZA LA FUNCIÓN 11: Guardar CRC con su Iteración
    async saveCRCCard(crcData) {
        const { error } = await supabaseClient.from('crc_cards').insert([crcData]);
        if (error) throw error;
    },

    // 12. Subir imagen al Bucket y guardar registro del diagrama
    async uploadDiagram(titulo, file) {
        // A) Obtener ID del usuario actual
        const { data: { user } } = await supabaseClient.auth.getUser();

        // B) Subir archivo al Storage de Supabase (Bucket: 'recursos')
        const fileExt = file.name.split('.').pop();
        const fileName = `diagrama_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('recursos')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // C) Obtener la URL pública de la imagen subida
        const { data: urlData } = supabaseClient.storage
            .from('recursos')
            .getPublicUrl(fileName);

        // D) Guardar el registro en la tabla 'diagrams'
        const { error: dbError } = await supabaseClient.from('diagrams').insert([{
            titulo: titulo,
            archivo_url: urlData.publicUrl,
            subido_por: user.id
        }]);

        if (dbError) throw dbError;
    },

    // 13. Obtener los diagramas subidos
    async getDiagrams() {
        const { data, error } = await supabaseClient
            .from('diagrams')
            .select('*, profiles:subido_por (nombre)')
            .order('fecha', { ascending: false });
        if (error) { console.error('Error cargando diagramas:', error); return []; }
        return data;
    },

    // js/api.js (Agrega esto en tu objeto API)

    // 14. Eliminar una tarjeta CRC
    async deleteCRCCard(id) {
        const { error } = await supabaseClient
            .from('crc_cards')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // 15. Eliminar Historia de Usuario
    async deleteStory(storyId) {
        const { error } = await supabaseClient
            .from('user_stories')
            .delete()
            .eq('id', storyId);
        if (error) throw error;
    },

    // 16. Obtener el equipo completo con el nombre de su rol
    async getTeamMembers() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select(`
                id, 
                nombre, 
                avatar_url,
                roles (nombre)
            `);
        if (error) throw error;
        return data;
    },

    // ==========================================
    // MÓDULO DE PRUEBAS (TESTING XP)
    // ==========================================

    // 17. Obtener pruebas filtradas por iteración
    async getTests(iterationId) {
        const { data, error } = await supabaseClient
            .from('tests')
            .select('*')
            .eq('iteration_id', iterationId)
            .order('creado_en', { ascending: false });
        if (error) throw error;
        return data;
    },

    // 18. Crear o Actualizar una prueba
    async saveTest(testData) {
        const isUpdate = testData.id !== "";
        let query = supabaseClient.from('tests');

        if (isUpdate) {
            query = query.update({
                descripcion: testData.descripcion,
                tipo: testData.tipo
            }).eq('id', testData.id);
        } else {
            query = query.insert([{
                descripcion: testData.descripcion,
                tipo: testData.tipo,
                iteration_id: testData.iteration_id
            }]);
        }

        const { error } = await query;
        if (error) throw error;
    },

    // 19. Eliminar prueba
    async deleteTest(id) {
        const { error } = await supabaseClient.from('tests').delete().eq('id', id);
        if (error) throw error;
    },

    // 20. Cambiar el estado (Pasada / Fallida / Pendiente)
    async updateTestStatus(id, estado) {
        const { error } = await supabaseClient.from('tests').update({ estado: estado }).eq('id', id);
        if (error) throw error;
    },

    // ==========================================
    // MÓDULO DEL TRACKER (MÉTRICAS Y PLANEACIÓN)
    // ==========================================

    // 21. Obtener detalles específicos de una iteración
    async getIterationDetails(iterationId) {
        const { data, error } = await supabaseClient
            .from('iterations')
            .select('*')
            .eq('id', iterationId)
            .single();
        if (error) throw error;
        return data;
    },

    // 22. Guardar el Plan de Iteración
    async saveIterationPlan(iterationId, velocidadObjetivo, notas) {
        const { error } = await supabaseClient
            .from('iterations')
            .update({
                velocidad_objetivo: velocidadObjetivo,
                notas_planeacion: notas
            })
            .eq('id', iterationId);
        if (error) throw error;
    }
};

