/* Fotos existentes do Radar. Vínculo por ID ou nome; não altera cadastros. */
(() => {
 const records = [
{
  "id": "vinicius",
  "name": "Vinicius Fernandes de Sales",
  "aliases": [
    "Vinicius Fernandes de Sales",
    "Vinícius Fernandes de Sales"
  ],
  "ids": [
    "vinicius",
    "vini",
    "analyst-vinicius",
    "analyst-vini"
  ],
  "src": "img/analistas/vini.jpg"
},
  {
    "id": "alex",
    "name": "Alex Soroka",
    "aliases": [
      "Alex Soroka",
      "Alex Soroka Franco"
    ],
    "ids": [
      "alex",
      "alex",
      "analyst-alex"
    ],
    "src": "img/analistas/alex.jpg"
  },
  {
    "id": "angelo",
    "name": "Ângelo Ruivo",
    "aliases": [
      "Ângelo Ruivo",
      "Angelo Lucio Pereira Ruivo"
    ],
    "ids": [
      "angelo",
      "angelo",
      "analyst-angelo"
    ],
    "src": "img/analistas/angelo.jpg"
  },
  {
    "id": "eric",
    "name": "Eric Salmazzi",
    "aliases": [
      "Eric Salmazzi",
      "Eric Salmazzi Alves Miranda"
    ],
    "ids": [
      "eric",
      "eric",
      "analyst-eric"
    ],
    "src": "img/analistas/eric.jpg"
  },
  {
    "id": "ezequias",
    "name": "Ezequias Magdiel",
    "aliases": [
      "Ezequias Magdiel",
      "Ezequias Magdiel Pace"
    ],
    "ids": [
      "ezequias",
      "ezequias",
      "analyst-ezequias"
    ],
    "src": "img/analistas/ezequias.jpg"
  },
  {
    "id": "flavio",
    "name": "Flávio Ramos",
    "aliases": [
      "Flávio Ramos",
      "Flávio Ramos de Souza"
    ],
    "ids": [
      "flavio",
      "flavio",
      "analyst-flavio"
    ],
    "src": "img/analistas/flavio.jpg"
  },
  {
    "id": "joao",
    "name": "João Victor",
    "aliases": [
      "João Victor",
      "João Victor França de Oliveira"
    ],
    "ids": [
      "joao",
      "joao",
      "analyst-joao"
    ],
    "src": "img/analistas/joao.jpg"
  },
  {
    "id": "josimar",
    "name": "Josimar",
    "aliases": [
      "Josimar",
      "Josimar Rodrigues dos Santos"
    ],
    "ids": [
      "josimar",
      "josimar",
      "analyst-josimar"
    ],
    "src": "img/analistas/josimar.jpg"
  },
  {
    "id": "kaio",
    "name": "Kaio Vinicius",
    "aliases": [
      "Kaio Vinicius",
      "Kaio Vinicius Camargo Silva"
    ],
    "ids": [
      "kaio",
      "kaio",
      "analyst-kaio"
    ],
    "src": "img/analistas/kaio.jpg"
  }
];
 const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 window.AgendaAnalystPhotos = {
   find(analyst) {
     const id = normalize(analyst.id), name = normalize(analyst.name);
     const exact = records.find(a => a.ids.some(v => normalize(v) === id) || a.aliases.some(v => normalize(v) === name));
     if (exact) return exact.src;
     const matches = records.filter(a => name && a.aliases.some(v => name.startsWith(normalize(v))));
     return matches.length === 1 ? matches[0].src : '';
   }
 };
})();
