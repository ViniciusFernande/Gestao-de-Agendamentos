// Gerenciamento de Dados e Persistência Local (LocalStorage)
// Sistema de Gestão de Agendas - Analistas

const STORAGE_KEYS = {
  ANALYSTS: 'sg_analistas',
  SCHOOLS: 'sg_escolas',
  SCHEDULES: 'sg_agendamentos',
  SETTINGS: 'sg_configuracoes',
  QUEUE: 'sg_filas_visita',
  WHATSAPP_TEMPLATE: 'sg_whatsapp_template',
  THEME: 'sg_selected_theme'
};

// Categorias padrão de assuntos
const PREDEFINED_SUBJECTS = [
  { id: 'chamado_interno', name: 'Chamado Interno', type: 'chamado_interno' },
  { id: 'manutencao_maquinas', name: 'Manutenção de Maquinas', type: 'manutencao' },
  { id: 'formatar_maquinas', name: 'Formatar Maquinas', type: 'manutencao' },
  { id: 'conectividade', name: 'Conectividade', type: 'manutencao' },
  { id: 'espelhamento_dvr', name: 'Espelhamento DVR', type: 'manutencao' },
  { id: 'verificar_ap', name: 'Verificar AP', type: 'manutencao' },
  { id: 'inventario_escolar', name: 'Inventário Escolar', type: 'inventario' }
];

// Dados iniciais padrão (8 Analistas)
const SEED_ANALYSTS = [
  {
    id: 'ana-silva',
    role: 'Analista Pleno',
    name: 'Ana Silva',
    phone: '(11) 98765-4321',
    neighborhood: 'Vila Mariana',
    startDate: '2022-03-10',
    status: 'ativo',
    color: '#3b82f6',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'bruno-costa',
    role: 'Analista Junior II',
    name: 'Bruno Costa',
    phone: '(11) 97654-3210',
    neighborhood: 'Pinheiros',
    startDate: '2021-08-15',
    status: 'ativo',
    color: '#8b5cf6',
    avatar: ''
  },
  {
    id: 'carla-oliveira',
    name: 'Carla Oliveira',
    phone: '(11) 96543-2109',
    neighborhood: 'Santana',
    startDate: '2023-01-20',
    status: 'ativo',
    color: '#ec4899',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'daniel-santos',
    name: 'Daniel Santos',
    phone: '(11) 95432-1098',
    neighborhood: 'Tatuapé',
    startDate: '2022-06-01',
    status: 'ativo',
    color: '#10b981',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'eduardo-rocha',
    name: 'Eduardo Rocha',
    phone: '(11) 94321-0987',
    neighborhood: 'Ipiranga',
    startDate: '2023-04-12',
    status: 'ativo',
    color: '#f59e0b',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'fernanda-lima',
    name: 'Fernanda Lima',
    phone: '(11) 93210-9876',
    neighborhood: 'Mooca',
    startDate: '2022-11-05',
    status: 'ativo',
    color: '#06b6d4',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'gabriel-souza',
    name: 'Gabriel Souza',
    phone: '(11) 92109-8765',
    neighborhood: 'Bela Vista',
    startDate: '2023-08-01',
    status: 'ativo',
    color: '#6366f1',
    avatar: ''
  },
  {
    id: 'helena-martins',
    name: 'Helena Martins',
    phone: '(11) 91098-7654',
    neighborhood: 'Perdizes',
    startDate: '2021-05-18',
    status: 'ativo',
    color: '#14b8a6',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  }
];

