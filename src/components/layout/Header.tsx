"use client";

import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Bell } from "lucide-react";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logOut } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="text-lg font-semibold text-slate-800 hidden sm:block">
          Bem-vindo de volta{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
        </div>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        <Button variant="ghost" size="icon" className="text-slate-500 rounded-full hover:bg-slate-100 hidden sm:flex">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
          <div className="hidden md:flex flex-col items-end justify-center">
            <p className="text-sm font-medium text-slate-700 leading-none">{user?.displayName || "User"}</p>
            <p className="text-xs text-slate-500 truncate w-32 mt-1 block">{user?.email}</p>
          </div>
          <Avatar className="h-9 w-9 border border-slate-200 shadow-sm ring-2 ring-transparent transition-all hover:ring-emerald-100">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={() => logOut()} className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
