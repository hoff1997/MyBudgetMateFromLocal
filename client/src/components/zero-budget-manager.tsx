import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, TrendingUp, TrendingDown, Plus, History, Sparkles, Target, Edit } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { type Envelope, type EnvelopeCategory } from '@shared/schema';

interface BudgetHistory {
  id: number;
  envelopeId: number;
  oldBudget: string;
  newBudget: string;
  reason: string;
  timestamp: Date;
}

interface ZeroBudgetManagerProps {
  className?: string;
  onEditEnvelope?: (envelope: Envelope) => void;
}

interface AllocationItem {
  envelopeId: number;
  amount: string;
}

export default function ZeroBudgetManager({ className, onEditEnvelope }: ZeroBudgetManagerProps) {
  const queryClient = useQueryClient();
  const [surplusTarget, setSurplusTarget] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showOverspendAlert, setShowOverspendAlert] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [showSurplusDialog, setShowSurplusDialog] = useState(false);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ['/api/envelopes'],
  });

  const { data: categories = [] } = useQuery<EnvelopeCategory[]>({
    queryKey: ['/api/envelope-categories'],
  });

  const payCycle = user?.payCycle || 'fortnightly';

  // Calculate totals
  const incomeEnvelopes = envelopes.filter(env => 
    categories.find(cat => cat.id === env.categoryId)?.name === 'Income'
  );
  
  const expenseEnvelopes = envelopes.filter(env => 
    categories.find(cat => cat.id === env.categoryId)?.name !== 'Income'
  );

  const totalIncome = incomeEnvelopes.reduce((sum, env) => 
    sum + parseFloat(env.budgetedAmount || '0'), 0
  );
  
  const totalExpenses = expenseEnvelopes.reduce((sum, env) => 
    sum + parseFloat(env.budgetedAmount || '0'), 0
  );

  const surplus = totalIncome - totalExpenses;
  const isZeroBudget = Math.abs(surplus) < 0.01;

  console.log('Budget calculation:', {
    totalIncome,
    totalExpenses,
    surplus,
    incomeCount: incomeEnvelopes.length,
    expenseCount: expenseEnvelopes.length,
    showSurplusBox: surplus > 5
  });

  // Check for celebration trigger
  useEffect(() => {
    if (isZeroBudget && !showCelebration) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, [isZeroBudget]);

  // Check for overspend alert
  useEffect(() => {
    if (surplus < -1) { // Show alert for any overspend over $1
      setShowOverspendAlert(true);
    } else {
      setShowOverspendAlert(false);
    }
  }, [surplus]);

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ envelopeId, newBudget, reason }: { envelopeId: number; newBudget: string; reason: string }) => {
      const envelope = envelopes.find(e => e.id === envelopeId);
      if (envelope) {
        // Save to budget history (would be real API call)
        console.log('Budget history:', {
          envelopeId,
          oldBudget: envelope.budgetedAmount,
          newBudget,
          reason,
          timestamp: new Date()
        });
      }
      return apiRequest('PATCH', `/api/envelopes/${envelopeId}`, { budgetedAmount: newBudget });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
    },
  });

  const addSurplusToEnvelope = () => {
    if (surplusTarget && surplus > 0) {
      const targetEnvelope = envelopes.find(e => e.id === surplusTarget);
      if (targetEnvelope) {
        const newBudget = (parseFloat(targetEnvelope.budgetedAmount || '0') + surplus).toFixed(2);
        updateBudgetMutation.mutate({
          envelopeId: surplusTarget,
          newBudget,
          reason: `Added surplus of $${surplus.toFixed(2)}`
        });
      }
    }
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'Uncategorised';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Uncategorised';
  };

  const EnvelopeBudgetRow = ({ envelope, onEditEnvelope }: { envelope: Envelope; onEditEnvelope?: (envelope: Envelope) => void }) => {
    const [editing, setEditing] = useState(false);
    const [budgetValue, setBudgetValue] = useState(envelope.budgetedAmount || '0');
    const currentBalance = parseFloat(envelope.balance || '0');
    const currentBudget = parseFloat(envelope.budgetedAmount || '0');
    const isIncome = incomeEnvelopes.includes(envelope);

    const saveBudget = () => {
      const amount = parseFloat(budgetValue) || 0;
      updateBudgetMutation.mutate({
        envelopeId: envelope.id,
        newBudget: amount.toString(),
        reason: 'Manual budget adjustment'
      });
      setEditing(false);
    };

    return (
      <div className="border-b hover:bg-muted/20 py-1 px-2">
        {/* Desktop Layout - Single Line */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-2 md:items-center">
          <div className="col-span-4 flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{envelope.name}</span>
            {isIncome && <Badge variant="outline" className="text-xs">Income</Badge>}
          </div>
          
          <div className="col-span-2 text-right">
            <span className="text-sm">${currentBalance.toFixed(2)}</span>
          </div>
          
          <div className="col-span-3 text-right">
            {editing ? (
              <div className="flex gap-1">
                <Input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  onBlur={() => {
                    const amount = parseFloat(budgetValue) || 0;
                    if (amount !== currentBudget) {
                      saveBudget();
                    } else {
                      setEditing(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveBudget();
                    } else if (e.key === 'Escape') {
                      setBudgetValue(envelope.budgetedAmount || '0');
                      setEditing(false);
                    }
                  }}
                  autoFocus
                  className="h-6 text-xs w-20"
                  step="0.01"
                  min="0"
                  placeholder={envelope.budgetedAmount || '0'}
                />
                <button
                  onClick={saveBudget}
                  className="text-green-600 hover:text-green-800 text-xs px-1"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setBudgetValue(envelope.budgetedAmount || '0');
                    setEditing(false);
                  }}
                  className="text-red-600 hover:text-red-800 text-xs px-1"
                >
                  ✗
                </button>
              </div>
            ) : (
              <div 
                className="cursor-pointer hover:bg-muted rounded px-2 py-1"
                onClick={() => {
                  setBudgetValue('');
                  setEditing(true);
                }}
              >
                <span className={`text-sm font-medium ${isIncome ? 'text-green-600' : 'text-blue-600'}`}>
                  ${currentBudget.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          
          <div className="col-span-2 text-right">
            <span className="text-xs text-muted-foreground">{getCategoryName(envelope.categoryId)}</span>
          </div>
          
          <div className="col-span-1 text-right flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setHistoryDialogOpen(true)}
              title="View budget history"
            >
              <History className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onEditEnvelope?.(envelope)}
              title="Edit envelope settings"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Mobile Layout - Two Lines */}
        <div className="md:hidden space-y-1">
          {/* Line 1: Envelope Name and Category */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-3 h-3 rounded bg-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{envelope.name}</span>
              {isIncome && <Badge variant="outline" className="text-[10px] px-1 py-0">Income</Badge>}
            </div>
            <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
              {getCategoryName(envelope.categoryId)}
            </span>
          </div>
          
          {/* Line 2: Balance, Budget, and Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="text-xs">
                <span className="text-muted-foreground">Bal: </span>
                <span className="font-medium">${currentBalance.toFixed(2)}</span>
              </div>
              
              <div className="text-xs">
                <span className="text-muted-foreground">Budget: </span>
                {editing ? (
                  <div className="inline-flex gap-1">
                    <Input
                      type="number"
                      value={budgetValue}
                      onChange={(e) => setBudgetValue(e.target.value)}
                      onBlur={() => {
                        const amount = parseFloat(budgetValue) || 0;
                        if (amount !== currentBudget) {
                          saveBudget();
                        } else {
                          setEditing(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveBudget();
                        } else if (e.key === 'Escape') {
                          setBudgetValue(envelope.budgetedAmount || '0');
                          setEditing(false);
                        }
                      }}
                      autoFocus
                      className="h-5 text-xs w-16 px-1"
                      step="0.01"
                      min="0"
                      placeholder={envelope.budgetedAmount || '0'}
                    />
                    <button
                      onClick={saveBudget}
                      className="text-green-600 hover:text-green-800 text-xs px-1"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setBudgetValue(envelope.budgetedAmount || '0');
                        setEditing(false);
                      }}
                      className="text-red-600 hover:text-red-800 text-xs px-1"
                    >
                      ✗
                    </button>
                  </div>
                ) : (
                  <span 
                    className={`font-medium cursor-pointer hover:underline ${isIncome ? 'text-green-600' : 'text-blue-600'}`}
                    onClick={() => {
                      setBudgetValue('');
                      setEditing(true);
                    }}
                  >
                    ${currentBudget.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => setHistoryDialogOpen(true)}
                title="View budget history"
              >
                <History className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => onEditEnvelope?.(envelope)}
                title="Edit envelope settings"
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getPayCycleDescription = () => {
    switch (payCycle) {
      case 'weekly': return 'per week';
      case 'fortnightly': return 'per fortnight';
      case 'monthly': return 'per month';
      case 'quarterly': return 'per quarter';
      case 'annual': return 'per year';
      default: return 'per pay period';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Pay Cycle Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Zero Budget Planning</h3>
              <p className="text-sm text-blue-700">
                Your budget is calculated based on your <strong>{payCycle}</strong> pay cycle. 
                All amounts shown are {getPayCycleDescription()}. 
                <span className="text-blue-600"> Change pay cycle in Settings.</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Celebration Component */}
      {showCelebration && (
        <Alert className="border-green-500 bg-green-50">
          <Sparkles className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">
            🎉 Congratulations! You've achieved Zero-Based Budgeting for your {payCycle} pay cycle! Your income exactly matches your planned expenses.
          </AlertDescription>
        </Alert>
      )}

      {/* Overspend Alert */}
      {showOverspendAlert && (
        <Alert className="border-red-500 bg-red-50 pt-2 pb-1 px-3">
          <AlertTriangle className="h-3 w-3 text-red-600" />
          <AlertDescription className="text-red-800 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Oh oh, you are spending more than you earn!</p>
              <p>You're planning to spend <strong>${Math.abs(surplus).toFixed(0)} more</strong> than your {payCycle} income. Check your expenses to see what you can adjust.</p>
              <p className="text-xs">Consider reducing some expense budgets or finding ways to increase your income to achieve zero-based budgeting.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{incomeEnvelopes.length} income sources {getPayCycleDescription()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{expenseEnvelopes.length} expense categories {getPayCycleDescription()}</p>
          </CardContent>
        </Card>

        <Card className={surplus >= 0 ? 'border-green-500' : 'border-red-500'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <Target className="h-4 w-4" />
              Budget Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {surplus >= 0 ? '+' : ''}${surplus.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isZeroBudget ? 'Perfect Zero Budget!' : surplus > 0 ? 'Surplus to allocate' : 'Overspend to fix'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">
              Zero Budget Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress 
              value={totalIncome > 0 ? Math.min(100, (totalExpenses / totalIncome) * 100) : 0} 
              className="h-2 mb-2"
            />
            <div className="text-xs text-muted-foreground">
              {totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0}% allocated
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surplus Allocation */}
      {surplus > 5 && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-sm text-green-600">Allocate Surplus ({payCycle})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center">
              <span className="text-sm">Distribute ${surplus.toFixed(2)} {getPayCycleDescription()} across envelopes:</span>
              <Button 
                onClick={() => {
                  setAllocations([{ envelopeId: 0, amount: '' }]);
                  setShowSurplusDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Allocate Surplus
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Surplus Allocation Dialog */}
      <Dialog open={showSurplusDialog} onOpenChange={setShowSurplusDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Allocate Surplus Funds</DialogTitle>
            <DialogDescription>
              Distribute your surplus budget across multiple envelopes to achieve zero-based budgeting.
            </DialogDescription>
          </DialogHeader>
          <SurplusAllocationDialogContent 
            surplus={surplus}
            envelopes={expenseEnvelopes}
            allocations={allocations}
            setAllocations={setAllocations}
            onClose={() => setShowSurplusDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Budget Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Budget Manager</span>
            <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Budget Change History</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Budget history feature coming soon...</p>
                  <p className="text-xs text-muted-foreground">
                    This will show all budget changes with timestamps and reasons for easy tracking and potential rollbacks.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Income Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Income Sources
            </h3>
            <div className="grid grid-cols-12 gap-2 py-2 px-3 bg-muted/50 text-xs font-medium">
              <div className="col-span-4">Envelope Name</div>
              <div className="col-span-2 text-right">Current Balance</div>
              <div className="col-span-3 text-right">Budget Amount</div>
              <div className="col-span-2 text-right">Category</div>
              <div className="col-span-1 text-right">History</div>
            </div>
            {incomeEnvelopes.map(envelope => (
              <EnvelopeBudgetRow key={envelope.id} envelope={envelope} onEditEnvelope={onEditEnvelope} />
            ))}
          </div>

          <Separator className="my-6" />

          {/* Expenses Section */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Expense Categories
            </h3>
            <div className="grid grid-cols-12 gap-2 py-2 px-3 bg-muted/50 text-xs font-medium">
              <div className="col-span-4">Envelope Name</div>
              <div className="col-span-2 text-right">Current Balance</div>
              <div className="col-span-3 text-right">Budget Amount</div>
              <div className="col-span-2 text-right">Category</div>
              <div className="col-span-1 text-right">History</div>
            </div>
            {expenseEnvelopes.map(envelope => (
              <EnvelopeBudgetRow key={envelope.id} envelope={envelope} onEditEnvelope={onEditEnvelope} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Surplus Allocation Dialog Content Component
function SurplusAllocationDialogContent({ 
  surplus, 
  envelopes, 
  allocations, 
  setAllocations, 
  onClose 
}: {
  surplus: number;
  envelopes: Envelope[];
  allocations: AllocationItem[];
  setAllocations: (allocations: AllocationItem[]) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const allocateMutation = useMutation({
    mutationFn: async (allocations: AllocationItem[]) => {
      const promises = allocations.map(async (allocation) => {
        const envelope = envelopes.find(e => e.id === allocation.envelopeId);
        if (envelope && parseFloat(allocation.amount) > 0) {
          const newBudget = (parseFloat(envelope.budgetedAmount || '0') + parseFloat(allocation.amount)).toFixed(2);
          return apiRequest('PATCH', `/api/envelopes/${allocation.envelopeId}`, { 
            budgetedAmount: newBudget 
          });
        }
      });
      return Promise.all(promises.filter(Boolean));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      onClose();
      setAllocations([]);
    },
    onError: (error) => {
      console.error('Allocation failed:', error);
    }
  });

  const addAllocation = () => {
    setAllocations([...allocations, { envelopeId: 0, amount: '' }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: keyof AllocationItem, value: string | number) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const totalAllocated = allocations.reduce((sum, allocation) => 
    sum + (parseFloat(allocation.amount) || 0), 0);
  
  const remaining = surplus - totalAllocated;

  const handleAllocate = () => {
    const validAllocations = allocations.filter(a => a.envelopeId > 0 && parseFloat(a.amount) > 0);
    if (validAllocations.length > 0 && remaining >= 0) {
      allocateMutation.mutate(validAllocations);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted p-3 rounded-lg">
        <p className="text-sm">
          <strong>Available Surplus:</strong> ${surplus.toFixed(2)} | 
          <strong className="ml-2">Total Allocated:</strong> ${totalAllocated.toFixed(2)} | 
          <strong className={`ml-2 ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
            Remaining:
          </strong> ${remaining.toFixed(2)}
        </p>
      </div>
      
      {allocations.length === 0 && (
        <p className="text-muted-foreground">Add allocations to distribute your surplus funds across multiple envelopes.</p>
      )}

      {allocations.map((allocation, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <h4 className="font-medium">Allocation {index + 1}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeAllocation(index)}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
              ×
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Envelope</label>
              <Select 
                value={allocation.envelopeId.toString()} 
                onValueChange={(value) => updateAllocation(index, 'envelopeId', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an envelope" />
                </SelectTrigger>
                <SelectContent>
                  {envelopes.filter(e => e.name !== 'Unallocated').map(envelope => (
                    <SelectItem key={envelope.id} value={envelope.id.toString()}>
                      {envelope.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <Input
                type="number"
                value={allocation.amount}
                onChange={(e) => updateAllocation(index, 'amount', e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={addAllocation}
        className="w-full flex items-center gap-2"
        disabled={remaining <= 0 && allocations.length > 0}
      >
        <Plus className="h-4 w-4" />
        Add Allocation
      </Button>

      {remaining < 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You're trying to allocate ${Math.abs(remaining).toFixed(2)} more than available. Please adjust your amounts.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleAllocate}
          disabled={allocations.length === 0 || remaining < 0 || totalAllocated === 0 || allocateMutation.isPending}
        >
          {allocateMutation.isPending ? 'Allocating...' : `Allocate $${totalAllocated.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}