const SEED_SCHOOLS = [
  { cie: '012345', name: 'E.E. Prof. Maria José', director: 'Marcos Vinicius Ribeiro', phone: '(11) 3208-1122', neighborhood: 'Bela Vista' },
  { cie: '023456', name: 'Colégio Objetivo', director: 'Beatriz Vasconcelos', phone: '(11) 3177-4000', neighborhood: 'Paulista' },
  { cie: '034567', name: 'E.M. João XXIII', director: 'Claudio Roberto Silveira', phone: '(11) 3397-5500', neighborhood: 'Mooca' },
  { cie: '045678', name: 'E.E. Dr. Julio de Mesquita', director: 'Patricia Helena Fagundes', phone: '(11) 2291-3044', neighborhood: 'Brás' },
  { cie: '056789', name: 'E.M. Clarice Lispector', director: 'Fernando Albuquerque', phone: '(11) 2965-8811', neighborhood: 'Vila Formosa' },
  { cie: '067890', name: 'E.E. Santos Dumont', director: 'Regina Célia Pires', phone: '(11) 2221-7009', neighborhood: 'Santana' },
  { cie: '078901', name: 'E.M. Darcy Ribeiro', director: 'Luiz Fernando Moraes', phone: '(11) 3858-4422', neighborhood: 'Casa Verde' },
  { cie: '089012', name: 'E.E. Caetano de Campos', director: 'Sonia Maria Antunes', phone: '(11) 3256-7890', neighborhood: 'Consolação' },
  { cie: '090123', name: 'E.E. Rodrigues Alves', director: 'Jorge Amado Barreto', phone: '(11) 3289-4321', neighborhood: 'Cerqueira César' },
  { cie: '101234', name: 'E.M. Paulo Freire', director: 'Silvia Letícia Ramos', phone: '(11) 3931-2244', neighborhood: 'Freguesia do Ó' }
];

