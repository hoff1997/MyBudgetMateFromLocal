import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "./lib/supabase";
import { SupabaseAuthProvider, useSupabaseAuthContext } from "./contexts/SupabaseAuthContext";

import Dashboard from "./pages/dashboard";
import Envelopes from "./pages/envelopes-new";
import Transactions from "./pages/transactions";
import ReconciliationMainPage from "./pages/reconciliation-main";
import RecurringIncomePage from "./pages/recurring-income";
import ReportsPage from "./pages/reports";
import SettingsPage from "./pages/settings";
import SetupPage from "./pages/setup";
import ZeroBudgetSetup from "./pages/zero-budget-setup";
import NetWorthPage from "./pages/net-worth";
import DebtManagementPage from "./pages/debt-management";
import EnvelopeBalances from "./pages/envelope-balances";
import EnvelopePlanning from "./pages/envelope-planning";
import EnvelopeSummary from "./pages/envelope-summary";
import AccountsPage from "./pages/accounts";
import Landing from "./pages/landing";
import Login from "./pages/Login";
import Signup from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

function Router() {
  const { isAuthenticated, loading } = useSupabaseAuthContext();

  console.log("Router state:", { isAuthenticated, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/Login" component={Login} />
          <Route path="/register" component={Signup} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={ReconciliationMainPage} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/accounts" component={AccountsPage} />
          <Route path="/envelopes-new" component={Envelopes} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/reconciliation" component={ReconciliationMainPage} />
          <Route path="/recurring-income" component={RecurringIncomePage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/setup" component={SetupPage} />
          <Route path="/zero-budget-setup" component={ZeroBudgetSetup} />
          <Route path="/envelope-planning" component={EnvelopePlanning} />
          <Route path="/envelope-summary" component={EnvelopeSummary} />
          <Route path="/net-worth" component={NetWorthPage} />
          <Route path="/debt-management" component={DebtManagementPage} />
          <Route path="/envelope-balances" component={EnvelopeBalances} />
        </>
      )}
    </Switch>
  );
}

export default function App() {
  console.log("Starting My Budget Mate app...");

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔑 Auth state changed:", event);
      console.log("📦 Session:", session);

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        const userId = session.user.id;

        try {
          // 🔍 Check if user already has envelopes
          const { data: envelopes, error } = await supabase
            .from("envelopes")
            .select("id")
            .eq("user_id", userId)
            .limit(1);

          if (error) {
            console.error("Error checking envelopes:", error.message);
          }

          if (!envelopes || envelopes.length === 0) {
            console.log("🚀 First-time user detected — creating starter envelopes/categories...");

            // 1️⃣ Insert default categories
            const defaultCategories = [
              { user_id: userId, name: "Housing" },
              { user_id: userId, name: "Food" },
              { user_id: userId, name: "Transport" },
            ];

            const { error: catError } = await supabase
              .from("categories")
              .insert(defaultCategories);

            if (catError) {
              console.error("Failed to create categories:", catError.message);
            }

            // 2️⃣ Insert default envelopes
            const defaultEnvelopes = [
              { user_id: userId, name: "Rent", category: "Housing", sort_order: 1 },
              { user_id: userId, name: "Groceries", category: "Food", sort_order: 2 },
              { user_id: userId, name: "Fuel", category: "Transport", sort_order: 3 },
            ];

            const { error: envError } = await supabase
              .from("envelopes")
              .insert(defaultEnvelopes);

            if (envError) {
              console.error("Failed to create envelopes:", envError.message);
            }
          }
        } catch (err) {
          console.error("Setup error:", err);
        }

        // ✅ Redirect to dashboard
        window.location.href = "/dashboard";
      }
    });

    return () => {
      listener.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <Router />
      </SupabaseAuthProvider>
    </QueryClientProvider>
  );
}
