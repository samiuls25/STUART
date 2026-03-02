import React from "react"
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, Heart, Search, Users, Compass, Map, Calendar, Settings } from "lucide-react";
import { motion } from "framer-motion";
import AuthModal from "../auth/AuthModal.tsx";
import { useAuth } from "../../lib/AuthContext";

const navItems = [
  { path: "/", label: "Explore", icon: Compass },
  { path: "/map", label: "Map", icon: Map },
  { path: "/hangouts", label: "Hangouts", icon: Calendar },
  { path: "/friends", label: "Friends", icon: Users },
  { path: "/saved", label: "Saved", icon: Heart },
  { path: "/profile", label: "Profile", icon: User },
];

const Navbar = () => {
  const [showAuth, setShowAuth] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                <span className="font-heading font-bold text-xl text-primary-foreground">S</span>
              </div>
              <span className="font-heading font-bold text-xl text-foreground tracking-tight">
                STUART
              </span>
            </Link>

            {/* Center Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link flex items-center gap-2 ${isActive ? "active" : ""}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden lg:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    className="input-field w-56 pl-10 pr-4 py-2 text-sm"
                  />
                </div>
              </div>

              {user && (
                <Link
                  to="/settings"
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground max-w-[140px] truncate block" title={user.email}>
                    {user.email}
                  </span>
                  <button
                    onClick={signOut}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
};

export default Navbar;
