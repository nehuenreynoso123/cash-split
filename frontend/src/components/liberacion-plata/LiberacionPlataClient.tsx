import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function LiberacionPlataClient() {
  useAuthRedirect();

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-8 text-center">
      <span className="material-symbols-outlined text-4xl text-outline">monetization_on</span>
      <h3 className="mt-3 font-body-base text-on-surface text-lg font-semibold">
        Liberaciones de Plata
      </h3>
      <p className="mt-1 font-body-base text-on-surface-variant">
        Sección en construcción. Acá vas a ver las liberaciones de plata.
      </p>
    </div>
  );
}