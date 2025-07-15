import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Scale, Target, List, Receipt } from "lucide-react";

export default function MobileBottomNav() {
  const [location] = useLocation();

  const navigationItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/", icon: Scale, label: "Reconcile" },
    { href: "/envelope-planning", icon: Target, label: "Budget", target: "_blank" },
    { href: "/envelope-summary", icon: List, label: "Envelopes" },
    { href: "/transactions", icon: Receipt, label: "Transactions" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 safe-area-pb">
      <div className="flex justify-around items-center">
        {navigationItems.map((item) => {
          const isActive = location === item.href;
          
          return item.target === "_blank" ? (
            <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
              <div className={cn(
                "flex flex-col items-center py-1 px-2 transition-colors cursor-pointer",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </a>
          ) : (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex flex-col items-center py-1 px-2 transition-colors cursor-pointer",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
