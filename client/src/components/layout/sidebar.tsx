import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EnhancedTransactionDialog } from "@/components/enhanced-transaction-dialog";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, 
  Inbox, 
  List, 
  BarChart3, 
  Settings, 
  User,
  Wallet,
  GitBranch,
  Scale,
  RotateCcw,
  Plus,
  Receipt,
  FolderPlus,
  CreditCard,
  PiggyBank,
  ArrowLeftRight,
  Target,
  Play,
  LogOut,
  ChevronDown,
  ChevronRight,
  Clock
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [comingSoonExpanded, setComingSoonExpanded] = useState(false);

  const getQuickActions = () => {
    const commonActions = [
      { label: "New Transaction", icon: Receipt, action: "transaction" },
      { label: "New Envelope", icon: Inbox, action: () => window.location.href = "/envelopes?new=true" },
      { label: "New Account", icon: Wallet, action: () => window.location.href = "/accounts?new=true" },
    ];

    const contextualActions = [];
    
    switch (location) {
      case "/envelopes":
        contextualActions.push(
          { label: "New Category", icon: FolderPlus, action: () => window.location.href = "/envelopes?newCategory=true" },
          { label: "Transfer Between Envelopes", icon: ArrowLeftRight, action: () => window.location.href = "/envelopes?transfer=true" }
        );
        break;
      case "/accounts":
        contextualActions.push(
          { label: "New Savings Account", icon: PiggyBank, action: () => window.location.href = "/accounts?type=savings&new=true" },
          { label: "New Credit Card", icon: CreditCard, action: () => window.location.href = "/accounts?type=credit&new=true" }
        );
        break;
      case "/transactions":
        contextualActions.push(
          { label: "Quick Add Receipt", icon: Receipt, action: () => window.location.href = "/transactions?receipt=true" }
        );
        break;
      case "/recurring-income":
        contextualActions.push(
          { label: "New Recurring Income", icon: RotateCcw, action: () => window.location.href = "/recurring-income?new=true" }
        );
        break;
    }

    return [...contextualActions, ...commonActions];
  };

  const navigationItems = [
    { href: "/setup", icon: Play, label: "Getting Started" },
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/", icon: Scale, label: "Reconcile" },
    { href: "/envelope-planning", icon: Target, label: "Budget", target: "_blank" },
    { href: "/envelope-summary", icon: List, label: "Envelopes" },
    { href: "/envelope-balances", icon: BarChart3, label: "Balance Report", target: "_blank" },
    { href: "/transactions", icon: Receipt, label: "Transactions" },
    { href: "/accounts", icon: Wallet, label: "Accounts" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-card border-r border-border">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Logo/Header */}
        <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 border-b border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Inbox className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="ml-3 text-lg font-semibold text-foreground">My Budget Mate</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Add</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <EnhancedTransactionDialog title="Add New Transaction">
                <DropdownMenuItem className="cursor-pointer">
                  <Receipt className="mr-2 h-4 w-4" />
                  <span>Add Transaction</span>
                </DropdownMenuItem>
              </EnhancedTransactionDialog>
              <DropdownMenuItem onClick={() => window.location.href = "/envelopes-new?new=true"} className="cursor-pointer">
                <Inbox className="mr-2 h-4 w-4" />
                <span>Add Envelope</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = "/envelopes-new?newCategory=true"} className="cursor-pointer">
                <FolderPlus className="mr-2 h-4 w-4" />
                <span>Add Category</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = "/accounts?new=true"} className="cursor-pointer">
                <Wallet className="mr-2 h-4 w-4" />
                <span>Add Account</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => window.location.href = "/envelopes-new?transfer=true"} className="cursor-pointer">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                <span>Transfer Between Envelopes</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = "/net-worth?addAsset=true"} className="cursor-pointer">
                <PiggyBank className="mr-2 h-4 w-4" />
                <span>Add Asset/Liability</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>



        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            return (item.label === "Getting Started" || item.target === "_blank") ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                <div className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}>
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.label}
                </div>
              </a>
            ) : (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary border-r-2 border-primary" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}>
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
          
          {/* Coming Soon Submenu */}
          <div className="space-y-1">
            <button
              onClick={() => setComingSoonExpanded(!comingSoonExpanded)}
              className={cn(
                "w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Clock className="mr-3 h-4 w-4" />
              <span className="flex-1 text-left">Coming Soon</span>
              {comingSoonExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {comingSoonExpanded && (
              <div className="pl-6 space-y-1">
                {/* Placeholder for future submenu items */}
                <div className="px-3 py-2 text-xs text-muted-foreground italic">
                  Submenu items will appear here
                </div>
              </div>
            )}
          </div>
        </nav>



        {/* User Profile */}
        <div className="flex-shrink-0 border-t border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">Demo User</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
