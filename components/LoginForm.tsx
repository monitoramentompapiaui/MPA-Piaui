import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  LogIn, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  HelpCircle, 
  Shield, 
  ArrowRight,
  Database,
  Info,
  User as UserIcon
} from 'lucide-react';
import { supabase, isSupabaseConfigured, getSupabaseError } from '../utils/supabase';

// Função determinística para gerar hash local de credenciais e evitar salvar senhas em texto puro
const computeOfflineHash = (email: string, password: string): string => {
  const str = `${email.toLowerCase().trim()}:${password}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte para inteiro de 32 bits
  }
  return hash.toString(36);
};

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  const configError = getSupabaseError();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setError("O Supabase não está configurado. Por favor, configure as chaves ambientais no painel do AI Studio.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Entrar
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.user) {
        // Armazena credenciais locais de forma segura (hash) para autenticação offline futura
        const emailLower = email.toLowerCase().trim();
        const offlineHash = computeOfflineHash(email, password);
        localStorage.setItem(`fishery_offline_hash_${emailLower}`, offlineHash);
        localStorage.setItem(`fishery_offline_user_${emailLower}`, JSON.stringify(data.user));

        onLoginSuccess(data.user);
      } else {
        throw new Error("Erro desconhecido ao autenticar.");
      }
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      const errMsg = err?.message ? String(err.message).toLowerCase() : "";

      // Detecta erro de rede ou de falta de conexão com o Supabase (offline)
      const isNetworkError = !navigator.onLine || 
        errMsg.includes("failed to fetch") || 
        errMsg.includes("network error") || 
        errMsg.includes("network_error") ||
        errMsg.includes("load failed") ||
        errMsg.includes("cors") ||
        errMsg.includes("timeout") ||
        err?.status === 0;

      if (isNetworkError) {
        const emailLower = email.toLowerCase().trim();
        const cachedHash = localStorage.getItem(`fishery_offline_hash_${emailLower}`);
        const cachedUserStr = localStorage.getItem(`fishery_offline_user_${emailLower}`);

        if (cachedHash && cachedUserStr) {
          const enteredHash = computeOfflineHash(email, password);
          if (enteredHash === cachedHash) {
            try {
              const cachedUser = JSON.parse(cachedUserStr);
              setSuccessMessage("Entrando no modo offline (credenciais locais verificadas!).");
              setTimeout(() => {
                onLoginSuccess(cachedUser);
              }, 1200);
              return;
            } catch (e) {
              console.error("Erro ao ler dados locais offline:", e);
            }
          } else {
            setError("E-mail ou senha incorretos para o acesso offline.");
            setIsLoading(false);
            return;
          }
        } else {
          setError("Você está offline e não possui um login ou cadastro validado neste dispositivo. Conecte-se à internet para efetuar o primeiro acesso e validar seu cadastro.");
          setIsLoading(false);
          return;
        }
      }
      
      if (errMsg.includes("invalid login credentials") || errMsg.includes("invalid_credentials") || errMsg.includes("invalid-credentials") || errMsg.includes("credenciais inválidas") || errMsg.includes("incorrect_password") || errMsg.includes("user not found")) {
        setError("E-mail ou senha incorretos. Verifique suas credenciais de acesso ou consulte o administrador do sistema.");
      } else if (errMsg.includes("user already registered") || errMsg.includes("already registered") || errMsg.includes("email already in use") || errMsg.includes("email_taken")) {
        setError("Este e-mail já está cadastrado no sistema.");
      } else if (errMsg.includes("password should be") || errMsg.includes("weak_password") || errMsg.includes("password_too_short")) {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else if (errMsg.includes("email not confirmed") || errMsg.includes("email_not_confirmed")) {
        setError("E-mail não confirmado. Por favor, verifique sua caixa de entrada para confirmar seu cadastro.");
      } else if (errMsg.includes("rate limit") || errMsg.includes("too many requests")) {
        setError("Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes e tente novamente.");
      } else {
        setError(err?.message || "Erro na conexão com o servidor de autenticação.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden selection:bg-blue-100">
      
      {/* DYNAMIC AMBIENT BACKDROP LIGHTS */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-blue-500/10 blur-[110px] pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-[380px] h-[380px] rounded-full bg-teal-400/10 blur-[130px] pointer-events-none animate-pulse duration-[12000ms]"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-10 px-6 sm:px-12 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-[0_25px_60px_rgba(15,23,42,0.06)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] hover:shadow-[0_35px_70px_rgba(15,23,42,0.09)] dark:hover:shadow-[0_35px_70px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 transition-all duration-300 space-y-6 relative overflow-hidden">
          
          {/* DECORATIVE TOP STRIP */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400"></div>

          {/* INSTITUTIONAL BRANDING HEADER */}
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex mb-4 transition-all duration-300 hover:scale-105">
              <img 
                referrerPolicy="no-referrer"
                src={typeof window !== 'undefined' && (localStorage.getItem('fishery_theme') === 'dark' || document.documentElement.classList.contains('dark')) ? "/images/Design sem nome (2).png" : "/images/logo.png"} 
                alt="Logo MPA Piauí" 
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'text-blue-600 font-display font-black text-2xl tracking-wider';
                    fallback.innerText = 'MPA PIAUÍ';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
            
            <h3 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">MPA Piauí</h3>
            <p className="text-xs font-semibold text-slate-550 dark:text-slate-400 mt-1 max-w-[300px]">
              Projeto Monitoramento de Desembarques Pesqueiros do Piauí
            </p>
          </div>

          {/* STATUS NOTIFICATIONS */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-750 dark:text-red-400 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold leading-relaxed animate-in fade-in py-3.5 shadow-sm">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes("O Supabase não está configurado") && (
                  <button 
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="block text-blue-600 dark:text-blue-400 hover:text-blue-750 underline font-extrabold mt-1.5 text-[10px] uppercase tracking-wider"
                  >
                    {showInstructions ? "Ocultar Instruções ↑" : "Como configurar? ↓"}
                  </button>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold leading-relaxed animate-in fade-in py-3.5 shadow-sm">
              <Info size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* HELP TIP ABOUT SUPABASE CONFIG */}
          {(!isSupabaseConfigured || configError) && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-905 dark:text-amber-400 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed animate-in fade-in shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200">Variáveis de Ambiente Necessárias</h4>
                  <p className="mt-1 font-medium text-slate-655 dark:text-slate-400">
                    O painel corporativo requer que as chaves do Supabase estejam configuradas nas variáveis de ambiente do projeto para persistência segura na nuvem.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full text-center text-[10px] font-black text-amber-700 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-400 uppercase tracking-widest hover:underline pt-1 flex items-center justify-center gap-1.5"
              >
                <span>{showInstructions ? "Ocultar manual de configuração ↑" : "Ver manual de configuração passo a passo ↓"}</span>
              </button>
            </div>
          )}

          {/* HOW-TO GUIDE */}
          {showInstructions && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-xs space-y-3.5 font-medium text-slate-705 dark:text-slate-400 animate-in slide-in-from-top duration-300">
              <h5 className="font-display font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase text-[10px] tracking-widest text-blue-600 dark:text-blue-400 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <Database size={13} /> Configuração Passo a Passo
              </h5>
              <p className="leading-relaxed">
                1. Entre no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 underline font-bold">Supabase Dashboard</a> e clique no seu projeto.
              </p>
              <p className="leading-relaxed">
                2. Acesse <strong>Project Settings</strong> (ícone da engrenagem) &gt; <strong>API</strong>.
              </p>
              <p className="leading-relaxed">
                3. Copie a <strong>Project URL</strong> e a chave <strong>anon public</strong> de <em>Project API keys</em>.
              </p>
              <p className="leading-relaxed">
                4. Preencha na aba Configurações de Ambientações do AI Studio:
              </p>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[10px] space-y-1 block shadow-inner leading-relaxed overflow-x-auto">
                <div>VITE_SUPABASE_URL = <span className="text-amber-400">https://...supabase.co</span></div>
                <div>VITE_SUPABASE_ANON_KEY = <span className="text-amber-400">sua-chave-anon-public-longa</span></div>
              </div>
              <div className="border-t border-slate-200/60 dark:border-slate-800 pt-2.5 text-[10px] text-slate-500 dark:text-slate-500 leading-normal">
                💡 <strong>Dica de Autenticação Supabase:</strong> Lembre-se de verificar que o fornecedor "Email Auth" está habilitado em seu painel no Supabase, sob a aba de <em>Authentication &gt; Providers</em>.
              </div>
            </div>
          )}

          {/* CREDENTIAL FORM */}
          <form className="space-y-5 pt-2" onSubmit={handleAuth}>
            <div>
              <label htmlFor="email" className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest pl-1">
                E-mail Administrativo
              </label>
              <div className="mt-2 relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@mpa.gov.br"
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50/60 hover:bg-slate-50 focus:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest pl-1">
                Senha de Acesso
              </label>
              <div className="mt-2 relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="block w-full pl-11 pr-11 py-3.5 bg-slate-50/60 hover:bg-slate-50 focus:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-650 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-md cursor-pointer text-sm"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Entrar no Painel</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SECURITY SECURITY FOOTER */}
          <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase select-none">
            <Shield size={12} className="text-slate-350 dark:text-slate-650 shrink-0 mt-[-1px]" />
            <span>Acesso Seguro SSL</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginForm;
