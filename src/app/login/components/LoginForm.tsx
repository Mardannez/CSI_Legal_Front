'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

interface LoginFormProps {
  onSuccess?: () => void;
}

interface FormData {
  usuario: string;
  password: string;
}

interface FormErrors {
  usuario?: string;
  password?: string;
  general?: string;
}

const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    usuario: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loading } = useAuth();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.usuario.trim()) {
      newErrors.usuario = 'El usuario es obligatorio';
    } else if (formData.usuario.trim().length < 3) {
      newErrors.usuario = 'El usuario debe tener al menos 3 caracteres';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 4) {
      newErrors.password = 'La contraseña debe tener al menos 4 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }

    if (errors.general) {
      setErrors((prev) => ({
        ...prev,
        general: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await login({
        usuario: formData.usuario.trim(),
        password: formData.password,
      });

      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al iniciar sesión. Por favor, inténtelo de nuevo.';

      setErrors({
        general: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    alert('Funcionalidad de recuperación de contraseña próximamente disponible');
  };

  const isBusy = isSubmitting || loading;

  if (!isHydrated) {
    return (
      <div className="w-full max-w-md mx-auto bg-card rounded-lg shadow-elevation-2 p-8">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-lg shadow-elevation-2 p-8 border border-border">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/assets/images/CSI-LOGO-05-1771034129124.png"
            alt="CSI Consultores y Soluciones Integrales Logo"
            width={120}
            height={120}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Bienvenido</h1>
        <p className="text-sm text-muted-foreground font-caption">
          Sistema de Gestión de Cumplimiento Legal
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {errors.general && (
          <div className="bg-error/10 border border-error rounded-md p-4 flex items-start gap-3">
            <Icon
              name="ExclamationTriangleIcon"
              size={20}
              className="text-error flex-shrink-0 mt-0.5"
            />
            <p className="text-sm text-error font-caption">{errors.general}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="usuario" className="block text-sm font-medium text-foreground">
            Usuario
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="UserIcon" size={20} className="text-muted-foreground" />
            </div>
            <input
              type="text"
              id="usuario"
              name="usuario"
              value={formData.usuario}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-4 py-3 bg-background border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth ${
                errors.usuario ? 'border-error' : 'border-input'
              }`}
              placeholder="admin"
              disabled={isBusy}
              autoComplete="username"
            />
          </div>
          {errors.usuario && (
            <p className="text-sm text-error font-caption flex items-center gap-1 mt-1">
              <Icon name="ExclamationCircleIcon" size={16} className="flex-shrink-0" />
              {errors.usuario}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="LockClosedIcon" size={20} className="text-muted-foreground" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-12 py-3 bg-background border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth ${
                errors.password ? 'border-error' : 'border-input'
              }`}
              placeholder="••••••••"
              disabled={isBusy}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isBusy}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Icon
                name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'}
                size={20}
                className="text-muted-foreground hover:text-foreground transition-smooth"
              />
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-error font-caption flex items-center gap-1 mt-1">
              <Icon name="ExclamationCircleIcon" size={16} className="flex-shrink-0" />
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isBusy ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              <span>Iniciando sesión...</span>
            </>
          ) : (
            <>
              <Icon name="ArrowRightOnRectangleIcon" size={20} />
              <span>Iniciar Sesión</span>
            </>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-smooth"
            disabled={isBusy}
          >
            ¿Olvidó su contraseña?
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-border">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Icon name="ShieldCheckIcon" size={20} className="text-success" />
            <span className="text-xs text-muted-foreground font-caption">
              Seguridad Empresarial
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="LockClosedIcon" size={20} className="text-success" />
            <span className="text-xs text-muted-foreground font-caption">
              Cifrado SSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;