/* Ajuste visual dos cards à largura disponível com altura uniforme para analistas da mesma fileira. */
(() => {
  let observer;
  let frame;
  let lastContainerWidth = 0;

  function fit(container) {
    if (!container) container = document.getElementById('analyst-cards-container');
    if (!container || !container.clientWidth) return;

    const cells = Array.from(container.querySelectorAll(':scope > .agenda-card-cell'));
    if (!cells.length) return;

    const base = Number(container.dataset.cardBaseWidth) || 340;
    const items = [];

    // 1. Resetar altura dos cards e ajustar largura e escala proporcional
    cells.forEach(cell => {
      const card = cell.firstElementChild;
      if (!card) return;
      card.style.height = '';
      const width = cell.clientWidth;
      if (!width) return;
      const naturalWidth = Math.max(base, width);
      const scale = width / naturalWidth;
      const cardWidth = naturalWidth + 'px';
      if (card.style.width !== cardWidth) card.style.width = cardWidth;
      const transform = 'scale(' + scale + ')';
      if (card.style.transform !== transform) card.style.transform = transform;

      items.push({ cell, card, scale, naturalWidth });
    });

    if (!items.length) return;

    // 2. Determinar número de colunas da grade (padrão 5 colunas por fileira)
    let cols = 5;
    try {
      const gridComputed = window.getComputedStyle(container);
      const tmplCols = gridComputed.getPropertyValue('grid-template-columns').trim();
      if (tmplCols) {
        const parts = tmplCols.split(/\s+/).filter(Boolean);
        if (parts.length > 0) cols = parts.length;
      }
    } catch (e) {
      cols = 5;
    }

    // Agrupar itens por fileira usando cols
    const rows = [];
    for (let i = 0; i < items.length; i += cols) {
      rows.push(items.slice(i, i + cols));
    }

    // 3. Para cada fileira, encontrar a maior altura e equalizar todos os cards e células
    rows.forEach(row => {
      let maxNaturalHeight = 0;
      row.forEach(item => {
        const h = item.card.offsetHeight;
        if (h > maxNaturalHeight) maxNaturalHeight = h;
      });

      if (maxNaturalHeight > 0) {
        row.forEach(item => {
          const naturalHeight = maxNaturalHeight + 'px';
          const scaledHeight = Math.ceil(maxNaturalHeight * item.scale) + 'px';
          if (item.card.style.height !== naturalHeight) item.card.style.height = naturalHeight;
          if (item.cell.style.height !== scaledHeight) item.cell.style.height = scaledHeight;
        });
      }
    });
  }

  window.AgendaCardLayout = {
    fit,
    refresh(container) {
      if (!container) container = document.getElementById('analyst-cards-container');
      if (!container) return;
      if (observer) observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      Array.from(container.children).filter(card => card.classList.contains('analyst-daily-card')).forEach(card => {
        const cell = document.createElement('div');
        cell.className = 'agenda-card-cell';
        card.before(cell);
        cell.append(card);
      });
      lastContainerWidth = container.clientWidth;
      fit(container);
      if (window.ResizeObserver) {
        observer = new ResizeObserver(() => {
          if (Math.abs(container.clientWidth - lastContainerWidth) > 2) {
            lastContainerWidth = container.clientWidth;
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => fit(container));
          }
        });
        observer.observe(container);
      }
    }
  };

  window.addEventListener('resize', () => {
    const container = document.getElementById('analyst-cards-container');
    if (container) {
      lastContainerWidth = container.clientWidth;
      fit(container);
    }
  });
})();