// =====================================================
// SKILLTRACK - Avances Module
// =====================================================

const Avances = (() => {

  async function openModal(retoId) {
    const reto = Retos.getById(retoId);
    if (!reto) {
      // Try fetching from DB
      const uid = (await Auth.getUser()).id;
      const { data } = await db.from('retos').select('*').eq('id', retoId).eq('usuario_id', uid).single();
      if (!data) { UI.toast('Reto no encontrado', 'error'); return; }
    }

    const retoData = reto || await (async () => {
      const uid = (await Auth.getUser()).id;
      const { data } = await db.from('retos').select('*').eq('id', retoId).eq('usuario_id', uid).single();
      return data;
    })();

    const m = UI.modal({
      title: `Avances: ${retoData.titulo}`,
      body: `<div id="avances-modal-content"><div class="loading-overlay"><div class="loading-spinner"></div></div></div>`,
      footer: ''
    });

    // Add footer manually for layout control
    const footerDiv = document.createElement('div');
    footerDiv.className = 'modal-footer';
    footerDiv.style.flexDirection = 'column';
    footerDiv.style.gap = '1rem';
    footerDiv.innerHTML = `
      <div style="width:100%;">
        <button class="btn btn-primary btn-full" id="avance-add-btn">+ Registrar nueva sesión</button>
      </div>`;
    m.el.appendChild(footerDiv);

    footerDiv.querySelector('#avance-add-btn').addEventListener('click', () => openFormModal(retoData, m));

    await renderAvancesList(retoId, m);
  }

  async function renderAvancesList(retoId, m) {
    const container = m.el.querySelector('#avances-modal-content');
    if (!container) return;

    container.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div></div>`;

    const uid = (await Auth.getUser()).id;
    const { data: avances, error } = await db
      .from('avances')
      .select('*')
      .eq('reto_id', retoId)
      .eq('usuario_id', uid)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      container.innerHTML = `<div class="alert alert-error">${UI.escHtml(error.message)}</div>`;
      return;
    }

    const { data: retoData } = await db.from('retos').select('progreso, estado').eq('id', retoId).eq('usuario_id', uid).single();
    const totalMin = avances?.reduce((a, v) => a + (v.minutos_dedicados || 0), 0) || 0;

    if (!avances?.length) {
      container.innerHTML = UI.emptyState('📝', 'Sin avances', 'Registra tu primera sesión de trabajo para este reto.');
      return;
    }

    container.innerHTML = `
      <div style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
        <div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:0.5rem 0.875rem;flex:1;text-align:center;">
          <div style="font-size:1.25rem;font-weight:700;">${retoData?.progreso || 0}%</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Progreso actual</div>
        </div>
        <div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:0.5rem 0.875rem;flex:1;text-align:center;">
          <div style="font-size:1.25rem;font-weight:700;">${avances.length}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Sesiones</div>
        </div>
        <div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:0.5rem 0.875rem;flex:1;text-align:center;">
          <div style="font-size:1.25rem;font-weight:700;">${formatMin(totalMin)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Tiempo total</div>
        </div>
      </div>
      ${avances.map(a => `
        <div class="avance-item" style="position:relative;">
          <div class="avance-dot" style="background:${a.porcentaje === 100 ? 'var(--accent-green)' : 'var(--accent-violet)'}"></div>
          <div style="flex:1;min-width:0;">
            <div class="avance-date">${UI.fmtDate(a.fecha)}</div>
            <div class="avance-desc">${UI.escHtml(a.descripcion)}</div>
            <div class="avance-meta">
              <span>📈 ${a.porcentaje}%</span>
              ${a.minutos_dedicados ? `<span>⏱️ ${a.minutos_dedicados}m</span>` : ''}
            </div>
          </div>
          <button class="btn-icon danger" style="flex-shrink:0;align-self:flex-start;"
            onclick="Avances.deleteAvance(${a.id}, ${retoId}, this)"
            title="Eliminar avance" aria-label="Eliminar avance">🗑️</button>
        </div>`).join('')}`;
  }

  async function openFormModal(reto, parentModal) {
    const today = new Date().toISOString().slice(0, 10);
    const currentProgreso = reto.progreso || 0;

    const bodyHtml = `
      <div class="form-group">
        <label for="av-fecha">Fecha <span style="color:var(--accent-red)">*</span></label>
        <input id="av-fecha" type="date" value="${today}" max="${today}" required>
      </div>
      <div class="form-group">
        <label for="av-desc">Descripción del trabajo <span style="color:var(--accent-red)">*</span></label>
        <textarea id="av-desc" maxlength="500" placeholder="¿Qué trabajaste hoy? Describe brevemente tus avances…" style="min-height:80px;"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="av-minutos">Minutos dedicados</label>
          <input id="av-minutos" type="number" min="0" max="1440" step="5" placeholder="ej. 60" value="">
        </div>
        <div class="form-group">
          <label for="av-pct">Porcentaje de progreso alcanzado: <span id="av-pct-label">${currentProgreso}%</span></label>
          <input id="av-pct" type="range" min="${currentProgreso}" max="100" step="1" value="${currentProgreso}" class="range-slider">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Mínimo: ${currentProgreso}% (progreso actual)</div>
        </div>
      </div>
      <div id="av-form-error"></div>`;

    const footerHtml = `
      <button class="btn btn-ghost" id="av-cancel">Cancelar</button>
      <button class="btn btn-success" id="av-save">Guardar sesión</button>`;

    const m = UI.modal({ title: 'Nueva sesión de trabajo', body: bodyHtml, footer: footerHtml });

    const pctInput = m.el.querySelector('#av-pct');
    const pctLabel = m.el.querySelector('#av-pct-label');
    pctInput.addEventListener('input', () => { pctLabel.textContent = pctInput.value + '%'; });

    m.el.querySelector('#av-cancel').addEventListener('click', m.close);
    m.el.querySelector('#av-save').addEventListener('click', () => saveAvance(m, reto, parentModal));
    m.el.querySelector('#av-desc').focus();
  }

  async function saveAvance(m, reto, parentModal) {
    const fecha = m.el.querySelector('#av-fecha').value;
    const descripcion = m.el.querySelector('#av-desc').value.trim();
    const minutos = parseInt(m.el.querySelector('#av-minutos').value) || 0;
    const porcentaje = parseInt(m.el.querySelector('#av-pct').value);
    const errEl = m.el.querySelector('#av-form-error');

    errEl.innerHTML = '';

    if (!fecha) { errEl.innerHTML = `<div class="alert alert-error">La fecha es obligatoria.</div>`; return; }
    if (!descripcion) { errEl.innerHTML = `<div class="alert alert-error">La descripción es obligatoria.</div>`; return; }
    if (minutos < 0) { errEl.innerHTML = `<div class="alert alert-error">Los minutos no pueden ser negativos.</div>`; return; }

    const saveBtn = m.el.querySelector('#av-save');
    UI.setButtonLoading(saveBtn, true);

    try {
      const uid = (await Auth.getUser()).id;

      // Insert avance
      const { error: avErr } = await db.from('avances').insert({
        reto_id: reto.id,
        usuario_id: uid,
        fecha,
        descripcion,
        porcentaje,
        minutos_dedicados: minutos
      });
      if (avErr) throw avErr;

      // Update reto progress (only if new pct is higher)
      const newPct = Math.max(reto.progreso || 0, porcentaje);
      const newEstado = newPct === 100 ? 'Completado' : reto.estado === 'Pendiente' && newPct > 0 ? 'En progreso' : reto.estado;

      await Retos.updateProgreso(reto.id, newPct, newEstado !== reto.estado ? newEstado : null);
      reto.progreso = newPct;
      reto.estado = newEstado;

      UI.toast('Sesión registrada correctamente', 'success');
      m.close();

      // Refresh parent modal
      await renderAvancesList(reto.id, parentModal);
    } catch (err) {
      UI.setButtonLoading(saveBtn, false);
      errEl.innerHTML = `<div class="alert alert-error">${UI.escHtml(err.message)}</div>`;
    }
  }

  async function deleteAvance(id, retoId, btn) {
    const ok = await UI.confirm({
      title: 'Eliminar avance',
      message: 'Esta sesión de trabajo será eliminada. El porcentaje del reto no se ajustará automáticamente. ¿Continuar?',
      confirmText: 'Eliminar',
      danger: true
    });
    if (!ok) return;

    const uid = (await Auth.getUser()).id;
    const { error } = await db.from('avances').delete().eq('id', id).eq('usuario_id', uid);
    if (error) {
      UI.toast('Error al eliminar: ' + error.message, 'error');
      return;
    }
    UI.toast('Avance eliminado', 'success');

    // Refresh the parent modal content
    const parentModal = btn.closest('.modal');
    if (parentModal) {
      const fakeM = { el: parentModal };
      await renderAvancesList(retoId, fakeM);
    }
  }

  function formatMin(min) {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m2 = min % 60;
    return m2 > 0 ? `${h}h ${m2}m` : `${h}h`;
  }

  return { openModal, deleteAvance };
})();
