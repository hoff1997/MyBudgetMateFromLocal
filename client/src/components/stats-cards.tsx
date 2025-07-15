import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Scale, AlertTriangle, CheckCircle, CreditCard, Target, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface StatsCardsProps {
  showReconciliation?: boolean;
}

export default function StatsCards({ showReconciliation = false }: StatsCardsProps) {
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  const { data: envelopeData } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const envelopes = envelopeData?.envelopes || [];
  const categories = envelopeData?.categories || [];

  // Calculate reconciliation if requested
  const getReconciliationData = () => {
    if (!showReconciliation || !accounts.length || !envelopes.length) return null;

    const totalBankBalance = accounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);
    const totalEnvelopeBalance = envelopes.reduce((sum, envelope) => sum + parseFloat(envelope.currentBalance), 0);
    const difference = totalBankBalance - totalEnvelopeBalance;
    const isReconciled = Math.abs(difference) < 0.01;

    return { totalBankBalance, totalEnvelopeBalance, difference, isReconciled };
  };

  // Calculate envelope status
  const getEnvelopeStats = () => {
    if (!envelopes.length) return { onTrack: 0, overspent: 0, totalOverspent: 0 };

    let onTrack = 0;
    let overspent = 0;
    let totalOverspent = 0;

    envelopes.forEach(envelope => {
      const balance = parseFloat(envelope.currentBalance);
      if (balance < 0) {
        overspent++;
        totalOverspent += Math.abs(balance);
      } else {
        onTrack++;
      }
    });

    return { onTrack, overspent, totalOverspent };
  };

  // Get credit card holding account data
  const getCreditCardHoldingData = () => {
    const ccHoldingAccount = accounts.find(account => account.name === "Credit Card Holding");
    const ccPaymentEnvelope = envelopes.find(envelope => envelope.name === "Credit Card Payment");
    const creditCardAccount = accounts.find(account => account.type === "credit");
    
    return {
      holdingBalance: ccHoldingAccount ? parseFloat(ccHoldingAccount.balance) : 0,
      paymentEnvelopeBalance: ccPaymentEnvelope ? parseFloat(ccPaymentEnvelope.currentBalance) : 0,
      creditCardDebt: creditCardAccount ? Math.abs(parseFloat(creditCardAccount.balance)) : 0,
      isFullyCovered: function() {
        return this.holdingBalance >= this.creditCardDebt;
      }
    };
  };

  const reconciliation = getReconciliationData();
  const envelopeStats = getEnvelopeStats();
  const ccHoldingData = getCreditCardHoldingData();

  if (!accounts.length || !envelopes.length) {
    const gridCols = showReconciliation && reconciliation ? "md:grid-cols-5" : "md:grid-cols-4";
    const cardCount = showReconciliation && reconciliation ? 5 : 4;
    
    return (
      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const gridCols = showReconciliation && reconciliation ? "md:grid-cols-5" : "md:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">On Track Envelopes</p>
              <p className="text-2xl font-semibold text-green-600">
                {envelopeStats.onTrack}
              </p>
              <p className="text-xs text-muted-foreground">
                Envelopes within budget
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overspent Envelopes</p>
              <p className="text-2xl font-semibold text-red-600">
                {envelopeStats.overspent}
              </p>
              <p className="text-xs text-red-600">
                ${envelopeStats.totalOverspent.toFixed(2)} overspent
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Available</p>
              <p className={`text-2xl font-semibold ${envelopes.reduce((sum, env) => sum + parseFloat(env.currentBalance), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${envelopes.reduce((sum, env) => sum + parseFloat(env.currentBalance), 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Across all envelopes
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Credit Card Holding</p>
              <p className={`text-2xl font-semibold ${ccHoldingData.isFullyCovered() ? 'text-green-600' : 'text-yellow-600'}`}>
                ${ccHoldingData.holdingBalance.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {ccHoldingData.creditCardDebt > 0 ? (
                  ccHoldingData.isFullyCovered() 
                    ? 'Fully covered for payment' 
                    : `$${(ccHoldingData.creditCardDebt - ccHoldingData.holdingBalance).toFixed(2)} more needed`
                ) : (
                  'No credit card debt'
                )}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              ccHoldingData.isFullyCovered() 
                ? 'bg-green-100 dark:bg-green-900/20' 
                : 'bg-yellow-100 dark:bg-yellow-900/20'
            }`}>
              <CreditCard className={`h-6 w-6 ${
                ccHoldingData.isFullyCovered() ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {showReconciliation && reconciliation && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bank Balance</p>
                <p className={`text-2xl font-semibold ${reconciliation.totalBankBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${reconciliation.totalBankBalance.toFixed(2)}
                </p>
                <div className="flex items-center mt-1">
                  {reconciliation.isReconciled ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Reconciled
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      ${Math.abs(reconciliation.difference).toFixed(2)} off
                    </Badge>
                  )}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                reconciliation.isReconciled 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : 'bg-yellow-100 dark:bg-yellow-900/20'
              }`}>
                <Scale className={`h-6 w-6 ${
                  reconciliation.isReconciled ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
