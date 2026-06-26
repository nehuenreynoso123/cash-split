import { useState, type FormEvent } from 'react';
import { signin } from '../../lib/api';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Completá todos los campos');
      return;
    }

    setLoading(true);
    try {
      await signin(email, password);
      window.location.href = '/dashboard/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Branding */}
      <div className="flex flex-col items-center mb-stack_lg">
        <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-stack_md shadow-sm">
          <span className="material-symbols-outlined text-on-primary text-[32px]">
            account_balance_wallet
          </span>
        </div>
        <h1 className="font-display-lg text-display-lg text-primary tracking-tight">
          cash_split
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant mt-1">
          Capital Management
        </p>
      </div>

      {/* Auth Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
        <div className="mb-stack_lg">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Iniciar sesión
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Ingresá tus credenciales para acceder a tu panel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-stack_md">
          {error && (
            <div className="bg-error-container text-on-error-container text-body-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label
              className="font-label-caps text-label-caps text-on-surface-variant uppercase"
              htmlFor="email"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <span
                className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
                  focusedField === 'email' ? 'text-secondary' : 'text-outline'
                }`}
              >
                mail
              </span>
              <input
                className="w-full pl-10 pr-4 py-3 bg-white border border-outline-variant rounded-lg font-body-base text-body-base focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all placeholder:text-outline-variant"
                id="email"
                type="email"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label
                className="font-label-caps text-label-caps text-on-surface-variant uppercase"
                htmlFor="password"
              >
                Contraseña
              </label>
              <a className="font-body-sm text-body-sm text-secondary hover:underline" href="#">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative">
              <span
                className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors ${
                  focusedField === 'password' ? 'text-secondary' : 'text-outline'
                }`}
              >
                lock
              </span>
              <input
                className="w-full pl-10 pr-12 py-3 bg-white border border-outline-variant rounded-lg font-body-base text-body-base focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all placeholder:text-outline-variant"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2 py-1">
            <input
              className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary"
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label className="font-body-sm text-body-sm text-on-surface-variant" htmlFor="remember">
              Recordar mi sesión
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary text-on-secondary py-3.5 rounded-lg font-headline-md text-headline-md hover:bg-secondary-container hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-stack_md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Ingresando...
              </>
            ) : (
              <>
                <span>Ingresar</span>
                <span className="material-symbols-outlined text-[20px]">login</span>
              </>
            )}
          </button>
        </form>

        {/* Social Login */}
        <div className="relative my-stack_lg">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface-container-lowest px-4 font-label-caps text-label-caps text-outline uppercase">
              O continuar con
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-stack_md">
          <button className="flex items-center justify-center gap-2 border border-outline-variant rounded-lg py-2.5 hover:bg-surface-container-low transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-body-base text-body-base">Google</span>
          </button>
          <button className="flex items-center justify-center gap-2 border border-outline-variant rounded-lg py-2.5 hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            <span className="font-body-base text-body-base">SSO</span>
          </button>
        </div>
      </div>

      {/* Register link */}
      <div className="text-center mt-stack_lg">
        <p className="font-body-base text-body-base text-on-surface-variant">
          ¿No tenés una cuenta?{' '}
          <a className="text-secondary font-bold hover:underline" href="#">
            Registrarse
          </a>
        </p>
      </div>

      {/* Status */}
      <div className="mt-12 flex items-center justify-center gap-4 text-outline opacity-60">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-body-sm text-body-sm">Sistemas operativos</span>
        </div>
        <span className="text-outline-variant">|</span>
        <span className="font-body-sm text-body-sm">v2.4.0</span>
      </div>
    </div>
  );
}
