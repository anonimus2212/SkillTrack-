// =====================================================
// SKILLTRACK - UI Utilities
// =====================================================

const UI = (() => {
  // ── TOAST ──────────────────────────────────────────
  function toast(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${escHtml(message)}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('hiding');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, duration);
  }

  // ── MODAL ──────────────────────────────────────────
  function modal({ title, body, footer, onClose, wide = false } = {}) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${Date.now()}">
        <div class="modal-header">
          <span class="modal-title">${escHtml(title)}</span>
          <button class="modal-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body"></div>
        ${footer ? `<div class="modal-footer"></div>` : ''}
      </div>`;

    const modalEl = backdrop.querySelector('.modal');
    const bodyEl = backdrop.querySelector('.modal-body');
    const footerEl = backdrop.querySelector('.modal-footer');

    if (typeof body === 'string') {
      bodyEl.innerHTML = body;
    } else if (body instanceof HTMLElement) {
      bodyEl.appendChild(body);
    }

    if (footer && footerEl) {
      if (typeof footer === 'string') footerEl.innerHTML = footer;
      else if (footer instanceof HTMLElement) footerEl.appendChild(footer);
    }

    const close = () => {
      backdrop.remove();
      onClose && onClose();
    };

    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(backdrop);
    return { el: modalEl, close, bodyEl, footerEl };
  }

  // ── CONFIRM ────────────────────────────────────────
  function confirm({ title = '¿Estás seguro?', message, confirmText = 'Eliminar', danger = true } = {}) {
    return new Promise((resolve) => {
      const m = modal({
        title,
        body: `<p style="color:var(--text-secondary);font-size:0.9rem;">${escHtml(message)}</p>`,
        footer: `
          <button class="btn btn-ghost" id="confirm-cancel">Cancelar</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${escHtml(confirmText)}</button>`
      });

      m.el.querySelector('#confirm-cancel').addEventListener('click', () => { m.close(); resolve(false); });
      m.el.querySelector('#confirm-ok').addEventListener('click', () => { m.close(); resolve(true); });
    });
  }

  // ── LOADING BUTTON ─────────────────────────────────
  function setButtonLoading(btn, loading) {
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = `<span class="loading-spinner"></span> Cargando...`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
      btn.disabled = false;
    }
  }

  // ── ESCAPE HTML ───────────────────────────────────
  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── BADGES ────────────────────────────────────────
  function estadoBadge(estado) {
    const map = {
      'Pendiente': 'badge-gray',
      'En progreso': 'badge-blue',
      'Completado': 'badge-green',
      'Cancelado': 'badge-red'
    };
    return `<span class="badge ${map[estado] || 'badge-gray'}">${escHtml(estado)}</span>`;
  }

  function prioridadBadge(p) {
    const map = { 'Alta': 'badge-red', 'Media': 'badge-amber', 'Baja': 'badge-green' };
    return `<span class="badge ${map[p] || 'badge-gray'}">${escHtml(p)}</span>`;
  }

  function nivelBadge(n) {
    const map = { 'Principiante': 'badge-green', 'Intermedio': 'badge-amber', 'Avanzado': 'badge-violet' };
    return `<span class="badge ${map[n] || 'badge-gray'}">${escHtml(n)}</span>`;
  }

  // ── PROGRESS BAR ──────────────────────────────────
  function progressBar(value, height = 6) {
    const pct = Math.min(100, Math.max(0, value || 0));
    const color = pct === 100 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-violet-light)' : 'var(--accent-amber)';
    return `
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <div class="progress-bar-container" style="flex:1;height:${height}px;">
          <div class="progress-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <span style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);min-width:2.5rem;text-align:right;">${pct}%</span>
      </div>`;
  }

  // ── DATE FORMAT ───────────────────────────────────
  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return dateStr; }
  }

  function fmtDatetime(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(dateStr + 'T00:00:00');
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  }

  // ── EMPTY STATE ───────────────────────────────────
  function emptyState(icon, title, desc, btn = '') {
    return `<div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>${escHtml(title)}</h3>
      <p>${escHtml(desc)}</p>
      ${btn}
    </div>`;
  }

  // ── DONUT SVG ─────────────────────────────────────
  function donutSvg(segments, size = 120) {
    const r = 42, cx = 60, cy = 60;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const total = segments.reduce((a, s) => a + s.value, 0) || 1;

    const paths = segments.map(seg => {
      const pct = seg.value / total;
      const dash = pct * circ;
      const path = `<circle class="donut-seg" cx="${cx}" cy="${cy}" r="${r}" 
        fill="none" stroke="${seg.color}" stroke-width="14" stroke-linecap="butt"
        stroke-dasharray="${dash} ${circ - dash}"
        stroke-dashoffset="${-offset * circ}"
        transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += pct;
      return path;
    });

    return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" style="flex-shrink:0;">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="14"/>
      ${paths.join('')}
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" 
        fill="var(--text-primary)" font-size="14" font-weight="700">${total}</text>
    </svg>`;
  }

  // ── BAR CHART ─────────────────────────────────────
  function barChart(items) {
    const max = Math.max(...items.map(i => i.value), 1);
    return `<div class="bar-chart">
      ${items.map(i => {
        const h = Math.round((i.value / max) * 100);
        return `<div class="bar-item">
          <span class="bar-value">${i.value}</span>
          <div class="bar-fill" style="height:${h}%;background:${i.color || 'linear-gradient(180deg,var(--accent-violet-light),var(--accent-violet-dark))'}"></div>
          <span class="bar-label">${escHtml(i.label)}</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  return {
    toast, modal, confirm, setButtonLoading, escHtml,
    estadoBadge, prioridadBadge, nivelBadge, progressBar,
    fmtDate, fmtDatetime, daysUntil, emptyState,
    donutSvg, barChart
  };
})();
