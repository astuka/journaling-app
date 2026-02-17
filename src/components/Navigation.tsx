import { NavLink } from 'react-router-dom';
import './Navigation.css';

export function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-brand">
        <span className="brand-icon">✦</span>
        <span className="brand-text">Reflections</span>
      </div>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Journal
        </NavLink>
        <NavLink to="/questions" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Question Bank
        </NavLink>
        <NavLink to="/canvas" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Canvas
        </NavLink>
      </div>
    </nav>
  );
}
