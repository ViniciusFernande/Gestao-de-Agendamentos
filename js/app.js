/**
 * SISTEMA DE GESTÃO DE AGENDAS - ANALISTAS
 * Lógica principal da aplicação (SPA)
 */

const App = {
  currentView: 'dashboard',
  dashboardPeriod: 'month', // 'month', 'day', 'total'
  historyMode: '5_months', // '5_months', 'all_months'
  perfChart: null,
  historyChart: null,
  activeWaSchedule: null,
  selectedAgendaDate: null,
  activeDailyAgendaAnalyst: null,
  activeDailyAgendaOrders: [],
  activeDailyAgendaDate: null,


  // ==========================================================================
  // AUTENTICAÇÃO E PERMISSÕES (FIREBASE AUTH)
  // ==========================================================================
  initAuth() {
    if (typeof AuthService === 'undefined') return;

    AuthService.init(userProfile => {
      const authModal = document.getElementById('auth-modal');
      if (userProfile) {
        if (authModal) authModal.style.display = 'none';
        this.applyUserRoleUI(userProfile);
        if (typeof FirestoreSync !== 'undefined') {
          FirestoreSync.startSync(collection => {
            this.refreshAfterSync(collection);
          });
        }
      } else {
        if (authModal) {
          authModal.style.display = 'flex';
          const loginUser = document.getElementById('login-username');
          if (loginUser) loginUser.focus();
        }
        if (typeof FirestoreSync !== 'undefined') {
          FirestoreSync.stopSync();
        }
      }
    });
  },

  async handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const userInput = (document.getElementById('login-username')?.value || '').trim();
    const passInput = document.getElementById('login-password')?.value || '';
    const errorBox = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('btn-submit-login');

    if (!userInput || !passInput) {
      if (errorBox) {
        errorBox.textContent = 'Por favor, preencha o usuário e a senha.';
        errorBox.style.display = 'block';
      }
      return false;
    }

    if (errorBox) errorBox.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
    }

    try {
      await AuthService.login(userInput, passInput);
      // Login com sucesso! onAuthStateChanged irá fechar a tela automaticamente
    } catch (err) {
      console.error("Erro detalhado no login:", err);
      let msg = "Falha ao autenticar. Verifique usuário e senha.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-login-credentials") {
        msg = "Usuário ou senha incorretos.";
      } else if (err.code === "auth/unauthorized-domain") {
        msg = "Domínio não autorizado no Firebase. Adicione o domínio no console.";
      } else if (err.code === "auth/network-request-failed") {
        msg = "Erro de conexão com o Firebase. Verifique sua conexão.";
      } else if (err.message) {
        msg = err.message;
      }
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar no Sistema';
      }
    }
    return false;
  },

  async handleLogout() {
    if (confirm("Deseja realmente sair do sistema?")) {
      await AuthService.logout();
      window.location.reload();
    }
  },

  toggleLoginPassVisibility() {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('icon-toggle-pass');
    if (!input || !icon) return;
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fa-solid fa-eye';
    }
  },

  applyUserRoleUI(userProfile) {
    if (!userProfile) return;

    const nameEl = document.getElementById('sidebar-user-name');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (nameEl) nameEl.textContent = userProfile.name;
    if (avatarEl) {
      avatarEl.innerHTML = userProfile.role === 'admin' 
        ? '<i class="fa-solid fa-user-shield" style="color:#fbbf24;"></i>' 
        : '<i class="fa-solid fa-user-tie" style="color:#60a5fa;"></i>';
    }

    const isAdmin = userProfile.role === 'admin';
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    // Subtítulo da página de configurações ajustado dinamicamente
    const configSubtitle = document.querySelector('#view-configuracoes .page-subtitle');
    if (configSubtitle) {
      configSubtitle.textContent = isAdmin 
        ? 'Aparência, personalização de mensagens, backup e restauração' 
        : 'Escolha o tema e a cor de aparência do site';
    }

    this.renderAnalystsTable();
    this.renderSchoolsTable();
  },

  refreshAfterSync(collection) {
    this.populateSelects();
    if (this.currentView === 'agenda') {
      this.renderAgenda();
    } else if (this.currentView === 'todos-agendamentos') {
      this.renderAllSchedulesTable();
    } else if (this.currentView === 'fila') {
      this.renderQueue();
    } else if (this.currentView === 'analistas') {
      this.renderAnalystsTable();
    } else if (this.currentView === 'escolas') {
      this.renderSchoolsTable();
    } else if (this.currentView === 'ranking') {
      this.renderRanking();
    } else if (this.currentView === 'relatorios') {
      this.generateReport();
    }
    this.updateDashboard();
  },

  init() {
    this.initAuth();
    this.initTheme();
    this.sanitizeReturnOsNumbers();
    this.setupNavigation();
    this.setupSidebar();
    this.setupDateDefaults();
    this.populateSelects();
    this.setupEventListeners();
    this.updateDashboard();
  },

  setupDateDefaults() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${day}/${month}/${year}`;
    
    const txtToday = document.getElementById('txt-today-date');
    if (txtToday) txtToday.textContent = todayFormatted;

    const txtPanelToday = document.getElementById('txt-panel-today-date');
    if (txtPanelToday) txtPanelToday.textContent = todayFormatted;

    // Data do formulário de novo agendamento
    const inputSchedDate = document.getElementById('sched-date');
    if (inputSchedDate) inputSchedDate.value = todayStr;

    // Data de início do analista
    const inputAnalystStart = document.getElementById('analyst-start-date');
    if (inputAnalystStart) inputAnalystStart.value = todayStr;

    // DATA PADRÃO DO FILTRO DE AGENDAMENTOS (SEMPRE A DATA DO DIA ATUAL POR PADRÃO)
    const filterSchedDate = document.getElementById('filter-sched-date');
    if (filterSchedDate) {
      filterSchedDate.value = todayStr;
      filterSchedDate.setAttribute('value', todayStr);
    }

    // Datas padrão do relatório
    const reportStart = document.getElementById('report-date-start');
    if (reportStart) reportStart.value = todayStr;
    const reportEnd = document.getElementById('report-date-end');
    if (reportEnd) reportEnd.value = todayStr;

    // Filtro padrão de mês da aba analistas
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const selAnalystMonth = document.getElementById('filter-analyst-month');
    if (selAnalystMonth) selAnalystMonth.value = currentMonth;
  },

  sanitizeReturnOsNumbers() {
    const list = store.getSchedules();
    let changed = false;
    list.forEach(s => {
      if (s.osNumber && /(-RET)+$/i.test(s.osNumber)) {
        s.osNumber = s.osNumber.replace(/(-RET)+$/gi, '').trim();
        changed = true;
      }
      if (s.obs && /^Atendimento de retorno referente/i.test(s.obs)) {
        s.obs = '';
        changed = true;
      } else if (s.obs && /^Motivo do retorno:\s*/i.test(s.obs)) {
        s.obs = s.obs.replace(/^Motivo do retorno:\s*/i, '').trim();
        changed = true;
      }
      if (s.subject && /^Retorno:\s*/i.test(s.subject)) {
        s.subject = s.subject.replace(/^Retorno:\s*/gi, '').trim();
        changed = true;
      }
    });
    if (changed) {
      store.setSchedules(list);
    }
  },

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view');
        this.navigateTo(targetView);
      });
    });
  },

  navigateTo(viewId) {
    this.currentView = viewId;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });

    const btnSidebarSettings = document.querySelector('.btn-sidebar-settings');
    if (btnSidebarSettings) {
      btnSidebarSettings.classList.toggle('active', viewId === 'configuracoes');
    }

    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.toggle('active', section.id === `view-${viewId}`);
    });

    // Recarrega os dados da tela acessada
    if (viewId === 'dashboard') {
      this.updateDashboard();
    } else if (viewId === 'agendamentos') {
      this.renderAnalystDailyCards();
    } else if (viewId === 'filas-visita') {
      this.renderQueueView(); this.renderDashboardQueue();
    } else if (viewId === 'todos-agendamentos') {
      this.renderAllSchedulesTable();
    } else if (viewId === 'ranking-escolas') {
      this.renderSchoolsRanking();
    } else if (viewId === 'analistas') {
      this.renderAnalystsTable();
    } else if (viewId === 'escolas') {
      this.renderSchoolsTable();
    } else if (viewId === 'relatorios') {
      this.generateReport();
    } else if (viewId === 'configuracoes') {
      this.initSettingsView();
    }

    // Em mobile, fecha a sidebar ao navegar
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar) {
      sidebar.classList.remove('mobile-open');
      document.getElementById('sidebar-overlay')?.classList.remove('active');
    }
  },

  setupSidebar() {
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const mobileBtn = document.getElementById('mobile-toggle-btn');
    const btnCloseMobile = document.getElementById('btn-close-sidebar-mobile');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mainWrapper = document.getElementById('main-wrapper');

    const closeMobileSidebar = () => {
      if (sidebar) sidebar.classList.remove('mobile-open');
      document.getElementById('sidebar-overlay')?.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
    };

    const openMobileSidebar = () => {
      if (sidebar) sidebar.classList.add('mobile-open');
      if (overlay) overlay.classList.add('active');
    };

    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainWrapper.classList.toggle('expanded');
        setTimeout(() => {
          if (this.perfChart) this.perfChart.resize();
          if (this.historyChart) this.historyChart.resize();
        }, 310);
      });
    }

    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('mobile-open')) {
          closeMobileSidebar();
        } else {
          openMobileSidebar();
        }
      });
    }

    if (btnCloseMobile) {
      btnCloseMobile.addEventListener('click', closeMobileSidebar);
    }

    if (overlay) {
      overlay.addEventListener('click', closeMobileSidebar);
    }

    // Fechar ao navegar
    document.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          closeMobileSidebar();
        }
      });
    });

    // Ao redimensionar a tela
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        closeMobileSidebar();
      }
      if (this.perfChart) this.perfChart.resize();
      if (this.historyChart) this.historyChart.resize();
    });
  },

  populateSelects() {
    const analysts = store.getAnalysts();

    // Selects de analistas (Agendamentos e Filtros)
    const schedAnalystSelect = document.getElementById('sched-analyst');
    const filterSchedAnalyst = document.getElementById('filter-sched-analyst');
    const reportAnalyst = document.getElementById('report-filter-analyst');

    if (schedAnalystSelect) {
      schedAnalystSelect.innerHTML = '<option value="">Selecione um analista...</option>' +
        analysts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }

    if (filterSchedAnalyst) {
      filterSchedAnalyst.innerHTML = '<option value="all">Todos os Analistas</option>' +
        analysts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }

    const filterAllAnalyst = document.getElementById('filter-all-analyst');
    if (filterAllAnalyst) {
      filterAllAnalyst.innerHTML = '<option value="all">Todos os Analistas</option>' +
        analysts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }

    if (reportAnalyst) {
      reportAnalyst.innerHTML = '<option value="all">Todos os Analistas</option>' +
        analysts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }

    // Assuntos pré-definidos
    const schedSubjectSelect = document.getElementById('sched-subject-select');
    if (schedSubjectSelect) {
      let optionsHtml = '<option value="">Selecione uma opção...</option>';
      PREDEFINED_SUBJECTS.forEach(sub => {
        optionsHtml += `<option value="${sub.name}" data-type="${sub.type}">${sub.name}</option>`;
      });
      optionsHtml += '<option value="custom">Outro</option>';
      schedSubjectSelect.innerHTML = optionsHtml;
    }
  },

  setupEventListeners() {
    // Filtro de período do Dashboard (Mês, Dia, Total)
    const periodButtons = document.querySelectorAll('.period-pill-btn');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        periodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.dashboardPeriod = btn.getAttribute('data-period');
        this.updateDashboard();
      });
    });

    // Fechar autocomplete se clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.autocomplete-container')) {
        document.getElementById('results-cie')?.classList.remove('active');
        document.getElementById('results-school-name')?.classList.remove('active');
        document.getElementById('queue-results-cie')?.classList.remove('active');
      }
    });
  },
  // =========================================================================
  // DASHBOARD & GRÁFICOS
  // =========================================================================
  updateDashboard() {
    const schedules = store.getSchedules();
    const analysts = store.getAnalysts();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Filtrar conforme o período selecionado (Mês, Dia, Total)
    let filteredCompleted = [];
    let periodSuffix = '(MÊS)';
    let periodSub = 'no Mês Atual';

    if (this.dashboardPeriod === 'month') {
      filteredCompleted = schedules.filter(s => {
        if (!s.completed) return false;
        const d = new Date(s.date + 'T00:00:00');
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
      periodSuffix = '(MÊS)';
      periodSub = 'no Mês Atual';
    } else if (this.dashboardPeriod === 'day') {
      filteredCompleted = schedules.filter(s => s.completed && s.date === todayStr);
      periodSuffix = '(HOJE)';
      periodSub = 'no Dia Atual';
    } else { // total
      filteredCompleted = schedules.filter(s => s.completed);
      periodSuffix = '(TOTAL)';
      periodSub = 'desde o início';
    }

    // Contadores
    const countCompleted = filteredCompleted.length;
    const countManut = filteredCompleted.filter(s => (s.serviceType === 'manutencao' || s.serviceType === 'chamado_interno')).length;
    const countInv = filteredCompleted.filter(s => s.serviceType === 'inventario').length;
    
    // Ordens agendadas hoje (independente de concluída ou não)
    const todayScheduled = schedules.filter(s => s.date === todayStr).length;

    // Atualiza Labels e Valores nos Cards
    document.getElementById('label-card-completed').textContent = `ORDENS CONCLUÍDAS ${periodSuffix}`;
    document.getElementById('val-card-completed').textContent = countCompleted;
    document.getElementById('sub-card-completed').textContent = `Total de Ordens ${periodSub}`;

    document.getElementById('label-card-maintenance').textContent = `ORDENS DE MANUTENÇÃO ${periodSuffix}`;
    document.getElementById('val-card-maintenance').textContent = countManut;
    document.getElementById('sub-card-maintenance').textContent = `Manutenções Concluídas ${periodSub}`;

    document.getElementById('label-card-inventory').textContent = `ORDENS DE INVENTÁRIO ${periodSuffix}`;
    document.getElementById('val-card-inventory').textContent = countInv;
    document.getElementById('sub-card-inventory').textContent = `Inventários Concluídos ${periodSub}`;

    document.getElementById('val-card-today').textContent = todayScheduled;

    // Atualiza título do Gráfico de Desempenho
    const chartTitle = document.getElementById('txt-chart-performance-title');
    if (chartTitle) chartTitle.textContent = 'DESEMPENHO DOS ANALISTAS';

    // 2. Renderiza Gráfico de Desempenho dos Analistas
    this.renderPerformanceChart(filteredCompleted, analysts);

    // 3. Renderiza a Lista de Agendas de Hoje (8 analistas)
    this.renderTodaySchedulesList(schedules, analysts);

    // 4. Renderiza Gráfico Histórico de 5 Meses / Todos (Compacto)
    this.updateHistoryChart();

    // 5. Renderiza Top 3 Escolas no Dashboard (Formato Lista)
    this.renderDashboardTopSchools();

    // 6. Renderiza Fila de Chamados no Dashboard
    this.renderDashboardQueue();
  },

  renderPerformanceChart(completedSchedules, analysts) {
    // Agrupa concluídas por analista
    const countsMap = {};
    analysts.forEach(a => countsMap[a.id] = { name: a.name, count: 0 });

    completedSchedules.forEach(s => {
      if (countsMap[s.analystId]) {
        countsMap[s.analystId].count++;
      }
    });

    // Ordena do maior para o menor e pega os principais (igual ao layout da foto)
    const sorted = Object.values(countsMap).sort((a, b) => b.count - a.count);
    const labels = sorted.map(i => i.name);
    const dataValues = sorted.map(i => i.count);

    const ctx = document.getElementById('chart-analysts-performance');
    if (!ctx) return;

    if (this.perfChart) {
      this.perfChart.destroy();
    }

    // Registra plugin para exibir valores no topo das barras como na foto
    const topLabelsPlugin = {
      id: 'topLabelsPlugin',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar, index) => {
            const data = dataset.data[index];
            if (data > 0) {
              ctx.fillStyle = '#ffffff';
              const isMobile = window.innerWidth <= 768;
              ctx.font = `bold ${isMobile ? 9 : 11}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText(data, bar.x, bar.y - 7);
            }
          });
        });
      }
    };

    this.perfChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ordens Concluídas',
          data: dataValues,
          backgroundColor: '#6095db',
          hoverBackgroundColor: '#8cb7f2',
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.65,
          categoryPercentage: 0.8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 20 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#ffffff',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              color: '#94a3b8',
              font: { size: window.innerWidth <= 768 ? 9 : (labels.length > 7 ? 10 : 11), family: 'Inter' },
              maxRotation: 45,
              minRotation: window.innerWidth <= 768 ? 35 : (labels.length > 6 ? 25 : 0)
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(51, 65, 85, 0.4)'
            },
            ticks: {
              color: '#64748b',
              stepSize: 10,
              font: { size: window.innerWidth <= 768 ? 9 : 11, family: 'Inter' },
              maxRotation: window.innerWidth <= 768 ? 35 : 0
            }
          }
        }
      },
      plugins: [topLabelsPlugin]
    });
  },

  renderTodaySchedulesList(schedules, analysts) {
    const container = document.getElementById('today-schedules-container');
    if (!container) return;

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Agendamentos de hoje
    const todayList = schedules.filter(s => s.date === todayStr);

    if (todayList.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:30px;">Nenhum agendamento para hoje.</div>';
      return;
    }

    // Mostra os agendamentos de hoje
    let html = '';
    todayList.forEach(item => {
      const analyst = analysts.find(a => a.id === item.analystId) || { name: 'Analista', color: '#3b82f6', avatar: '', phone: '' };
      
      let avatarHtml = '';
      if (analyst.avatar) {
        avatarHtml = `<img src="${analyst.avatar}" class="analyst-avatar-img" alt="${analyst.name}" onerror="this.outerHTML='<div class=\'analyst-avatar-fallback\' style=\'background:${analyst.color}\'>${analyst.name.charAt(0)}</div>'">`;
      } else {
        avatarHtml = `<div class="analyst-avatar-fallback" style="background:${analyst.color || '#3b82f6'};">${analyst.name.charAt(0)}</div>`;
      }

      html += `
        <div class="today-sched-item">
          <div class="today-sched-left">
            ${avatarHtml}
            <div class="today-sched-info">
              <div class="today-sched-name">
                ${analyst.name} &bull; ${item.schoolName}
              </div>
              <div class="today-sched-subject">
                <i class="fa-solid fa-tag" style="font-size:10px;"></i> ${item.subject}
              </div>
            </div>
          </div>

        </div>
      `;
    });

    container.innerHTML = html;
  },

  updateHistoryChart() {
    const selectMode = document.getElementById('select-history-view-mode');
    const mode = selectMode ? selectMode.value : '5_months';
    const schedules = store.getSchedules();

    // Determina os meses a considerar
    const now = new Date();
    const monthsToInclude = mode === '5_months' ? 5 : 12;

    const monthLabels = [];
    const manutCounts = [];
    const invCounts = [];

    for (let i = monthsToInclude - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      
      monthLabels.push(monthName.toUpperCase());

      // Filtra ordens do mês
      const monthScheds = schedules.filter(s => {
        const itemDate = new Date(s.date + 'T00:00:00');
        return itemDate.getFullYear() === y && itemDate.getMonth() === m && s.completed;
      });

      const mCount = monthScheds.filter(s => (s.serviceType === 'manutencao' || s.serviceType === 'chamado_interno')).length;
      const iCount = monthScheds.filter(s => s.serviceType === 'inventario').length;

      manutCounts.push(mCount);
      invCounts.push(iCount);
    }

    const ctx = document.getElementById('chart-history-evolution');
    if (!ctx) return;

    if (this.historyChart) {
      this.historyChart.destroy();
    }

    this.historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Manutenção / Conectividade',
            data: manutCounts,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#38bdf8',
            pointRadius: 4,
            borderWidth: 2
          },
          {
            label: 'Inventário de Equipamentos',
            data: invCounts,
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#34d399',
            pointRadius: 4,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Inter', size: 12 },
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#ffffff',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(51, 65, 85, 0.2)' },
            ticks: { color: '#94a3b8', font: { family: 'Inter' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
            ticks: { color: '#64748b', font: { family: 'Inter' } }
          }
        }
      }
    });
  },
  // =========================================================================
  // GESTÃO DE AGENDAMENTOS
  // =========================================================================
  renderSchedulesTable() {
    const tbody = document.getElementById('tbody-schedules');
    if (!tbody) return;

    const schedules = store.getSchedules();
    const analysts = store.getAnalysts();

    // Filtros
    const filterAnalyst = document.getElementById('filter-sched-analyst')?.value || 'all';
    const filterDate = document.getElementById('filter-sched-date')?.value || '';
    const filterStatus = document.getElementById('filter-sched-status')?.value || 'all';
    const filterSearch = (document.getElementById('filter-sched-search')?.value || '').toLowerCase().trim();

    const filtered = schedules.filter(s => {
      // Não exibe agendamento de retorno duplicado no Histórico
      if (s.isReturnVisit) return false;
      if (filterAnalyst !== 'all' && s.analystId !== filterAnalyst) return false;
      if (filterDate && s.date !== filterDate) return false;
      if (filterStatus === 'completed' && !s.completed) return false;
      if (filterStatus === 'pending' && s.completed) return false;
      if (filterStatus === 'needs_return' && !s.needsReturn) return false;
      
      if (filterSearch) {
        const matchCie = String(s.schoolCie).toLowerCase().includes(filterSearch);
        const matchName = String(s.schoolName).toLowerCase().includes(filterSearch);
        const matchOs = String(s.osNumber).toLowerCase().includes(filterSearch);
        const matchSub = String(s.subject).toLowerCase().includes(filterSearch);
        if (!matchCie && !matchName && !matchOs && !matchSub) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum agendamento encontrado com os filtros selecionados.</td></tr>';
      return;
    }

    let rows = '';
    filtered.forEach(item => {
      const analyst = analysts.find(a => a.id === item.analystId) || { name: 'Analista' };
      const statusBadge = item.completed 
        ? '<span class="table-status-badge status-completed"><i class="fa-solid fa-check"></i> Concluída</span>'
        : '<span class="table-status-badge status-pending"><i class="fa-regular fa-clock"></i> Pendente</span>';
      
      const returnBadge = item.needsReturn
        ? `<div class="badge-return"><i class="fa-solid fa-rotate-left"></i> Retornar ${item.returnDate ? '(' + item.returnDate.split('-').reverse().join('/') + ')' : ''}</div>`
        : '<span style="color:var(--text-dim); font-size:0.8rem;">-</span>';

      const dateFmt = item.date ? item.date.split('-').reverse().join('/') : '-';

      rows += `
        <tr>
          <td>
            <strong style="color:#ffffff;">${item.osNumber || '-'}</strong>
            <div style="font-size:0.78rem; color:var(--text-muted);">${dateFmt}</div>
          </td>
          <td>
            <span style="font-weight:600; color:#ffffff;">${analyst.name}</span>
          </td>
          <td>
            <div>${item.schoolName}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">CIE: ${item.schoolCie} | Dir: ${item.directorName || 'Não inf.'}</div>
          </td>
          <td>
            <span style="color:#60a5fa;">${item.subject}</span>
            ${item.obs ? `<div style="font-size:0.75rem; color:var(--text-dim); max-width:250px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${item.obs}">${item.obs}</div>` : ''}
          </td>
          <td>${statusBadge}</td>
          <td>${returnBadge}</td>
          <td style="text-align: center;">
            <div class="action-buttons-group" style="justify-content: center;">
              ${item.completed 
                ? `<button class="btn-icon-action" style="background:#16a34a; color:#ffffff; cursor:not-allowed; opacity:0.9;" disabled title="Atendimento concluído. Para alterar caso tenha marcado errado, use o botão do lápis (editar).">
                    <i class="fa-solid fa-check-double"></i>
                   </button>`
                : `<button class="btn-icon-action btn-complete" title="Marcar como Concluída" onclick="App.markCardAsCompleted('${item.id}')">
                    <i class="fa-solid fa-check"></i>
                   </button>`
              }
              <button class="btn-icon-action" style="color:#4ade80;" title="Enviar WhatsApp" onclick="App.openWhatsappModal('${item.id}')">
                <i class="fa-brands fa-whatsapp"></i>
              </button>
              <button class="btn-icon-action btn-edit" title="Editar Agendamento" onclick="App.openEditScheduleModal('${item.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              ${(item.completed || item.needsReturn)
                ? `<button class="btn-icon-action btn-delete" disabled title="Ordem ${item.completed ? 'concluída' : 'com retorno agendado'}. Exclusão bloqueada." style="cursor:not-allowed; opacity:0.35; filter:grayscale(0.85);">
                    <i class="fa-solid fa-trash"></i>
                   </button>`
                : `<button class="btn-icon-action btn-delete" title="Excluir Agendamento" onclick="App.deleteSchedule('${item.id}')">
                    <i class="fa-solid fa-trash"></i>
                   </button>`
              }
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  clearScheduleFilters() {
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('filter-sched-analyst').value = 'all';
    document.getElementById('filter-sched-date').value = todayStr; // Retorna sempre ao dia atual por padrão
    document.getElementById('filter-sched-status').value = 'all';
    document.getElementById('filter-sched-search').value = '';
    this.renderSchedulesTable();
  },

  setScheduleDateFilterToday() {
    const todayStr = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('filter-sched-date');
    if (dateInput) {
      dateInput.value = todayStr;
      this.renderSchedulesTable();
    }
  },

  toggleCompleted(id) {
    store.toggleScheduleCompleted(id);
    this.renderAnalystDailyCards();
    this.renderAllSchedulesTable();
    this.updateDashboard();
  },

  deleteSchedule(id) {
    const sched = store.getSchedules().find(s => String(s.id).trim() === String(id).trim());
    if (sched && (sched.completed || sched.needsReturn)) {
      alert(`Esta ordem de serviço está ${sched.completed ? 'concluída' : 'com retorno agendado'} e não pode ser excluída. Caso precise ajustar, utilize o botão de edição (lápis).`);
      return;
    }
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
      store.deleteSchedule(id);
      this.renderAnalystDailyCards();
      this.renderAllSchedulesTable();
      this.renderSchedulesTable();
      this.updateDashboard();
    }
  },

  openNewScheduleModal() {
    const form = document.getElementById('form-schedule');
    if (!form) return;
    form.reset();

    document.getElementById('sched-id').value = '';
    document.getElementById('modal-schedule-title').textContent = 'Novo Agendamento de O.S.';
    
    // Auto-preenche data com hoje
    document.getElementById('sched-date').value = new Date().toISOString().split('T')[0];
    // Número da O.S. inicia vazio (opcional)
    document.getElementById('sched-os-number').value = '';
    const svcTypeEl = document.getElementById('sched-service-type'); if (svcTypeEl) svcTypeEl.value = '';

    // Reseta visibilidade de retorno e assunto personalizado
    const statusFlagsGroup = document.getElementById('group-schedule-status-flags');
    if (statusFlagsGroup) statusFlagsGroup.style.display = 'none';
    const chkCompleted = document.getElementById('sched-completed');
    if (chkCompleted) chkCompleted.checked = false;
    const chkNeedsReturn = document.getElementById('sched-needs-return');
    if (chkNeedsReturn) chkNeedsReturn.checked = false;
    document.getElementById('group-return-date').style.display = 'none';
    const inpC = document.getElementById('sched-subject-custom'); if (inpC) { inpC.style.display = 'none'; inpC.value = ''; inpC.required = false; }

    this.populateSelects();
    this.openModal('modal-schedule');
  },

  openEditScheduleModal(id) {
    const sched = store.getSchedules().find(s => s.id === id);
    if (!sched) return;

    this.populateSelects();

    document.getElementById('sched-id').value = sched.id;
    document.getElementById('modal-schedule-title').textContent = 'Editar Agendamento de O.S.';
    document.getElementById('sched-analyst').value = sched.analystId;
    document.getElementById('sched-date').value = sched.date;
    document.getElementById('sched-school-cie').value = sched.schoolCie;
    document.getElementById('sched-school-name').value = sched.schoolName;
    document.getElementById('sched-director').value = sched.directorName || '';
    document.getElementById('sched-os-number').value = sched.osNumber;
    document.getElementById('sched-service-type').value = sched.serviceType || 'manutencao';
    document.getElementById('sched-completed').checked = !!sched.completed;
    document.getElementById('sched-needs-return').checked = !!sched.needsReturn;
    document.getElementById('sched-return-date').value = sched.returnDate || '';
    document.getElementById('sched-obs').value = sched.obs || '';

    const statusFlagsGroup = document.getElementById('group-schedule-status-flags');
    if (statusFlagsGroup) statusFlagsGroup.style.display = 'flex';
    this.toggleReturnDateInput(!!sched.needsReturn);

    // Trata se o assunto é pré-definido ou personalizado
    const isPredefined = PREDEFINED_SUBJECTS.some(sub => sub.name === sched.subject);
    const selectSub = document.getElementById('sched-subject-select');
    const inputCustom = document.getElementById('sched-subject-custom');

    if (isPredefined) {
      selectSub.value = sched.subject;
      inputCustom.style.display = 'none';
    } else {
      selectSub.value = 'custom';
      inputCustom.value = sched.subject;
      inputCustom.style.display = 'block';
    }

    this.openModal('modal-schedule');
  },

  saveScheduleForm(event) {
    event.preventDefault();

    const id = document.getElementById('sched-id').value || ('sched-' + Date.now());
    const analystId = document.getElementById('sched-analyst').value;
    const date = document.getElementById('sched-date').value;
    const schoolCie = document.getElementById('sched-school-cie').value.trim();
    const schoolName = document.getElementById('sched-school-name').value.trim();
    const directorName = document.getElementById('sched-director').value.trim();
    const osNumber = document.getElementById('sched-os-number').value.trim(); // Opcional
    const serviceType = document.getElementById('sched-service-type').value;
    if (!serviceType) {
      this.showNotification('Por favor, selecione o Tipo de Serviço.', 'warning');
      document.getElementById('sched-service-type').focus();
      return;
    }
    const completed = document.getElementById('sched-completed').checked;
    const needsReturn = document.getElementById('sched-needs-return').checked;
    const returnDate = needsReturn ? document.getElementById('sched-return-date').value : '';
    const obs = document.getElementById('sched-obs').value.trim();

    // Determina o assunto final
    const selectSubVal = document.getElementById('sched-subject-select').value;
    let finalSubject = selectSubVal;
    if (selectSubVal === 'custom') {
      finalSubject = document.getElementById('sched-subject-custom').value.trim() || 'Atendimento Geral';
    }

    const scheduleData = {
      id,
      analystId,
      date,
      schoolCie,
      schoolName,
      directorName,
      osNumber,
      subject: finalSubject,
      serviceType,
      completed,
      needsReturn,
      returnDate,
      obs
    };

    store.saveSchedule(scheduleData);

    // Se a escola ainda não existir cadastrada, cadastra automaticamente!
    const existingSchool = store.getSchoolByCie(schoolCie);
    if (!existingSchool && schoolCie && schoolName) {
      store.saveSchool({
        cie: schoolCie,
        name: schoolName,
        director: directorName,
        phone: '',
        neighborhood: ''
      });
    }

    this.closeModal('modal-schedule');
    this.renderAnalystDailyCards();
    this.renderAllSchedulesTable();
    this.updateDashboard();
  },

  handleSubjectSelectChange(val) {
    const inputCustom = document.getElementById('sched-subject-custom');
    if (val === 'custom') {
      inputCustom.style.display = 'block';
      inputCustom.required = true;
      inputCustom.focus();
    } else {
      inputCustom.style.display = 'none';
      inputCustom.required = false;
      inputCustom.value = '';
      // Auto ajusta tipo de serviço se for pré-definido
      const found = PREDEFINED_SUBJECTS.find(s => s.name === val);
      if (found) {
        document.getElementById('sched-service-type').value = found.type;
      }
    }
  },


  handleStatusFlagChange(type, isChecked) {
    const chkCompleted = document.getElementById('sched-completed');
    const chkReturn = document.getElementById('sched-needs-return');
    const groupReturnDate = document.getElementById('group-return-date');

    if (type === 'completed') {
      if (isChecked) {
        if (chkReturn) chkReturn.checked = false;
        if (groupReturnDate) groupReturnDate.style.display = 'none';
      }
    } else if (type === 'return') {
      if (isChecked) {
        if (chkCompleted) chkCompleted.checked = false;
        if (groupReturnDate) groupReturnDate.style.display = 'block';
      } else {
        if (groupReturnDate) groupReturnDate.style.display = 'none';
      }
    }
  },

    toggleReturnDateInput(checked) {
    document.getElementById('group-return-date').style.display = checked ? 'block' : 'none';
  },

  // AUTO-COMPLETE DE ESCOLAS POR CIE OU NOME
  handleCieInput(query) {
    const resultsContainer = document.getElementById('results-cie');
    if (!query || query.length < 2) {
      resultsContainer.classList.remove('active');
      return;
    }

    const schools = store.getSchools();
    const matches = schools.filter(s => s.cie.toLowerCase().includes(query.toLowerCase()));

    if (matches.length === 0) {
      resultsContainer.classList.remove('active');
      return;
    }

    resultsContainer.innerHTML = matches.map(s => `
      <div class="autocomplete-item" onclick="App.selectSchoolAutocomplete('${s.cie}')">
        <div class="autocomplete-item-name">${s.name}</div>
        <div class="autocomplete-item-cie">CIE: ${s.cie} | Dir: ${s.director}</div>
      </div>
    `).join('');
    resultsContainer.classList.add('active');
  },

  handleSchoolNameInput(query) {
    const resultsContainer = document.getElementById('results-school-name');
    if (!query || query.length < 2) {
      resultsContainer.classList.remove('active');
      return;
    }

    const schools = store.getSchools();
    const matches = schools.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));

    if (matches.length === 0) {
      resultsContainer.classList.remove('active');
      return;
    }

    resultsContainer.innerHTML = matches.map(s => `
      <div class="autocomplete-item" onclick="App.selectSchoolAutocomplete('${s.cie}')">
        <div class="autocomplete-item-name">${s.name}</div>
        <div class="autocomplete-item-cie">CIE: ${s.cie} | Dir: ${s.director}</div>
      </div>
    `).join('');
    resultsContainer.classList.add('active');
  },

  selectSchoolAutocomplete(cie) {
    const school = store.getSchoolByCie(cie);
    if (!school) return;

    document.getElementById('sched-school-cie').value = school.cie;
    document.getElementById('sched-school-name').value = school.name;
    document.getElementById('sched-director').value = school.director || '';

    document.getElementById('results-cie').classList.remove('active');
    document.getElementById('results-school-name').classList.remove('active');
  },
  // =========================================================================
  // WHATSAPP E GERAÇÃO DE IMAGEM DA AGENDA
  // =========================================================================
  openWhatsappModal(scheduleId) {
    const sched = store.getSchedules().find(s => s.id === scheduleId);
    if (!sched) return;

    const analyst = store.getAnalystById(sched.analystId) || { name: 'Analista', phone: '' };
    this.activeWaSchedule = { ...sched, analystPhone: analyst.phone, analystName: analyst.name };

    // Preenche o Card de Preview
    document.getElementById('wa-preview-os').textContent = sched.osNumber;
    document.getElementById('wa-preview-analyst').textContent = analyst.name;
    document.getElementById('wa-preview-phone').textContent = analyst.phone ? `WhatsApp: ${analyst.phone}` : 'Sem telefone cadastrado';
    document.getElementById('wa-preview-date').textContent = sched.date.split('-').reverse().join('/');
    document.getElementById('wa-preview-school').textContent = sched.schoolName;
    document.getElementById('wa-preview-cie-director').textContent = `CIE: ${sched.schoolCie} | Diretor(a): ${sched.directorName || 'Não informado'}`;
    document.getElementById('wa-preview-subject').textContent = sched.subject;

    const obsBox = document.getElementById('wa-preview-obs-box');
    const obsTxt = document.getElementById('wa-preview-obs');
    if (sched.obs) {
      obsTxt.textContent = sched.obs;
      obsBox.style.display = 'block';
    } else {
      obsBox.style.display = 'none';
    }

    this.openModal('modal-whatsapp');
  },

  downloadWhatsappCardImage() {
    const cardEl = document.getElementById('whatsapp-card-container');
    const btnDownload = document.getElementById('btn-download-wa-img');
    if (!cardEl) return;

    btnDownload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';

    // Renderiza imagem com html2canvas em alta qualidade
    html2canvas(cardEl, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#0f172a'
    }).then(canvas => {
      btnDownload.innerHTML = '<i class="fa-solid fa-download"></i> Baixar Imagem PNG';
      
      const link = document.createElement('a');
      const filename = `agenda_${this.activeWaSchedule?.analystName || 'analista'}_${this.activeWaSchedule?.osNumber || 'os'}.png`.replace(/\s+/g, '_');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => {
      btnDownload.innerHTML = '<i class="fa-solid fa-download"></i> Baixar Imagem PNG';
      console.error(err);
      alert('Erro ao gerar imagem: ' + err.message);
    });
  },

  sendDirectWhatsapp() {
    if (!this.activeWaSchedule) return;

    let phone = (this.activeWaSchedule.analystPhone || '').replace(/\D/g, '');
    if (!phone) {
      alert('Este analista não possui número de WhatsApp cadastrado!');
      return;
    }

    if (phone.length <= 11 && !phone.startsWith('55')) {
      phone = '55' + phone;
    }

    const dateFmt = this.activeWaSchedule.date ? this.activeWaSchedule.date.split('-').reverse().join('/') : '';
    const template = store.getWhatsappTemplate();
    const obsText = this.activeWaSchedule.obs ? this.activeWaSchedule.obs : 'Nenhuma';

    let message = template
      .replace(/\{analista\}/gi, this.activeWaSchedule.analystName || 'Analista')
      .replace(/\{os\}/gi, this.activeWaSchedule.osNumber || 'Sem O.S.')
      .replace(/\{data\}/gi, dateFmt)
      .replace(/\{escola\}/gi, this.activeWaSchedule.schoolName || 'Escola')
      .replace(/\{cie\}/gi, this.activeWaSchedule.schoolCie || '-')
      .replace(/\{diretor\}/gi, this.activeWaSchedule.directorName || 'Coordenação')
      .replace(/\{assunto\}/gi, this.activeWaSchedule.subject || 'Atendimento')
      .replace(/\{obs\}/gi, obsText);

    // Se obs estava vazio e sobrou a linha de observacoes com 'Nenhuma', limpa suavemente
    if (!this.activeWaSchedule.obs) {
      message = message.replace(/\*Observações:\*\s*Nenhuma\n?/gi, '').trim();
    }

    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    window.open(url, '_blank');
  },


  // =========================================================================
  // GESTÃO DE TODOS OS AGENDAMENTOS (HISTÓRICO COMPLETO)
  // =========================================================================
  renderAllSchedulesTable() {
    const tbody = document.getElementById('tbody-all-schedules');
    if (!tbody) return;

    const schedules = store.getSchedules();
    const analysts = store.getAnalysts();

    // Filtros
    const filterAnalyst = document.getElementById('filter-all-analyst')?.value || 'all';
    const filterDate = document.getElementById('filter-all-date')?.value || '';
    const filterStatus = document.getElementById('filter-all-status')?.value || 'all';
    const filterSearch = (document.getElementById('filter-all-search')?.value || '').toLowerCase().trim();

    const filtered = schedules.filter(s => {
      // Não exibe agendamento de retorno duplicado no Histórico
      if (s.isReturnVisit) return false;
      if (filterAnalyst !== 'all' && s.analystId !== filterAnalyst) return false;
      if (filterDate && s.date !== filterDate) return false;
      if (filterStatus === 'completed' && !s.completed) return false;
      if (filterStatus === 'pending' && s.completed) return false;
      if (filterStatus === 'needs_return' && !s.needsReturn) return false;
      
      if (filterSearch) {
        const matchCie = String(s.schoolCie).toLowerCase().includes(filterSearch);
        const matchName = String(s.schoolName).toLowerCase().includes(filterSearch);
        const matchOs = String(s.osNumber).toLowerCase().includes(filterSearch);
        const matchSub = String(s.subject).toLowerCase().includes(filterSearch);
        if (!matchCie && !matchName && !matchOs && !matchSub) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum agendamento encontrado com os filtros selecionados.</td></tr>';
      return;
    }

    let rows = '';
    filtered.forEach(item => {
      const analyst = analysts.find(a => a.id === item.analystId) || { name: 'Analista' };
      const statusBadge = item.completed 
        ? '<span class="table-status-badge status-completed"><i class="fa-solid fa-check"></i> Concluída</span>'
        : (item.needsReturn
            ? `<div class="badge-return" style="display:inline-flex; align-items:center; gap:5px;"><i class="fa-solid fa-rotate-left"></i> Retornar ${item.returnDate ? '(' + item.returnDate.split('-').reverse().join('/') + ')' : ''}</div>`
            : '<span class="table-status-badge status-pending"><i class="fa-regular fa-clock"></i> Pendente</span>');

      const dateFmt = item.date ? item.date.split('-').reverse().join('/') : '-';

      rows += `
        <tr>
          <td>
            <strong style="color:#ffffff;">${item.osNumber || '-'}</strong>
            <div style="font-size:0.78rem; color:var(--text-muted);">${dateFmt}</div>
          </td>
          <td>
            <span style="font-weight:600; color:#ffffff;">${analyst.name}</span>
          </td>
          <td>
            <div>${item.schoolName}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">CIE: ${item.schoolCie} | Dir: ${item.directorName || 'Não inf.'}</div>
          </td>
          <td>
            <span style="color:#60a5fa;">${item.subject}</span>
            ${item.obs ? `<div style="font-size:0.75rem; color:var(--text-dim); max-width:250px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${item.obs}">${item.obs}</div>` : ''}
          </td>
          <td>${statusBadge}</td>
          <td style="text-align: center;">
            <div class="action-buttons-group" style="justify-content: center;">
              <button class="btn-icon-action btn-edit" title="Editar Agendamento" onclick="App.openEditScheduleModal('${item.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-icon-action btn-delete" title="Excluir Agendamento" onclick="App.deleteSchedule('${item.id}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  clearAllSchedulesFilters() {
    document.getElementById('filter-all-analyst').value = 'all';
    document.getElementById('filter-all-date').value = '';
    document.getElementById('filter-all-status').value = 'all';
    document.getElementById('filter-all-search').value = '';
    this.renderAllSchedulesTable();
  },



  // Métodos de navegação de data na Agenda Analistas
  prevAgendaDate() {
    if (!this.selectedAgendaDate) {
      this.selectedAgendaDate = new Date().toISOString().split('T')[0];
    }
    const d = new Date(this.selectedAgendaDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    this.selectedAgendaDate = d.toISOString().split('T')[0];
    this.renderAnalystDailyCards();
  },

  nextAgendaDate() {
    if (!this.selectedAgendaDate) {
      this.selectedAgendaDate = new Date().toISOString().split('T')[0];
    }
    const d = new Date(this.selectedAgendaDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    this.selectedAgendaDate = d.toISOString().split('T')[0];
    this.renderAnalystDailyCards();
  },

  setAgendaDate(dateStr) {
    if (dateStr) {
      this.selectedAgendaDate = dateStr;
      this.renderAnalystDailyCards();
    }
  },

  setAgendaDateToday() {
    this.selectedAgendaDate = new Date().toISOString().split('T')[0];
    this.renderAnalystDailyCards();
  },

  // =========================================================================
  // AGENDA ANALISTAS - CARDS EXCLUSIVOS DO DIA ATUAL
  // =========================================================================
  renderAnalystDailyCards() {
    const container = document.getElementById('analyst-cards-container');
    if (!container) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayFmt = new Date().toLocaleDateString('pt-BR');
    if (!this.selectedAgendaDate) {
      this.selectedAgendaDate = todayStr;
    }
    const currentDate = this.selectedAgendaDate;

    // Sincroniza o input picker oculto
    const picker = document.getElementById('agenda-hidden-date-picker');
    if (picker) picker.value = currentDate;

    // Formata o texto do badge de data (Hoje, Ontem, Amanhã ou Data)
    const [y, m, d] = currentDate.split('-');
    const currentFmt = `${d}/${m}/${y}`;

    const targetTime = new Date(currentDate + 'T00:00:00').getTime();
    const todayTime = new Date(todayStr + 'T00:00:00').getTime();
    const diffDays = Math.round((targetTime - todayTime) / 86400000);

    let dateLabel = currentFmt;
    if (diffDays === 0) dateLabel = `Hoje (${currentFmt})`;
    else if (diffDays === -1) dateLabel = `Ontem (${currentFmt})`;
    else if (diffDays === 1) dateLabel = `Amanhã (${currentFmt})`;
    else dateLabel = `${currentFmt}`;

    const badgeDate = document.getElementById('agenda-card-date-badge');
    if (badgeDate) badgeDate.textContent = dateLabel;

    const btnBackToday = document.getElementById('btn-agenda-back-today');
    if (btnBackToday) btnBackToday.style.display = (diffDays === 0) ? 'none' : 'inline-flex';

    const subtitle = document.getElementById('agenda-page-subtitle');
    if (subtitle) {
      subtitle.textContent = (diffDays === 0)
        ? 'Visualização exclusiva por card de cada analista e ordens do dia atual'
        : `Visualização por card de cada analista e ordens para ${currentFmt}`;
    }

    const analysts = store.getAnalysts().filter(a => a.status === 'ativo');
    const allSchedules = store.getSchedules();
    const todaySchedules = allSchedules.filter(s => s.date === currentDate);

    // Atualiza chips de resumo no topo
    const statAnalysts = document.getElementById('stat-card-analysts');
    const statTotal = document.getElementById('stat-card-total');
    const statCompleted = document.getElementById('stat-card-completed');
    const statPending = document.getElementById('stat-card-pending');

    const completedCount = todaySchedules.filter(s => s.completed).length;
    const pendingCount = todaySchedules.filter(s => !s.completed).length;

    if (statAnalysts) statAnalysts.textContent = analysts.length;
    if (statTotal) statTotal.textContent = todaySchedules.length;
    if (statCompleted) statCompleted.textContent = completedCount;
    if (statPending) statPending.textContent = pendingCount;

    if (analysts.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">Nenhum analista ativo cadastrado no sistema.</div>';
      return;
    }

    let cardsHtml = '';

    analysts.forEach(analyst => {
      const analystOrders = todaySchedules.filter(s => s.analystId === analyst.id);
      analystOrders.sort((a, b) => {
        const seqA = (typeof a.sequence === 'number' && !isNaN(a.sequence)) ? a.sequence : 999;
        const seqB = (typeof b.sequence === 'number' && !isNaN(b.sequence)) ? b.sequence : 999;
        if (seqA !== seqB) return seqA - seqB;
        return 0;
      });
      
      let avatarHtml = '';
      if (analyst.avatar) {
        avatarHtml = `<img src="${analyst.avatar}" class="analyst-avatar-img" alt="${analyst.name}" onerror="this.outerHTML='<div class=\'analyst-avatar-fallback\' style=\'background:${analyst.color}\'>${analyst.name.charAt(0)}</div>'">`;
      } else {
        avatarHtml = `<div class="analyst-avatar-fallback" style="background:${analyst.color || '#3b82f6'};">${analyst.name.charAt(0)}</div>`;
      }

      const sendAgendaBtn = analystOrders.length > 0
        ? `<button type="button" class="btn-header-send-agenda" onclick="App.openDailyAgendaModal('${analyst.id}', '${currentDate}')" title="Enviar agenda para o WhatsApp de ${analyst.name}">
             <i class="fa-brands fa-whatsapp"></i>
             <span>Enviar Agenda</span>
           </button>`
        : `<button type="button" class="btn-header-send-agenda is-disabled" disabled title="Nenhum agendamento para este analista nesta data">
             <i class="fa-brands fa-whatsapp"></i>
             <span>Enviar Agenda</span>
           </button>`;

      cardsHtml += `
        <div class="analyst-daily-card" id="analyst-card-${analyst.id}">
          
          <!-- Topo do Card: Nome e Botão Enviar Agenda -->
          <div class="analyst-daily-header">
            <div class="analyst-daily-header-left">
              ${avatarHtml}
              <div class="analyst-daily-name">${analyst.name}</div>
            </div>
            <div>${sendAgendaBtn}</div>
          </div>

          <!-- Corpo do Card: Ordens do Dia Atual -->
          <div class="analyst-daily-body" data-analyst-id="${analyst.id}" ondragover="App.handleAnalystDragOver(event)" ondragenter="App.handleAnalystDragEnter(event)" ondragleave="App.handleAnalystDragLeave(event)" ondrop="App.handleAnalystDrop(event, '${analyst.id}')">
      `;

      if (analystOrders.length > 0) {
        analystOrders.forEach((order, index) => {
          const isDone = !!order.completed;
          const doneBadge = isDone
            ? '<span class="table-status-badge status-completed" style="font-size:0.72rem; padding:3px 8px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:5px;"><i class="fa-solid fa-check"></i> Concluída</span>'
            : '';

          const returnInfo = order.needsReturn
            ? `<div class="badge-return" style="margin-top:0;" title="${order.returnDate ? `Data do retorno: ${order.returnDate.split('-').reverse().join('/')}` : 'Retorno agendado'}"><i class="fa-solid fa-rotate-left"></i> Retorno Agendado</div>`
            : '';

          const osInputHtml = `
            <div class="card-os-inline-group">
              <span class="card-os-label">Nº O.S:</span>
              <input type="text" class="card-os-inline-input" placeholder="" value="${(order.osNumber || '').replace(/(-RET)+$/gi, '')}" onchange="App.updateScheduleOs('${order.id}', this.value)" title="Digite o número da O.S. (Pressione Enter ou clique fora para salvar)">
            </div>
          `;

          const seqBarHtml = analystOrders.length > 1
            ? `<div class="card-seq-bar">
                 <div class="card-seq-left">
                   <span class="seq-pill"><i class="fa-solid fa-route"></i> ${index + 1}º Atendimento</span>
                   ${osInputHtml}
                 </div>
                 <div class="seq-btns">
                   <button type="button" class="btn-seq-move" title="Subir na sequência" ${index === 0 ? 'disabled' : ''} onclick="event.stopPropagation(); App.moveScheduleSequence('${order.id}', -1)">
                     <i class="fa-solid fa-arrow-up"></i>
                   </button>
                   <button type="button" class="btn-seq-move" title="Descer na sequência" ${index === analystOrders.length - 1 ? 'disabled' : ''} onclick="event.stopPropagation(); App.moveScheduleSequence('${order.id}', 1)">
                     <i class="fa-solid fa-arrow-down"></i>
                   </button>
                 </div>
               </div>`
            : `<div class="card-seq-bar">
                 <div class="card-seq-left">
                   <span class="seq-pill" style="opacity:0.85; font-size:0.72rem;"><i class="fa-solid fa-location-dot"></i> Atendimento Único</span>
                   ${osInputHtml}
                 </div>
               </div>`;

          const isLocked = isDone || !!order.needsReturn;

          cardsHtml += `
            <div class="card-order-box ${isDone ? 'completed' : ''} ${isLocked ? 'is-locked' : ''}" 
                 ${isLocked ? 'draggable="false"' : `draggable="true" ondragstart="App.handleOrderDragStart(event, '${order.id}')" ondragend="App.handleOrderDragEnd(event)"`} 
                 id="order-box-${order.id}" 
                 title="${isLocked ? (isDone ? 'Atendimento concluído (bloqueado para transferências)' : 'Atendimento com retorno agendado (bloqueado para transferências)') : 'Arraste este card para mudar de analista'}">
              ${seqBarHtml}
              <div class="card-order-header">
                <div>
                  <div class="card-school-name">
                    <span>${order.schoolName}</span>
                  </div>
                  <div class="card-school-cie">CIE: ${order.schoolCie} | Diretor(a): ${order.directorName || 'Coordenação'}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  ${isLocked 
                    ? '<span class="drag-grip-indicator" style="opacity:0.3; cursor:not-allowed;" title="Bloqueado para transferências"><i class="fa-solid fa-lock" style="font-size:0.75rem;"></i></span>' 
                    : '<span class="drag-grip-indicator" title="Arraste para outro analista"><i class="fa-solid fa-grip-vertical"></i></span>'
                  }
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <span class="card-subject-badge"><i class="fa-solid fa-screwdriver-wrench"></i> ${(order.subject || '').replace(/^Retorno:\s*/gi, '').trim()}</span>
                <span style="font-size:0.74rem; color:var(--text-dim);"><i class="fa-regular fa-calendar"></i> ${(order.date ? order.date.split('-').reverse().join('/') : currentFmt)}</span>
              </div>

              ${order.obs ? `<div class="card-obs-text"><i class="fa-solid fa-circle-info" style="color:#60a5fa;"></i> ${order.obs}</div>` : ''}

              <!-- Linha de Ações: Concluído / Precisa Retornar / WhatsApp / Editar / Excluir -->
              <div class="card-actions-row">
                ${isDone 
                  ? `<button type="button" class="card-btn-action card-btn-complete is-done" disabled title="Atendimento marcado como concluído. Para reabrir ou alterar caso tenha clicado errado, use o botão do lápis (editar)." style="cursor:not-allowed; opacity:0.92;">
                      <i class="fa-solid fa-circle-check"></i> Concluída
                    </button>`
                  : (order.needsReturn
                      ? `<button type="button" class="card-btn-action card-btn-complete" disabled title="Atendimento com retorno já agendado. Botão de conclusão bloqueado." style="cursor:not-allowed; opacity:0.35; filter:grayscale(0.85);">
                          <i class="fa-solid fa-check"></i> Concluir
                        </button>`
                      : `<button type="button" class="card-btn-action card-btn-complete" onclick="App.markCardAsCompleted('${order.id}')" title="Marcar atendimento como concluído">
                          <i class="fa-solid fa-check"></i> Concluir
                        </button>`
                    )
                }

                ${order.needsReturn 
                  ? `<button type="button" class="card-btn-action card-btn-return is-returned" disabled title="Retorno já agendado para ${order.returnDate ? order.returnDate.split('-').reverse().join('/') : 'outra data'}. Para alterar ou cancelar o retorno caso precise de último caso, use o botão do lápis (editar)." style="cursor:not-allowed; opacity:0.92; background:rgba(245, 158, 11, 0.25); border-color:#f59e0b; color:#fbbf24; flex-direction:column; justify-content:center; gap:1px; padding:5px 8px; line-height:1.15;">
                      <span style="display:inline-flex; align-items:center; gap:5px; font-weight:700; font-size:0.78rem;"><i class="fa-solid fa-arrows-rotate"></i> Retorno</span>
                      ${order.returnDate ? `<span style="font-size:0.72rem; color:#fde047; font-weight:600; letter-spacing:0.2px;">${order.returnDate.split('-').reverse().join('/')}</span>` : ''}
                    </button>`
                  : (isDone
                      ? `<button type="button" class="card-btn-action card-btn-return" disabled title="Atendimento já concluído. Botão de retorno bloqueado." style="cursor:not-allowed; opacity:0.35; filter:grayscale(0.85);">
                          <i class="fa-solid fa-arrows-rotate"></i> Retornar
                        </button>`
                      : `<button type="button" class="card-btn-action card-btn-return" onclick="App.openReturnModal('${order.id}')" title="Informar necessidade de retorno e agendar automaticamente para a data">
                          <i class="fa-solid fa-arrows-rotate"></i> Retornar
                        </button>`
                    )
                }



                <button class="btn-icon-action btn-edit" title="Editar atendimento" onclick="App.openEditScheduleModal('${order.id}')">
                  <i class="fa-solid fa-pen"></i>
                </button>

                ${(isDone || order.needsReturn)
                  ? `<button class="btn-icon-action btn-delete" disabled title="Ordem ${isDone ? 'concluída' : 'com retorno agendado'}. Exclusão bloqueada. Para alterar, use o botão de edição (lápis)." style="cursor:not-allowed; opacity:0.35; filter:grayscale(0.85);">
                      <i class="fa-solid fa-trash"></i>
                    </button>`
                  : `<button class="btn-icon-action btn-delete" title="Excluir atendimento" onclick="App.deleteSchedule('${order.id}')">
                      <i class="fa-solid fa-trash"></i>
                    </button>`
                }
              </div>
            </div>
          `;
        });

        // Botão para adicionar mais uma ordem para este analista hoje se desejar
        cardsHtml += `
          <button class="btn-secondary" style="width:100%; font-size:0.78rem; padding:8px; justify-content:center; margin-top:2px;" onclick="App.openNewScheduleForAnalyst('${analyst.id}', '${currentDate}')">
            <i class="fa-solid fa-plus"></i> Adicionar Outra O.S. Hoje
          </button>
        `;
      } else {
        // Estado vazio: analista sem agendamento hoje
        cardsHtml += `
          <div class="card-empty-state">
            <i class="fa-regular fa-calendar-xmark" style="font-size:1.8rem; color:#475569;"></i>
            <div>Nenhum agendamento para hoje</div>
            <button class="btn-secondary" style="font-size:0.8rem; padding:7px 16px;" onclick="App.openNewScheduleForAnalyst('${analyst.id}', '${currentDate}')">
              <i class="fa-solid fa-plus"></i> Agendar Atendimento Hoje
            </button>
          </div>
        `;
      }

      cardsHtml += `
          </div>
        </div>
      `;
    });

    container.innerHTML = cardsHtml;
  },

  openNewScheduleForAnalyst(analystId, customDate) {
    const targetDate = customDate || this.selectedAgendaDate || new Date().toISOString().split('T')[0];
    this.openNewScheduleModal();
    const select = document.getElementById('sched-analyst');
    if (select) select.value = analystId;
    const dateInput = document.getElementById('sched-date');
    if (dateInput) dateInput.value = targetDate;
  },

  updateScheduleOs(scheduleId, newOsValue) {
    const schedules = store.getSchedules();
    const sched = schedules.find(s => s.id === scheduleId);
    if (sched) {
      sched.osNumber = newOsValue.trim();
      store.saveSchedule(sched);
      this.renderAnalystDailyCards();
      this.renderAllSchedulesTable();
      this.updateDashboard();
    }
  },


  markCardAsCompleted(scheduleId) {
    const list = store.getSchedules();
    const item = list.find(s => String(s.id).trim() === String(scheduleId).trim());
    if (item) {
      item.completed = true;
      item.needsReturn = false; // Ao concluir, encerra a necessidade de retorno
      
      // Se este card concluído for um retorno vinculado a uma ordem original,
      // atualiza também a ordem original para Concluída!
      if (item.parentScheduleId) {
        let root = list.find(s => String(s.id).trim() === String(item.parentScheduleId).trim());
        while (root && root.parentScheduleId) {
          const parent = list.find(s => String(s.id).trim() === String(root.parentScheduleId).trim());
          if (!parent) break;
          root = parent;
        }
        if (root) {
          root.completed = true;
          root.needsReturn = false;
          if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveSchedule(root);
        }
      }

      store.setSchedules(list);
      if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveSchedule(item);
      this.renderAnalystDailyCards();
      this.renderAllSchedulesTable();
      this.updateDashboard();
    }
  },
  toggleCardCompleted(scheduleId) {
    store.toggleScheduleCompleted(scheduleId);
    this.renderAnalystDailyCards();
    this.renderAllSchedulesTable();
    this.updateDashboard();
  },

  openReturnModal(scheduleId) {
    const sched = store.getSchedules().find(s => s.id === scheduleId);
    if (!sched) return;

    const analyst = store.getAnalystById(sched.analystId) || { name: 'Analista' };

    document.getElementById('return-source-sched-id').value = sched.id;
    document.getElementById('return-info-school').textContent = `${sched.schoolName} (CIE: ${sched.schoolCie})`;
    document.getElementById('return-info-analyst').textContent = `Analista: ${analyst.name}`;
    document.getElementById('return-info-os').textContent = `O.S. Atual: ${sched.osNumber || 'Sem número informado'}`;
    
    // Data padrão de retorno: amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('return-picked-date').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('return-picked-obs').value = '';

    this.openModal('modal-return');
  },

  confirmScheduleReturn(event) {
    event.preventDefault();

    const sourceId = document.getElementById('return-source-sched-id').value;
    const returnDate = document.getElementById('return-picked-date').value;
    const returnObs = document.getElementById('return-picked-obs').value.trim();

    if (!returnDate) {
      alert('Por favor, informe a data do retorno.');
      return;
    }

    const schedules = store.getSchedules();
    const sourceSched = schedules.find(s => s.id === sourceId);
    if (!sourceSched) return;

    // 1. Marca a O.S. atual como necessitando de retorno com a data
    sourceSched.needsReturn = true;
    sourceSched.returnDate = returnDate;
    store.saveSchedule(sourceSched);

    // Se sourceSched já for um retorno anterior, localiza a ordem original raiz para atualizar a data do último retorno nela também
    let rootSchedule = null;
    if (sourceSched.parentScheduleId) {
      rootSchedule = schedules.find(s => String(s.id).trim() === String(sourceSched.parentScheduleId).trim());
      while (rootSchedule && rootSchedule.parentScheduleId) {
        const parent = schedules.find(s => String(s.id).trim() === String(rootSchedule.parentScheduleId).trim());
        if (!parent) break;
        rootSchedule = parent;
      }
      if (rootSchedule) {
        rootSchedule.needsReturn = true;
        rootSchedule.returnDate = returnDate; // Atualiza no histórico para exibir a nova data de retorno mais recente!
        store.saveSchedule(rootSchedule);
      }
    }

    // 2. CRIA AUTOMATICAMENTE O CARD DE RETORNO PARA O DIA DO RETORNO INFORMADO (com flag isReturnVisit: true)
    const rootId = (rootSchedule ? rootSchedule.id : (sourceSched.parentScheduleId || sourceSched.id));
    const returnOsNumber = sourceSched.osNumber ? sourceSched.osNumber.replace(/(-RET)+$/gi, '').trim() : '';
    
    const newReturnSchedule = {
      id: 'sched-ret-' + Date.now(),
      parentScheduleId: rootId,
      isReturnVisit: true, // Identifica que é continuação de atendimento/retorno e não uma nova ordem
      analystId: sourceSched.analystId,
      schoolCie: sourceSched.schoolCie,
      schoolName: sourceSched.schoolName,
      directorName: sourceSched.directorName,
      date: returnDate,
      subject: (sourceSched.subject || '').replace(/^Retorno:\s*/gi, '').trim(),
      serviceType: sourceSched.serviceType,
      osNumber: returnOsNumber,
      completed: false,
      needsReturn: false,
      returnDate: '',
      obs: returnObs ? returnObs.trim() : ''
    };

    store.saveSchedule(newReturnSchedule);

    this.closeModal('modal-return');
    this.renderAnalystDailyCards();
    this.renderAllSchedulesTable();
    this.updateDashboard();

    const formattedReturnDate = returnDate.split('-').reverse().join('/');
    alert(`Retorno registrado com sucesso! Uma nova O.S. já foi agendada para o analista no dia ${formattedReturnDate}.`);
  },


  draggedScheduleId: null,
  toastTimeout: null,

  handleOrderDragStart(event, scheduleId) {
    const sched = store.getSchedules().find(s => String(s.id).trim() === String(scheduleId).trim());
    if (sched && (sched.completed || sched.needsReturn)) {
      if (event.preventDefault) event.preventDefault();
      this.showToast('Atendimento bloqueado: não é permitido transferir ordem concluída ou com retorno.');
      return;
    }
    this.draggedScheduleId = scheduleId;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', scheduleId);
      event.dataTransfer.effectAllowed = 'move';
    }
    const cardEl = event.currentTarget;
    setTimeout(() => {
      cardEl.classList.add('is-dragging');
    }, 0);
  },

  handleOrderDragEnd(event) {
    event.currentTarget.classList.remove('is-dragging');
    document.querySelectorAll('.analyst-daily-body').forEach(el => {
      el.classList.remove('drag-target-hover');
    });
  },

  handleAnalystDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  },

  handleAnalystDragEnter(event) {
    event.preventDefault();
    const bodyEl = event.currentTarget.closest('.analyst-daily-body');
    if (bodyEl) {
      bodyEl.classList.add('drag-target-hover');
    }
  },

  handleAnalystDragLeave(event) {
    const bodyEl = event.currentTarget.closest('.analyst-daily-body');
    if (bodyEl && !bodyEl.contains(event.relatedTarget)) {
      bodyEl.classList.remove('drag-target-hover');
    }
  },

  handleAnalystDrop(event, targetAnalystId) {
    event.preventDefault();
    const bodyEl = event.currentTarget.closest('.analyst-daily-body');
    if (bodyEl) {
      bodyEl.classList.remove('drag-target-hover');
    }

    const scheduleId = this.draggedScheduleId || (event.dataTransfer ? event.dataTransfer.getData('text/plain') : null);
    if (!scheduleId || !targetAnalystId) return;

    const schedules = store.getSchedules();
    const order = schedules.find(s => String(s.id).trim() === String(scheduleId).trim());
    if (!order) return;

    if (String(order.analystId).trim() === String(targetAnalystId).trim()) {
      return; // Já pertence a este analista
    }

    if (order.completed || order.needsReturn) {
      this.showToast('Atendimento bloqueado: não é permitido transferir ordem concluída ou com retorno.');
      return;
    }

    const targetAnalyst = store.getAnalystById(targetAnalystId) || { name: 'Analista' };

    // Transfere o atendimento para o novo analista
    order.analystId = targetAnalystId;
    store.saveSchedule(order);

    // Re-renderiza os cards e as tabelas em tempo real
    this.renderAnalystDailyCards();
    this.renderAllSchedulesTable();
    this.updateDashboard();

    this.showToast(`Atendimento transferido para ${targetAnalyst.name}!`);
  },

  showToast(message) {
    const toast = document.getElementById('app-toast');
    const toastText = document.getElementById('app-toast-text');
    if (toast && toastText) {
      toastText.textContent = message;
      toast.classList.add('active');
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        toast.classList.remove('active');
      }, 3500);
    }
  },

  // =========================================================================
  // GESTÃO DE ANALISTAS
  // =========================================================================

  // =========================================================================
  // GESTÃO DE SEQUÊNCIA E AGENDA COMPLETA DO DIA (WHATSAPP EM IMAGEM)
  // =========================================================================
  moveScheduleSequence(scheduleId, direction) {
    const schedules = store.getSchedules();
    const target = schedules.find(s => String(s.id).trim() === String(scheduleId).trim());
    if (!target) return;

    const targetDate = target.date;
    const analystId = target.analystId;

    // Obter todas as ordens deste analista nesta data
    const orders = schedules.filter(s => s.analystId === analystId && s.date === targetDate);
    orders.sort((a, b) => {
      const seqA = (typeof a.sequence === 'number' && !isNaN(a.sequence)) ? a.sequence : 999;
      const seqB = (typeof b.sequence === 'number' && !isNaN(b.sequence)) ? b.sequence : 999;
      if (seqA !== seqB) return seqA - seqB;
      return 0;
    });

    const currentIndex = orders.findIndex(s => String(s.id).trim() === String(scheduleId).trim());
    if (currentIndex < 0) return;
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= orders.length) return;

    // Inverte posições no array
    const temp = orders[currentIndex];
    orders[currentIndex] = orders[newIndex];
    orders[newIndex] = temp;

    // Reatribui sequence de 1 a N e salva
    orders.forEach((ord, idx) => {
      ord.sequence = idx + 1;
      store.saveSchedule(ord);
    });

    this.renderAnalystDailyCards();
    this.showToast(`Sequência alterada: ${target.schoolName} agora é o ${newIndex + 1}º atendimento.`);
  },

  openDailyAgendaModal(analystId, customDate) {
    const targetDate = customDate || this.selectedAgendaDate || new Date().toISOString().split('T')[0];
    const analyst = store.getAnalystById(analystId) || { name: 'Analista', phone: '', neighborhood: '' };
    const schedules = store.getSchedules();

    const orders = schedules.filter(s => s.analystId === analystId && s.date === targetDate);
    orders.sort((a, b) => {
      const seqA = (typeof a.sequence === 'number' && !isNaN(a.sequence)) ? a.sequence : 999;
      const seqB = (typeof b.sequence === 'number' && !isNaN(b.sequence)) ? b.sequence : 999;
      if (seqA !== seqB) return seqA - seqB;
      return 0;
    });

    if (orders.length === 0) {
      alert('Este analista não possui atendimentos agendados nesta data.');
      return;
    }

    this.activeDailyAgendaAnalyst = analyst;
    this.activeDailyAgendaOrders = orders;
    this.activeDailyAgendaDate = targetDate;

    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const d = new Date(targetDate + 'T00:00:00');
    const weekdayName = weekdays[d.getDay()] || '';
    const dateFormatted = targetDate.split('-').reverse().join('/');

    // Cabeçalho do Cartão Digital
    const badgeCount = document.getElementById('daily-agenda-badge-count');
    if (badgeCount) badgeCount.textContent = `${orders.length} ${orders.length === 1 ? 'Atendimento' : 'Atendimentos'}`;

    const txtName = document.getElementById('daily-agenda-analyst-name');
    if (txtName) txtName.textContent = analyst.name;

    const txtDate = document.getElementById('daily-agenda-date');
    if (txtDate) txtDate.textContent = dateFormatted;

    const txtWeekday = document.getElementById('daily-agenda-weekday');
    if (txtWeekday) txtWeekday.textContent = weekdayName;

    // Renderiza lista das paradas na sequência correta
    let ordersHtml = '';
    orders.forEach((ord, i) => {
      const isDone = !!ord.completed;
      const statusBadge = isDone
        ? '<span style="color:#4ade80; font-size:0.72rem; font-weight:700;"><i class="fa-solid fa-check"></i> Concluída</span>'
        : (ord.needsReturn
            ? '<span style="color:#fbbf24; font-size:0.72rem; font-weight:700;"><i class="fa-solid fa-arrows-rotate"></i> Retorno</span>'
            : ''
          );

      ordersHtml += `
        <div class="daily-agenda-item">
          <div class="daily-agenda-item-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="item-seq-badge">${i + 1}º ATENDIMENTO</span>
              ${statusBadge}
            </div>
            <span class="item-os-badge">O.S.: ${ord.osNumber || 'Não informada'}</span>
          </div>

          <div class="daily-agenda-item-school">${ord.schoolName}</div>
          <div class="daily-agenda-item-cie">CIE: ${ord.schoolCie} | Diretor(a): ${ord.directorName || 'Coordenação'}</div>

          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px;">
            <span class="daily-agenda-item-subject"><i class="fa-solid fa-screwdriver-wrench"></i> ${(ord.subject || '').replace(/^Retorno:\s*/gi, '').trim()}</span>
          </div>

          ${ord.obs ? `<div class="daily-agenda-item-obs"><i class="fa-solid fa-circle-info" style="color:#60a5fa;"></i> Obs: ${ord.obs}</div>` : ''}
        </div>
      `;
    });

    const listEl = document.getElementById('daily-agenda-orders-list');
    if (listEl) listEl.innerHTML = ordersHtml;

    this.openModal('modal-daily-agenda');
  },

  copyDailyAgendaImage() {
    const cardEl = document.getElementById('daily-agenda-card-container');
    const btn = document.getElementById('btn-daily-copy-img');
    if (!cardEl) return;

    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Copiando...';

    html2canvas(cardEl, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#0b1120'
    }).then(canvas => {
      canvas.toBlob(blob => {
        if (!blob) {
          if (btn) btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Imagem';
          alert('Não foi possível gerar a imagem.');
          return;
        }

        if (navigator.clipboard && window.ClipboardItem) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(() => {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check" style="color:#4ade80;"></i> Imagem Copiada!';
            App.showToast('Imagem copiada! Basta pressionar Ctrl+V no WhatsApp para colar!');
            setTimeout(() => {
              if (btn) btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Imagem';
            }, 3500);
          }).catch(err => {
            console.warn('Clipboard write fallback to download:', err);
            App.downloadDailyAgendaImage();
            if (btn) btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Imagem';
            App.showToast('A imagem foi baixada para você anexar ao WhatsApp!');
          });
        } else {
          App.downloadDailyAgendaImage();
          if (btn) btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Imagem';
        }
      }, 'image/png');
    }).catch(err => {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Imagem';
      console.error(err);
      alert('Erro ao processar imagem: ' + err.message);
    });
  },

  downloadDailyAgendaImage() {
    const cardEl = document.getElementById('daily-agenda-card-container');
    const btn = document.getElementById('btn-daily-download-img');
    if (!cardEl) return;

    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';

    html2canvas(cardEl, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#0b1120'
    }).then(canvas => {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-download"></i> Baixar Imagem PNG';
      const link = document.createElement('a');
      const analystSlug = (this.activeDailyAgendaAnalyst?.name || 'analista').toLowerCase().replace(/\s+/g, '_');
      const dateStr = (this.activeDailyAgendaDate || 'hoje').replace(/-/g, '');
      link.download = `agenda_completa_${analystSlug}_${dateStr}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      App.showToast('Download da imagem PNG realizado com sucesso!');
    }).catch(err => {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-download"></i> Baixar Imagem PNG';
      console.error(err);
      alert('Erro ao gerar imagem: ' + err.message);
    });
  },

  sendDailyAgendaWhatsapp() {
    if (!this.activeDailyAgendaAnalyst) return;

    let phone = (this.activeDailyAgendaAnalyst.phone || '').replace(/\D/g, '');
    if (!phone) {
      alert('Este analista não possui número de WhatsApp cadastrado!');
      return;
    }

    if (phone.length <= 11 && !phone.startsWith('55')) {
      phone = '55' + phone;
    }

    const dateFormatted = this.activeDailyAgendaDate ? this.activeDailyAgendaDate.split('-').reverse().join('/') : '';
    const orders = this.activeDailyAgendaOrders || [];

    let message = `*CTC - AGENDAMENTO DIÁRIO - ${dateFormatted}*\n` +
      `👤 *Analista:* ${this.activeDailyAgendaAnalyst.name}\n` +
      `📋 *Total de Atendimentos:* ${orders.length}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    orders.forEach((ord, i) => {
      message += `📍 *${i + 1}º ATENDIMENTO*\n`;
      message += `🏫 *Escola:* ${ord.schoolName}\n`;
      message += `🔢 *CIE:* ${ord.schoolCie} | *Diretor(a):* ${ord.directorName || 'Coordenação'}\n`;
      message += `🔧 *Serviço:* ${(ord.subject || '').replace(/^Retorno:\s*/gi, '').trim()}\n`;
      if (ord.osNumber) message += `📄 *Nº O.S.:* ${ord.osNumber}\n`;
      if (ord.obs) message += `ℹ️ *Obs:* ${ord.obs}\n`;
      if (ord.completed) message += `✅ *Status:* Concluída\n`;
      message += `\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Por favor, siga a sequência indicada e confirme o término de cada atendimento._\n` +
      `_(A imagem do roteiro completo também foi gerada pelo sistema.)_`;

    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    window.open(url, '_blank');
  },

    populateAnalystYears() {
    const yearSelect = document.getElementById('filter-analyst-year');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const schedules = store.getSchedules();
    const yearsSet = new Set();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear - 2);

    schedules.forEach(s => {
      if (s.date && /^\d{4}/.test(s.date)) {
        const y = parseInt(s.date.substring(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    const prevVal = yearSelect.value || String(currentYear);

    yearSelect.innerHTML = sortedYears.map(y => `<option value="${y}" ${String(y) === String(prevVal) ? 'selected' : ''}>${y}</option>`).join('');
  },

  onAnalystPeriodChange() {
    const period = document.getElementById('filter-analyst-period')?.value || 'all';
    const monthGroup = document.getElementById('group-analyst-month');
    const yearGroup = document.getElementById('group-analyst-year');

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    if (period === 'all') {
      if (monthGroup) monthGroup.style.display = 'none';
      if (yearGroup) yearGroup.style.display = 'none';
    } else if (period === 'current_month') {
      if (monthGroup) monthGroup.style.display = 'none';
      if (yearGroup) yearGroup.style.display = 'none';
    } else if (period === 'custom_month') {
      if (monthGroup) {
        monthGroup.style.display = 'flex';
        const monthSelect = document.getElementById('filter-analyst-month');
        if (monthSelect && !monthSelect.value) monthSelect.value = currentMonth;
      }
      if (yearGroup) {
        yearGroup.style.display = 'flex';
        const yearSelect = document.getElementById('filter-analyst-year');
        if (yearSelect && !yearSelect.value) yearSelect.value = currentYear;
      }
    } else if (period === 'year') {
      if (monthGroup) monthGroup.style.display = 'none';
      if (yearGroup) {
        yearGroup.style.display = 'flex';
        const yearSelect = document.getElementById('filter-analyst-year');
        if (yearSelect && !yearSelect.value) yearSelect.value = currentYear;
      }
    }

    this.renderAnalystsTable();
  },

  renderAnalystsTable() {
    const tbody = document.getElementById('tbody-analysts');
    if (!tbody) return;

    this.populateAnalystYears();

    const analysts = store.getAnalysts();
    const schedules = store.getSchedules();

    if (analysts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum analista cadastrado.</td></tr>';
      return;
    }

    const period = document.getElementById('filter-analyst-period')?.value || 'all';
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());
    const monthNames = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };

    let periodLabel = '';
    let filterFn = (s) => true;

    if (period === 'all') {
      periodLabel = 'Desde o Início';
      filterFn = (s) => true;
    } else if (period === 'current_month') {
      const monthPrefix = `${currentYear}-${currentMonth}`;
      periodLabel = `Mês Atual (${monthNames[currentMonth]}/${currentYear})`;
      filterFn = (s) => s.date && s.date.startsWith(monthPrefix);
    } else if (period === 'custom_month') {
      const pickedMonth = document.getElementById('filter-analyst-month')?.value || currentMonth;
      const pickedYear = document.getElementById('filter-analyst-year')?.value || currentYear;
      const monthPrefix = `${pickedYear}-${pickedMonth}`;
      periodLabel = `${monthNames[pickedMonth] || pickedMonth}/${pickedYear}`;
      filterFn = (s) => s.date && s.date.startsWith(monthPrefix);
    } else if (period === 'year') {
      const pickedYear = document.getElementById('filter-analyst-year')?.value || currentYear;
      periodLabel = `Ano ${pickedYear}`;
      filterFn = (s) => s.date && s.date.startsWith(pickedYear);
    }

    // Atualiza cabeçalho da coluna "Concluídas"
    const thCompleted = document.getElementById('th-analysts-completed');
    if (thCompleted) {
      thCompleted.innerHTML = `Concluídas <span style="font-size:0.75rem; font-weight:500; color:#93c5fd; display:block;">(${periodLabel})</span>`;
    }

    let grandTotalCompleted = 0;
    let rows = '';

    analysts.forEach(a => {
      const completedCount = schedules.filter(s => s.analystId === a.id && s.completed && filterFn(s)).length;
      grandTotalCompleted += completedCount;

      const statusClass = a.status === 'ativo' ? 'status-completed' : 'status-pending';
      const statusLabel = a.status === 'ativo' ? 'Ativo' : 'Inativo';
      const startFmt = a.startDate ? a.startDate.split('-').reverse().join('/') : '-';

      let avatarHtml = '';
      if (a.avatar) {
        avatarHtml = `<img src="${a.avatar}" class="analyst-avatar-img" alt="${a.name}" onerror="this.outerHTML='<div class=\'analyst-avatar-fallback\' style=\'background:${a.color}\'>${a.name.charAt(0)}</div>'">`;
      } else {
        avatarHtml = `<div class="analyst-avatar-fallback" style="background:${a.color || '#3b82f6'};">${a.name.charAt(0)}</div>`;
      }

      const roleBadge = (a.role === 'Analista Pleno') 
        ? `<span style="font-size:0.75rem; font-weight:700; padding:4px 9px; border-radius:6px; background:rgba(139,92,246,0.18); color:#c4b5fd; border:1px solid rgba(139,92,246,0.35); white-space:nowrap;"><i class="fa-solid fa-award" style="margin-right:5px;"></i>Pleno</span>`
        : `<span style="font-size:0.75rem; font-weight:700; padding:4px 9px; border-radius:6px; background:rgba(56,189,248,0.18); color:#7dd3fc; border:1px solid rgba(56,189,248,0.35); white-space:nowrap;"><i class="fa-solid fa-user-check" style="margin-right:5px;"></i>Junior II</span>`;

      rows += `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              ${avatarHtml}
              <div>
                <strong style="color:#ffffff;">${a.name}</strong>
                <div style="font-size:0.72rem; color:var(--text-dim); margin-top:2px;">${a.role || 'Analista Junior II'}</div>
              </div>
            </div>
          </td>
          <td>${roleBadge}</td>
          <td>
            <a href="https://wa.me/55${(a.phone || '').replace(/\D/g, '')}" target="_blank" style="color:#4ade80; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
              <i class="fa-brands fa-whatsapp"></i> ${a.phone}
            </a>
          </td>
          <td>${a.neighborhood || '-'}</td>
          <td>${startFmt}</td>
          <td><span class="table-status-badge ${statusClass}">${statusLabel}</span></td>
          <td style="text-align:center;">
            <strong style="color:${completedCount > 0 ? '#60a5fa' : '#64748b'}; font-size:1.05rem;">${completedCount}</strong>
          </td>
          <td style="text-align: center;">
            <div class="action-buttons-group" style="justify-content: center;">
              ${(typeof AuthService !== 'undefined' && AuthService.isAdmin()) ? `
              <button class="btn-icon-action btn-edit" title="Editar Analista" onclick="App.openEditAnalystModal('${a.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-icon-action btn-delete" title="Excluir Analista" onclick="App.deleteAnalyst('${a.id}')">
                <i class="fa-solid fa-trash"></i>
              </button>` : `<span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-lock"></i> Somente Leitura</span>`}
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  openNewAnalystModal() {
    if (typeof AuthService !== 'undefined' && !AuthService.isAdmin()) { alert('Apenas o Administrador pode cadastrar analistas.'); return; }
    const form = document.getElementById('form-analyst');
    if (!form) return;
    form.reset();

    document.getElementById('analyst-id').value = '';
    document.getElementById('modal-analyst-title').textContent = 'Novo Analista';
    document.getElementById('analyst-start-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('analyst-status').value = 'ativo';
    const roleEl = document.getElementById('analyst-role'); if (roleEl) roleEl.value = '';

    this.openModal('modal-analyst');
  },

  openEditAnalystModal(id) {
    const a = store.getAnalystById(id);
    if (!a) return;

    document.getElementById('analyst-id').value = a.id;
    document.getElementById('modal-analyst-title').textContent = 'Editar Analista';
    document.getElementById('analyst-name').value = a.name;
    document.getElementById('analyst-phone').value = a.phone;
    document.getElementById('analyst-neighborhood').value = a.neighborhood;
    document.getElementById('analyst-start-date').value = a.startDate;
    document.getElementById('analyst-status').value = a.status;
    document.getElementById('analyst-avatar').value = a.avatar || '';
    const roleEl = document.getElementById('analyst-role'); if (roleEl) roleEl.value = a.role || '';

    this.openModal('modal-analyst');
  },

  saveAnalystForm(event) {
    event.preventDefault();

    const id = document.getElementById('analyst-id').value || ('analyst-' + Date.now());
    const name = document.getElementById('analyst-name').value.trim();
    const phone = document.getElementById('analyst-phone').value.trim();
    const neighborhood = document.getElementById('analyst-neighborhood').value.trim();
    const startDate = document.getElementById('analyst-start-date').value;
    const status = document.getElementById('analyst-status').value;
    const avatar = document.getElementById('analyst-avatar').value.trim();
    const role = document.getElementById('analyst-role') ? document.getElementById('analyst-role').value : '';

    if (!role) {
      this.showNotification('Por favor, selecione o Cargo / Nível do Analista.', 'warning');
      document.getElementById('analyst-role').focus();
      return;
    }

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#6366f1', '#14b8a6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const analystData = {
      id,
      name,
      role,
      phone,
      neighborhood,
      startDate,
      status,
      avatar,
      color: store.getAnalystById(id)?.color || randomColor
    };

    store.saveAnalyst(analystData);
    this.closeModal('modal-analyst');
    this.populateSelects();
    this.renderAnalystsTable();
    this.updateDashboard();
  },

  deleteAnalyst(id) {
    if (typeof AuthService !== 'undefined' && !AuthService.isAdmin()) { alert('Apenas o Administrador pode excluir analistas.'); return; }
    if (confirm('Tem certeza que deseja excluir este analista?')) {
      store.deleteAnalyst(id);
      this.populateSelects();
      this.renderAnalystsTable();
      this.updateDashboard();
    }
  },

  // =========================================================================
  // GESTÃO DE ESCOLAS
  // =========================================================================
  getTopSchools() {
    const schedules = store.getSchedules();
    const schools = store.getSchools();
    const schoolStats = {};

    // 1. Inicializa com escolas cadastradas
    schools.forEach(sc => {
      schoolStats[sc.cie] = {
        cie: sc.cie,
        name: sc.name,
        director: sc.director || 'Não informado',
        neighborhood: sc.neighborhood || '-',
        total: 0,
        completed: 0
      };
    });

    // 2. Contabiliza apenas agendamentos reais (ignora retornos/isReturnVisit)
    schedules.forEach(s => {
      if (s.isReturnVisit) return; // Retornos não contam como novo agendamento da escola
      const cie = s.schoolCie || 'SEM_CIE';
      if (!schoolStats[cie]) {
        schoolStats[cie] = {
          cie: s.schoolCie || '-',
          name: s.schoolName || 'Escola não cadastrada',
          director: s.directorName || 'Não informado',
          neighborhood: '-',
          total: 0,
          completed: 0
        };
      }
      schoolStats[cie].total += 1;
      if (s.completed) {
        schoolStats[cie].completed += 1;
      }
    });

    // 3. Ordena decrescente pelo total de agendamentos
    return Object.values(schoolStats).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.completed - a.completed;
    });
  },

  buildPodiumCardsHtml(rankingList) {
    if (!rankingList || rankingList.length < 3) {
      return '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem; grid-column:1/-1;">Necessário ao menos 3 escolas para compor o Top 3.</div>';
    }

    const first = rankingList[0];
    const second = rankingList[1];
    const third = rankingList[2];

    return `
      <!-- 2º LUGAR: PRATA -->
      <div class="podium-card podium-silver">
        <div class="podium-medal-icon">🥈</div>
        <div class="podium-badge medal-badge-silver"><i class="fa-solid fa-medal"></i> 2º Lugar • Prata</div>
        <div class="podium-school-name" title="${second.name}">${second.name}</div>
        <div class="podium-school-meta">CIE: ${second.cie} &bull; ${second.neighborhood}</div>
        <div class="podium-count-box">
          <span class="podium-count-num">${second.total}</span>
          <span class="podium-count-label">Agendamentos</span>
        </div>
      </div>

      <!-- 1º LUGAR: OURO (DESTAQUE CENTRAL) -->
      <div class="podium-card podium-gold">
        <div class="podium-crown"><i class="fa-solid fa-crown"></i></div>
        <div class="podium-medal-icon">🥇</div>
        <div class="podium-badge medal-badge-gold"><i class="fa-solid fa-medal"></i> 1º Lugar • Ouro</div>
        <div class="podium-school-name" title="${first.name}">${first.name}</div>
        <div class="podium-school-meta">CIE: ${first.cie} &bull; ${first.neighborhood}</div>
        <div class="podium-count-box">
          <span class="podium-count-num">${first.total}</span>
          <span class="podium-count-label">Agendamentos</span>
        </div>
      </div>

      <!-- 3º LUGAR: BRONZE -->
      <div class="podium-card podium-bronze">
        <div class="podium-medal-icon">🥉</div>
        <div class="podium-badge medal-badge-bronze"><i class="fa-solid fa-medal"></i> 3º Lugar • Bronze</div>
        <div class="podium-school-name" title="${third.name}">${third.name}</div>
        <div class="podium-school-meta">CIE: ${third.cie} &bull; ${third.neighborhood}</div>
        <div class="podium-count-box">
          <span class="podium-count-num">${third.total}</span>
          <span class="podium-count-label">Agendamentos</span>
        </div>
      </div>
    `;
  },

  renderDashboardTopSchools() {
    const listEl = document.getElementById('dash-ranking-list-container') || document.getElementById('dash-ranking-podium-container');
    if (!listEl) return;
    const rankingList = this.getTopSchools();
    const top5 = rankingList.slice(0, 5);

    if (top5.length === 0) {
      listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">Nenhuma escola visitada ainda.</div>';
      return;
    }

    const medalsConfig = [
      { class: 'rank-gold', badgeClass: 'badge-gold', pos: '1º', icon: 'fa-medal', hasCrown: true },
      { class: 'rank-silver', badgeClass: 'badge-silver', pos: '2º', icon: 'fa-medal', hasCrown: false },
      { class: 'rank-bronze', badgeClass: 'badge-bronze', pos: '3º', icon: 'fa-medal', hasCrown: false },
      { class: 'rank-fourth', badgeClass: 'badge-fourth', pos: '4º', icon: 'fa-award', hasCrown: false },
      { class: 'rank-fifth', badgeClass: 'badge-fifth', pos: '5º', icon: 'fa-award', hasCrown: false }
    ];

    let html = '';
    top5.forEach((item, idx) => {
      const cfg = medalsConfig[idx] || medalsConfig[4];
      const safeName = (item.name || '').replace(/"/g, '&quot;');
      const crownHtml = cfg.hasCrown ? '<div class="dash-rank-crown-wrap"><i class="fa-solid fa-crown rank-crown-icon"></i></div>' : '';

      html += `
        <div class="dash-rank-item ${cfg.class}">
          <div class="dash-rank-medal">
            ${crownHtml}
            <div class="dash-rank-badge ${cfg.badgeClass}">
              <i class="fa-solid ${cfg.icon}"></i>
              <span>${cfg.pos}</span>
            </div>
          </div>
          <div class="dash-rank-info">
            <div class="dash-rank-name" title="${safeName}">${safeName}</div>
            <div class="dash-rank-meta">CIE: ${item.cie || '-'} • ${item.neighborhood || ''}</div>
          </div>
          <div class="dash-rank-val">
            <span class="dash-rank-num">${item.total}</span>
            <span class="dash-rank-lbl">visitas</span>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  },

  renderDashboardQueue() {
    const listEl = document.getElementById('dash-queue-items-container');
    const badgeEl = document.getElementById('dash-queue-badge');
    if (!listEl) return;

    const queue = store.getQueue();
    if (badgeEl) {
      badgeEl.textContent = `${queue.length}`;
      badgeEl.title = `${queue.length} chamado(s) na fila`;
    }

    if (queue.length === 0) {
      listEl.innerHTML = `
        <div class="dash-queue-empty">
          <i class="fa-solid fa-clipboard-check"></i>
          <p>Nenhum chamado pendente</p>
          <button class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; margin-top:2px;" onclick="App.navigateTo('filas-visita')">
            <i class="fa-solid fa-plus"></i> Abrir Fila
          </button>
        </div>
      `;
      return;
    }

    // Ordenação FIFO com precedência de urgentes
    const getTimestamp = (q) => {
      if (q.urgentAt) return q.urgentAt;
      if (q.createdAt) {
        if (typeof q.createdAt === 'number') return q.createdAt;
        const parsed = Date.parse(q.createdAt);
        if (!isNaN(parsed)) return parsed;
      }
      return 0;
    };

    const sortedQueue = [...queue].sort((a, b) => {
      const aUrgent = (a.priority === 'urgente');
      const bUrgent = (b.priority === 'urgente');
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return getTimestamp(a) - getTimestamp(b);
    });

    // Pega até os 3 primeiros chamados para manter proporção perfeita com os 3 itens do Top 3
    const topQueue = sortedQueue.slice(0, 4);

    let html = '';
    topQueue.forEach(item => {
      const isUrgent = (item.priority === 'urgente');
      const safeSchoolName = (item.schoolName || '').replace(/"/g, '&quot;');
      const safeSubject = (item.subject || 'Chamado').replace(/"/g, '&quot;');

      let catIcon = 'fa-screwdriver-wrench';
      let catLabel = 'Manutenção';
      if (item.category === 'conectividade') {
        catIcon = 'fa-wifi';
        catLabel = 'Conectividade';
      } else if (item.category === 'inventario') {
        catIcon = 'fa-boxes-stacked';
        catLabel = 'Inventário';
      }

      let dateFmt = '';
      if (item.dateAdded) {
        const parts = item.dateAdded.split('-');
        if (parts.length === 3) dateFmt = `${parts[2]}/${parts[1]}`;
      }
      if (!dateFmt) dateFmt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      html += `
        <div class="dash-queue-item ${isUrgent ? 'is-urgent' : ''}" onclick="App.navigateTo('filas-visita')" title="Clique para gerenciar na Fila de Chamados">
          <div class="dash-queue-item-top">
            <span class="dash-queue-badge ${isUrgent ? 'badge-urgent' : 'badge-normal'}">
              ${isUrgent ? '🚨 Urgente' : 'Normal'}
            </span>
            <span class="dash-queue-cat-tag cat-${item.category}">
              <i class="fa-solid ${catIcon}"></i> ${catLabel}
            </span>
          </div>
          <div class="dash-queue-school-name">${safeSchoolName}</div>
          <div class="dash-queue-item-footer">
            <span class="dash-queue-subject" title="${safeSubject}"><i class="fa-regular fa-file-lines"></i> ${safeSubject}</span>
            <span class="dash-queue-date"><i class="fa-regular fa-clock"></i> ${dateFmt}</span>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  },

  renderSchoolsRanking() {
    const tbody = document.getElementById('tbody-ranking-schools');
    const podiumEl = document.getElementById('ranking-podium-container');
    if (!tbody) return;

    const rankingList = this.getTopSchools();
    const search = (document.getElementById('input-search-ranking-school')?.value || '').toLowerCase().trim();

    // 4. Renderiza o pódio com os 3 primeiros (Ouro, Prata e Bronze)
    if (podiumEl) {
      podiumEl.innerHTML = this.buildPodiumCardsHtml(rankingList);
    }

    // 5. Filtro da tabela (o Top 3 já está destacado no pódio acima e não repete na lista)
    const hasPodium = podiumEl && rankingList.length >= 3;
    const tableBaseList = hasPodium ? rankingList.slice(3) : rankingList;

    const filteredTableList = tableBaseList.filter(item => {
      if (!search) return true;
      return item.name.toLowerCase().includes(search) || item.cie.toLowerCase().includes(search) || item.neighborhood.toLowerCase().includes(search);
    });

    if (filteredTableList.length === 0) {
      const msg = hasPodium ? 'Nenhuma outra escola encontrada no ranking.' : 'Nenhuma escola encontrada no ranking.';
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">${msg}</td></tr>`;
      return;
    }

    // 6. Linhas da tabela a partir do 4º lugar
    let rows = '';
    filteredTableList.forEach((item) => {
      const rankIndex = rankingList.indexOf(item) + 1;
      let positionHtml = '';
      let rowHighlightClass = '';

      if (rankIndex === 1) {
        positionHtml = '<span class="medal-badge medal-badge-gold"><i class="fa-solid fa-medal"></i> 🥇 1º Ouro</span>';
        rowHighlightClass = 'ranking-row-gold';
      } else if (rankIndex === 2) {
        positionHtml = '<span class="medal-badge medal-badge-silver"><i class="fa-solid fa-medal"></i> 🥈 2º Prata</span>';
        rowHighlightClass = 'ranking-row-silver';
      } else if (rankIndex === 3) {
        positionHtml = '<span class="medal-badge medal-badge-bronze"><i class="fa-solid fa-medal"></i> 🥉 3º Bronze</span>';
        rowHighlightClass = 'ranking-row-bronze';
      } else {
        positionHtml = `<span class="ranking-position-num">${rankIndex}º</span>`;
      }

      rows += `
        <tr class="${rowHighlightClass}">
          <td style="text-align: center;">${positionHtml}</td>
          <td>
            <strong style="color:#ffffff; font-size:0.92rem;">${item.name}</strong>
          </td>
          <td><span style="color:#60a5fa; font-weight:700;">${item.cie}</span></td>
          <td>${item.director}</td>
          <td>${item.neighborhood}</td>
          <td style="text-align: center;">
            <span class="ranking-total-badge">${item.total}</span>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  renderSchoolsTable() {
    const tbody = document.getElementById('tbody-schools');
    if (!tbody) return;

    const schools = store.getSchools();
    const search = (document.getElementById('input-search-school')?.value || '').toLowerCase().trim();

    // Ordenar escolas em ordem alfabética de A a Z
    schools.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

    const filtered = schools.filter(s => {
      if (!search) return true;
      return s.cie.toLowerCase().includes(search) || s.name.toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhuma escola encontrada.</td></tr>';
      return;
    }

    let rows = '';
    filtered.forEach(s => {
      rows += `
        <tr>
          <td><strong style="color:#60a5fa;">${s.cie}</strong></td>
          <td><span style="font-weight:600; color:#ffffff;">${s.name}</span></td>
          <td>${s.director || '-'}</td>
          <td>${s.phone || '-'}</td>
          <td>${s.neighborhood || '-'}</td>
          <td style="text-align: center;">
            <div class="action-buttons-group" style="justify-content: center;">
              ${(typeof AuthService !== 'undefined' && AuthService.isAdmin()) ? `
              <button class="btn-icon-action btn-edit" title="Editar Escola" onclick="App.openEditSchoolModal('${s.cie}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-icon-action btn-delete" title="Excluir Escola" onclick="App.deleteSchool('${s.cie}')">
                <i class="fa-solid fa-trash"></i>
              </button>` : `<span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-lock"></i> Somente Leitura</span>`}
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  openNewSchoolModal() {
    if (typeof AuthService !== 'undefined' && !AuthService.isAdmin()) { alert('Apenas o Administrador pode cadastrar escolas.'); return; }
    const form = document.getElementById('form-school');
    if (!form) return;
    form.reset();

    document.getElementById('school-original-cie').value = '';
    document.getElementById('modal-school-title').textContent = 'Nova Escola';
    this.openModal('modal-school');
  },

  openEditSchoolModal(cie) {
    const s = store.getSchoolByCie(cie);
    if (!s) return;

    document.getElementById('school-original-cie').value = s.cie;
    document.getElementById('modal-school-title').textContent = 'Editar Escola';
    document.getElementById('school-cie').value = s.cie;
    document.getElementById('school-name').value = s.name;
    document.getElementById('school-director').value = s.director;
    document.getElementById('school-phone').value = s.phone || '';
    document.getElementById('school-neighborhood').value = s.neighborhood || '';

    this.openModal('modal-school');
  },

  saveSchoolForm(event) {
    event.preventDefault();

    const originalCie = document.getElementById('school-original-cie').value;
    const cie = document.getElementById('school-cie').value.trim();
    const name = document.getElementById('school-name').value.trim();
    const director = document.getElementById('school-director').value.trim();
    const phone = document.getElementById('school-phone').value.trim();
    const neighborhood = document.getElementById('school-neighborhood').value.trim();

    if (originalCie && originalCie !== cie) {
      store.deleteSchool(originalCie);
    }

    store.saveSchool({ cie, name, director, phone, neighborhood });
    this.closeModal('modal-school');
    this.renderSchoolsTable();
  },

  deleteSchool(cie) {
    if (typeof AuthService !== 'undefined' && !AuthService.isAdmin()) { alert('Apenas o Administrador pode excluir escolas.'); return; }
    if (confirm(`Tem certeza que deseja excluir a escola com CIE ${cie}?`)) {
      store.deleteSchool(cie);
      this.renderSchoolsTable();
    }
  },

  // =========================================================================
  // RELATÓRIOS E EXPORTAÇÃO
  // =========================================================================
  onReportPresetChange() {
    const preset = document.getElementById('report-period-preset').value;
    const customGroup = document.getElementById('group-custom-dates');
    if (preset === 'custom') {
      customGroup.style.display = 'flex';
    } else {
      customGroup.style.display = 'none';
    }
    this.generateReport();
  },

  generateReport() {
    const preset = document.getElementById('report-period-preset')?.value || 'month';
    const analystFilter = document.getElementById('report-filter-analyst')?.value || 'all';
    const typeFilter = document.getElementById('report-filter-type')?.value || 'all';
    
    const schedules = store.getSchedules();
    const analysts = store.getAnalysts();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Calcula intervalo de datas do preset
    let startDate = '';
    let endDate = '';
    let periodDesc = '';

    if (preset === 'month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      startDate = new Date(y, m, 1).toISOString().split('T')[0];
      endDate = new Date(y, m + 1, 0).toISOString().split('T')[0];
      periodDesc = `Mês Atual (${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`;
    } else if (preset === 'day') {
      startDate = todayStr;
      endDate = todayStr;
      periodDesc = `Dia Atual (${todayStr.split('-').reverse().join('/')})`;
    } else if (preset === 'week') {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
      periodDesc = `Semana Atual (${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')})`;
    } else if (preset === 'year') {
      const y = now.getFullYear();
      startDate = `${y}-01-01`;
      endDate = `${y}-12-31`;
      periodDesc = `Ano de ${y}`;
    } else if (preset === 'custom') {
      startDate = document.getElementById('report-date-start')?.value || '2000-01-01';
      endDate = document.getElementById('report-date-end')?.value || '2099-12-31';
      periodDesc = `Período Personalizado (${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')})`;
    } else {
      startDate = '2000-01-01';
      endDate = '2099-12-31';
      periodDesc = 'Total Geral (Histórico Completo)';
    }

    // Filtra dados
    const filtered = schedules.filter(s => {
      if (s.date < startDate || s.date > endDate) return false;
      if (analystFilter !== 'all' && s.analystId !== analystFilter) return false;
      if (typeFilter !== 'all' && s.serviceType !== typeFilter) return false;
      return true;
    });

    const completedList = filtered.filter(s => s.completed);
    const countCompleted = completedList.length;
    const countManut = completedList.filter(s => (s.serviceType === 'manutencao' || s.serviceType === 'chamado_interno')).length;
    const countInv = completedList.filter(s => s.serviceType === 'inventario').length;
    const countReturns = filtered.filter(s => s.needsReturn).length;

    // Atualiza cards de métricas do relatório
    document.getElementById('report-metric-completed').textContent = countCompleted;
    document.getElementById('report-metric-manut').textContent = countManut;
    document.getElementById('report-metric-inv').textContent = countInv;
    const returnsEl = document.getElementById('report-metric-returns'); if (returnsEl) returnsEl.textContent = countReturns;

    const descEl = document.getElementById('report-header-period-desc');
    const analystName = analystFilter === 'all' ? 'Todos os Analistas' : (store.getAnalystById(analystFilter)?.name || 'Analista');
    if (descEl) descEl.textContent = `Período: ${periodDesc} | Filtro: ${analystName}`;

    const genTimeEl = document.getElementById('report-header-generated-time');
    if (genTimeEl) genTimeEl.textContent = `Emissão: ${new Date().toLocaleString('pt-BR')}`;

    // Guarda dados filtrados para uso eventual na exportação de PDF
    this.currentReportFiltered = filtered;
    this.currentReportAnalysts = analysts;

    // Garante estrutura da tabela contínua padrão sem divisão na tela
    const tableWrapper = document.getElementById('report-table-wrapper');
    if (tableWrapper && !document.getElementById('report-table-body')) {
      tableWrapper.innerHTML = `
        <table class="custom-table" id="report-print-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>O.S.</th>
              <th>Analista</th>
              <th>Escola</th>
              <th>CIE</th>
              <th>Assunto</th>
            </tr>
          </thead>
          <tbody id="report-table-body"></tbody>
        </table>
      `;
    }

    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhuma ordem encontrada para os filtros selecionados.</td></tr>';
      return;
    }

    // Preenche tabela única 100% contínua na tela
    let rows = '';
    filtered.forEach(item => {
      const analyst = analysts.find(a => a.id === item.analystId) || { name: 'Analista' };
      const dateFmt = item.date.split('-').reverse().join('/');

      rows += `
        <tr>
          <td>${dateFmt}</td>
          <td><strong style="color:#ffffff;">${item.osNumber || '-'}</strong></td>
          <td>${analyst.name}</td>
          <td>${item.schoolName}</td>
          <td>${item.schoolCie}</td>
          <td>${item.subject}</td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  },

  printReport() {
    window.print();
  },

  async exportReportPDF() {
    const btn = document.getElementById('btn-export-pdf') || document.querySelector('button[onclick="App.exportReportPDF()"]');
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando PDF...';
      btn.disabled = true;
    }

    const element = document.getElementById('report-print-container');
    const tableWrapper = document.getElementById('report-table-wrapper');
    if (!element || !tableWrapper) {
      if (btn) { btn.innerHTML = originalContent; btn.disabled = false; }
      return;
    }

    // Salva o HTML contínuo da tela para restaurar imediatamente após o PDF
    const originalWrapperHtml = tableWrapper.innerHTML;

    try {
      const filtered = this.currentReportFiltered || [];
      const analysts = this.currentReportAnalysts || store.getAnalysts();

      // Monta paginação temporária inteligente somente para o arquivo PDF
      if (filtered.length > 12) {
        const P1_LIMIT = 12;
        const OTHER_LIMIT = 18;

        const pages = [];
        pages.push(filtered.slice(0, P1_LIMIT));
        let remainder = filtered.slice(P1_LIMIT);
        while (remainder.length > 0) {
          pages.push(remainder.slice(0, OTHER_LIMIT));
          remainder = remainder.slice(OTHER_LIMIT);
        }

        const totalPages = pages.length;
        let tablesHtml = '';
        const theadHtml = `
          <thead>
            <tr>
              <th>Data</th>
              <th>O.S.</th>
              <th>Analista</th>
              <th>Escola</th>
              <th>CIE</th>
              <th>Assunto</th>
            </tr>
          </thead>
        `;

        pages.forEach((pageItems, pageIdx) => {
          let rows = '';
          pageItems.forEach(item => {
            const analyst = analysts.find(a => a.id === item.analystId) || { name: 'Analista' };
            const dateFmt = item.date.split('-').reverse().join('/');
            rows += `
              <tr>
                <td>${dateFmt}</td>
                <td><strong style="color:#ffffff;">${item.osNumber || '-'}</strong></td>
                <td>${analyst.name}</td>
                <td>${item.schoolName}</td>
                <td>${item.schoolCie}</td>
                <td>${item.subject}</td>
              </tr>
            `;
          });

          if (pageIdx === 0) {
            tablesHtml += `
              <table class="custom-table" id="report-print-table">
                ${theadHtml}
                <tbody>${rows}</tbody>
              </table>
            `;
          } else {
            tablesHtml += `
              <div class="html2pdf__page-break" style="page-break-after: always; break-after: page; height: 16px; margin-top: 14px;"></div>
              <div class="report-continuation-header" style="display:flex; justify-content:space-between; align-items:center; margin: 14px 0 8px 0; padding-bottom: 6px; border-bottom: 1px solid #23314f;">
                <span style="font-size: 0.85rem; font-weight: 700; color: #60a5fa;">RELATÓRIO GERENCIAL DE ORDENS CONCLUÍDAS <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">(Continuação)</span></span>
                <span style="font-size: 0.75rem; color: #94a3b8;">Página ${pageIdx + 1} de ${totalPages}</span>
              </div>
              <table class="custom-table">
                ${theadHtml}
                <tbody>${rows}</tbody>
              </table>
            `;
          }
        });

        tableWrapper.innerHTML = tablesHtml;
      }

      const opt = {
        margin: 10,
        filename: `Relatorio_OS_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#0f172a'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();

    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      // Restaura imediatamente a visualização 100% contínua da tela
      tableWrapper.innerHTML = originalWrapperHtml;
      if (btn) {
        btn.innerHTML = originalContent;
        btn.disabled = false;
      }
    }
  },


  // =========================================================================
  // GESTÃO DE TEMAS (5 TONALIDADES EM DEGRADÊ) E CONFIGURAÇÕES
  // =========================================================================
  initTheme() {
    try {
      const savedTheme = localStorage.getItem('sg_selected_theme') || 'theme-1';
      this.applyTheme(savedTheme, false);
    } catch(e) {
      console.error('Erro ao inicializar tema:', e);
    }
  },

  applyTheme(themeName, showToast = true) {
    try {
      document.documentElement.setAttribute('data-theme', themeName);
      localStorage.setItem('sg_selected_theme', themeName);

      // Atualiza classes ativas nos cartões de tema se existirem
      document.querySelectorAll('.theme-card-option').forEach(el => {
        if (el.dataset.theme === themeName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      if (showToast && typeof App !== 'undefined' && App.showToast) {
        const names = {
          'theme-1': '1. Escuro Slate (Original)',
          'theme-2': '2. Marinho Suave (25% claro)',
          'theme-3': '3. Crepúsculo (50% médio)',
          'theme-4': '4. Cinza Metálico',
          'theme-5': '5. Branco Suave (Off-White Gelo)'
        };
        App.showToast(`Tema alterado: ${names[themeName] || themeName}`);
      }
    } catch(e) {
      console.error('Erro ao aplicar tema:', e);
    }
  },

  initSettingsView() {
    try {
      // 1. Marca o tema ativo nas opções
      const currentTheme = localStorage.getItem('sg_selected_theme') || 'theme-1';
      document.querySelectorAll('.theme-card-option').forEach(el => {
        if (el.dataset.theme === currentTheme) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      // 2. Preenche o modelo de mensagem do WhatsApp
      const textarea = document.getElementById('textarea-wa-template');
      if (textarea && typeof store !== 'undefined' && store.getWhatsappTemplate) {
        textarea.value = store.getWhatsappTemplate();
        this.updateWhatsappTemplatePreview();
      }
    } catch(e) {
      console.error('Erro em initSettingsView:', e);
    }
  },

  insertMsgVariable(variableTag) {
    const textarea = document.getElementById('textarea-wa-template');
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = textarea.value.substring(0, startPos);
    const textAfter = textarea.value.substring(endPos, textarea.value.length);

    textarea.value = textBefore + variableTag + textAfter;
    textarea.selectionStart = textarea.selectionEnd = startPos + variableTag.length;
    textarea.focus();

    this.updateWhatsappTemplatePreview();
  },

  updateWhatsappTemplatePreview() {
    const textarea = document.getElementById('textarea-wa-template');
    const previewBox = document.getElementById('wa-template-preview-box');
    if (!textarea || !previewBox) return;

    const template = textarea.value;
    const exampleDate = new Date().toLocaleDateString('pt-BR');
    
    let rendered = template
      .replace(/\{analista\}/gi, 'Carlos Eduardo')
      .replace(/\{os\}/gi, 'OS-2026-1042')
      .replace(/\{data\}/gi, exampleDate)
      .replace(/\{escola\}/gi, 'E.E. Professor João Batista')
      .replace(/\{cie\}/gi, '012345')
      .replace(/\{diretor\}/gi, 'Marcos Vinicius')
      .replace(/\{assunto\}/gi, 'Manutenção de Computadores')
      .replace(/\{obs\}/gi, 'Verificar fonte e trocar HD');

    previewBox.textContent = rendered;
  },

  saveWhatsappTemplate() {
    const textarea = document.getElementById('textarea-wa-template');
    if (!textarea) return;

    const val = textarea.value.trim();
    if (!val) {
      alert('O modelo de mensagem não pode ficar vazio.');
      return;
    }

    if (typeof store !== 'undefined' && store.setWhatsappTemplate) {
      store.setWhatsappTemplate(val);
    }
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast('Modelo de mensagem do WhatsApp salvo com sucesso!');
    } else {
      alert('Modelo de mensagem do WhatsApp salvo com sucesso!');
    }
  },

  resetWhatsappTemplateToDefault() {
    if (confirm('Deseja restaurar o modelo padrão original de mensagem do WhatsApp?')) {
      if (typeof store !== 'undefined' && store.getDefaultWhatsappTemplate) {
        const defaultTpl = store.getDefaultWhatsappTemplate();
        store.setWhatsappTemplate(defaultTpl);
        const textarea = document.getElementById('textarea-wa-template');
        if (textarea) {
          textarea.value = defaultTpl;
          this.updateWhatsappTemplatePreview();
        }
      }
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('Modelo padrão original restaurado!');
      }
    }
  },

  // =========================================================================
  // BACKUP E RESTAURAÇÃO
  // =========================================================================
  exportBackupJSON() {
    const data = {
      analysts: store.getAnalysts(),
      schools: store.getSchools(),
      schedules: store.getSchedules(),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sg_analistas_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (json.analysts && json.schools && json.schedules) {
          store.setAnalysts(json.analysts);
          store.setSchools(json.schools);
          store.setSchedules(json.schedules);
          alert('Backup restaurado com sucesso!');
          location.reload();
        } else {
          alert('Arquivo JSON inválido.');
        }
      } catch (err) {
        alert('Erro ao processar JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  resetToDefaultData() {
    if (confirm('Deseja restaurar os dados de demonstração originais com os 8 analistas e 342 ordens no mês? Todos os dados customizados serão redefinidos.')) {
      store.resetToDefault();
      alert('Dados de demonstração restaurados com sucesso!');
      location.reload();
    }
  },


  // =========================================================================
  // GESTÃO DA FILA DE CHAMADOS (MANUTENÇÃO, CONECTIVIDADE, INVENTÁRIO)
  // =========================================================================

  renderQueueView() {
    const queue = store.getQueue();
    
    // Ordenação: 
    // 1. Escolas Urgentes sempre no topo.
    //    Se houver mais de uma Urgente na mesma coluna, mantém em primeiro a primeira escola que foi colocada como Urgente (FIFO entre urgentes).
    // 2. As demais escolas entram embaixo, respeitando a ordem cronológica em que foram adicionadas.
    const sortQueueItems = (items) => {
      const getTimestamp = (q) => {
        if (q.createdAt) return Number(q.createdAt);
        const m = String(q.id).match(/queue_(\d+)/);
        if (m) return Number(m[1]);
        return 0;
      };

      const getUrgentTimestamp = (q) => {
        if (q.urgentSince) return Number(q.urgentSince);
        return getTimestamp(q);
      };

      const urgentes = items.filter(q => q.priority === 'urgente')
                            .sort((a, b) => getUrgentTimestamp(a) - getUrgentTimestamp(b));

      const normais = items.filter(q => q.priority !== 'urgente')
                           .sort((a, b) => getTimestamp(a) - getTimestamp(b));

      return [...urgentes, ...normais];
    };

    // Categorias
    const manutencaoList = sortQueueItems(queue.filter(q => q.category === 'manutencao'));
    const conectividadeList = sortQueueItems(queue.filter(q => q.category === 'conectividade'));
    const inventarioList = sortQueueItems(queue.filter(q => q.category === 'inventario'));

    // Atualiza badges e contadores do cabeçalho
    const totalCount = queue.length;
    const headerBadge = document.getElementById('queue-header-total-badge');
    if (headerBadge) {
      headerBadge.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${totalCount} na Fila`;
    }

    const statTotal = document.getElementById('queue-stat-total');
    if (statTotal) statTotal.textContent = totalCount;

    const statManut = document.getElementById('queue-stat-manutencao');
    if (statManut) statManut.textContent = manutencaoList.length;

    const statConect = document.getElementById('queue-stat-conectividade');
    if (statConect) statConect.textContent = conectividadeList.length;

    const statInv = document.getElementById('queue-stat-inventario');
    if (statInv) statInv.textContent = inventarioList.length;

    // Contadores das colunas
    const countManut = document.getElementById('queue-count-manutencao');
    if (countManut) countManut.textContent = manutencaoList.length;

    const countConect = document.getElementById('queue-count-conectividade');
    if (countConect) countConect.textContent = conectividadeList.length;

    const countInv = document.getElementById('queue-count-inventario');
    if (countInv) countInv.textContent = inventarioList.length;

    // Renderiza cada coluna
    this.renderQueueColumnList('queue-list-manutencao', manutencaoList, 'manutencao', 'Manutenção');
    this.renderQueueColumnList('queue-list-conectividade', conectividadeList, 'conectividade', 'Conectividade');
    this.renderQueueColumnList('queue-list-inventario', inventarioList, 'inventario', 'Inventário');
  },

  renderQueueColumnList(containerId, list, categoryKey, categoryLabel) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="queue-empty-box">
          <i class="fa-solid fa-inbox"></i>
          <div>Nenhuma escola na fila de ${categoryLabel}</div>
          <button type="button" class="btn-secondary" style="font-size:0.75rem; padding:5px 10px; margin-top:4px;" onclick="App.openNewQueueModal('${categoryKey}')">
            <i class="fa-solid fa-plus"></i> Adicionar Escola
          </button>
        </div>
      `;
      return;
    }

    let html = '';
    list.forEach(item => {
      html += this.buildQueueCardHtml(item);
    });

    // Botão rápido no rodapé da coluna para adicionar mais uma
    html += `
      <button class="btn-secondary" style="width:100%; font-size:0.78rem; padding:8px; justify-content:center; margin-top:4px;" onclick="App.openNewQueueModal('${categoryKey}')">
        <i class="fa-solid fa-plus"></i> Adicionar à Fila de ${categoryLabel}
      </button>
    `;

    container.innerHTML = html;
  },

  buildQueueCardHtml(item) {
    const priorityClass = item.priority === 'urgente' ? 'priority-urgente' : 'priority-normal';
    const priorityLabel = item.priority === 'urgente' ? '🚨 Urgente' : 'Normal';
    
    // Formatação de data
    let dateFmt = '';
    if (item.dateAdded) {
      const parts = item.dateAdded.split('-');
      if (parts.length === 3) dateFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (!dateFmt) dateFmt = new Date().toLocaleDateString('pt-BR');

    // Ícone de acordo com a categoria
    let catIcon = 'fa-screwdriver-wrench';
    if (item.category === 'conectividade') catIcon = 'fa-wifi';
    if (item.category === 'inventario') catIcon = 'fa-boxes-stacked';

    const safeSchoolName = (item.schoolName || '').replace(/"/g, '&quot;');
    const safeSubject = (item.subject || '').replace(/"/g, '&quot;');
    const safeObs = (item.obs || '').replace(/"/g, '&quot;');
    const osNumber = item.osNumber || 'STI-26/81619';

    return `
      <div class="queue-order-box" id="queue-box-${item.id}">
        
        <!-- Barra de Metadados: Prioridade e Data da Solicitação -->
        <div class="queue-top-meta">
          <span class="queue-priority-tag ${priorityClass}">${priorityLabel}</span>
          <span style="font-size:0.72rem; color:var(--text-dim);" title="Data de solicitação">
            <i class="fa-regular fa-clock"></i> ${dateFmt}
          </span>
        </div>

        <!-- Cabeçalho do Card: Nome da Escola, CIE e Diretor -->
        <div class="card-order-header" style="margin-top:2px;">
          <div>
            <div class="card-school-name">
              <span>${safeSchoolName}</span>
            </div>
            <div class="card-school-cie">CIE: ${item.schoolCie} | Diretor(a): ${item.directorName || 'Coordenação'}</div>
          </div>
        </div>

        <!-- Assunto -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <span class="card-subject-badge"><i class="fa-solid ${catIcon}"></i> ${safeSubject}</span>
        </div>

        <!-- Observações da solicitação -->
        ${item.obs ? `<div class="card-obs-text"><i class="fa-solid fa-circle-info" style="color:#60a5fa;"></i> ${item.obs}</div>` : ''}

        <!-- Linha de Ações: Adicionar à Agenda, Editar e Excluir -->
        <div class="card-actions-row" style="margin-top:6px; display:flex; align-items:center; gap:8px;">
          
          <button type="button" class="btn-queue-dispatch" onclick="App.openDispatchQueueModal('${item.id}')" title="Alocar esta solicitação diretamente na agenda de um analista">
            <i class="fa-solid fa-calendar-plus"></i> Adicionar à Agenda
          </button>

          <button type="button" class="btn-icon-action btn-edit" title="Editar solicitação da fila" onclick="App.openEditQueueModal('${item.id}')">
            <i class="fa-solid fa-pen"></i>
          </button>

          <button type="button" class="btn-icon-action btn-delete" title="Excluir da fila" onclick="App.deleteQueueItemConfirm('${item.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>

        </div>

      </div>
    `;
  },

  openNewQueueModal(defaultCategory = 'manutencao') {
    const form = document.getElementById('form-queue-item');
    if (form) form.reset();

    document.getElementById('queue-item-id').value = '';
    const resCie = document.getElementById('queue-results-cie');
    if (resCie) resCie.classList.remove('active');
    const cieIn = document.getElementById('queue-school-cie');
    if (cieIn) cieIn.value = '';
    const dirIn = document.getElementById('queue-director');
    if (dirIn) dirIn.value = '';
    
    const titleEl = document.getElementById('modal-queue-title');
    if (titleEl) {
      titleEl.innerHTML = '<i class="fa-solid fa-layer-group" style="color:var(--primary);"></i> Nova Solicitação na Fila';
    }

    // Popula select de escolas
    const schoolSelect = document.getElementById('queue-school-select');
    if (schoolSelect) {
      const schools = store.getSchools().slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      let optHtml = '<option value="">Selecione uma escola...</option>';
      schools.forEach(s => {
        optHtml += `<option value="${s.cie}">${s.name} (CIE: ${s.cie})</option>`;
      });
      schoolSelect.innerHTML = optHtml;
    }

    // Define categoria
    const catSelect = document.getElementById('queue-category');
    if (catSelect) {
      catSelect.value = defaultCategory || 'manutencao';
    }



    // Prioridade
    const prioritySelect = document.getElementById('queue-priority');
    if (prioritySelect) prioritySelect.value = 'normal';

    // Data de hoje
    const dateInput = document.getElementById('queue-date-added');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Oculta input customizado de assunto
    const customSubjInput = document.getElementById('queue-subject-custom');
    if (customSubjInput) {
      customSubjInput.style.display = 'none';
      customSubjInput.value = '';
      customSubjInput.required = false;
    }

    // Seta assunto padrão conforme a categoria
    const subjSelect = document.getElementById('queue-subject-select');
    if (subjSelect) {
      if (defaultCategory === 'conectividade') {
        subjSelect.value = 'Conectividade';
      } else if (defaultCategory === 'inventario') {
        subjSelect.value = 'Inventário Escolar';
      } else {
        subjSelect.value = 'Manutenção de Maquinas';
      }
    }

    this.openModal('modal-queue-item');
  },

  handleQueueCieInput(query) {
    const resultsContainer = document.getElementById('queue-results-cie');
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 2) {
      if (resultsContainer) resultsContainer.classList.remove('active');
      return;
    }

    const schools = store.getSchools();
    const matches = schools.filter(s => String(s.cie).toLowerCase().includes(trimmed.toLowerCase()));

    if (!resultsContainer || matches.length === 0) {
      if (resultsContainer) resultsContainer.classList.remove('active');
      return;
    }

    resultsContainer.innerHTML = matches.map(s => `
      <div class="autocomplete-item" onclick="App.selectQueueSchoolByCie('${s.cie}')">
        <div class="autocomplete-item-name">${s.name}</div>
        <div class="autocomplete-item-cie">CIE: ${s.cie} | Diretor(a): ${s.director || 'Coordenação'}</div>
      </div>
    `).join('');
    resultsContainer.classList.add('active');

    // Auto-seleciona se o CIE for exato
    const exact = schools.find(s => String(s.cie).trim() === trimmed);
    if (exact) {
      const selectSchool = document.getElementById('queue-school-select');
      const dirInput = document.getElementById('queue-director');
      if (selectSchool) selectSchool.value = exact.cie;
      if (dirInput) dirInput.value = exact.director || '';
    }
  },

  selectQueueSchoolByCie(cie) {
    const school = store.getSchoolByCie(cie);
    if (!school) return;

    const cieInput = document.getElementById('queue-school-cie');
    const selectSchool = document.getElementById('queue-school-select');
    const dirInput = document.getElementById('queue-director');

    if (cieInput) cieInput.value = school.cie;
    if (selectSchool) selectSchool.value = school.cie;
    if (dirInput) dirInput.value = school.director || '';

    const resultsContainer = document.getElementById('queue-results-cie');
    if (resultsContainer) resultsContainer.classList.remove('active');
  },

  onQueueSchoolSelect(cie) {
    const cieInput = document.getElementById('queue-school-cie');
    const dirInput = document.getElementById('queue-director');
    const resultsContainer = document.getElementById('queue-results-cie');
    if (resultsContainer) resultsContainer.classList.remove('active');

    if (!cie) {
      if (cieInput) cieInput.value = '';
      if (dirInput) dirInput.value = '';
      return;
    }
    const school = store.getSchoolByCie(cie);
    if (school) {
      if (cieInput) cieInput.value = school.cie || '';
      if (dirInput) dirInput.value = school.director || '';
    }
  },

  onQueueCategoryChange(category) {
    const subjSelect = document.getElementById('queue-subject-select');
    const inputCustom = document.getElementById('queue-subject-custom');
    if (inputCustom) {
      inputCustom.style.display = 'none';
      inputCustom.value = '';
      inputCustom.required = false;
    }
    if (subjSelect) {
      if (category === 'manutencao') {
        subjSelect.value = 'Manutenção de Maquinas';
      } else if (category === 'conectividade') {
        subjSelect.value = 'Conectividade';
      } else if (category === 'inventario') {
        subjSelect.value = 'Inventário Escolar';
      }
    }
  },

  handleQueueSubjectSelectChange(val) {
    const inputCustom = document.getElementById('queue-subject-custom');
    if (val === 'custom') {
      if (inputCustom) {
        inputCustom.style.display = 'block';
        inputCustom.required = true;
        inputCustom.focus();
      }
    } else {
      if (inputCustom) {
        inputCustom.style.display = 'none';
        inputCustom.required = false;
        inputCustom.value = '';
      }
      // Auto ajusta a categoria da fila de acordo com o assunto pré-definido
      const catSelect = document.getElementById('queue-category');
      if (catSelect && val) {
        if (val === 'Conectividade' || val === 'Verificar AP') {
          catSelect.value = 'conectividade';
        } else if (val === 'Inventário Escolar') {
          catSelect.value = 'inventario';
        } else {
          catSelect.value = 'manutencao';
        }
      }
    }
  },

  openEditQueueModal(queueId) {
    const item = store.getQueueItemById(queueId);
    if (!item) {
      alert('Solicitação não encontrada.');
      return;
    }

    document.getElementById('queue-item-id').value = item.id;
    
    const titleEl = document.getElementById('modal-queue-title');
    if (titleEl) {
      titleEl.innerHTML = '<i class="fa-solid fa-pen" style="color:var(--primary);"></i> Editar Solicitação na Fila';
    }

    // Popula select de escolas
    const schoolSelect = document.getElementById('queue-school-select');
    if (schoolSelect) {
      const schools = store.getSchools().slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      let optHtml = '<option value="">Selecione uma escola...</option>';
      schools.forEach(s => {
        const isSel = String(s.cie).trim() === String(item.schoolCie).trim() ? 'selected' : '';
        optHtml += `<option value="${s.cie}" ${isSel}>${s.name} (CIE: ${s.cie})</option>`;
      });
      schoolSelect.innerHTML = optHtml;
    }

    document.getElementById('queue-school-cie').value = item.schoolCie || '';
    document.getElementById('queue-director').value = item.directorName || '';
    document.getElementById('queue-category').value = item.category || 'manutencao';
    
    document.getElementById('queue-priority').value = item.priority || 'normal';
    document.getElementById('queue-date-added').value = item.dateAdded || new Date().toISOString().split('T')[0];
    document.getElementById('queue-obs').value = item.obs || '';

    // Assunto pré-definido ou customizado
    const subjSelect = document.getElementById('queue-subject-select');
    const inputCustom = document.getElementById('queue-subject-custom');
    const predefinedList = [
      'Chamado Interno',
      'Manutenção de Maquinas',
      'Formatar Maquinas',
      'Conectividade',
      'Espelhamento DVR',
      'Verificar AP',
      'Inventário Escolar'
    ];

    if (predefinedList.includes(item.subject)) {
      if (subjSelect) subjSelect.value = item.subject;
      if (inputCustom) {
        inputCustom.style.display = 'none';
        inputCustom.value = '';
        inputCustom.required = false;
      }
    } else {
      if (subjSelect) subjSelect.value = 'custom';
      if (inputCustom) {
        inputCustom.style.display = 'block';
        inputCustom.value = item.subject || '';
        inputCustom.required = true;
      }
    }

    this.openModal('modal-queue-item');
  },

  saveQueueItemForm(e) {
    if (e && e.preventDefault) e.preventDefault();

    const schoolSelect = document.getElementById('queue-school-select');
    const schoolCie = schoolSelect.value;
    if (!schoolCie) {
      alert('Por favor, selecione uma escola.');
      return;
    }

    const school = store.getSchoolByCie(schoolCie);
    const schoolName = school ? school.name : (schoolSelect.options[schoolSelect.selectedIndex]?.text || '');
    const directorName = document.getElementById('queue-director').value.trim() || (school ? school.director : '');
    const category = document.getElementById('queue-category').value;
    const osNumber = '';

    // Assunto selecionado ou digitado no campo customizado
    const subjSelectVal = document.getElementById('queue-subject-select').value;
    let subject = subjSelectVal;
    if (subjSelectVal === 'custom') {
      subject = document.getElementById('queue-subject-custom').value.trim();
    }
    if (!subject) {
      alert('Por favor, selecione ou informe o assunto da solicitação.');
      return;
    }

    const priority = document.getElementById('queue-priority').value || 'normal';
    const dateAdded = document.getElementById('queue-date-added').value || new Date().toISOString().split('T')[0];
    const obs = document.getElementById('queue-obs').value.trim();

    const existingId = document.getElementById('queue-item-id').value;
    const id = existingId || ('queue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

    const itemData = {
      id,
      schoolCie,
      schoolName,
      directorName,
      category,
      osNumber,
      subject,
      priority,
      dateAdded,
      obs
    };

    store.saveQueueItem(itemData);
    this.closeModal('modal-queue-item');
    this.renderQueueView(); this.renderDashboardQueue();
    this.showToast('Solicitação salva na fila com sucesso!');
  },

  deleteQueueItemConfirm(queueId) {
    const item = store.getQueueItemById(queueId);
    const schoolName = item ? item.schoolName : 'esta escola';
    if (confirm(`Deseja realmente remover ${schoolName} da fila de chamados?`)) {
      store.deleteQueueItem(queueId);
      this.renderQueueView(); this.renderDashboardQueue();
      this.showToast('Solicitação removida da fila.');
    }
  },

  // --- ADICIONAR ITEM DA FILA NA AGENDA DO ANALISTA ---
  openDispatchQueueModal(queueId) {
    const item = store.getQueueItemById(queueId);
    if (!item) {
      alert('Solicitação não encontrada.');
      return;
    }

    document.getElementById('dispatch-queue-id').value = item.id;
    document.getElementById('dispatch-summary-school-name').textContent = item.schoolName;
    document.getElementById('dispatch-summary-school-cie').textContent = `CIE: ${item.schoolCie} | Diretor(a): ${item.directorName || 'Coordenação'}`;
    
    // Assunto
    const subjEl = document.getElementById('dispatch-summary-subject');
    if (subjEl) {
      let icon = 'fa-screwdriver-wrench';
      if (item.category === 'conectividade') icon = 'fa-wifi';
      if (item.category === 'inventario') icon = 'fa-boxes-stacked';
      subjEl.innerHTML = `<i class="fa-solid ${icon}" style="color:var(--primary); margin-right:4px;"></i> <span>${item.subject || 'Atendimento Técnico'}</span>`;
    }

    // Badges resumo
    const catBadge = document.getElementById('dispatch-summary-category-badge');
    if (catBadge) {
      catBadge.className = `badge-${item.category || 'manutencao'}`;
      catBadge.textContent = item.category === 'conectividade' ? 'Conectividade' : (item.category === 'inventario' ? 'Inventário' : 'Manutenção');
    }

    const priorityBadge = document.getElementById('dispatch-summary-priority-badge');
    if (priorityBadge) {
      const pLabel = item.priority === 'urgente' ? '🚨 Urgente' : (item.priority === 'alta' ? 'Prioridade Alta' : 'Prioridade Normal');
      priorityBadge.textContent = pLabel;
    }

    // Popula select de analistas (apenas ativos)
    const analystSelect = document.getElementById('dispatch-analyst');
    if (analystSelect) {
      const analysts = store.getAnalysts().filter(a => a.status === 'ativo');
      let optHtml = '<option value="">Selecione para qual analista colocar...</option>';
      analysts.forEach(a => {
        optHtml += `<option value="${a.id}">${a.name}</option>`;
      });
      analystSelect.innerHTML = optHtml;
      if (analysts.length > 0) {
        analystSelect.selectedIndex = 1; // Já pré-seleciona o primeiro analista para agilidade
      }
    }

    // Data padrão: usa a data da agenda atual ou a data de hoje
    const dateInput = document.getElementById('dispatch-date');
    if (dateInput) {
      dateInput.value = this.currentAgendaDate || new Date().toISOString().split('T')[0];
    }

    // Nº O.S (opcional, traz o da fila se houver)
    const osInput = document.getElementById('dispatch-os-number');
    if (osInput) {
      osInput.value = item.osNumber || '';
    }

    this.openModal('modal-dispatch-queue');
  },

  confirmDispatchQueue(e) {
    if (e && e.preventDefault) e.preventDefault();

    const queueId = document.getElementById('dispatch-queue-id').value;
    const analystId = document.getElementById('dispatch-analyst').value;
    const schedDate = document.getElementById('dispatch-date').value;
    const osNumberInput = document.getElementById('dispatch-os-number');
    const osNumber = osInputVal = osNumberInput ? osNumberInput.value.trim() : '';

    if (!analystId) {
      alert('Por favor, selecione qual analista receberá este agendamento.');
      return;
    }
    if (!schedDate) {
      alert('Por favor, selecione a data do agendamento.');
      return;
    }

    const item = store.getQueueItemById(queueId);
    if (!item) {
      alert('Solicitação na fila não encontrada.');
      return;
    }

    const analyst = store.getAnalystById(analystId);

    // Cria o agendamento oficial
    const newSchedule = {
      id: 'sched_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      analystId: analystId,
      schoolCie: item.schoolCie,
      schoolName: item.schoolName,
      directorName: item.directorName || '',
      date: schedDate,
      period: 'Manhã',
      subject: item.subject,
      osNumber: osNumber,
      obs: item.obs || '',
      completed: false,
      needsReturn: false
    };

    store.saveSchedule(newSchedule);

    // Remove da fila
    store.deleteQueueItem(queueId);

    // Fecha a modal
    this.closeModal('modal-dispatch-queue');

    // Atualiza views
    this.renderQueueView(); this.renderDashboardQueue();
    if (typeof this.renderAnalystDailyCards === 'function') {
      this.renderAnalystDailyCards();
    }
    if (typeof this.updateDashboard === 'function') {
      this.updateDashboard();
    }

    const analystName = analyst ? analyst.name : 'analista';
    this.showToast(`Escola adicionada na agenda de ${analystName} com sucesso!`);
  },

  // =========================================================================
  // AUXILIARES
  // =========================================================================
  openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  },

  maskPhone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 6) {
      input.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
    } else if (v.length > 2) {
      input.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    } else if (v.length > 0) {
      input.value = `(${v}`;
    }
  }
};

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
