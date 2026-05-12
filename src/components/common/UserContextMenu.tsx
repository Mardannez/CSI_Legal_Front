'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface UserProfile {
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  isGlobalAdmin?: boolean;
}

interface UserContextMenuProps {
  user?: UserProfile | null; // <-- ahora tolera undefined/null
  onLogout?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

const UserContextMenu = ({
  user,
  onLogout,
  onProfileClick,
  onSettingsClick,
  className = '',
}: UserContextMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Usuario seguro para evitar que el sistema rompa mientras hidrata sesión
  const safeUser: UserProfile = user ?? {
    name: 'Usuario',
    email: '',
    role: '',
    avatar: '',
    isGlobalAdmin: false,
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);

    if (onLogout) {
      onLogout();
    } else {
      router.push('/login');
    }
  };

  const handleProfileClick = () => {
    setIsOpen(false);

    if (onProfileClick) {
      onProfileClick();
    }
  };

  const handleSettingsClick = () => {
    setIsOpen(false);

    if (onSettingsClick) {
      onSettingsClick();
    }
  };

const getInitials = (name: string): string => {
  return (name || 'U')
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Si el AuthContext aún no manda isGlobalAdmin,
// usamos también el role como respaldo.
const isSuperAdminByRole =
  (safeUser.role || '').toUpperCase() === 'SUPER_ADMIN';

const canViewAdministration = !!safeUser.isGlobalAdmin || isSuperAdminByRole;

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Menú de usuario"
      >
        <div className="flex items-center gap-3">
          {safeUser.avatar ? (
            <AppImage
              src={safeUser.avatar}
              alt={`Avatar de ${safeUser.name}`}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
              {getInitials(safeUser.name)}
            </div>
          )}

          <div className="hidden lg:block text-left">
            <p className="text-sm font-medium text-foreground leading-tight">
              {safeUser.name}
            </p>
            {safeUser.role && (
              <p className="text-xs text-muted-foreground font-caption">
                {safeUser.role}
              </p>
            )}
          </div>
        </div>

        <Icon
          name={isOpen ? 'ChevronUpIcon' : 'ChevronDownIcon'}
          size={16}
          className="text-muted-foreground hidden lg:block"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-popover border border-border rounded-md shadow-elevation-2 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-popover-foreground">
              {safeUser.name}
            </p>

            {safeUser.email && (
              <p className="text-xs text-muted-foreground font-caption mt-1">
                {safeUser.email}
              </p>
            )}

            {safeUser.role && (
              <p className="text-xs text-muted-foreground font-caption mt-1">
                {safeUser.role}
              </p>
            )}
          </div>

          <div className="py-2">
          
          
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
            >
              <Icon name="UserIcon" size={18} className="text-muted-foreground" />
              <span>Mi Perfil</span>
            </button>

            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
            >
              <Icon name="Cog6ToothIcon" size={18} className="text-muted-foreground" />
              <span>Configuración</span>
            </button>

         {canViewAdministration && (
          <>
            <Link
              href="/user-management"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
            >
              <Icon name="UsersIcon" size={18} className="text-muted-foreground" />
              <span>Mantenimiento de Usuarios</span>
            </Link>

            <Link
              href="/roles-management"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
            >
              <Icon name="ShieldCheckIcon" size={18} className="text-muted-foreground" />
              <span>Mantenimiento de Roles</span>
            </Link>

            <Link
              href="/permissions-management"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
            >
              <Icon name="KeyIcon" size={18} className="text-muted-foreground" />
              <span>Mantenimiento de Permisos</span>
            </Link>
            <Link
              href="/license-management"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
            >
              <Icon name="BriefcaseIcon" size={18} className="text-muted-foreground" />
              <span>Mantenimiento de Licencias</span>
            </Link>
          </>
        )}
          </div>

        {canViewAdministration && (
        <div className="border-t border-border py-2">
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Administración
            </p>

            <Link
              href="/country-management"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-2 py-2 text-sm text-popover-foreground hover:bg-muted rounded-md transition-smooth"
            >
              <Icon
                name="GlobeAmericasIcon"
                size={18}
                className="text-muted-foreground"
              />
              <span>Gestión de Países</span>
            </Link>

            <Link
              href="/project-maintenance"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-2 py-2 text-sm text-popover-foreground hover:bg-muted rounded-md transition-smooth"
            >
              <Icon
                name="BriefcaseIcon"
                size={18}
                className="text-muted-foreground"
              />
              <span>Mantenimiento de Proyectos</span>
            </Link>

            <Link
              href="/requirements-maintenance"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-2 py-2 text-sm text-popover-foreground hover:bg-muted rounded-md transition-smooth"
            >
              <Icon
                name="ClipboardDocumentListIcon"
                size={18}
                className="text-muted-foreground"
              />
              <span>Mantenimiento de Requisitos</span>
            </Link>
          </div>
        </div>
        )}

          <div className="border-t border-border py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-muted transition-smooth"
            >
              <Icon
                name="ArrowRightOnRectangleIcon"
                size={18}
                className="text-error"
              />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserContextMenu;