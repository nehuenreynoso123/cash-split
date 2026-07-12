import { signout } from '../../lib/api';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
}

export default function Header({ pageTitle, pageSubtitle }: HeaderProps) {
  const handleLogout = async () => {
    await signout();
    window.location.href = '/';
  };

  return (
    <header className="flex justify-between items-center h-header_height px-container_padding w-full sticky top-0 bg-surface border-b border-outline-variant z-40">
      <div className="flex items-center gap-4">
        <h2 className="font-headline-md text-headline-md text-primary">
          {pageTitle}
        </h2>
        {pageSubtitle && (
          <>
            <div className="h-4 w-px bg-outline-variant" />
            <span className="text-on-surface-variant font-body-base">
              {pageSubtitle}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline group-focus-within:text-secondary transition-colors">
            <span className="material-symbols-outlined text-base">search</span>
          </span>
          <input
            className="bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2 text-body-base focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all w-64"
            placeholder="Buscar..."
            type="text"
          />
        </div>

        <div className="flex items-center gap-3 border-l border-outline-variant pl-6">
          <button
            onClick={handleLogout}
            className="text-on-surface-variant hover:text-primary transition-colors font-body-base cursor-pointer"
          >
            Cerrar sesión
          </button>
          <img
            alt="User profile"
            className="w-8 h-8 rounded-full"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhjOa4jsaYfsNt-2iPw6L0VT_4qtqnkSOOq2oMMc0Bw67S5Np5dSmRBlqr_RFtodoCOcFfs5MSIjj5IolrvYpDJ9GujYRO3hAORaSELZt2m8Jd3MN67I5y4CujnevGrygsjT8PBxTTfOHvSM-H5TWF6-gPNDiEoFt6NrIJjTILqqhZ_bxZ01C5PMG6zJkamq8A94neSm8D5xaWgjSmY-9EySy4kUyM4mmBJEq_JwFHPJNOH7UzTWbcRczU4Y4GbuWBY3Z0tCLlYU4"
          />
        </div>
      </div>
    </header>
  );
}
