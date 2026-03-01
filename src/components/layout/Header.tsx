import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Warehouse,
  Package,
  Map,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useT } from '../../i18n';
import styles from './Header.module.css';

interface HeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
  onNavigate: () => void;
}

export function Header({ menuOpen, onMenuToggle, onNavigate }: HeaderProps) {
  const t = useT();

  const links: { to: string; label: string; icon: LucideIcon }[] = [
    { to: '/dashboard', label: t.nav_dashboard, icon: LayoutDashboard },
    { to: '/tasks', label: t.nav_tasks, icon: List },
    { to: '/hideout', label: t.nav_hideout, icon: Warehouse },
    { to: '/items', label: t.nav_items, icon: Package },
    { to: '/map', label: t.nav_map, icon: Map },
    { to: '/settings', label: t.nav_settings, icon: Settings },
  ];

  return (
    <header className={styles.header}>
      <button
        className={styles.menuBtn}
        onClick={onMenuToggle}
        aria-label={menuOpen ? t.menu_close : t.menu_open}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <span className={styles.logo}>Tarkov Kappa Navi</span>
      <nav className={styles.nav} data-mobile-open={menuOpen || undefined}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
            }
            onClick={onNavigate}
          >
            <l.icon size={16} />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
