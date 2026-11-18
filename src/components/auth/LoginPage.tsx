import React, { useRef, useEffect, useState } from "react";
import { Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useToastContext } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "../../utils/cn";


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
          ((x < width * 0.25 && x > width * 0.05) && (y < height * 0.4 && y > height * 0.1)) ||
          ((x < width * 0.25 && x > width * 0.15) && (y < height * 0.8 && y > height * 0.4)) ||
          ((x < width * 0.45 && x > width * 0.3) && (y < height * 0.35 && y > height * 0.15)) ||
          ((x < width * 0.5 && x > width * 0.35) && (y < height * 0.65 && y > height * 0.35)) ||
          ((x < width * 0.7 && x > width * 0.45) && (y < height * 0.5 && y > height * 0.1)) ||
          ((x < width * 0.8 && x > width * 0.65) && (y < height * 0.8 && y > height * 0.6));

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

    const resizeObserver = new ResizeObserver(entries => {
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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId: number;

    function drawDots() {
      ctx!.clearRect(0, 0, dimensions.width, dimensions.height);

      dots.forEach(dot => {
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const toast = useToastContext();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        setErrors({ general: error.message });
      } else if (data.user) {
        const userName = data.user.user_metadata?.full_name || 'Super Admin';
        toast.success(
          `Welcome back, ${userName}!`,
          "Let's make today productive and great.",
          4000
        );

        setTimeout(() => {
          navigate('/');
        }, 100);
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex-1 flex w-full items-center justify-center max-w-5xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-[92%] sm:w-full max-w-[22rem] sm:max-w-md lg:max-w-5xl overflow-hidden rounded-3xl lg:rounded-[2rem] flex flex-col lg:flex-row bg-white dark:bg-gray-900 shadow-2xl mx-auto"
        >
          {/* Left side - Map */}
          <div className="hidden lg:block w-1/2 h-[700px] relative overflow-hidden border-r border-gray-100 dark:border-gray-800">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-gray-900">
              <DotMap />

              {/* Logo and text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="-mb-12 h-64 w-64"
                >
                  <DotLottieReact
                    src="https://lottie.host/3e696992-3a0e-4b9b-95b4-543cf6b7433e/6VwhQTbVzu.json"
                    loop
                    autoplay
                  />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="text-4xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300"
                >
                  Travneeds System
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-base text-center text-gray-700 dark:text-gray-300 max-w-sm leading-relaxed"
                >
                  Integrated Management System for Travel & Tourism. Connect, manage, and grow your global operations seamlessly.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.5 }}
                  className="mt-8"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@travneeds.com');
                      setPassword('password123');
                      setErrors({});
                    }}
                    className="px-6 py-2.5 bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-full text-sm font-semibold text-blue-900 dark:text-blue-100 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span className="text-base">🔑</span>
                    <span>Fill Demo Credentials</span>
                  </button>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Right side - Sign In Form */}
          <div className="w-full lg:w-1/2 p-5 sm:p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-gray-900">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Mobile-only Lottie */}
              <div className="lg:hidden flex justify-center mb-0">
                <div className="h-40 w-40 -mb-8">
                  <DotLottieReact
                    src="https://lottie.host/3e696992-3a0e-4b9b-95b4-543cf6b7433e/6VwhQTbVzu.json"
                    loop
                    autoplay
                  />
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-gray-900 dark:text-white text-center sm:text-left">Welcome back</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-5 sm:mb-8 text-sm sm:text-base text-center sm:text-left">Sign in to your account</p>

              {errors.general && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                    <p className="text-sm text-red-800 dark:text-red-300">{errors.general}</p>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 text-gray-700 dark:text-gray-300 shadow-sm font-medium"
                  onClick={() => toast.info('Google Sign-In', 'Google authentication will be available soon.')}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fillOpacity=".54"
                    />
                    <path
                      fill="#4285F4"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#34A853"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                    <path fill="#EA4335" d="M1 1h22v22H1z" fillOpacity="0" />
                  </svg>
                  <span>Login with Google</span>
                </button>
              </div>

              <div className="relative my-6 sm:my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">or sign in with email</span>
                </div>
              </div>

              <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-blue-500">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className={cn(
                      "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white w-full h-12 rounded-full focus:border-blue-500 focus:ring-blue-500",
                      errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    )}
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password <span className="text-blue-500">*</span>
                    </label>
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={isPasswordVisible ? "text" : "password"}
                      value={password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter your password"
                      required
                      className={cn(
                        "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white w-full h-12 rounded-full pr-12 focus:border-blue-500 focus:ring-blue-500",
                        errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      )}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                      {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                  )}
                </div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onHoverStart={() => setIsHovered(true)}
                  onHoverEnd={() => setIsHovered(false)}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 relative overflow-hidden text-white rounded-full transition-all duration-300 border-0",
                      isHovered && !isLoading ? "shadow-lg shadow-blue-500/30" : ""
                    )}
                  >
                    <span className="flex items-center justify-center">
                      {isLoading ? 'Signing in...' : 'Sign in'}
                      {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                    </span>
                    {isHovered && !isLoading && (
                      <motion.span
                        initial={{ left: "-100%" }}
                        animate={{ left: "100%" }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        style={{ filter: "blur(8px)" }}
                      />
                    )}
                  </Button>
                </motion.div>

                <div className="relative my-6 lg:hidden">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@travneeds.com');
                    setPassword('password123');
                    setErrors({});
                  }}
                  className="lg:hidden w-full h-11 sm:h-12 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span className="text-lg">🔑</span>
                  <span>Fill Demo Credentials</span>
                </button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="mt-8 mb-4 text-center space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2026 Travneeds System. All rights reserved.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Powered by <a href="https://dipencil.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">diPencil Studio</a>
        </p>
      </div>
    </div>
  );
};
