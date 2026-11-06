/* Ajuste visual dos cards à largura disponível com altura uniforme para analistas da mesma fileira. */
(() => {
  let observer;
  let frame;
  let isFitting = false;
  let lastContainerWidth = 0;

  function fit(container) {
    if (!container) container = document.getElementById('analyst-cards-container');
    if (!container || !container.clientWidth || isFitting) return;
    isFitting = true;

    try {
      const cells = Array.from(container.querySelectorAll(':scope > .agenda-card-cell'));
      if (!cells.length) return;

      const base = Number(container.dataset.cardBaseWidth) || 340;
      const items = [];

      // 1. Resetar alturas anteriores e calcular a largura/escala proporcional de cada card
      cells.forEach(cell => {
        const card = cell.firstElementChild;
        if (!card) return;
        card.style.height = '';
        cell.style.height = '';
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

      // 2. Agrupar itens por fileira (detectando quebra horizontal pelo offsetLeft)
      const rows = [];
      let currentRow = [];
      let lastLeft = -Infinity;

      items.forEach(item => {
        const left = item.cell.offsetLeft;
        const naturalHeight = item.card.offsetHeight;
        item.naturalHeight = naturalHeight;

        if (currentRow.length > 0 && left <= lastLeft + 4) {
          rows.push(currentRow);
          currentRow = [];
        }
        currentRow.push(item);
        lastLeft = left;
      });
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }

      // 3. Para cada fileira, encontrar a maior altura e equalizar todos os cards daquela fileira
      rows.forEach(row => {
        let maxNaturalHeight = 0;
        row.forEach(item => {
          if (item.naturalHeight > maxNaturalHeight) {
            maxNaturalHeight = item.naturalHeight;
          }
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
    } finally {
      requestAnimationFrame(() => {
        isFitting = false;
      });
    }
  }

  window.AgendaCardLayout = {
    fit,
    refresh(container) {
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