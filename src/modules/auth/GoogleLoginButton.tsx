import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { apiRequest } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useLocale } from '../../localization/useLocale';
import { useAuth } from './useAuth';

export function GoogleLoginButton({ link = false }: { link?: boolean }) {
  const [params] = useSearchParams();
  const { isRTL } = useLocale();
  const text = (en: string, ar: string) => (isRTL ? ar : en);
  const { csrfToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const resource = useApiResource<{ available: boolean; linked: boolean }>(
    link ? '/auth/google/link' : '/auth/google/availability',
  );
  const callback = params.get('google');
  if (!resource.data?.available && (!callback || link)) return null;
  if (resource.data?.linked && link)
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-300">
        {text('Google account linked', 'حساب Google مربوط')}
      </p>
    );
  async function start() {
    setBusy(true);
    setError(false);
    try {
      const { url } = await apiRequest<{ url: string }>(
        link ? '/auth/google/link' : '/auth/google/start',
        { method: 'POST', csrfToken: link ? (csrfToken ?? undefined) : undefined },
      );
      window.location.assign(url);
    } catch {
      setBusy(false);
      setError(true);
    }
  }
  return (
    <div className="space-y-2">
      {resource.data?.available && (
        <Button
          type="button"
          variant="outline"
          className={link ? '' : 'w-full'}
          loading={busy}
          onClick={() => void start()}
        >
          {link
            ? text('Link your Google account', 'اربط حساب Google')
            : text('Sign in with Google', 'تسجيل الدخول بـ Google')}
        </Button>
      )}
      {(error || (callback && !link)) && (
        <p role="alert" className="text-sm text-rose-600">
          {callback === 'not-linked'
            ? text(
                'Sign in with your password first and link Google from your profile.',
                'ادخل بكلمة المرور الأول واربط Google من البروفايل.',
              )
            : text(
                'Could not complete Google sign-in. Try again or use your password.',
                'تعذّر تسجيل الدخول بـ Google. حاول تاني أو استخدم كلمة المرور.',
              )}
        </p>
      )}
    </div>
  );
}
