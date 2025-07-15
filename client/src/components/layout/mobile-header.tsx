import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Plus, Home, Wallet, Inbox, List, RotateCcw, Scale, BarChart3, GitBranch, Settings, User, HelpCircle, Play, UserCircle, FileSpreadsheet, ExternalLink, Receipt, FolderPlus, CreditCard, PiggyBank, ArrowLeftRight, Target, LogOut, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EnhancedTransactionDialog } from "@/components/enhanced-transaction-dialog";

export default function MobileHeader() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [comingSoonExpanded, setComingSoonExpanded] = useState(false);
  const { user } = useAuth();

  const getQuickActions = () => {
    const commonActions = [
      { label: "New Transaction", icon: Receipt, action: "transaction" },
      { label: "New Envelope", icon: Inbox, action: () => window.location.href = "/envelopes-new?new=true" },
      { label: "New Category", icon: FolderPlus, action: () => window.location.href = "/envelopes-new?newCategory=true" },
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

  const getPageTitle = () => {
    // Check for URL parameters to handle Budget page
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    
    if (location === "/envelopes-new" && tab === "zero-budget") {
      return "Budget";
    }
    
    switch (location) {
      case "/": return "Reconcile Transactions";
      case "/dashboard": return "Dashboard";
      case "/accounts": return "Accounts";
      case "/envelopes": return "Envelopes";
      case "/envelopes-new": return "Envelopes";
      case "/envelope-summary": return "Envelope Summary";
      case "/envelope-balances": return "Balance Report";
      case "/transactions": return "Transactions";
      case "/recurring-income": return "Recurring Income";
      case "/reconciliation": return "Reconciliation";
      case "/reconciliation-main": return "Reconcile Transactions";
      case "/net-worth": return "Net Worth";
      case "/debt-management": return "Debt Management";
      case "/reports": return "Reports";
      case "/rules": return "Rules";
      case "/settings": return "Settings";
      case "/setup": return "Getting Started";
      default: return "My Budget Mate";
    }
  };

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/", icon: Scale, label: "Reconcile" },
    { href: "/envelope-planning", icon: Target, label: "Budget", target: "_blank" },
    { href: "/envelope-summary", icon: List, label: "Envelopes" },
    { href: "/transactions", icon: Receipt, label: "Transactions" },
    { href: "/accounts", icon: Wallet, label: "Accounts" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const comingSoonItems = [
    { href: "/setup", icon: Play, label: "Getting Started" },
    { href: "/envelope-summary", icon: List, label: "Envelope Summary" },
    { href: "/envelope-planning", icon: BarChart3, label: "Envelope Planning" },
    { href: "/envelope-balances", icon: FileSpreadsheet, label: "Balance Report" },
    { href: "/transactions", icon: Receipt, label: "Transactions" },
    { href: "/accounts", icon: Wallet, label: "Accounts" },
    { href: "/recurring-income", icon: RotateCcw, label: "Recurring Income" },
    { href: "/debt-management", icon: CreditCard, label: "Debt Management" },
    { href: "/net-worth", icon: BarChart3, label: "Net Worth" },
    { href: "/reports", icon: GitBranch, label: "Reports" },
    { href: "/rules", icon: GitBranch, label: "Rules" },
  ];

  return (
    <>
      <header className="lg:hidden bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-3">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 flex flex-col max-h-screen">
                <SheetHeader className="p-4 border-b flex-shrink-0">
                  <SheetTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    My Budget Mate
                  </SheetTitle>
                </SheetHeader>
                
                {/* User Profile Section */}
                <div className="p-4 border-b bg-muted/30 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Demo User</p>
                      <p className="text-sm text-muted-foreground">demo@example.com</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Navigation Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <nav className="p-4 space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Navigation</p>
                      {navItems.map((item) => (
                        item.label === "Balance Report" || item.label === "Getting Started" || item.target === "_blank" ? (
                          <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => setIsOpen(false)}
                            >
                              <item.icon className="mr-2 h-4 w-4" />
                              {item.label}
                            </Button>
                          </a>
                        ) : (
                          <Link key={item.href} href={item.href}>
                            <Button
                              variant={location === item.href ? "default" : "ghost"}
                              className="w-full justify-start"
                              onClick={() => setIsOpen(false)}
                            >
                              <item.icon className="mr-2 h-4 w-4" />
                              {item.label}
                            </Button>
                          </Link>
                        )
                      ))}
                    </div>

                    <Separator className="my-4" />

                    {/* Coming Soon Submenu */}
                    <div className="space-y-1">
                      <button
                        onClick={() => setComingSoonExpanded(!comingSoonExpanded)}
                        className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        <span className="flex-1 text-left">Coming Soon</span>
                        {comingSoonExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      
                      {comingSoonExpanded && (
                        <div className="pl-6 space-y-1">
                          {comingSoonItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-muted-foreground"
                                onClick={() => setIsOpen(false)}
                              >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                              </Button>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator className="my-4" />

                    {/* Account & Settings */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</p>
                      
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setIsOpen(false)}
                      >
                        <UserCircle className="mr-2 h-4 w-4" />
                        Profile
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setIsOpen(false)}
                      >
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Support
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setIsOpen(false);
                          window.location.href = "/api/logout";
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                    
                    {/* Extra bottom padding for iPhone safe area */}
                    <div className="h-8"></div>
                  </nav>
                </div>

                {/* App Version - Fixed at bottom */}
                <div className="p-4 border-t flex-shrink-0 bg-background">
                  <p className="text-xs text-muted-foreground text-center">
                    My Budget Mate v1.0
                  </p>
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
              <p className="text-sm text-muted-foreground">My Budget Mate</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {getQuickActions().map((action, index) => (
                action.action === "transaction" ? (
                  <EnhancedTransactionDialog key={index} title="Add New Transaction">
                    <DropdownMenuItem className="cursor-pointer">
                      <action.icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </DropdownMenuItem>
                  </EnhancedTransactionDialog>
                ) : (
                  <DropdownMenuItem 
                    key={index}
                    onClick={typeof action.action === 'function' ? action.action : undefined}
                    className="cursor-pointer"
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                )
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
