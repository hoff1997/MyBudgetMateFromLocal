import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calculator, Target, TrendingDown, DollarSign, Clock, Zap, AlertTriangle } from 'lucide-react';

interface DebtItem {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  interestRate: number;
  type: string;
}

interface PayoffStrategy {
  method: 'snowball' | 'avalanche' | 'custom';
  extraPayment: number;
  debts: DebtItem[];
}

interface PayoffResult {
  debt: DebtItem;
  payoffDate: Date;
  totalInterest: number;
  monthsToPayoff: number;
  totalPaid: number;
}

export default function DebtPayoffCalculator({ liabilities }: { liabilities: any[] }) {
  const [strategy, setStrategy] = useState<PayoffStrategy>({
    method: 'avalanche',
    extraPayment: 0,
    debts: []
  });
  
  const [results, setResults] = useState<PayoffResult[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalDebt: 0,
    totalInterest: 0,
    payoffDate: new Date(),
    monthsToPayoff: 0,
    totalPaid: 0
  });

  // Convert liabilities to debt items
  useEffect(() => {
    const debts: DebtItem[] = liabilities
      .filter(l => parseFloat(l.currentBalance) > 0)
      .map(l => ({
        id: l.id.toString(),
        name: l.name,
        balance: parseFloat(l.currentBalance),
        minimumPayment: parseFloat(l.minimumPayment || '0'),
        interestRate: parseFloat(l.interestRate || '0'),
        type: l.liabilityType
      }));
    
    setStrategy(prev => ({ ...prev, debts }));
  }, [liabilities]);

  const calculatePayoffSchedule = (strategy: PayoffStrategy): PayoffResult[] => {
    const { method, extraPayment, debts } = strategy;
    let workingDebts = [...debts];
    const results: PayoffResult[] = [];
    let currentMonth = 0;
    const maxMonths = 600; // 50 years max

    // Sort debts based on strategy
    if (method === 'snowball') {
      // Smallest balance first
      workingDebts.sort((a, b) => a.balance - b.balance);
    } else if (method === 'avalanche') {
      // Highest interest rate first
      workingDebts.sort((a, b) => b.interestRate - a.interestRate);
    }

    let totalExtraPayment = extraPayment;

    while (workingDebts.length > 0 && currentMonth < maxMonths) {
      currentMonth++;
      
      // Apply interest and minimum payments
      workingDebts.forEach(debt => {
        const monthlyInterest = (debt.balance * (debt.interestRate / 100)) / 12;
        debt.balance += monthlyInterest;
        
        const payment = Math.min(debt.minimumPayment, debt.balance);
        debt.balance -= payment;
      });

      // Apply extra payment to priority debt
      if (totalExtraPayment > 0 && workingDebts.length > 0) {
        const targetDebt = workingDebts[0];
        const extraForTarget = Math.min(totalExtraPayment, targetDebt.balance);
        targetDebt.balance -= extraForTarget;
      }

      // Remove paid off debts and add extra payment to snowball
      const originalLength = workingDebts.length;
      workingDebts = workingDebts.filter(debt => {
        if (debt.balance <= 0.01) {
          const originalDebt = debts.find(d => d.id === debt.id)!;
          results.push({
            debt: originalDebt,
            payoffDate: new Date(Date.now() + currentMonth * 30 * 24 * 60 * 60 * 1000),
            totalInterest: calculateTotalInterest(originalDebt, currentMonth),
            monthsToPayoff: currentMonth,
            totalPaid: originalDebt.balance + calculateTotalInterest(originalDebt, currentMonth)
          });
          
          // Add freed up payment to extra payment (snowball effect)
          if (method !== 'custom') {
            totalExtraPayment += originalDebt.minimumPayment;
          }
          
          return false;
        }
        return true;
      });
    }

    return results;
  };

  const calculateTotalInterest = (debt: DebtItem, months: number): number => {
    // Simplified interest calculation
    const monthlyRate = debt.interestRate / 100 / 12;
    const payment = debt.minimumPayment;
    
    if (monthlyRate === 0) return 0;
    
    const totalPayments = payment * months;
    return Math.max(0, totalPayments - debt.balance);
  };

  const updateResults = () => {
    const payoffResults = calculatePayoffSchedule(strategy);
    setResults(payoffResults);
    
    // Calculate totals
    const totalDebt = strategy.debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalInterest = payoffResults.reduce((sum, result) => sum + result.totalInterest, 0);
    const lastPayoffDate = payoffResults.length > 0 
      ? new Date(Math.max(...payoffResults.map(r => r.payoffDate.getTime())))
      : new Date();
    const monthsToPayoff = payoffResults.length > 0
      ? Math.max(...payoffResults.map(r => r.monthsToPayoff))
      : 0;
    
    setTotalStats({
      totalDebt,
      totalInterest,
      payoffDate: lastPayoffDate,
      monthsToPayoff,
      totalPaid: totalDebt + totalInterest
    });
  };

  useEffect(() => {
    if (strategy.debts.length > 0) {
      updateResults();
    }
  }, [strategy]);

  const getStrategyDescription = (method: string) => {
    switch (method) {
      case 'snowball':
        return 'Pay minimum on all debts, focus extra payments on smallest balance first. Builds momentum and motivation.';
      case 'avalanche':
        return 'Pay minimum on all debts, focus extra payments on highest interest rate first. Saves the most money.';
      case 'custom':
        return 'Set your own payment priorities and amounts for each debt.';
      default:
        return '';
    }
  };

  const getSavingsVsMinimum = () => {
    // Calculate what happens with minimum payments only
    const minimumStrategy = { ...strategy, extraPayment: 0 };
    const minimumResults = calculatePayoffSchedule(minimumStrategy);
    const minimumInterest = minimumResults.reduce((sum, result) => sum + result.totalInterest, 0);
    
    return {
      interestSaved: Math.max(0, minimumInterest - totalStats.totalInterest),
      timeSaved: minimumResults.length > 0 
        ? Math.max(...minimumResults.map(r => r.monthsToPayoff)) - totalStats.monthsToPayoff
        : 0
    };
  };

  const savings = getSavingsVsMinimum();

  if (strategy.debts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Debt Payoff Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No debts found. Add liabilities in the Net Worth section to use the debt payoff calculator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Debt Payoff Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="strategy">Payoff Strategy</Label>
              <Select 
                value={strategy.method} 
                onValueChange={(value: 'snowball' | 'avalanche' | 'custom') => 
                  setStrategy(prev => ({ ...prev, method: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avalanche">Debt Avalanche (Save Most Money)</SelectItem>
                  <SelectItem value="snowball">Debt Snowball (Build Momentum)</SelectItem>
                  <SelectItem value="custom">Custom Strategy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {getStrategyDescription(strategy.method)}
              </p>
            </div>
            
            <div>
              <Label htmlFor="extraPayment">Extra Monthly Payment ($)</Label>
              <Input
                id="extraPayment"
                type="number"
                step="0.01"
                value={strategy.extraPayment}
                onChange={(e) => setStrategy(prev => ({ 
                  ...prev, 
                  extraPayment: parseFloat(e.target.value) || 0 
                }))}
                placeholder="0.00"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Additional amount beyond minimum payments
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Debt</p>
                    <p className="text-xl font-bold">${totalStats.totalDebt.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Payoff Date</p>
                    <p className="text-lg font-bold">{totalStats.payoffDate.toLocaleDateString()}</p>
                  </div>
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Interest</p>
                    <p className="text-lg font-bold">${totalStats.totalInterest.toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Time to Payoff</p>
                    <p className="text-lg font-bold">{Math.round(totalStats.monthsToPayoff / 12)}y {totalStats.monthsToPayoff % 12}m</p>
                  </div>
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Savings Information */}
          {strategy.extraPayment > 0 && (
            <Alert className="border-green-500 bg-green-50">
              <Zap className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Great news!</strong> By paying an extra ${strategy.extraPayment}/month, you'll save{' '}
                <strong>${savings.interestSaved.toLocaleString()}</strong> in interest and pay off your debts{' '}
                <strong>{Math.round(savings.timeSaved / 12)} years {savings.timeSaved % 12} months</strong> earlier!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Debt List and Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Payoff Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={result.debt.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <h4 className="font-medium">{result.debt.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{result.debt.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${result.debt.balance.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{result.debt.interestRate}% APR</p>
                  </div>
                </div>
                
                <div className="grid gap-2 md:grid-cols-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Payoff Date:</span>
                    <span className="ml-2 font-medium">{result.payoffDate.toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Interest:</span>
                    <span className="ml-2 font-medium">${result.totalInterest.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Months to Payoff:</span>
                    <span className="ml-2 font-medium">{result.monthsToPayoff}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}