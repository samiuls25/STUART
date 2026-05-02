import React from "react"
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, Heart, Users, Compass, Map, Calendar, Settings, Bell, Menu } from "lucide-react";
import { motion } from "framer-motion";
import AuthModal from "../auth/AuthModal.tsx";
import { useAuth } from "../../lib/AuthContext";
import { useNotificationCount } from "../../hooks/use-notifications";
import ThemeToggle from "./ThemeToggle.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet.tsx";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotificationCount();
  const location = useLocation();

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[72px] gap-2">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow shrink-0">
                <span className="font-heading font-bold text-xl text-primary-foreground">S</span>
              </div>
              <span className="font-heading font-bold text-xl text-foreground tracking-tight truncate">
                STUART
              </span>
            </Link>

            {/* Center Navigation - desktop */}
            <div className="hidden md:flex flex-1 justify-center items-center gap-1 min-w-0">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link flex items-center gap-2 ${isActive ? "active" : ""}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 md:gap-3 shrink-0">
              <ThemeToggle />

              {!user && (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="md:hidden btn-primary px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0"
                >
                  Sign In
                </button>
              )}

              {user && (
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-[18px] text-center font-semibold">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {user && (
                <Link
                  to="/settings"
                  className="hidden md:flex p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Settings className="w-5 h-5" />
                </Link>
              )}

              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open navigation menu"
                    className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="flex flex-col w-[min(100vw-2rem,320px)] sm:max-w-sm">
                  <SheetHeader className="text-left">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 mt-6 flex-1 overflow-y-auto">
                    {navItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                    {user && (
                      <Link
                        to="/settings"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted md:hidden"
                      >
                        <Settings className="w-5 h-5 shrink-0" />
                        Settings
                      </Link>
                    )}
                  </nav>

                  <div className="border-t border-border pt-4 mt-auto shrink-0 space-y-3">
                    {user ? (
                      <>
                        <p className="text-xs text-muted-foreground truncate px-1" title={user.email}>
                          {user.email}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void signOut();
                            setMobileNavOpen(false);
                          }}
                          className="btn-secondary w-full px-4 py-2.5 text-sm"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileNavOpen(false);
                          setShowAuth(true);
                        }}
                        className="btn-primary w-full px-4 py-2.5 text-sm"
                      >
                        Sign In
                      </button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm text-muted-foreground max-w-[140px] lg:max-w-[200px] truncate block" title={user.email}>
                    {user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="hidden md:inline-flex btn-primary px-4 py-2 text-sm whitespace-nowrap"
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
