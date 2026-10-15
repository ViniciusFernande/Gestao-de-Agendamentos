// ==========================================================================
// FIREBASE CONFIG & INTEGRATION (Auth + Cloud Firestore)
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCm7dWAj3dszhT5X3mM6HxroOur54cw4X8",
  authDomain: "gestao-de-agendamentos-3d19c.firebaseapp.com",
  projectId: "gestao-de-agendamentos-3d19c",
  storageBucket: "gestao-de-agendamentos-3d19c.firebasestorage.app",
  messagingSenderId: "332698863344",
  appId: "1:332698863344:web:53e6738d19aa110465e435"
};

// Inicialização do Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Mapeamento dos usuários conhecidos para perfis
const USER_ROLES = {
  "vinicius@agendamentos.com": { name: "Vinicius", role: "admin", label: "Administrador", isSuper: true },
  "ricardo@agendamentos.com": { name: "Ricardo", role: "analista", label: "Analista", isSuper: false },
  "tiago@agendamentos.com": { name: "Tiago", role: "analista", label: "Analista", isSuper: false },
  "angelo@agendamentos.com": { name: "Angelo", role: "analista", label: "Analista", isSuper: false }
};

const AuthService = {
  currentUser: null,
  userProfile: null,

  init(onAuthChange) {
    auth.onAuthStateChanged(user => {
      this.currentUser = user;
      if (user) {
        const emailLower = (user.email || "").toLowerCase();
        this.userProfile = USER_ROLES[emailLower] || {
          name: user.displayName || emailLower.split("@")[0],
          role: "analista",
          label: "Analista",
          isSuper: false
        };
        localStorage.setItem("app_current_user", JSON.stringify(this.userProfile));
      } else {
        this.userProfile = null;
        localStorage.removeItem("app_current_user");
      }
      if (onAuthChange) onAuthChange(this.userProfile);
    });
  },

  async login(loginInput, password) {
    let email = loginInput.trim().toLowerCase();
    if (!email.includes("@")) {
      email = email + "@agendamentos.com";
    }
    return await auth.signInWithEmailAndPassword(email, password);
  },

  async logout() {
    await auth.signOut();
  },

  isAdmin() {
    return this.userProfile && this.userProfile.role === "admin";
  }
};

// Gerenciador de sincronização em tempo real do Firestore
const FirestoreSync = {
  unsubscribers: [],
  isSyncing: false,

  startSync(onDataUpdated) {
    this.stopSync();

    // 1. Escolas
    const unsubSchools = db.collection("escolas").onSnapshot(snapshot => {
      const schools = [];
      snapshot.forEach(doc => schools.push(doc.data()));
      if (schools.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
        if (onDataUpdated) onDataUpdated("schools");
      }
    }, err => console.warn("Erro ao sincronizar escolas:", err));
    this.unsubscribers.push(unsubSchools);

    // 2. Analistas
    const unsubAnalysts = db.collection("analistas").onSnapshot(snapshot => {
      const analysts = [];
      snapshot.forEach(doc => analysts.push(doc.data()));
      if (analysts.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ANALYSTS, JSON.stringify(analysts));
        if (onDataUpdated) onDataUpdated("analysts");
      }
    }, err => console.warn("Erro ao sincronizar analistas:", err));
    this.unsubscribers.push(unsubAnalysts);

    // 3. Agendamentos
    const unsubSchedules = db.collection("agendamentos").onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const schedules = [];
        snapshot.forEach(doc => schedules.push(doc.data()));
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        if (onDataUpdated) onDataUpdated("schedules");
      } else {
        // Se o Firestore estiver vazio, subir os agendamentos existentes no localStorage
        const localSchedules = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES) || "[]");
        if (localSchedules.length > 0) {
          localSchedules.forEach(s => {
            db.collection("agendamentos").doc(String(s.id)).set(s).catch(() => {});
          });
        }
      }
    }, err => console.warn("Erro ao sincronizar agendamentos:", err));
    this.unsubscribers.push(unsubSchedules);

    // 4. Fila
    const unsubQueue = db.collection("fila").onSnapshot(snapshot => {
      const queue = [];
      snapshot.forEach(doc => queue.push(doc.data()));
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
      if (onDataUpdated) onDataUpdated("queue");
    }, err => console.warn("Erro ao sincronizar fila:", err));
    this.unsubscribers.push(unsubQueue);

    // 5. Configurações gerais (WhatsApp template, etc.)
    const unsubConfig = db.collection("config").doc("geral").onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data.whatsappTemplate) {
          localStorage.setItem(STORAGE_KEYS.WHATSAPP_TEMPLATE, data.whatsappTemplate);
          if (onDataUpdated) onDataUpdated("config");
        }
      }
    }, err => console.warn("Erro ao sincronizar configs:", err));
    this.unsubscribers.push(unsubConfig);
  },

  stopSync() {
    this.unsubscribers.forEach(unsub => {
      if (typeof unsub === "function") unsub();
    });
    this.unsubscribers = [];
  },

  // Operações de Escrita Direta no Firestore (com fallback local transparente)
  async saveSchool(school) {
    try {
      await db.collection("escolas").doc(String(school.cie)).set(school);
    } catch (e) {
      console.warn("Falha ao salvar escola no Firestore:", e);
    }
  },

  async deleteSchool(cie) {
    try {
      await db.collection("escolas").doc(String(cie)).delete();
    } catch (e) {
      console.warn("Falha ao excluir escola no Firestore:", e);
    }
  },

  async saveAnalyst(analyst) {
    try {
      await db.collection("analistas").doc(String(analyst.id)).set(analyst);
    } catch (e) {
      console.warn("Falha ao salvar analista no Firestore:", e);
    }
  },

  async deleteAnalyst(id) {
    try {
      await db.collection("analistas").doc(String(id)).delete();
    } catch (e) {
      console.warn("Falha ao excluir analista no Firestore:", e);
    }
  },

  async saveSchedule(sched) {
    try {
      await db.collection("agendamentos").doc(String(sched.id)).set(sched);
    } catch (e) {
      console.warn("Falha ao salvar agendamento no Firestore:", e);
    }
  },

  async deleteSchedule(id) {
    try {
      await db.collection("agendamentos").doc(String(id)).delete();
    } catch (e) {
      console.warn("Falha ao excluir agendamento no Firestore:", e);
    }
  },

  async saveQueueItem(item) {
    try {
      await db.collection("fila").doc(String(item.id)).set(item);
    } catch (e) {
      console.warn("Falha ao salvar item da fila no Firestore:", e);
    }
  },

  async deleteQueueItem(id) {
    try {
      await db.collection("fila").doc(String(id)).delete();
    } catch (e) {
      console.warn("Falha ao excluir item da fila no Firestore:", e);
    }
  },

  async saveWhatsappTemplate(template) {
    try {
      await db.collection("config").doc("geral").set({ whatsappTemplate: template }, { merge: true });
    } catch (e) {
      console.warn("Falha ao salvar config no Firestore:", e);
    }
  },

  async wipeAll() {
    try {
      const collections = ["escolas", "analistas", "agendamentos", "fila"];
      for (const col of collections) {
        const snap = await db.collection(col).get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn("Falha ao zerar Firestore:", e);
    }
  }
};
