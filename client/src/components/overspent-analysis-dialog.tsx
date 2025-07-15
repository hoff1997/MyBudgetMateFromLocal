import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, TrendingDown, ArrowRight, Eye, ArrowLeftRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Envelope } from "@shared/schema";

interface OverspentAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OverspentAnalysisDialog({ open, onOpenChange }: OverspentAnalysisDialogProps) {
  const [isBalancing, setIsBalancing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ['/api/envelopes'],
  });

  // Calculate overspent envelopes
  const overspentEnvelopes = envelopes
    .filter(envelope => {
      const balance = parseFloat(envelope.currentBalance);
      return balance < 0;
    })
    .map(envelope => {
      const balance = parseFloat(envelope.currentBalance);
      const budget = parseFloat(envelope.budgetedAmount);
      const overspentAmount = Math.abs(balance);
      const percentageOverspent = budget > 0 ? (overspentAmount / budget) * 100 : 0;
      
      return {
        ...envelope,
        balance,
        budget,
        overspentAmount,
        percentageOverspent
      };
    })
    .sort((a, b) => b.overspentAmount - a.overspentAmount); // Sort by most overspent first

  const totalOverspent = overspentEnvelopes.reduce((sum, env) => sum + env.overspentAmount, 0);

  // Calculate surplus envelopes
  const surplusEnvelopes = envelopes
    .filter(envelope => {
      const balance = parseFloat(envelope.currentBalance);
      const budget = parseFloat(envelope.budgetedAmount);
      return balance > 0 && budget > 0; // Has positive balance and a budget
    })
    .map(envelope => {
      const balance = parseFloat(envelope.currentBalance);
      const budget = parseFloat(envelope.budgetedAmount);
      return {
        ...envelope,
        balance,
        budget,
        surplusAmount: balance
      };
    })
    .sort((a, b) => b.surplusAmount - a.surplusAmount);

  const totalSurplus = surplusEnvelopes.reduce((sum, env) => sum + env.surplusAmount, 0);
  const canBalance = totalSurplus >= totalOverspent;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getSeverityLevel = (percentageOverspent: number) => {
    if (percentageOverspent > 50) return { level: "critical", color: "bg-red-500", textColor: "text-red-600" };
    if (percentageOverspent > 25) return { level: "high", color: "bg-orange-500", textColor: "text-orange-600" };
    if (percentageOverspent > 10) return { level: "medium", color: "bg-yellow-500", textColor: "text-yellow-600" };
    return { level: "low", color: "bg-blue-500", textColor: "text-blue-600" };
  };

  const handleViewTransactions = (envelopeName: string) => {
    window.location.href = `/transactions?envelope=${encodeURIComponent(envelopeName)}`;
  };

  const balanceEnvelopesMutation = useMutation({
    mutationFn: async () => {
      // Calculate optimal transfers to balance overspent envelopes
      const transfers = [];
      let remainingToBalance = totalOverspent;
      
      // Sort surplus envelopes by amount available (largest first)
      const sortedSurplus = [...surplusEnvelopes].sort((a, b) => b.surplusAmount - a.surplusAmount);
      
      for (const overspentEnv of overspentEnvelopes) {
        let amountNeeded = overspentEnv.overspentAmount;
        
        for (const surplusEnv of sortedSurplus) {
          if (amountNeeded <= 0) break;
          
          const transferAmount = Math.min(amountNeeded, surplusEnv.surplusAmount);
          if (transferAmount > 0) {
            transfers.push({
              fromEnvelopeId: surplusEnv.id,
              toEnvelopeId: overspentEnv.id,
              amount: transferAmount.toFixed(2),
              fromName: surplusEnv.name,
              toName: overspentEnv.name
            });
            
            surplusEnv.surplusAmount -= transferAmount;
            amountNeeded -= transferAmount;
          }
        }
      }
      
      // Execute transfers
      for (const transfer of transfers) {
        await apiRequest('/api/envelopes/transfer', {
          method: 'POST',
          body: {
            fromEnvelopeId: transfer.fromEnvelopeId,
            toEnvelopeId: transfer.toEnvelopeId,
            amount: transfer.amount,
            description: `Auto-balance: ${transfer.fromName} → ${transfer.toName}`
          }
        });
      }
      
      return transfers;
    },
    onSuccess: (transfers) => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Envelopes Balanced Successfully",
        description: `Completed ${transfers.length} transfer${transfers.length > 1 ? 's' : ''} to balance overspent envelopes.`,
      });
      
      setIsBalancing(false);
    },
    onError: (error) => {
      toast({
        title: "Balance Failed",
        description: "Failed to balance envelopes. Please try again.",
        variant: "destructive",
      });
      setIsBalancing(false);
    }
  });

  const handleBalanceEnvelopes = () => {
    setIsBalancing(true);
    balanceEnvelopesMutation.mutate();
  };

  if (overspentEnvelopes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-green-600 mr-2" />
              Overspent Analysis
            </DialogTitle>
            <DialogDescription>
              Analysis of envelope spending and balance recommendations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-green-900 mb-2">All Envelopes On Track!</h3>
            <p className="text-sm text-muted-foreground">
              Excellent budgeting! None of your envelopes are currently overspent.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            Overspent Analysis - {overspentEnvelopes.length} Envelope{overspentEnvelopes.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Review overspent envelopes and balance with surplus funds from other envelopes.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Card */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-red-900">
              <span className="flex items-center">
                <TrendingDown className="h-4 w-4 mr-2" />
                Total Overspent: {formatCurrency(totalOverspent)}
              </span>
              {canBalance && (
                <Button
                  onClick={handleBalanceEnvelopes}
                  disabled={isBalancing || balanceEnvelopesMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  {isBalancing || balanceEnvelopesMutation.isPending ? 'Balancing...' : 'Auto-Balance'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-red-700">
                You have {overspentEnvelopes.length} envelope{overspentEnvelopes.length > 1 ? 's' : ''} that {overspentEnvelopes.length > 1 ? 'are' : 'is'} over budget. 
              </p>
              {canBalance ? (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Good news! You have {formatCurrency(totalSurplus)} in surplus funds available.
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Click "Auto-Balance" to automatically transfer surplus funds to cover overspent amounts.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    Insufficient surplus funds ({formatCurrency(totalSurplus)} available, {formatCurrency(totalOverspent - totalSurplus)} more needed)
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Consider adjusting budgets or reducing spending in overspent categories.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Overspent Envelopes List */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Overspent Envelopes</h3>
          
          {overspentEnvelopes.map((envelope) => {
            const severity = getSeverityLevel(envelope.percentageOverspent);
            
            return (
              <Card key={envelope.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{envelope.icon}</div>
                      <div>
                        <h4 className="font-medium">{envelope.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="destructive" className="text-xs">
                            {formatCurrency(envelope.overspentAmount)} over
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${severity.textColor}`}>
                            {envelope.percentageOverspent.toFixed(0)}% over budget
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Budget: </span>
                        <span className="font-medium">{formatCurrency(envelope.budget)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Balance: </span>
                        <span className="font-medium text-red-600">{formatCurrency(envelope.balance)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTransactions(envelope.name)}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Transactions
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Budget Usage</span>
                      <span>{envelope.percentageOverspent.toFixed(1)}% over</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${severity.color}`}
                        style={{ width: `${Math.min(envelope.percentageOverspent, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Suggestions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-900 text-sm">💡 Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-700">
            <p>• Transfer funds from surplus envelopes to cover overspent amounts</p>
            <p>• Review recent transactions to identify unexpected spending</p>
            <p>• Consider adjusting budgets for next month based on actual spending patterns</p>
            <p>• Set up spending alerts for envelopes that frequently go over budget</p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}