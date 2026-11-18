import React, { useRef, useEffect, useState } from 'react';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToastContext } from '../../hooks/useToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useLocale } from '../../localization/useLocale';
import { useBranding } from '../settings/useBranding';
import { ApiError } from '../../lib/http/api';
import { cn } from '../../utils/cn';

const DotMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Create dots for the world map
  const generateDots = (width: number, height: number) => {
    const dots = [];
    const gap = 12;
    const dotRadius = 1;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const isInMapShape =
          (x < width * 0.25 && x > width * 0.05 && y < height * 0.4 && y > height * 0.1) ||
          (x < width * 0.25 && x > width * 0.15 && y < height * 0.8 && y > height * 0.4) ||
          (x < width * 0.45 && x > width * 0.3 && y < height * 0.35 && y > height * 0.15) ||
          (x < width * 0.5 && x > width * 0.35 && y < height * 0.65 && y > height * 0.35) ||
          (x < width * 0.7 && x > width * 0.45 && y < height * 0.5 && y > height * 0.1) ||
          (x < width * 0.8 && x > width * 0.65 && y < height * 0.8 && y > height * 0.6);

        if (isInMapShape && Math.random() > 0.3) {
          dots.push({
            x,
            y,
            radius: dotRadius,
            opacity: Math.random() * 0.5 + 0.2,
          });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(canvas.parentElement as Element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId: number;

    function drawDots() {
      ctx!.clearRect(0, 0, dimensions.width, dimensions.height);

      dots.forEach((dot) => {
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(37, 99, 235, ${dot.opacity})`;
        ctx!.fill();
      });
    }

    function animate() {
      drawDots();
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const { signIn } = useAuth();
  const { t, locale, switchLocale } = useLocale();
  const { branding } = useBranding();
  const toast = useToastContext();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setFailure('');
    try {
      const user = await signIn(email.trim(), password);
      toast.success(t('auth.welcome'), user.fullName);
      navigate('/');
    } catch (error) {
      const message =
        error instanceof ApiError && error.code === 'INVALID_CREDENTIALS'
          ? t('auth.invalidCredentials')
          : error instanceof ApiError && error.code === 'TOO_MANY_ATTEMPTS'
            ? t('auth.tooManyAttempts')
            : t('auth.unavailable');
      setFailure(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7FE] px-4 py-8 dark:bg-gray-950">
      <div className="flex w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-blue-600 p-12 text-white lg:flex">
          <div className="absolute inset-0 opacity-40">
            <DotMap />
          </div>
          <div className="relative">
            <img
              src={branding?.logoUrl ?? '/logo.png'}
              alt={branding?.projectName ?? t('app.name')}
              className="h-12 max-w-[220px] object-contain"
            />
          </div>
          <div className="relative py-16">
            <h2 className="text-4xl font-bold leading-tight">{t('landing.title')}</h2>
            <p className="mt-5 text-lg leading-relaxed text-blue-100">{t('landing.description')}</p>
          </div>
          <button
            onClick={() => navigate('/landing')}
            className="relative inline-flex items-center gap-2 self-start rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            {t('auth.backToLanding')}
            <ArrowRight className="h-4 w-4 rtl-flip" />
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full flex-col justify-center p-6 sm:p-12 lg:w-1/2"
        >
          <div className="mb-8 flex items-center justify-between gap-3">
            <img
              src={branding?.logoUrl ?? '/logo.png'}
              alt={branding?.projectName ?? t('app.name')}
              className="h-10 max-w-[160px] object-contain lg:hidden"
            />
            <button
              onClick={() => switchLocale(locale === 'en' ? 'ar' : 'en')}
              className="ms-auto rounded-xl px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('auth.signIn')}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('auth.accountAccess')}</p>
          {failure && (
            <div
              role="alert"
              className="mt-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              {failure}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Input
              id="login-email"
              label={t('auth.email')}
              type="email"
              autoComplete="username"
              value={email}
              maxLength={254}
              required
              onChange={(event) => setEmail(event.target.value)}
            />
            <div className="relative">
              <Input
                id="login-password"
                label={t('auth.password')}
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                maxLength={128}
                required
                onChange={(event) => setPassword(event.target.value)}
                className={cn('pe-12')}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((value) => !value)}
                aria-label={isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute bottom-3 end-4 text-gray-400 hover:text-gray-600"
              >
                {isPasswordVisible ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
              </button>
            </div>
            <Button type="submit" loading={isLoading} className="w-full h-12">
              {t('auth.signIn')}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
