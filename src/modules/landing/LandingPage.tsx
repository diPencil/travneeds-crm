import { Link } from 'react-router-dom';
import { ArrowRight, Globe, LayoutDashboard, Shield, Users } from 'lucide-react';
import { workspaceSections } from '../../config/workspace';
import { useLocale } from '../../localization/useLocale';
import { useBranding } from '../settings/useBranding';
import './landing.css';

export function LandingPage() {
  const { t, locale, switchLocale } = useLocale();
  const { branding } = useBranding();
  const name = branding?.projectName ?? t('app.name');
  return (
    <div className="min-h-screen bg-[#0a0e27] text-white overflow-x-hidden">
      <nav className="navbar-blur border-b border-white/5 bg-[#0a0e27]/80">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/landing"
            className="flex min-w-0 items-center gap-3 font-display text-xl font-bold"
          >
            <img
              src={branding?.logoUrl ?? '/logo.png'}
              alt={name}
              className="h-10 max-w-[180px] object-contain"
            />
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => switchLocale(locale === 'en' ? 'ar' : 'en')}
              className="rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/10"
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <Link
              to="/login"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
            >
              {t('auth.signIn')}
            </Link>
          </div>
        </div>
      </nav>
      <main>
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 end-0 h-[480px] w-[480px] rounded-full bg-blue-600/10 blur-[100px]"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="mb-4 text-sm font-semibold text-blue-400">{name}</p>
              <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
                {t('landing.title')}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
                {t('landing.description')}
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-7 py-3.5 font-semibold shadow-xl shadow-blue-600/25 transition-colors hover:bg-blue-700"
              >
                {t('auth.signIn')}
                <ArrowRight className="h-5 w-5 rtl-flip" />
              </Link>
            </div>
            <div className="glass-card rounded-3xl p-6 sm:p-8">
              <LayoutDashboard className="mb-5 h-12 w-12 text-blue-400" />
              <h2 className="text-2xl font-semibold">{t('landing.workspaceTitle')}</h2>
              <p className="mt-3 leading-relaxed text-gray-400">
                {t('landing.workspaceDescription')}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Users, key: 'landing.crm' },
                  { icon: Shield, key: 'landing.accounts' },
                  { icon: Globe, key: 'landing.languages' },
                ].map((item) => (
                  <div key={item.key} className="rounded-2xl border border-white/10 p-4">
                    <item.icon className="mb-3 h-6 w-6 text-blue-400" />
                    <p className="text-sm font-medium">
                      {t(item.key as 'landing.crm' | 'landing.accounts' | 'landing.languages')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="border-y border-white/5 bg-[#0c1030] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold">{t('landing.sectionsTitle')}</h2>
            <p className="mt-3 text-gray-400">{t('landing.sectionsDescription')}</p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workspaceSections.map((section) => (
                <article key={section.id} className="glass-card rounded-3xl p-6">
                  <h3 className="text-lg font-semibold">{t(section.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {t(section.descriptionKey)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-7xl px-4 py-8 text-sm text-gray-500 sm:px-6 lg:px-8">
        {name}
      </footer>
    </div>
  );
}
