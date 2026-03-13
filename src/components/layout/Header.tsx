"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Bell, Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logOut } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>("light");

  // Inicializa tema a partir do localStorage / preferência do sistema
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const stored = window.localStorage.getItem("artnacare-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial: ThemeMode = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";

    setTheme(initial);
    if (initial === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    window.localStorage.setItem("artnacare-theme", next);
  };

  return (
    <header className="h-16 border-b border-border bg-card/95 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="text-lg font-semibold text-foreground hidden sm:block">
          Bem-vindo de volta{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
        </div>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full hover:bg-muted hidden sm:flex">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3 border-l border-border pl-4">
          <div className="hidden md:flex flex-col items-end justify-center">
            <p className="text-sm font-medium text-foreground leading-none">{user?.displayName || "User"}</p>
            <p className="text-xs text-muted-foreground truncate w-32 mt-1 block">{user?.email}</p>
          </div>
          <Avatar className="h-9 w-9 border border-border shadow-sm ring-2 ring-transparent transition-all hover:ring-emerald-100">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logOut()}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
