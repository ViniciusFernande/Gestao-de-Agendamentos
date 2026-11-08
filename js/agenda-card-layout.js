/* Layout responsivo dos cards: fluxo nativo CSS Grid sem distorcao ou miniaturizacao artificial */
(() => {
  function cleanCards(container) {
    if (!container) container = document.getElementById('analyst-cards-container');
    if (!container) return;

    // Se houver celulas antigas (.agenda-card-cell), desembale os cards
    const cells = Array.from(container.querySelectorAll(':scope > .agenda-card-cell'));
    cells.forEach(cell => {
      while (cell.firstChild) {
        cell.before(cell.firstChild);
      }
      cell.remove();
    });

    // Remove qualquer inline style forçado de transform:scale ou position:absolute
    const cards = container.querySelectorAll('.analyst-daily-card');
    cards.forEach(card => {
      card.style.transform = '';
      card.style.width = '';
      card.style.height = '';
      card.style.position = '';
      card.style.top = '';
      card.style.left = '';
    });
  }

  window.AgendaCardLayout = {
    fit(container) {
      cleanCards(container);
    },
    refresh(container) {
      cleanCards(container);
    }
  };

  window.addEventListener('resize', () => {
    cleanCards();
  });
})();
