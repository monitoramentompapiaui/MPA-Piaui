
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PlusCircle, 
  History, 
  LayoutDashboard, 
  Menu,
  X,
  FileSpreadsheet,
  FileText,
  TableProperties,
  Anchor,
  Cloud,
  CloudLightning,
  CloudOff,
  RefreshCw,
  Database,
  Code,
  Tag,
  LogOut,
  User as UserIcon,
  LogIn,
  HelpCircle,
  Sparkles,
  BookOpen,
  Wifi,
  WifiOff,
  Check,
  Globe,
  Settings,
  Fish
} from 'lucide-react';
import { LandingForm, Fisherman, Species } from './types';
import LoginForm from './components/LoginForm';
import { exportToExcel } from './utils/export';

// Lazy load the main tab components to reduce initial bundle size and prevent page crashes on reload
const LandingFormWizard = React.lazy(() => import('./components/LandingFormWizard'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const MyFormsList = React.lazy(() => import('./components/MyFormsList'));
const BulkImportGrid = React.lazy(() => import('./components/BulkImportGrid'));
const UserProfileTab = React.lazy(() => import('./components/UserProfileTab'));
const CadastrosTab = React.lazy(() => import('./components/CadastrosTab'));
const WormsSpeciesSearchCard = React.lazy(() => import('./components/WormsSpeciesSearchCard').then(m => ({ default: m.WormsSpeciesSearchCard })));

// Tab Loading Indicator component for React.Suspense fallback
const TabLoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center select-none animate-pulse">
    <div className="relative flex items-center justify-center mb-4">
      <div className="w-12 h-12 rounded-full border-4 border-blue-100 dark:border-blue-950/40 animate-spin border-t-blue-600 dark:border-t-blue-500"></div>
    </div>
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">Carregando Aba...</p>
  </div>
);
import { dbGet, dbSet, dbRemove, dbGetAllForms, dbSaveForm, dbSaveFormsBulk, dbDeleteForm, dbDeleteFormsBulk, dbClearAllForms, getErrorMessage } from './utils/db';
import {
  isSupabaseConfigured,
  getSupabaseError,
  getSupabaseForms,
  getSupabaseFishermen,
  insertSupabaseForm,
  insertMultipleSupabaseForms,
  updateSupabaseForm,
  deleteSupabaseForm,
  deleteMultipleSupabaseForms,
  insertSupabaseFisherman,
  updateSupabaseFisherman,
  deleteSupabaseFisherman,
  getSupabaseSpecies,
  insertSupabaseSpecies,
  updateSupabaseSpecies,
  deleteSupabaseSpecies,
  insertMultipleSupabaseSpecies,
  registerUserProfileInDatabase,
  supabase
} from './utils/supabase';

const INITIAL_SPECIES_LIST: Species[] = [
  { id: 'spec-1', commonName: 'Tainha', scientificName: 'Mugil curema' },
  { id: 'spec-2', commonName: 'Pargo verdadeiro', scientificName: 'Lutjanus purpureus' },
  { id: 'spec-3', commonName: 'Cioba', scientificName: 'Lutjanus analis' },
  { id: 'spec-4', commonName: 'Cavala', scientificName: 'Scomberomorus cavalla' },
  { id: 'spec-5', commonName: 'Sururu', scientificName: 'Anomalocardia flexuosa' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTabRaw] = useState<'dashboard' | 'form' | 'history' | 'bulk' | 'profile' | 'cadastros' | 'worms'>('dashboard');

  const setActiveTab = useCallback((tab: 'dashboard' | 'form' | 'history' | 'bulk' | 'profile' | 'cadastros' | 'worms') => {
    setActiveTabRaw(tab);
    const hash = tab === 'dashboard' ? '' : `#${tab}`;
    if (window.location.hash !== hash) {
      window.history.pushState({}, '', hash || '/');
    }
  }, []);

  const handleNewForm = useCallback(() => {
    setActiveTab('form');
  }, [setActiveTab]);

  const handleGoToDashboard = useCallback(() => {
    setActiveTab('dashboard');
  }, [setActiveTab]);

  const handleShowTips = useCallback(() => {
    setShowQuickTips(true);
  }, []);

  // Sync tab with URL on mount and browser back/forward
  useEffect(() => {
    const handlePathAndTab = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const path = window.location.pathname.replace(/^\//, ''); // fallback to path if they came via old direct URL
      const validTabs = ['dashboard', 'form', 'history', 'bulk', 'profile', 'cadastros', 'worms'];
      
      if (validTabs.includes(hash)) {
        setActiveTabRaw(hash as any);
      } else if (validTabs.includes(path)) {
        // Automatically migrate old path-based URL to hash-based to prevent future 404s
        setActiveTabRaw(path as any);
        window.history.replaceState({}, '', `#${path}`);
      } else if (path === '' || path === 'login' || hash === 'login') {
        setActiveTabRaw('dashboard');
      }
    };

    handlePathAndTab();

    window.addEventListener('hashchange', handlePathAndTab);
    window.addEventListener('popstate', handlePathAndTab);
    return () => {
      window.removeEventListener('hashchange', handlePathAndTab);
      window.removeEventListener('popstate', handlePathAndTab);
    };
  }, []);

  const [formSubTab, setFormSubTab] = useState<'wizard' | 'registration'>('wizard');
  
  const [forms, setForms] = useState<LandingForm[]>([]);
  const [fishermen, setFishermen] = useState<Fisherman[]>([]);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Supabase Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ loaded: number; total: number; isResuming: boolean } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [showQuickTips, setShowQuickTips] = useState(false);

  // PWA & Connectivity States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showOfflineNotification, setShowOfflineNotification] = useState(!navigator.onLine);
  const [triggerPendingSync, setTriggerPendingSync] = useState(0);

  // Toast Notification States
  interface ToastMessage {
    id: string;
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    description: string;
  }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'warning' | 'info' | 'error', title: string, description: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('fishery_theme') as 'light' | 'dark') || 'light');

  // Efeito para aplicar tema escuro/claro
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('fishery_theme', theme);
  }, [theme]);

  // Estados de Autenticação Supabase
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // 1. Carregar cache local de forma assíncrona usando IndexedDB com fallback para LocalStorage
  useEffect(() => {
    const loadCache = async () => {
      try {
        // Carrega fichas (forms)
        let cachedForms = await dbGetAllForms();
        if (!cachedForms || cachedForms.length === 0) {
          // Fallback para localStorage se houver dados antigos
          const saved = localStorage.getItem('fishery_forms');
          if (saved) {
            try {
              const legacyForms = JSON.parse(saved);
              if (Array.isArray(legacyForms) && legacyForms.length > 0) {
                await dbSaveFormsBulk(legacyForms);
                cachedForms = legacyForms;
              }
            } catch (e) {
              console.error("Erro ao converter cache do localStorage de fihas:", e);
            }
          }
        }
        if (cachedForms && Array.isArray(cachedForms)) {
          cachedForms.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setForms(cachedForms);

          const hasPending = cachedForms.some(f => f.isOfflinePending);
          if (hasPending) {
            if (navigator.onLine) {
              setTriggerPendingSync(prev => prev + 1);
            } else {
              showToast('warning', 'Dados Offline Pendentes', 'Você possui fichas salvas localmente que aguardam conexão de rede para sincronizar.');
            }
          }
        }

        // Carrega pescadores
        let cachedFishermen = await dbGet<Fisherman[]>('fishery_fishermen');
        if (!cachedFishermen) {
          const savedFishermen = localStorage.getItem('fishery_fishermen');
          if (savedFishermen) {
            try {
              cachedFishermen = JSON.parse(savedFishermen);
              if (cachedFishermen) {
                await dbSet('fishery_fishermen', cachedFishermen);
              }
            } catch (e) {
              console.error("Erro ao converter cache do localStorage de pescadores:", e);
            }
          }
        }
        if (cachedFishermen && Array.isArray(cachedFishermen)) {
          setFishermen(cachedFishermen);
        }

        // Carrega espécies
        let cachedSpecies = await dbGet<Species[]>('fishery_species');
        if (!cachedSpecies) {
          const savedSpecies = localStorage.getItem('fishery_species');
          if (savedSpecies) {
            try {
              cachedSpecies = JSON.parse(savedSpecies);
              if (cachedSpecies) {
                await dbSet('fishery_species', cachedSpecies);
              }
            } catch (e) {
              console.error("Erro ao converter cache do localStorage de espécies:", e);
            }
          }
        }
        if (cachedSpecies && Array.isArray(cachedSpecies) && cachedSpecies.length >= INITIAL_SPECIES_LIST.length) {
          setSpeciesList(cachedSpecies);
        } else {
          const merged = [...INITIAL_SPECIES_LIST];
          if (Array.isArray(cachedSpecies)) {
            cachedSpecies.forEach((p: any) => {
              const lower = p.commonName ? p.commonName.toLowerCase().trim() : '';
              if (lower && !merged.some(m => m.commonName.toLowerCase().trim() === lower)) {
                merged.push(p);
              }
            });
          }
          setSpeciesList(merged);
          await dbSet('fishery_species', merged);
        }
      } catch (err) {
        console.error("Erro ao recarregar cache local do IndexedDB:", err);
        setSpeciesList(INITIAL_SPECIES_LIST);
      }
    };

    loadCache();
  }, []);

  // 1b. Monitorar estado de autenticação do Supabase de forma resiliente a offline
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      setIsAuthLoading(true);
      
      // Tenta carregar o usuário persistido localmente de início para evitar telas de bloqueio offline
      const cachedUserStr = localStorage.getItem('fishery_cached_user');
      if (cachedUserStr) {
        try {
          const parsedUser = JSON.parse(cachedUserStr);
          if (parsedUser) {
            setUser(parsedUser);
          }
        } catch (e) {
          console.error("Erro ao recuperar perfil cacheado offline:", e);
        }
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          localStorage.setItem('fishery_cached_user', JSON.stringify(session.user));
          // Salva os dados de login no banco de dados do Supabase
          registerUserProfileInDatabase(session.user);
        }
        setIsAuthLoading(false);
      }).catch(err => {
        console.error("Erro ao carregar sessão inicial:", err);
        setIsAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser(prevUser => {
            // Evita atualizar estado/unmount de componentes caso seja o mesmo usuário
            if (prevUser && prevUser.id === session.user.id) {
              return prevUser;
            }
            return session.user;
          });
          localStorage.setItem('fishery_cached_user', JSON.stringify(session.user));
          registerUserProfileInDatabase(session.user);
        } else {
          // Apenas assume logout completo em caso de evento explícito de SIGNED_OUT
          // Isso previne que instabilidades de rede durante o refresh de token limpem a sessão
          if (event === 'SIGNED_OUT') {
            setUser(null);
            localStorage.removeItem('fishery_cached_user');
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  // 1c. Tratamento de redirecionamento e URL na rota /login
  useEffect(() => {
    const handleLoginRedirectPath = () => {
      const isLoginPath = window.location.pathname.endsWith('/login') || window.location.hash === '#login' || window.location.hash.endsWith('/login');
      if (isLoginPath) {
        if (user) {
          // Se o usuário está cadastrado/logado na nuvem, limpa '/login' da URL enviando-o para a raiz '/'
          window.history.pushState({}, '', window.location.origin);
        } else {
          // Se acessou /login não logado, remove o bypass local para exigir autenticação
          sessionStorage.removeItem('fishery_skipped_auth');
        }
      }
    };
    handleLoginRedirectPath();
  }, [user]);

  // 1d. Verifica se deve exibir o modal de Dicas Rápidas na primeira vez que um usuário loga
  useEffect(() => {
    if (user) {
      const hasSeenTips = localStorage.getItem(`fishery_seen_tips_${user.id || user.email}`);
      if (!hasSeenTips) {
        setShowQuickTips(true);
      }
    } else {
      setShowQuickTips(false);
    }
  }, [user]);

  const syncOfflinePendingForms = useCallback(async (currentFormsList: LandingForm[]) => {
    const pendingForms = currentFormsList.filter(f => f.isOfflinePending);
    if (pendingForms.length === 0) return;

    if (!isSupabaseConfigured || !user) return;

    try {
      setIsSyncing(true);
      setSyncError(null);
      await insertMultipleSupabaseForms(pendingForms);

      // Succeeded! Update forms list and save back to local db
      const updatedForms = currentFormsList.map(f => {
        if (f.isOfflinePending) {
          return { ...f, isOfflinePending: false };
        }
        return f;
      });
      setForms(updatedForms);
      await dbSaveFormsBulk(updatedForms);
      showToast('success', 'Sincronização concluída', `${pendingForms.length} ficha(s) pendente(s) sincronizada(s) com sucesso.`);
    } catch (err) {
      console.error("Falha ao sincronizar fichas offline pendentes:", err);
      showToast('warning', 'Sincronização pendente', 'Há fichas offline pendentes de sincronização.');
    } finally {
      setIsSyncing(false);
    }
  }, [user, showToast]);

  // 1e. Monitoramento de conexão online/offline e detecção de instalador PWA
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineNotification(false);
      setTriggerPendingSync(prev => prev + 1);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineNotification(true);
    };
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (isOnline && triggerPendingSync > 0) {
      syncOfflinePendingForms(forms);
    }
  }, [isOnline, triggerPendingSync]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Instalação do App resultado: ${outcome}`);
    setDeferredPrompt(null);
  };

  // 2. Carregar dados reais e frescos do Supabase (Apenas se configurado e autenticado)
  useEffect(() => {
    const configErr = getSupabaseError();
    if (configErr) {
      setSyncError(configErr);
      return;
    }

    if (isSupabaseConfigured && user) {
      const syncFromSupabase = async () => {
        try {
          setIsSyncing(true);
          setSyncError(null);
          
          let cloudForms: LandingForm[] = [];
          try {
            cloudForms = await getSupabaseForms((incrementalForms, progress) => {
              setSyncProgress(progress);
            });
          } catch (e: any) {
            console.warn("Aviso: Falha ao carregar formulários do Supabase. Carregando dados locais.", e);
            cloudForms = await dbGetAllForms();
            // Apenas definimos um erro visual se o usuário estiver online e não for erro de conexão padrão
            if (navigator.onLine && e?.message && !e.message.includes("failed to fetch")) {
              setSyncError(`Aviso de conexão: ${getErrorMessage(e)}. Exibindo dados salvos localmente.`);
            }
          }
          
          let cloudFishermen: Fisherman[] = [];
          try {
            cloudFishermen = await getSupabaseFishermen();
          } catch (e) {
            console.warn("Aviso: Falha ao carregar pescadores do Supabase. Carregando dados locais.", e);
            cloudFishermen = await dbGet<Fisherman[]>('fishery_fishermen') || [];
          }
          
          let cloudSpecies: Species[] = [];
          try {
            cloudSpecies = await getSupabaseSpecies();
          } catch (e) {
            console.warn("Aviso: Falha ao carregar espécies do Supabase. Carregando dados locais.", e);
            cloudSpecies = await dbGet<Species[]>('fishery_species') || [];
          }
          
          setForms(cloudForms);
          setFishermen(cloudFishermen);
          
          if (cloudSpecies && cloudSpecies.length >= INITIAL_SPECIES_LIST.length) {
            setSpeciesList(cloudSpecies);
            await dbSet('fishery_species', cloudSpecies);
          } else {
            const merged = [...INITIAL_SPECIES_LIST];
            if (cloudSpecies && cloudSpecies.length > 0) {
              cloudSpecies.forEach((p: Species) => {
                const lower = p.commonName ? p.commonName.toLowerCase().trim() : '';
                if (lower && !merged.some(m => m.commonName.toLowerCase().trim() === lower)) {
                  merged.push(p);
                }
              });
            }
            setSpeciesList(merged);
            await dbSet('fishery_species', merged);
            
            // Auto sincroniza espécies com o Supabase se necessário
            if (navigator.onLine) {
              try {
                await insertMultipleSupabaseSpecies(merged);
              } catch (e) {
                console.warn("Dica: Se a tabela 'species' ainda não estiver criada no Supabase SQL Editor, faça isso para registrar todas as espécies automaticamente.", e);
              }
            }
          }
          
          // Atualiza cache local de alta capacidade no IndexedDB
          await dbSet('fishery_fishermen', cloudFishermen);
          setSyncProgress(null); // Clear progress when completely synced
          showToast('success', 'Sincronização Concluída', 'Seus dados foram atualizados com o servidor com sucesso.');
        } catch (err: any) {
          console.error("Erro geral no sincronismo automático do Supabase:", err);
          if (navigator.onLine) {
            setSyncError(`Erro de conexão com o Supabase: ${getErrorMessage(err)}. Verifique suas chaves e tabelas.`);
          }
        } finally {
          setIsSyncing(false);
        }
      };

      syncFromSupabase();
    }
  }, [user]);



  useEffect(() => {
    const handler = setTimeout(async () => {
      await dbSet('fishery_fishermen', fishermen);
      try { localStorage.removeItem('fishery_fishermen'); } catch {}
    }, 1000);
    return () => clearTimeout(handler);
  }, [fishermen]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      await dbSet('fishery_species', speciesList);
      try { localStorage.removeItem('fishery_species'); } catch {}
    }, 1000);
    return () => clearTimeout(handler);
  }, [speciesList]);

  // --- Funções de Mutação (Integração Local + Supabase) ---

  const saveForm = useCallback(async (newForm: LandingForm) => {
    if (newForm.idNumber) {
      const duplicateExists = forms.some(f => f.idNumber && f.idNumber.trim() === newForm.idNumber.trim());
      if (duplicateExists) {
        showToast('error', 'Ficha Duplicada', `O número de ficha "${newForm.idNumber}" já está cadastrado no sistema.`);
        alert(`Erro: O número de ficha "${newForm.idNumber}" já está cadastrado no banco de dados local. Por favor, insira um número diferente para evitar cadastros duplicados.`);
        return false;
      }
    }

    const decoratedForm: LandingForm = {
      ...newForm,
      identification: {
        ...newForm.identification,
        isManualEntry: true, // Indica que é um cadastro manual inserido individualmente a partir de agora
        createdByEmail: newForm.identification?.createdByEmail || user?.email || undefined,
        createdByUsername: newForm.identification?.createdByUsername || (user?.email ? user.email.split('@')[0] : 'Administrador')
      }
    };

    let isOfflinePending = false;
    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await insertSupabaseForm(decoratedForm);
        showToast('success', 'Ficha Cadastrada', `Ficha N° ${newForm.idNumber || ''} cadastrada e enviada ao servidor com sucesso.`);
      } catch (err: any) {
        setSyncError("Salvo apenas localmente (erro Supabase).");
        isOfflinePending = true;
        showToast('warning', 'Modo Offline', `Ficha N° ${newForm.idNumber || ''} salva localmente. Aguardando conexão de rede.`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      showToast('info', 'Salvo Localmente', `Ficha N° ${newForm.idNumber || ''} salva localmente no navegador.`);
    }

    const finalForm = { ...decoratedForm, isOfflinePending };
    setForms(prev => [finalForm, ...prev]);
    await dbSaveForm(finalForm);
    return true;
  }, [user, showToast, forms]);

  const saveMultipleForms = useCallback(async (newForms: LandingForm[]) => {
    const decoratedForms = newForms.map(form => ({
      ...form,
      identification: {
        ...form.identification,
        isManualEntry: false, // Forçar falso para dados importados por lote
        createdByEmail: form.identification?.createdByEmail || user?.email || undefined,
        createdByUsername: form.identification?.createdByUsername || (user?.email ? user.email.split('@')[0] : 'Administrador')
      }
    }));

    let isOfflinePending = false;
    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await insertMultipleSupabaseForms(decoratedForms);
        showToast('success', 'Lote Cadastrado', `${newForms.length} fichas cadastradas e sincronizadas com sucesso.`);
      } catch (err: any) {
        console.error("Erro no salvamento multi-linhas:", err);
        setSyncError("Lote salvo localmente (algumas falhas de rede com o Supabase).");
        isOfflinePending = true;
        showToast('warning', 'Modo Offline', `${newForms.length} fichas salvas localmente. Aguardando conexão.`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      showToast('info', 'Lote Salvo', `${newForms.length} fichas salvas localmente no navegador.`);
    }

    const finalForms = decoratedForms.map(f => ({ ...f, isOfflinePending }));
    setForms(prev => [...finalForms, ...prev]);
    setActiveTab('history');
    await dbSaveFormsBulk(finalForms);
  }, [user, showToast]);

  const updateForm = useCallback(async (updatedForm: LandingForm) => {
    const decoratedUpdatedForm: LandingForm = {
      ...updatedForm,
      identification: {
        ...updatedForm.identification,
        isManualEntry: updatedForm.identification?.isManualEntry !== undefined 
          ? updatedForm.identification.isManualEntry 
          : true, // Preserva se já definido, senão considera manual
        createdByEmail: updatedForm.identification?.createdByEmail || user?.email || undefined,
        createdByUsername: updatedForm.identification?.createdByUsername || (user?.email ? user.email.split('@')[0] : 'Administrador')
      }
    };

    let isOfflinePending = false;
    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await updateSupabaseForm(decoratedUpdatedForm);
        showToast('success', 'Ficha Atualizada', `Ficha N° ${updatedForm.idNumber || ''} atualizada e sincronizada com sucesso.`);
      } catch (err: any) {
        setSyncError("Atualizado localmente (erro Supabase).");
        isOfflinePending = true;
        showToast('warning', 'Modo Offline', `Ficha N° ${updatedForm.idNumber || ''} atualizada localmente. Aguardando conexão.`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      showToast('info', 'Ficha Atualizada', `Ficha N° ${updatedForm.idNumber || ''} atualizada localmente.`);
    }

    const finalForm = { ...decoratedUpdatedForm, isOfflinePending };
    setForms(prev => prev.map(f => f.id === finalForm.id ? finalForm : f));
    await dbSaveForm(finalForm);
  }, [user, showToast]);

  const deleteForm = useCallback(async (id: string) => {
    setForms(prev => prev.filter(f => f.id !== id));
    await dbDeleteForm(id);

    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await deleteSupabaseForm(id);
      } catch (err: any) {
        setSyncError("Excluído localmente (erro Supabase).");
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const deleteMultipleForms = useCallback(async (ids: string[]) => {
    const idSet = new Set(ids);
    setForms(prev => prev.filter(f => !idSet.has(f.id)));
    await dbDeleteFormsBulk(ids);

    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await deleteMultipleSupabaseForms(ids);
      } catch (err: any) {
        setSyncError("Exclusão em lote apenas local (erro Supabase).");
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const addFisherman = useCallback(async (newFisher: Fisherman) => {
    setFishermen(prev => [newFisher, ...prev]);

    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await insertSupabaseFisherman(newFisher);
      } catch (err: any) {
        setSyncError("Pescador salvo apenas localmente (erro Supabase).");
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const updateFisherman = useCallback(async (updatedFisher: Fisherman) => {
    setFishermen(prev => prev.map(f => f.id === updatedFisher.id ? updatedFisher : f));

    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await updateSupabaseFisherman(updatedFisher);
      } catch (err: any) {
        setSyncError("Pescador atualizado apenas localmente (erro Supabase).");
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const deleteFisherman = useCallback(async (id: string) => {
    setFishermen(prev => prev.filter(f => f.id !== id));

    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await deleteSupabaseFisherman(id);
      } catch (err: any) {
        setSyncError("Pescador excluído apenas localmente (erro Supabase).");
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const addSpecies = useCallback(async (newSpec: Species) => {
    setSpeciesList(prev => {
      const exists = prev.some(s => s.id === newSpec.id);
      if (exists) {
        return prev.map(s => s.id === newSpec.id ? newSpec : s);
      }
      return [newSpec, ...prev];
    });

    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        try {
          await insertSupabaseSpecies(newSpec);
        } catch (e) {
          await updateSupabaseSpecies(newSpec);
        }
      } catch (err: any) {
        setSyncError("Espécie salva apenas localmente (erro Supabase).");
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const deleteSpecies = useCallback(async (id: string) => {
    setSpeciesList(prev => prev.filter(s => s.id !== id));

    if (isSupabaseConfigured) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        await deleteSupabaseSpecies(id);
      } catch (err: any) {
        setSyncError("Espécie excluída apenas localmente (erro Supabase).");
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const clearAllForms = useCallback(async () => {
    setForms([]);
    await dbClearAllForms();
    await dbRemove('fishery_forms');
    await dbRemove('fishery_forms_last_sync_id');
    await dbRemove('fishery_forms_sync_completed');
    try { localStorage.removeItem('fishery_forms'); } catch {}
    setActiveTab('dashboard');

    if (isSupabaseConfigured && supabase) {
      try {
        setIsSyncing(true);
        setSyncError(null);
        
        // 1. Obter a contagem exata no Supabase antes de começar para animar o progresso
        const { count, error: countError } = await supabase
          .from('landing_forms')
          .select('*', { count: 'exact', head: true });
          
        const totalToClear = countError ? 252523 : (count || 0);
        let deletedTotal = 0;
        
        try {
          let hasMore = true;
          const BATCH_SIZE = 100;
          
          while (hasMore) {
            // Busca um lote de IDs ordenados/identificados
            const { data, error: fetchError } = await supabase
              .from('landing_forms')
              .select('id')
              .limit(BATCH_SIZE);
              
            if (fetchError) {
              console.error("Erro ao buscar registros para limpar na nuvem:", fetchError);
              throw fetchError;
            }
            
            if (!data || data.length === 0) {
              hasMore = false;
              break;
            }
            
            const idsToDelete = data.map((row: any) => row.id).filter(id => id && typeof id === 'string' && id.trim() !== '');
            if (idsToDelete.length === 0) {
              hasMore = false;
              break;
            }
            
            const { error: deleteError } = await supabase
              .from('landing_forms')
              .delete()
              .in('id', idsToDelete);
              
            if (deleteError) {
              console.error("Erro ao excluir lote de registros na nuvem:", deleteError);
              throw deleteError;
            }
            
            deletedTotal += idsToDelete.length;
            setSyncProgress({
              loaded: deletedTotal,
              total: Math.max(totalToClear, deletedTotal),
              isResuming: false
            });
            
            if (data.length < BATCH_SIZE) {
              hasMore = false;
            }
            
            // Permite que o Event Loop respire para manter UI responsiva
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        } catch (batchErr) {
          console.warn("Falha no lote de limpeza. Tentando deleção universal de contingência...", batchErr);
          // Deleção universal de contingência compatível tanto com colunas tipo UUID quanto TEXT
          const { error: fallbackError } = await supabase
            .from('landing_forms')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
            
          if (fallbackError) {
            console.warn("Falha na deleção neq, tentando por intervalo temporal...", fallbackError);
            const { error: timeError } = await supabase
              .from('landing_forms')
              .delete()
              .gt('created_at', '1970-01-01T00:00:00Z');
              
            if (timeError) {
              throw timeError;
            }
          }
          deletedTotal = totalToClear;
        }
        
        setSyncProgress(null);
        console.log(`Sucesso: todas as ${deletedTotal} fichas foram limpas da nuvem.`);
      } catch (err: any) {
        console.error("Erro de conexão ao limpar Supabase:", err);
        setSyncError(`Erro ao limpar nuvem: ${getErrorMessage(err)}`);
        setSyncProgress(null);
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const handleGlobalExport = () => {
    if (forms.length === 0) return;
    exportToExcel(forms, `MPA_Piaui_Export_${new Date().toISOString().split('T')[0]}`);
  };

  const handleCloseQuickTips = () => {
    if (user) {
      localStorage.setItem(`fishery_seen_tips_${user.id || user.email}`, 'true');
    }
    setShowQuickTips(false);
  };

  const syncManual = async () => {
    const configErr = getSupabaseError();
    if (configErr) {
      setSyncError(configErr);
      showToast('error', 'Erro de Configuração', configErr);
      return;
    }
    if (!isSupabaseConfigured) {
      showToast('warning', 'Sem Configuração', 'O Supabase não está configurado.');
      return;
    }
    try {
      setIsSyncing(true);
      setSyncError(null);

      // Sincroniza fichas pendentes primeiro
      const pendingForms = forms.filter(f => f.isOfflinePending);
      if (pendingForms.length > 0) {
        showToast('info', 'Sincronizando Pendências', `Sincronizando ${pendingForms.length} ficha(s) offline pendente(s)...`);
        await insertMultipleSupabaseForms(pendingForms);
        const updatedForms = forms.map(f => {
          if (f.isOfflinePending) {
            return { ...f, isOfflinePending: false };
          }
          return f;
        });
        setForms(updatedForms);
        await dbSaveFormsBulk(updatedForms);
      }

      const cloudForms = await getSupabaseForms((incrementalForms, progress) => {
        setSyncProgress(progress);
      });
      const cloudFishermen = await getSupabaseFishermen();
      const cloudSpecies = await getSupabaseSpecies();
      setForms(cloudForms);
      setFishermen(cloudFishermen);
      if (cloudSpecies && cloudSpecies.length > 0) {
        setSpeciesList(cloudSpecies);
      }
      setSyncProgress(null);
      showToast('success', 'Sincronização Manual Concluída', 'Todos os dados locais foram sincronizados e atualizados com o servidor.');
    } catch (err: any) {
      console.error("Erro no sincronismo manual:", err);
      const errMsg = `Falha na conexão com o Supabase: ${getErrorMessage(err)}. Certifique-se de que executou os scripts SQL de criação de tabelas.`;
      setSyncError(errMsg);
      setSyncProgress(null);
      showToast('error', 'Falha na Sincronização', errMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  const NavItem = ({ icon: Icon, label, tab, className = "", style }: { icon: any, label: string, tab: typeof activeTab, className?: string, style?: React.CSSProperties }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap ${
        activeTab === tab 
          ? 'bg-blue-600 text-white shadow-md dark:shadow-none' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
      } ${className}`}
      style={style}
    >
      <Icon size={18} />
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );

  const handleLogout = async () => {
    try {
      setIsSyncing(true);
      
      // 1. Limpar caches locais e dados do usuário anterior
      await dbClearAllForms();
      await dbRemove('fishery_forms_sync_completed');
      await dbRemove('fishery_forms_last_sync_id');
      await dbRemove('fishery_fishermen');
      await dbRemove('fishery_species');
      
      // Limpar itens específicos de localStorage
      if (user?.id) {
        localStorage.removeItem(`fishery_local_profile_${user.id}`);
      }
      localStorage.removeItem('fishery_local_profile');
      localStorage.removeItem('fishery_forms');
      localStorage.removeItem('fishery_fishermen');
      localStorage.removeItem('fishery_species');
      sessionStorage.removeItem('fishery_skipped_auth');
      
      // 2. Limpar os estados do React
      setForms([]);
      setFishermen([]);
      
      // 3. Efetuar Sign Out no Supabase se configurado
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      setUser(null);
    } catch (err) {
      console.error("Erro ao deslogar:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Autenticando sessão...</span>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !user) {
    return (
      <LoginForm 
        onLoginSuccess={(usr) => {
          setUser(usr);
          localStorage.setItem('fishery_cached_user', JSON.stringify(usr));
          if (window.location.pathname.endsWith('/login') || window.location.hash === '#login') {
            window.history.pushState({}, '', window.location.origin);
          }
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-200">
      
      {/* SIDEBAR LATERAL (DESKTOP) */}
      <aside className="hidden md:flex flex-col items-center justify-between w-[90px] bg-white dark:bg-slate-900 border-r border-slate-200/85 dark:border-slate-800 py-8 shrink-0 select-none sticky top-0 h-screen z-40 shadow-xs">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Espaçador superior no lugar da logo removida */}
          <div className="h-4"></div>

          {/* Abas de Navegação */}
          <div className="flex flex-col items-center gap-5 w-full px-2">
            {[
              { id: 'dashboard', label: 'Dashboard / Análises', icon: LayoutDashboard },
              { id: 'form', label: 'Nova Ficha de Desembarque', icon: PlusCircle },
              { id: 'cadastros', label: 'Gerenciar Cadastros', icon: Database },
              { id: 'history', label: 'Minhas Fichas', icon: History },
              { id: 'bulk', label: 'Entrada em Lote', icon: TableProperties },
              { id: 'worms', label: 'Busca Científica WoRMS', icon: Globe }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative group flex items-center justify-center w-full">
                  <button
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-500 dark:hover:text-blue-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={24} />
                  </button>
                  {/* Tooltip on Hover */}
                  <div className="absolute left-20 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 translate-x-3 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botões do Rodapé do Sidebar */}
        <div className="flex flex-col items-center gap-5 w-full px-2">
          {/* Alternador de Tema */}
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-450 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer"
            >
              <Sparkles size={22} className={theme === 'dark' ? 'text-amber-400' : 'text-slate-400'} />
            </button>
            <div className="absolute left-20 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 translate-x-3 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50">
              Alternar Tema ({theme === 'light' ? 'Escuro' : 'Claro'})
            </div>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL (DIREITA) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* HEADER PARA MÓVEIS */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200/85 dark:border-slate-800 sticky top-0 z-50 px-4 md:hidden shadow-sm">
          <div className="h-[70px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              {!logoError ? (
                <img 
                  src={theme === 'dark' ? '/images/Design sem nome (2).png' : '/images/logo.png'} 
                  alt="Logo MPA" 
                  onError={() => setLogoError(true)}
                  className="w-auto h-10 object-contain"
                />
              ) : (
                <Anchor className="w-8 h-8 text-blue-600" />
              )}
            </div>

            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Menu de navegação mobile */}
          {isMobileMenuOpen && (
            <div className="py-4 border-t border-slate-150 dark:border-slate-800 animate-in slide-in-from-top duration-200">
              <nav className="flex flex-col gap-2">
                <NavItem icon={LayoutDashboard} label="Dashboard" tab="dashboard" />
                <NavItem icon={PlusCircle} label="Nova Ficha" tab="form" className="mx-0 -mt-2" style={{ marginTop: '-8px' }} />
                <NavItem icon={Database} label="Cadastros" tab="cadastros" className="-mt-2" style={{ marginTop: '-8px' }} />
                <NavItem icon={History} label="Minhas Fichas" tab="history" className="-mt-2" style={{ marginTop: '-8px' }} />
                <NavItem icon={TableProperties} label="Entrada em Lote" tab="bulk" className="-mt-2" style={{ marginTop: '-8px' }} />
                
                <button
                  type="button"
                  onClick={() => { setActiveTab('worms'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm -mt-2 cursor-pointer ${
                    activeTab === 'worms' ? 'text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/30' : 'text-blue-700 hover:text-blue-600'
                  }`}
                  style={{ marginTop: '-8px' }}
                >
                  <Globe size={18} />
                  <span>Busca WoRMS</span>
                </button>

                <NavItem icon={UserIcon} label="Meu Perfil" tab="profile" className="-mt-2" style={{ marginTop: '-8px' }} />

                {isSupabaseConfigured && user && (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-4"></div>
                    <div className="px-4 py-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-50 dark:bg-slate-850 p-1.5 rounded-xl text-blue-600">
                          <UserIcon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Conectado como</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate" title={user.email}>{user.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100/50 text-red-650 hover:text-red-750 font-bold text-xs rounded-xl transition-all border border-red-105 cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Sair do Sistema</span>
                      </button>
                    </div>
                  </>
                )}
              </nav>
            </div>
          )}
        </header>

        {/* CABEÇALHO DO CONTEÚDO (DESKTOP) */}
        <div className="hidden md:block bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/85 dark:border-slate-800 py-4 px-8 xl:px-12 shadow-xs select-none sticky top-0 z-50">
          <div className="max-w-full mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {!logoError ? (
                <img 
                  src={theme === 'dark' ? '/images/Design sem nome (2).png' : '/images/logo.png'} 
                  alt="Logo MPA" 
                  onError={() => setLogoError(true)}
                  style={{ width: '135px', height: '48px' }}
                  className="object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                  onClick={() => setActiveTab('dashboard')}
                  title="Ir para o Dashboard"
                />
              ) : (
                <Anchor 
                  className="w-10 h-10 text-blue-600 cursor-pointer transition-transform duration-300 hover:scale-[1.05]" 
                  onClick={() => setActiveTab('dashboard')} 
                />
              )}
            </div>
            
            {/* Ações Rápidas no Cabeçalho */}
            <div className="flex items-center gap-3">
              {activeTab === 'dashboard' && (
                <>
                  <button
                    onClick={handleGlobalExport}
                    disabled={forms.length === 0}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 font-extrabold text-xs uppercase tracking-wider border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 ${forms.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  >
                    <FileSpreadsheet size={18} />
                    <span>Exportar Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      const event = new CustomEvent('trigger-pdf-export');
                      window.dispatchEvent(event);
                    }}
                    disabled={forms.length === 0}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 font-extrabold text-xs uppercase tracking-wider border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 ${forms.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    title="Baixar Relatório em PDF"
                  >
                    <FileText size={18} />
                    <span>Baixar PDF</span>
                  </button>
                </>
              )}

              {user && (
                <div className="flex items-center gap-2 pl-3 border-l border-slate-200/85 dark:border-slate-800">
                  {/* Botão Meu Perfil */}
                  <button
                    onClick={() => setActiveTab('profile')}
                    title="Meu Perfil"
                    className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
                      activeTab === 'profile'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 hover:text-blue-600 dark:hover:text-blue-400 text-slate-500 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <UserIcon size={18} />
                  </button>

                  {/* Botão Sair */}
                  <button
                    onClick={handleLogout}
                    title="Sair do Sistema"
                    className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 text-slate-400 dark:text-slate-450 border border-slate-200/80 dark:border-slate-700 hover:border-red-250 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progresso de Sincronização */}
        {syncProgress && syncProgress.total > 0 && (
          <div className="h-[3px] bg-blue-100 dark:bg-slate-800 overflow-hidden shrink-0">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(1, (syncProgress.loaded / syncProgress.total) * 100))}%` }}
            ></div>
          </div>
        )}

        {/* CONTAINER DO CONTEÚDO PRINCIPAL */}
        <main className="flex-1 p-4 md:p-8 xl:p-12 overflow-y-auto">
          <div className={`${(activeTab === 'bulk' || activeTab === 'worms') ? 'max-w-full' : 'max-w-7xl px-4 sm:px-6 lg:px-8'} mx-auto`}>
            {/* Alerta de Modo Offline */}
            {showOfflineNotification && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex gap-3">
                <div className="p-2 bg-amber-100/60 rounded-xl text-amber-700 shrink-0">
                  <WifiOff size={18} className="animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-sm text-amber-900">Você está utilizando o sistema em Modo Offline</h4>
                  <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                    Seu aplicativo carregou instantaneamente a partir do armazenamento interno. Suas novas fichas, cadastros e alterações serão salvas com segurança no seu dispositivo (IndexedDB) e serão sincronizadas com a nuvem (Supabase) assim que sua internet for restabelecida.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowOfflineNotification(false)} 
                className="text-amber-400 hover:text-amber-750 p-1 rounded-xl hover:bg-amber-100/50 transition-colors shrink-0"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          )}



          {syncError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-3">
                <div className="p-2 bg-red-100/60 rounded-xl text-red-600 shrink-0">
                  <CloudOff size={18} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-sm text-slate-800">Sincronização no Servidor</h4>
                  <p className="text-xs text-red-650 leading-relaxed font-semibold">{syncError}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSyncError(null)} 
                className="text-red-350 hover:text-red-700 p-1 rounded-xl hover:bg-red-100/50 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <React.Suspense fallback={<TabLoadingSpinner />}>
            {activeTab === 'dashboard' && <Dashboard forms={forms} onNewForm={handleNewForm} speciesList={speciesList} />}
            {activeTab === 'form' && (
              <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                <LandingFormWizard 
                  onSave={saveForm} 
                  onCancel={handleGoToDashboard} 
                  fishermen={fishermen} 
                  speciesList={speciesList}
                />
              </div>
            )}
            {activeTab === 'cadastros' && (
              <div className="animate-in slide-in-from-bottom duration-300">
                <CadastrosTab 
                  fishermen={fishermen}
                  onAddFisherman={addFisherman}
                  onDeleteFisherman={deleteFisherman}
                  onUpdateFisherman={updateFisherman}
                  speciesList={speciesList}
                  onAddSpecies={addSpecies}
                  onDeleteSpecies={deleteSpecies}
                />
              </div>
            )}
            {activeTab === 'bulk' && (
              <BulkImportGrid 
                onSave={saveMultipleForms} 
                onCancel={handleGoToDashboard} 
                speciesList={speciesList}
                fishermen={fishermen}
              />
            )}
            {activeTab === 'history' && (
              <MyFormsList 
                forms={forms} 
                onDelete={deleteForm} 
                onDeleteMultiple={deleteMultipleForms} 
                onUpdate={updateForm} 
                onClearAll={clearAllForms} 
                fishermen={fishermen}
                onUpdateFisherman={updateFisherman}
                onDeleteFisherman={deleteFisherman}
                speciesList={speciesList}
                onUpdateSpecies={addSpecies}
                onDeleteSpecies={deleteSpecies}
              />
            )}
            {activeTab === 'profile' && (
              <UserProfileTab 
                user={user} 
                onLogout={handleLogout} 
                onBackToDashboard={handleGoToDashboard} 
                onShowTips={handleShowTips}
                onInstallApp={deferredPrompt ? handleInstallApp : undefined}
                currentTheme={theme}
                onToggleTheme={setTheme}
                formsCount={
                  forms.filter(f => {
                    const isMine = user?.email && f.identification?.createdByEmail?.toLowerCase() === user.email.toLowerCase();
                    return isMine && f.identification?.isManualEntry === true;
                  }).length
                }
              />
            )}

            {activeTab === 'worms' && (
              <WormsSpeciesSearchCard />
            )}
          </React.Suspense>
        </div>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/85 dark:border-slate-800 py-4 px-4 sm:px-6 md:px-8 xl:px-12 select-none mt-auto" style={{ height: '68.7227px' }}>
        <div className="max-w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center sm:text-left">
            <Anchor size={14} className="text-blue-500 hover:rotate-12 transition-transform shrink-0" />
            <span>Sistema Web de Monitoramento de Desembarque Pesqueiro • MPA Piauí</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status Sincronismo e Quantidade de Fichas */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-3.5 pr-4 py-1.5 rounded-full flex items-center gap-2 shadow-xs">
              <div className={`w-2 h-2 rounded-full h-[8px] w-[8px] shrink-0 ${isSyncing ? 'bg-amber-500 animate-spin border-t-transparent' : 'bg-blue-500 animate-pulse'}`}></div>
              <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-450 uppercase tracking-widest leading-none">
                {syncProgress 
                  ? `${syncProgress.isResuming ? 'Retomando' : 'Sincronizando'}: ${syncProgress.loaded.toLocaleString('pt')} / ${syncProgress.total.toLocaleString('pt')}` 
                  : isSyncing 
                    ? 'Sincronizando...' 
                    : `${forms.length.toLocaleString('pt')} ${forms.length === 1 ? 'ficha' : 'fichas'}${isSupabaseConfigured && !user ? ' (Local)' : ''}`
                }
              </span>
            </div>

            {/* Botão de Sincronização Manual */}
            {isSupabaseConfigured && user && (
              <button
                type="button"
                onClick={syncManual}
                disabled={isSyncing}
                title="Sincronizar dados agora com o Supabase"
                className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>
      </footer>

      </div>

      {/* Supabase Schema / Instructions Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl my-8 overflow-hidden shadow-2xl border border-slate-200 font-sans">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <div>
                <h2 className="text-xl font-black uppercase flex items-center gap-2"><Database size={22} /> Sincronizar com seu Supabase</h2>
                <p className="text-xs text-blue-100 mt-0.5">Siga as instruções abaixo para ativar salvamento online permanente</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSchemaModal(false)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto text-slate-700">
              <div className="space-y-4 font-sans">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block font-bold">Passo 1: Onde encontrar os dados no painel do Supabase</span>
                <p className="text-xs leading-relaxed">
                  Não se preocupe, a URL não tem o texto literal "vossoprojeto". Ela é uma URL única gerada para o seu projeto pelo Supabase. Veja como achar o seu:
                </p>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 text-xs leading-relaxed">
                  <p>
                    1. Faça login no seu painel do <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Supabase Dashboard</a> e clique no seu projeto.
                  </p>
                  <p>
                    2. No menu lateral esquerdo (que tem os ícones), passe o mouse e clique no ícone da <strong>Engrenagem (Project Settings)</strong> ⚙️ localizado bem abaixo.
                  </p>
                  <p>
                    3. No menu lateral de configurações que se abre, clique na opção <strong>API</strong>.
                  </p>
                  <p>
                    4. No centro da tela, você verá o campo <strong>Project Config / URL</strong>. Ele se parece com: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono font-semibold">https://xxxxxxxxxxxxxxxxxxxx.supabase.co</code> (onde os 'x' são letras e números aleatórios gerados para você). <strong>Copie essa URL!</strong>
                  </p>
                  <p>
                    5. Logo abaixo, sob o título <strong>Project API keys</strong>, localize a chave com a etiqueta <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded tracking-wide text-[10px]">anon public</span>. É um texto bem longo. <strong>Copie essa chave!</strong>
                  </p>
                </div>
              </div>
 
              <div className="space-y-2">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block font-bold">Passo 2: Onde colar no AI Studio</span>
                <p className="text-xs leading-relaxed">
                  Abra o menu de configurações da aplicação aqui no painel do <strong>Google AI Studio</strong> (as variáveis de ambiente do seu projeto) e defina estes dois valores:
                </p>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono space-y-1 block shadow-inner leading-relaxed">
                  <div>VITE_SUPABASE_URL = <span className="text-amber-400 font-semibold">[cole a URL https://...supabase.co que você acabou de copiar]</span></div>
                  <div>VITE_SUPABASE_ANON_KEY = <span className="text-amber-400 font-semibold">[cole o texto longo da chave anon public]</span></div>
                </div>
              </div>
 
              <div className="space-y-2">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block font-bold">Passo 3: Criar as Tabelas no Supabase SQL Editor</span>
                <p className="text-xs leading-relaxed">
                  Acesse o painel do seu Supabase, clique em <strong>SQL Editor</strong>, crie uma nova query e execute o código abaixo para criar a estrutura das tabelas exatamente como o sistema exige:
                </p>
                <div className="relative group bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-56 shadow-inner leading-relaxed">
                  <pre className="whitespace-pre">{`-- 1. Criar tabela de pescadores
create table if not exists fishermen (
  id text primary key,
  name text not null,
  location text not null,
  gear_type text not null,
  vessel_type text not null,
  vessel_name text,
  propulsion_type text not null,
  gear_details jsonb not null default '{}'::jsonb
);

-- 2. Criar tabela de fichas de desembarque
create table if not exists landing_forms (
  id text primary key,
  id_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  identification jsonb not null default '{}'::jsonb,
  fishing jsonb not null default '{}'::jsonb,
  gear jsonb not null default '{}'::jsonb,
  production jsonb not null default '[]'::jsonb,
  period text
);

-- DICA: Se o seu banco já existe, basta executar estas linhas abaixo para adicionar as novas colunas:
-- alter table landing_forms add column if not exists period text;
-- alter table fishermen add column if not exists vessel_name text;

-- 3. Criar tabela de espécies (Atualizada com classificação e links)
create table if not exists species (
  id text primary key,
  common_name text not null,
  scientific_name text not null,
  images text[],
  family text,
  order_name text,
  group_name text,
  conservation_url text,
  see_more_url text
);

-- DICA: Se a tabela species já existe, execute estas linhas para adicionar as novas colunas:
-- alter table species add column if not exists images text[];
-- alter table species add column if not exists family text;
-- alter table species add column if not exists order_name text;
-- alter table species add column if not exists group_name text;
-- alter table species add column if not exists conservation_url text;
-- alter table species add column if not exists see_more_url text;

-- 4. Criar tabela pública para dados de login de usuários (Perfis)
create table if not exists user_profiles (
  id text primary key,
  email text not null,
  full_name text,
  phone text,
  office text,
  region text,
  avatar_url text,
  last_login timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DICA: Se a tabela user_profiles já existe no seu banco de dados, execute estes comandos no editor SQL:
-- alter table user_profiles add column if not exists full_name text;
-- alter table user_profiles add column if not exists phone text;
-- alter table user_profiles add column if not exists office text;
-- alter table user_profiles add column if not exists region text;
-- alter table user_profiles add column if not exists avatar_url text;

-- 5. ATIVAR Row Level Security (RLS) para proteger os dados
--    (NUNCA desative RLS em produção — isso expõe todos os dados publicamente)
alter table fishermen enable row level security;
alter table landing_forms enable row level security;
alter table species enable row level security;
alter table user_profiles enable row level security;

-- 6. Remover permissões excessivas do anon (público)
revoke all on table fishermen from anon;
revoke all on table landing_forms from anon;
revoke all on table species from anon;
revoke all on table user_profiles from anon;

-- 7. Políticas: usuários autenticados têm acesso total aos dados
create policy "authenticated_all_fishermen" on fishermen for all to authenticated using (true) with check (true);
create policy "authenticated_all_landing_forms" on landing_forms for all to authenticated using (true) with check (true);
create policy "authenticated_all_species" on species for all to authenticated using (true) with check (true);

-- 8. Política para user_profiles: cada usuário vê/apenas seu próprio perfil
create policy "users_own_profile_select" on user_profiles for select to authenticated using (auth.uid() = id);
create policy "users_own_profile_insert" on user_profiles for insert to authenticated with check (auth.uid() = id);
create policy "users_own_profile_update" on user_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 9. Todas as 134 espécies recomendadas já foram cadastradas diretamente na sua base de dados.`}</pre>
                </div>
              </div>
 
              <div className="space-y-2">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block font-bold">Passo 4: Sincronize Seus Dados!</span>
                <p className="text-xs leading-relaxed">
                  Uma vez que as variáveis forem preenchidas, o sistema automaticamente detectará o Supabase e sincronizará todos os seus dados online. Você poderá alternar ou continuar usando offline se houver queda de internet, sincronizando os dados sob demanda!
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                type="button" 
                onClick={() => setShowSchemaModal(false)} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-xs"
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Dicas Rápidas (Quick Tips) */}
      {showQuickTips && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl my-8 overflow-hidden shadow-2xl border border-slate-200 font-sans animate-in zoom-in-95 duration-250">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white relative">
              <div className="space-y-1">
                <span className="bg-white/20 text-white font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-sans">Onboarding</span>
                <h2 className="text-xl font-black uppercase flex items-center gap-2 mt-1">
                  <BookOpen size={22} className="text-blue-100 shrink-0" /> Dicas Rápidas de Início
                </h2>
                <p className="text-xs text-blue-100">Bem-vindo ao Sistema de Desembarque Pesqueiro MPA Piauí</p>
              </div>
              <button 
                type="button" 
                onClick={handleCloseQuickTips} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white absolute top-4 right-4"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content Body */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto text-slate-700">
              
              {/* Tip 1: Register first form */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 text-blue-600 text-xs font-black">1</span>
                  Como registrar a sua primeira ficha?
                </h3>
                
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed">
                  <p className="font-semibold text-slate-600">
                    Você tem duas formas eficientes de registrar as informações de pesca no sistema:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-2 hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-wider text-[10px]">
                        <PlusCircle size={14} /> Formulário Passo a Passo
                      </div>
                      <p className="text-slate-500 font-medium">
                        Clique em <strong className="text-slate-750">"Nova Ficha"</strong> no topo. O assistente integrado guiará você por 4 etapas estruturadas: Identificação, Dados da Pescaria, Apetrechos (onde os campos se adaptam para cada tipo de Arte de Pesca) e Produção de Espécies.
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-2 hover:border-emerald-300 transition-colors">
                      <div className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-wider text-[10px]">
                        <TableProperties size={14} /> Entrada Rápida em Lote
                      </div>
                      <p className="text-slate-500 font-medium">
                        Tem dezenas de fichas prontas no Excel? Vá em <strong className="text-slate-750">"Entrada em Lote"</strong> no menu, copie os dados e cole diretamente na tabela dinâmica do sistema para processamento super-rápido.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tip 2: Data sync */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 text-blue-600 text-xs font-black">2</span>
                  Como funciona a sincronização de dados?
                </h3>
                
                <div className="bg-blue-50/45 border border-blue-100/60 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-blue-100/60 rounded-lg text-blue-600 shrink-0 mt-0.5">
                      <Wifi size={14} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Modo Offline por Padrão</h4>
                      <p className="text-slate-500 font-medium mt-0.5">
                        O sistema foi desenhado para ser resiliente em locais remotos. Seus registros são guardados de forma segura localmente no navegador (IndexedDB) para que você não perca trabalho mesmo que fique sem conexão.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Sincronismo com a Nuvem</h4>
                      <p className="text-slate-500 font-medium mt-0.5">
                        Assim que houver internet estável e você estiver conectado, suas fichas salvam e sincronizam automaticamente na nuvem (Supabase).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <div className="p-1.5 bg-amber-550 text-amber-700 bg-amber-50 rounded-lg shrink-0 mt-0.5">
                      <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Controle e Envio Manual</h4>
                      <p className="text-slate-500 font-medium mt-0.5">
                        No rodapé (footer) do sistema, há um indicador que exibe a quantidade de fichas salvas. Você pode clicar no botão de girar/atualizar <strong className="text-slate-755">Sincronizar (🔄)</strong> ao lado dele para forçar o envio e baixar alterações de forma manual a qualquer instante.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                type="button" 
                onClick={handleCloseQuickTips} 
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} /> Entendido, vamos começar!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