function generateInitialSchedules() {
  const schedules = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = now.toISOString().split('T')[0];

  let osCounter = 1000;

  // 1. Agendas de Hoje (17 ordens no total, incluindo os 8 analistas da foto)
  const todayAssignments = [
    { analyst: 'ana-silva', schoolCie: '012345', subject: 'Conectividade / Rede Wi-Fi', type: 'manutencao', completed: true, obs: 'Reparo no Access Point do 2º andar e conector do switch central.' },
    { analyst: 'bruno-costa', schoolCie: '023456', subject: 'Inventário de Equipamentos', type: 'inventario', completed: true, obs: 'Levantamento de 42 notebooks novos recebidos.' },
    { analyst: 'carla-oliveira', schoolCie: '034567', subject: 'Manutenção Corretiva', type: 'manutencao', completed: false, obs: 'Computadores da secretaria sem conexão de rede local.' },
    { analyst: 'daniel-santos', schoolCie: '045678', subject: 'Conectividade / Rede Wi-Fi', type: 'manutencao', completed: false, obs: 'Configuração do SSID administrativo e de alunos.' },
    { analyst: 'eduardo-rocha', schoolCie: '056789', subject: 'Inventário de Equipamentos', type: 'inventario', completed: true, obs: 'Inventário dos desktops do laboratório de ciências.' },
    { analyst: 'fernanda-lima', schoolCie: '067890', subject: 'Manutenção Preventiva', type: 'manutencao', completed: true, obs: 'Limpeza e teste da bancada do laboratório de TI.' },
    { analyst: 'gabriel-souza', schoolCie: '078901', subject: 'Inventário e Tombamento', type: 'inventario', completed: false, obs: 'Colocação de etiquetas patrimoniais nas impressoras.' },
    { analyst: 'helena-martins', schoolCie: '089012', subject: 'Conectividade / Switch e Racks', type: 'manutencao', completed: true, obs: 'Organização do cabeamento estruturado no rack da diretoria.' }
  ];

  todayAssignments.forEach((item, idx) => {
    const school = SEED_SCHOOLS.find(s => s.cie === item.schoolCie) || SEED_SCHOOLS[0];
    schedules.push({
      id: 'sched-today-' + (idx + 1),
      osNumber: 'OS-' + currentYear + '-' + String(osCounter++).padStart(4, '0'),
      analystId: item.analyst,
      schoolCie: school.cie,
      schoolName: school.name,
      directorName: school.director,
      subject: item.subject,
      serviceType: item.type,
      date: todayStr,
      completed: item.completed,
      needsReturn: idx === 2,
      returnDate: idx === 2 ? new Date(now.getTime() + 86400000 * 2).toISOString().split('T')[0] : '',
      obs: item.obs
    });
  });

  // Mais 9 agendamentos hoje para somar 17 ordens hoje (idêntico ao card na foto!)
  const extraAnalysts = ['ana-silva', 'bruno-costa', 'carla-oliveira', 'daniel-santos', 'eduardo-rocha', 'fernanda-lima', 'gabriel-souza', 'helena-martins', 'ana-silva'];
  for (let i = 0; i < 9; i++) {
    const school = SEED_SCHOOLS[(i + 2) % SEED_SCHOOLS.length];
    const isManut = i % 2 === 0;
    schedules.push({
      id: 'sched-today-extra-' + (i + 1),
      osNumber: 'OS-' + currentYear + '-' + String(osCounter++).padStart(4, '0'),
      analystId: extraAnalysts[i],
      schoolCie: school.cie,
      schoolName: school.name,
      directorName: school.director,
      subject: isManut ? 'Manutenção Preventiva' : 'Inventário de Equipamentos',
      serviceType: isManut ? 'manutencao' : 'inventario',
      date: todayStr,
      completed: i < 5,
      needsReturn: false,
      returnDate: '',
      obs: 'Atendimento de rotina conforme cronograma semanal.'
    });
  }

  // 2. Histórico do Mês Atual (Totalizando exatamente 342 concluídas no mês: 158 manutenção e 184 inventário)
  // Desempenho dos analistas como na foto: Ana Silva (65), Bruno Costa (58), Carla Oliveira (52), Daniel Santos (49), Eduardo Rocha (41) + outros 3
  const monthPerformance = [
    { analyst: 'ana-silva', total: 65, manut: 30, inv: 35 },
    { analyst: 'bruno-costa', total: 58, manut: 27, inv: 31 },
    { analyst: 'carla-oliveira', total: 52, manut: 24, inv: 28 },
    { analyst: 'daniel-santos', total: 49, manut: 23, inv: 26 },
    { analyst: 'eduardo-rocha', total: 41, manut: 19, inv: 22 },
    { analyst: 'fernanda-lima', total: 34, manut: 16, inv: 18 },
    { analyst: 'gabriel-souza', total: 25, manut: 11, inv: 14 },
    { analyst: 'helena-martins', total: 18, manut: 8, inv: 10 }
  ]; // Soma: 65+58+52+49+41+34+25+18 = 342! Manutenção: 30+27+24+23+19+16+11+8 = 158! Inventário: 184!

  monthPerformance.forEach((perf) => {
    const alreadyToday = schedules.filter(s => s.analystId === perf.analyst && s.completed && s.date === todayStr).length;
    const toGenerate = Math.max(0, perf.total - alreadyToday);

    let generatedManut = schedules.filter(s => s.analystId === perf.analyst && s.completed && s.date === todayStr && s.serviceType === 'manutencao').length;
    const targetManut = perf.manut;

    for (let k = 0; k < toGenerate; k++) {
      const dayOffset = (k % 27) + 1;
      const d = new Date(currentYear, currentMonth, dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      const isManut = generatedManut < targetManut;
      if (isManut) generatedManut++;
      const school = SEED_SCHOOLS[(k + perf.total) % SEED_SCHOOLS.length];

      schedules.push({
        id: 'sched-m-' + perf.analyst + '-' + k,
        osNumber: 'OS-' + currentYear + '-' + String(osCounter++).padStart(4, '0'),
        analystId: perf.analyst,
        schoolCie: school.cie,
        schoolName: school.name,
        directorName: school.director,
        subject: isManut ? (k % 2 === 0 ? 'Manutenção Preventiva' : 'Conectividade / Rede Wi-Fi') : 'Inventário de Equipamentos',
        serviceType: isManut ? 'manutencao' : 'inventario',
        date: dateStr,
        completed: true,
        needsReturn: k % 14 === 0,
        returnDate: '',
        obs: 'Atendimento concluído com sucesso e assinado pela coordenação.'
      });
    }
  });

  // 3. Histórico dos 5 meses anteriores para o gráfico comparativo
  const pastMonthsCounts = [
    { offset: 5, manut: 118, inv: 135 },
    { offset: 4, manut: 130, inv: 148 },
    { offset: 3, manut: 145, inv: 160 },
    { offset: 2, manut: 149, inv: 172 },
    { offset: 1, manut: 154, inv: 178 }
  ];

  pastMonthsCounts.forEach(({ offset, manut, inv }) => {
    const pastDate = new Date(currentYear, currentMonth - offset, 15);
    const pYear = pastDate.getFullYear();
    const pMonth = pastDate.getMonth();

    // Guardamos amostra compacta para simulação histórica fiel
    const totalCount = manut + inv;
    const sampleFactor = 4;
    const sampleTotal = Math.round(totalCount / sampleFactor);
    const sampleManut = Math.round(manut / sampleFactor);

    for (let i = 0; i < sampleTotal; i++) {
      const isManut = i < sampleManut;
      const day = (i % 26) + 1;
      const d = new Date(pYear, pMonth, day);
      const analyst = SEED_ANALYSTS[i % SEED_ANALYSTS.length];
      const school = SEED_SCHOOLS[i % SEED_SCHOOLS.length];

      schedules.push({
        id: 'sched-past-' + offset + '-' + i,
        osNumber: 'OS-' + pYear + '-' + String(osCounter++).padStart(4, '0'),
        analystId: analyst.id,
        schoolCie: school.cie,
        schoolName: school.name,
        directorName: school.director,
        subject: isManut ? 'Manutenção / Conectividade' : 'Inventário de Equipamentos',
        serviceType: isManut ? 'manutencao' : 'inventario',
        date: d.toISOString().split('T')[0],
        completed: true,
        needsReturn: false,
        returnDate: '',
        obs: 'Registro histórico de atendimento.'
      });
    }
  });

  return schedules;
}

class DataStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.ANALYSTS)) {
      this.setAnalysts(SEED_ANALYSTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHOOLS)) {
      this.setSchools(SEED_SCHOOLS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
      this.setSchedules(generateInitialSchedules());
    }
  }

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.ANALYSTS);
    localStorage.removeItem(STORAGE_KEYS.SCHOOLS);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.QUEUE);
    this.init();
  }

  // --- ANALISTAS ---
  getAnalysts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ANALYSTS)) || [];
    } catch {
      return [];
    }
  }

  setAnalysts(analysts) {
    localStorage.setItem(STORAGE_KEYS.ANALYSTS, JSON.stringify(analysts));
  }

  getAnalystById(id) {
    return this.getAnalysts().find(a => a.id === id);
  }

  saveAnalyst(analyst) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveAnalyst(analyst);
    const list = this.getAnalysts();
    const idx = list.findIndex(a => a.id === analyst.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...analyst };
    } else {
      list.push(analyst);
    }
    this.setAnalysts(list);
  }

  deleteAnalyst(id) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.deleteAnalyst(id);
    const list = this.getAnalysts().filter(a => a.id !== id);
    this.setAnalysts(list);
  }

  // --- ESCOLAS ---
  getSchools() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOLS)) || [];
    } catch {
      return [];
    }
  }

  setSchools(schools) {
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
  }

  getSchoolByCie(cie) {
    return this.getSchools().find(s => String(s.cie).trim() === String(cie).trim());
  }

  saveSchool(school) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveSchool(school);
    const list = this.getSchools();
    const idx = list.findIndex(s => String(s.cie).trim() === String(school.cie).trim());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...school };
    } else {
      list.push(school);
    }
    this.setSchools(list);
  }

  deleteSchool(cie) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.deleteSchool(cie);
    const list = this.getSchools().filter(s => String(s.cie).trim() !== String(cie).trim());
    this.setSchools(list);
  }

  // --- AGENDAMENTOS ---
  getSchedules() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES)) || [];
    } catch {
      return [];
    }
  }

  setSchedules(schedules) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }

  saveSchedule(sched) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveSchedule(sched);
    const list = this.getSchedules();
    const idx = list.findIndex(s => s.id === sched.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...sched };
    } else {
      list.unshift(sched);
    }
    this.setSchedules(list);
  }

  deleteSchedule(id) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.deleteSchedule(id);
    const list = this.getSchedules().filter(s => String(s.id).trim() !== String(id).trim());
    this.setSchedules(list);
  }

  toggleScheduleCompleted(id) {
    const list = this.getSchedules();
    const item = list.find(s => String(s.id).trim() === String(id).trim());
    if (item) {
      item.completed = !item.completed;
      this.setSchedules(list);
      if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveSchedule(item);
      return item.completed;
    }
    return false;
  }

  // --- FILAS DE VISITA ---
  getQueue() {
    try {
      const q = localStorage.getItem(STORAGE_KEYS.QUEUE);
      if (!q) {
        const seed = this.getInitialQueueSeed();
        this.setQueue(seed);
        return seed;
      }
      return JSON.parse(q) || [];
    } catch {
      return [];
    }
  }

  setQueue(queue) {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  }

  getQueueItemById(id) {
    return this.getQueue().find(q => String(q.id).trim() === String(id).trim());
  }

  saveQueueItem(item) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveQueueItem(item);
    const list = this.getQueue();
    const now = Date.now();
    if (!item.createdAt) {
      item.createdAt = now;
    }

    const idx = list.findIndex(q => String(q.id).trim() === String(item.id).trim());
    if (idx >= 0) {
      const oldItem = list[idx];
      item.createdAt = oldItem.createdAt || item.createdAt;
      // Se foi alterada para urgente agora, registra o momento da urgência
      if (item.priority === 'urgente') {
        item.urgentSince = oldItem.urgentSince || now;
      }
      list[idx] = { ...list[idx], ...item };
    } else {
      // Nova escola colocada na fila
      if (item.priority === 'urgente') {
        item.urgentSince = now;
      }
      list.push(item);
    }
    this.setQueue(list);
  }

  deleteQueueItem(id) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.deleteQueueItem(id);
    const list = this.getQueue().filter(q => String(q.id).trim() !== String(id).trim());
    this.setQueue(list);
  }

  getInitialQueueSeed() {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'q_seed_1',
        schoolCie: '001234',
        schoolName: 'EE PROFESSOR JOÃO BATISTA',
        directorName: 'Maria Helena',
        category: 'manutencao',
        subject: 'Manutenção de Computadores',
        osNumber: 'STI-26/81619',
        dateAdded: today,
        priority: 'normal',
        obs: 'Laboratório de informática com 6 máquinas que não ligam após queda de energia.'
      },
      {
        id: 'q_seed_2',
        schoolCie: '005678',
        schoolName: 'EE DONA CARMEN',
        directorName: 'Carlos Eduardo',
        category: 'conectividade',
        subject: 'Conectividade / Rede Wi-Fi',
        osNumber: 'STI-26/81620',
        dateAdded: today,
        priority: 'urgente',
        obs: 'Ponto de rede da secretaria sem sinal de internet e AP dos professores reiniciando.'
      },
      {
        id: 'q_seed_3',
        schoolCie: '009012',
        schoolName: 'EE SANTOS DUMONT',
        directorName: 'Patrícia Oliveira',
        category: 'inventario',
        subject: 'Inventário Escolar',
        osNumber: 'STI-26/81621',
        dateAdded: today,
        priority: 'normal',
        obs: 'Levantamento e etiquetagem dos novos chromebooks e desktops recebidos.'
      }
    ];
  }

  // --- MODELO DE MENSAGEM DO WHATSAPP ---
  getDefaultWhatsappTemplate() {
    return `*SG - SISTEMA DE GESTÃO DE AGENDAS*
Olá *{analista}*, segue sua ordem de atendimento:

*O.S.:* {os}
*Data:* {data}
*Escola:* {escola}
*CIE:* {cie}
*Diretor(a):* {diretor}
*Assunto:* {assunto}
*Observações:* {obs}

_Por favor, confirme o recebimento e anexe a ordem concluída._`;
  }

  getWhatsappTemplate() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WHATSAPP_TEMPLATE);
      return saved ? saved : this.getDefaultWhatsappTemplate();
    } catch {
      return this.getDefaultWhatsappTemplate();
    }
  }

  setWhatsappTemplate(template) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveWhatsappTemplate(template);
    try {
      localStorage.setItem(STORAGE_KEYS.WHATSAPP_TEMPLATE, template);
    } catch (e) {
      console.error(e);
    }
  }

}

const store = new DataStore();
