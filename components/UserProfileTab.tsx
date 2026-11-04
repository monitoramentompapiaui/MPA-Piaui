import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  LogOut, 
  ArrowLeft,
  Sun,
  Moon,
  Mail,
  FileText,
  Download,
  Monitor,
  Smartphone,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { getUserProfile, updateUserProfile, supabase, isSupabaseConfigured } from '../utils/supabase';
import { fetchLatestAppRelease, FALLBACK_APP_RELEASE, LatestAppRelease } from '../utils/appReleases';

interface UserProfileTabProps {
  user: any;
  onLogout: () => void;
  onBackToDashboard: () => void;
  formsCount: number;
  onShowTips?: () => void;
  onInstallApp?: () => void;
  currentTheme?: 'light' | 'dark';
  onToggleTheme?: (theme: 'light' | 'dark') => void;
}

const formatReleaseDate = (value: string | null): string => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const UserProfileTab: React.FC<UserProfileTabProps> = ({ 
  user, 
  onLogout, 
  onBackToDashboard,
  formsCount,
  currentTheme = 'light',
  onToggleTheme
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields (Only Name and Phone)
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  // Password Change Fields
  const [showPasswordForm, setShowPasswordForm] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Central de downloads dos aplicativos
  const [appRelease, setAppRelease] = useState<LatestAppRelease>(FALLBACK_APP_RELEASE);
  const [isLoadingRelease, setIsLoadingRelease] = useState<boolean>(false);

  // Load Profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setError(null);
      
      if (isSupabaseConfigured && user) {
        setIsLoading(true);
        try {
          const profile = await getUserProfile(user.id);
          if (profile) {
            setFullName(profile.full_name || '');
            setPhone(profile.phone || '');
          }
        } catch (err: any) {
          console.error("Erro ao buscar dados do perfil:", err);
          setError("Erro na conexão ao carregar o perfil do Supabase.");
        } finally {
          setIsLoading(false);
        }
      } else {
        // Modo Local/Offline
        const localProfile = localStorage.getItem('fishery_local_profile');
        if (localProfile) {
          try {
            const parsed = JSON.parse(localProfile);
            setFullName(parsed.full_name || '');
            setPhone(parsed.phone || '');
          } catch (e) {
            console.error("Erro ao carregar dados do perfil local:", e);
          }
        }
      }
    };

    fetchProfile();
  }, [user]);

  const loadAppRelease = async () => {
    setIsLoadingRelease(true);
    try {
      const release = await fetchLatestAppRelease();
      setAppRelease(release);
    } finally {
      setIsLoadingRelease(false);
    }
  };

  useEffect(() => {
    void loadAppRelease();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const profileData = {
      full_name: fullName,
      phone: phone,
      office: '',
      region: '',
      avatar_url: 'captain',
    };

    if (isSupabaseConfigured && user) {
      try {
        const { error: saveError } = await updateUserProfile(user.id, {
          email: user.email,
          ...profileData
        });

        if (saveError) {
          if (saveError.message === "NEED_SQL_COLUMNS") {
            setSuccess("Informações salvas localmente com sucesso!");
          } else if (saveError.message && saveError.message.includes("relation") && saveError.message.includes("does not exist")) {
            setError("Tabela 'user_profiles' não encontrada no Supabase. Execute as migrações SQL necessárias.");
          } else {
            setError(saveError.message || "Erro desconhecido ao salvar.");
          }
        } else {
          setSuccess("Informações de perfil atualizadas com sucesso!");
        }
      } catch (err: any) {
        setError(err.message || "Erro inesperado ao salvar no Supabase.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Modo Local/Offline
      try {
        localStorage.setItem('fishery_local_profile', JSON.stringify(profileData));
        setSuccess("Perfil atualizado no navegador com sucesso!");
      } catch (err: any) {
        setError("Erro ao salvar perfil localmente.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!oldPassword) {
      setPasswordError("Por favor, digite a senha antiga para verificação.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas inseridas não coincidem.");
      return;
    }

    setIsChangingPassword(true);
    try {
      if (isSupabaseConfigured && supabase && user?.email) {
        // Etapa de verificação: reautenticar com a senha antiga
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPassword,
        });

        if (verifyError) {
          setPasswordError("A senha antiga inserida está incorreta.");
          setIsChangingPassword(false);
          return;
        }

        // Se a senha antiga está correta, atualiza para a nova senha
        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passError) {
          setPasswordError(passError.message);
        } else {
          setPasswordSuccess("Sua senha foi alterada com sucesso!");
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(() => setShowPasswordForm(false), 2000);
        }
      } else {
        // Simulação offline
        setPasswordSuccess("Senha alterada localmente com sucesso!");
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordForm(false), 2000);
      }
    } catch (err: any) {
      setPasswordError(err.message || "Erro inesperado ao alterar a senha.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "US";
  };

  const getDisplayHeaderName = () => {
    if (fullName) return fullName;
    if (user?.email) {
      const namePart = user.email.split('@')[0];
      const cleanParts = namePart.split(/[._-]/).filter(Boolean);
      if (cleanParts.length > 0) {
        return cleanParts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      }
    }
    return 'Usuário do Sistema';
  };

  const initials = getInitials();

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-32 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all border border-slate-200 dark:border-slate-800 cursor-pointer w-fit"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao Dashboard</span>
        </button>
      </div>

      {/* DASHBOARD PROFILE SUMMARY */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl border border-slate-200/10 dark:border-slate-800/80 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {/* Simple Profile Initials Avatar */}
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-black text-white shrink-0 select-none shadow-md">
              {initials}
            </div>

            {/* User Information */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none uppercase">
                {getDisplayHeaderName()}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-2 text-xs text-slate-300 font-semibold uppercase tracking-wide">
                {user?.email && (
                  <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 font-bold">
                    <Mail size={13} className="text-blue-400 shrink-0" />
                    <span className="lowercase">{user.email}</span>
                  </span>
                )}
                {phone && (
                  <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 font-bold">
                    <Phone size={13} className="text-emerald-400 shrink-0" />
                    <span>{phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fichas Registradas Card Component mimicking the user's uploaded image exactly */}
          <div className="bg-slate-950/40 dark:bg-slate-900/40 border border-white/10 dark:border-slate-800/60 rounded-2xl p-4 flex items-center gap-4 shrink-0 min-w-[200px] shadow-inner select-none">
            <div className="w-12 h-12 rounded-xl bg-blue-950/50 flex items-center justify-center border border-blue-900/40 text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Fichas Registradas
              </div>
              <div className="text-xl font-black text-white leading-none">
                {formsCount} <span className="text-sm font-semibold text-slate-300 lowercase">{formsCount === 1 ? 'ficha' : 'fichas'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* EDIT PROFILE DETAILS FORM */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-8">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2.5">
              <User size={20} className="text-blue-600 dark:text-blue-400" />
              Informações do Usuário
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-1 font-semibold">
              Gerencie suas informações cadastrais de contato do sistema.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-750 dark:text-red-400 p-4 rounded-2xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed animate-in fade-in">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 p-4 rounded-2xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">{success}</div>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-550 uppercase tracking-widest">
                  Nome Completo
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User size={15} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="block w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-550 uppercase tracking-widest">
                  Telefone de Contato
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone size={15} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="block w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto flex justify-center items-center gap-2 py-3 px-6 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Salvar Dados</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* SIDE BAR (SETTINGS & SECURITY) */}
        <div className="space-y-6">
          
          {/* VISUAL THEME SELECTOR - Icon Only Button representing Moon and Sun */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl p-6 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">
                Tema de Visualização
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold leading-relaxed">
                Alternar claro/escuro
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => onToggleTheme?.(currentTheme === 'light' ? 'dark' : 'light')}
              className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-all border border-slate-200 dark:border-slate-750 cursor-pointer flex items-center justify-center shadow-md shrink-0"
              title={currentTheme === 'light' ? "Mudar para Tema Escuro" : "Mudar para Tema Claro"}
            >
              {currentTheme === 'light' ? (
                <Moon size={20} className="text-slate-700 fill-slate-700/10" />
              ) : (
                <Sun size={20} className="text-amber-400 fill-amber-400/20" />
              )}
            </button>
          </div>

          {/* PASSWORD RESET CARD WITH OLD PASSWORD VERIFICATION */}
          {isSupabaseConfigured && user && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(!showPasswordForm);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                className="w-full flex items-center justify-between text-[11px] font-black uppercase text-slate-850 dark:text-slate-200 tracking-widest hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Key size={14} className="text-slate-400" /> Alterar Senha
                </span>
                <span className="text-slate-400 dark:text-slate-550 font-bold text-sm">
                  {showPasswordForm ? '▲' : '▼'}
                </span>
              </button>

              {showPasswordForm && (
                <form onSubmit={handleChangePassword} className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
                  {passwordError && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-250 text-red-750 p-2.5 text-[11px] rounded-xl font-bold">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 text-emerald-800 p-2.5 text-[11px] rounded-xl font-bold">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-450 dark:text-slate-550 uppercase">Senha Antiga</label>
                    <input
                      type="password"
                      required
                      placeholder="Sua senha atual"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-450 dark:text-slate-550 uppercase">Nova Senha</label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 dígitos"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-450 dark:text-slate-550 uppercase">Confirmar Senha</label>
                    <input
                      type="password"
                      required
                      placeholder="Redigite a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white font-black text-[10px] tracking-widest uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Processando...' : 'Atualizar Senha'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STANDALONE LOGOUT BUTTON (LEAVING ONLY LOGOUT BUTTON, NO EXTRAS) */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-55 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 font-black text-xs tracking-widest uppercase rounded-[2rem] transition-all border border-red-150 dark:border-red-900/50 cursor-pointer shadow-md"
          >
            <LogOut size={15} />
            <span>Sair da Conta</span>
          </button>

        </div>
      </div>

      {/* CENTRAL DE DOWNLOADS DOS APLICATIVOS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2.5">
              <Download size={20} className="text-blue-600 dark:text-blue-400" />
              Central de Downloads
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-1 font-semibold">
              Baixe a versão mais atualizada do Infopesca para o seu dispositivo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAppRelease()}
            disabled={isLoadingRelease}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer w-fit"
            title="Verificar a versão mais recente publicada"
          >
            <RefreshCw size={14} className={isLoadingRelease ? 'animate-spin' : ''} />
            {isLoadingRelease ? 'Verificando...' : 'Verificar atualização'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Versão: {isLoadingRelease ? 'consultando...' : appRelease.version}
          </span>

          {appRelease.publishedAt && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Publicada em {formatReleaseDate(appRelease.publishedAt)}
            </span>
          )}

          <a
            href={appRelease.releasePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ExternalLink size={11} />
            Ver todas as versões
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={appRelease.windows.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/50">
                <Monitor size={22} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">Windows</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                  Instalador .exe {appRelease.windows.size ? `• ${formatFileSize(appRelease.windows.size)}` : ''}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md group-hover:bg-blue-700 transition-all shrink-0">
              <Download size={14} />
              Baixar .exe
            </span>
          </a>

          <a
            href={appRelease.android.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-900/50">
                <Smartphone size={22} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">Android</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                  Aplicativo .apk {appRelease.android.size ? `• ${formatFileSize(appRelease.android.size)}` : ''}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md group-hover:bg-emerald-700 transition-all shrink-0">
              <Download size={14} />
              Baixar .apk
            </span>
          </a>
        </div>

        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 leading-relaxed">
          Os links apontam sempre para a última versão publicada. A versão web é atualizada automaticamente; os aplicativos desktop e Android são gerados a cada nova publicação no repositório do projeto.
        </p>
      </div>

    </div>
  );
};

export default UserProfileTab;
