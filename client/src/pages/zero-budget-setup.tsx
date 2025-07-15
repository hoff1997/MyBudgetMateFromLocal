import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns";
import { CalendarIcon, Plus, Edit, Trash2, Target, BarChart3, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import "./zero-budget-setup.css";

interface EditingField {
  envelopeId: number;
  field: string;
  value: string;
  relatedValue?: string;
}

export default function ZeroBudgetSetupNew() {
  const isMobile = useMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [focusedField, setFocusedField] = useState<{envelopeId: number, field: string} | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEnvelopeForm, setShowEnvelopeForm] = useState(false);
  
  const [newEnvelope, setNewEnvelope] = useState({
    name: '',
    typeId: 2, // Default to expense
    budget: '',
    frequency: 'monthly',
    notes: ''
  });

  // Get user and envelopes data
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const payCycle = (user as any)?.payCycle || "monthly";

  // Mutations
  const updateEnvelopeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest('PATCH', `/api/envelopes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
    },
  });

  const deleteEnvelopeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/envelopes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      toast({
        title: "Envelope deleted",
        description: "The envelope has been removed from your budget.",
      });
    },
  });

  const createEnvelopeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/envelopes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      setShowEnvelopeForm(false);
      setNewEnvelope({ name: '', typeId: 2, budget: '', frequency: 'monthly', notes: '' });
      toast({
        title: "Envelope created",
        description: "Your new envelope has been added to the budget.",
      });
    },
  });

  // Handle inline editing
  const handleInlineEdit = async (envelopeId: number, field: string, value: string, relatedValue?: string) => {
    try {
      const data: any = { [field]: value };
      
      // Handle special cases for related field updates
      if (field === 'payCycleAmount' && relatedValue) {
        data.annualAmount = relatedValue;
      } else if (field === 'annualAmount' && relatedValue) {
        data.payCycleAmount = relatedValue;
      } else if (field === 'targetAmount') {
        // When target amount is set for expense envelopes, calculate the per-cycle saving amount
        const targetAmount = parseFloat(value);
        const cycleDays = payCycle === 'weekly' ? 7 : payCycle === 'fortnightly' ? 14 : 30;
        
        // Calculate how much to save per cycle to reach target by due date
        const envelope = envelopes.find((env: any) => env.id === envelopeId);
        if (envelope?.nextPaymentDue && envelope.envelopeType === 'expense') {
          const dueDate = new Date(envelope.nextPaymentDue);
          const now = new Date();
          const daysUntilDue = Math.max(1, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          const cyclesUntilDue = Math.max(1, Math.ceil(daysUntilDue / cycleDays));
          
          const currentBalance = parseFloat(envelope.currentBalance || '0');
          const amountNeeded = Math.max(0, targetAmount - currentBalance);
          const perCycleAmount = amountNeeded / cyclesUntilDue;
          
          data.budgetedAmount = perCycleAmount.toFixed(2);
          data.payCycleAmount = perCycleAmount.toFixed(2);
        }
      }
      
      await updateEnvelopeMutation.mutateAsync({ id: envelopeId, data });
    } catch (error) {
      console.error('Failed to update envelope:', error);
      toast({
        title: "Error",
        description: "Failed to update envelope. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle envelope creation
  const handleCreateEnvelope = async () => {
    if (!newEnvelope.name.trim()) return;
    
    try {
      const data = {
        name: newEnvelope.name,
        envelopeType: newEnvelope.typeId === 1 ? 'income' : 'expense',
        budgetedAmount: newEnvelope.budget || '0',
        payCycleAmount: newEnvelope.budget || '0',
        budgetFrequency: newEnvelope.frequency,
        notes: newEnvelope.notes || null,
        userId: 1 // Demo user
      };
      
      await createEnvelopeMutation.mutateAsync(data);
    } catch (error) {
      console.error('Failed to create envelope:', error);
      toast({
        title: "Error",
        description: "Failed to create envelope. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate expected balance based on budget frequency and due date
  const calculateExpectedBalance = (envelope: any) => {
    const openingBalance = parseFloat(envelope.openingBalance || '0');
    
    if (!envelope.budgetFrequency || envelope.budgetFrequency === 'none' || !envelope.nextPaymentDue) {
      return openingBalance;
    }
    
    const now = new Date();
    const dueDate = new Date(envelope.nextPaymentDue);
    
    // For expense envelopes, use target amount; for income, use budget amount
    const targetAmount = envelope.envelopeType === 'expense' 
      ? parseFloat(envelope.targetAmount || '0')
      : parseFloat(envelope.budgetedAmount || '0');
    
    // Calculate cycle length in days based on frequency
    let cycleDays = 30; // Default to monthly
    switch (envelope.budgetFrequency) {
      case 'weekly': cycleDays = 7; break;
      case 'fortnightly': cycleDays = 14; break;
      case 'monthly': cycleDays = 30; break;
      case 'quarterly': cycleDays = 91; break;
      case 'annually': cycleDays = 365; break;
    }
    
    // Calculate the start of the current cycle (working backwards from due date)
    const cycleStart = new Date(dueDate.getTime() - (cycleDays * 24 * 60 * 60 * 1000));
    
    // If we're past the due date, we should have the full target amount
    if (now >= dueDate) {
      return openingBalance + targetAmount;
    }
    
    // If we're before the cycle started, just return opening balance
    if (now < cycleStart) {
      return openingBalance;
    }
    
    // Calculate progress through the current cycle
    const daysSinceCycleStart = Math.floor((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const progressRatio = Math.min(daysSinceCycleStart / cycleDays, 1);
    
    // Expected balance = opening balance + (target amount * progress through cycle)
    return openingBalance + (targetAmount * progressRatio);
  };

  // Calculate totals (including opening balances for startup allocation)
  const incomeEnvelopes = (envelopes as any[]).filter((env: any) => env.envelopeType === 'income');
  const expenseEnvelopes = (envelopes as any[]).filter((env: any) => env.envelopeType === 'expense');
  
  const totalIncome = incomeEnvelopes.reduce((sum: number, env: any) => 
    sum + parseFloat(env.budgetedAmount || '0') + parseFloat(env.openingBalance || '0'), 0);
  const totalExpenses = expenseEnvelopes.reduce((sum: number, env: any) => 
    sum + parseFloat(env.budgetedAmount || '0') + parseFloat(env.openingBalance || '0'), 0);
  const difference = totalIncome - totalExpenses;

  // Render envelope row
  const renderEnvelopeRow = (envelope: any, index: number) => {
    const payCycleAmount = parseFloat(envelope.payCycleAmount || '0');
    const annualAmount = parseFloat(envelope.annualAmount || '0');
    const openingBalance = parseFloat(envelope.openingBalance || '0');
    const currentBalance = parseFloat(envelope.currentBalance || '0');
    const expectedBalance = calculateExpectedBalance(envelope);
    const balanceDifference = currentBalance - expectedBalance;
    
    return (
      <tr key={envelope.id || index} className="text-sm">
        <td className="font-medium w-32">
          {/* Envelope name */}
          {editingField?.envelopeId === envelope.id && editingField?.field === 'name' ? (
            <Input
              value={editingField.value}
              onChange={(e) => setEditingField({...editingField, value: e.target.value})}
              onBlur={() => {
                handleInlineEdit(envelope.id!, 'name', editingField.value);
                setEditingField(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInlineEdit(envelope.id!, 'name', editingField.value);
                  setEditingField(null);
                }
                if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              className="h-8"
            />
          ) : (
            <div className="space-y-1">
              <div 
                className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm" 
                onClick={() => setEditingField({envelopeId: envelope.id!, field: 'name', value: envelope.name})}
              >
                {envelope.name}
              </div>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  {/* Type Icon */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => {
                      const newType = envelope.envelopeType === 'income' ? 'expense' : 'income';
                      updateEnvelopeMutation.mutate({ 
                        id: envelope.id!, 
                        data: { envelopeType: newType }
                      });
                    }}
                    title={`Toggle to ${envelope.envelopeType === 'income' ? 'expense' : 'income'}`}
                  >
                    {envelope.envelopeType === 'income' ? (
                      <ArrowUpCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="h-3 w-3 text-red-600" />
                    )}
                  </Button>
                  
                  {editingField?.envelopeId === envelope.id && editingField?.field === 'notes' ? (
                    <Input
                      value={editingField.value}
                      onChange={(e) => setEditingField({...editingField, value: e.target.value})}
                      onBlur={() => {
                        handleInlineEdit(envelope.id!, 'notes', editingField.value);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleInlineEdit(envelope.id!, 'notes', editingField.value);
                          setEditingField(null);
                        }
                        if (e.key === 'Escape') {
                          setEditingField(null);
                        }
                      }}
                      className="h-5 text-xs italic flex-1"
                      placeholder="Add notes..."
                    />
                  ) : (
                    <div 
                      className="text-xs italic text-muted-foreground cursor-pointer hover:text-blue-600 flex-1"
                      onClick={() => setEditingField({envelopeId: envelope.id!, field: 'notes', value: envelope.notes || ''})}
                    >
                      {envelope.notes || 'Add notes...'}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => setEditingField({envelopeId: envelope.id!, field: 'notes', value: envelope.notes || ''})}
                  title="Edit notes"
                >
                  <Edit className="h-2 w-2" />
                </Button>
              </div>
            </div>
          )}
        </td>
        
        {/* Schedule Column */}
        <td className="w-24">
          <div className="space-y-1">
            <Select 
              value={envelope.budgetFrequency || "monthly"} 
              onValueChange={(value) => {
                updateEnvelopeMutation.mutate({ 
                  id: envelope.id!, 
                  data: { budgetFrequency: value }
                });
              }}
            >
              <SelectTrigger className="h-6 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]" style={{zIndex: 9999}}>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnight</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annual</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Target Amount for Expense Envelopes */}
            {envelope.budgetFrequency && envelope.budgetFrequency !== 'none' && envelope.envelopeType === 'expense' && (
              <div className="text-xs mb-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={focusedField?.envelopeId === envelope.id && focusedField?.field === 'targetAmount' ? 
                    (editingField?.envelopeId === envelope.id && editingField?.field === 'targetAmount' ? editingField.value : '') : 
                    parseFloat(envelope.targetAmount || '0').toFixed(2)}
                  onChange={(e) => {
                    setEditingField({envelopeId: envelope.id!, field: 'targetAmount', value: e.target.value});
                    // Real-time save on each keystroke
                    handleInlineEdit(envelope.id!, 'targetAmount', e.target.value);
                  }}
                  onFocus={() => {
                    setFocusedField({envelopeId: envelope.id!, field: 'targetAmount'});
                    setEditingField({envelopeId: envelope.id!, field: 'targetAmount', value: ''});
                  }}
                  onBlur={() => {
                    if (editingField?.envelopeId === envelope.id && editingField?.field === 'targetAmount') {
                      handleInlineEdit(envelope.id!, 'targetAmount', editingField.value);
                    }
                    setFocusedField(null);
                    setEditingField(null);
                  }}
                  className="h-6 w-full text-xs text-center border-0 bg-transparent focus:bg-white focus:border-gray-200 rounded-none focus:rounded text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Bill amount"
                />
              </div>
            )}

            {/* Due Date Calendar Selector */}
            {envelope.budgetFrequency && envelope.budgetFrequency !== 'none' && (
              <div className="text-xs">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-full text-xs justify-start font-normal"
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {envelope.nextPaymentDue ? (
                        new Date(envelope.nextPaymentDue).toLocaleDateString('en-NZ', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                      ) : (
                        "Set next due date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]" align="start" style={{zIndex: 9999}}>
                    <Calendar
                      mode="single"
                      selected={envelope.nextPaymentDue ? new Date(envelope.nextPaymentDue) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          updateEnvelopeMutation.mutate({
                            id: envelope.id!,
                            data: { nextPaymentDue: date.toISOString() }
                          });
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </td>
        
        {/* Pay Cycle Amount */}
        <td className="w-24">
          <Input
            type="text"
            inputMode="decimal"
            value={focusedField?.envelopeId === envelope.id && focusedField?.field === 'payCycleAmount' ? 
              (editingField?.envelopeId === envelope.id && editingField?.field === 'payCycleAmount' ? editingField.value : '') : 
              payCycleAmount.toFixed(2)}
            onChange={(e) => {
              const newValue = e.target.value;
              const newAnnual = (parseFloat(newValue || '0') * (payCycle === 'weekly' ? 52 : payCycle === 'fortnightly' ? 26 : 12)).toFixed(2);
              setEditingField({envelopeId: envelope.id!, field: 'payCycleAmount', value: newValue, relatedValue: newAnnual});
              // Real-time save on each keystroke
              handleInlineEdit(envelope.id!, 'payCycleAmount', newValue, newAnnual);
            }}
            onFocus={() => {
              setFocusedField({envelopeId: envelope.id!, field: 'payCycleAmount'});
              setEditingField({envelopeId: envelope.id!, field: 'payCycleAmount', value: '', relatedValue: ''});
            }}
            onBlur={() => {
              if (editingField?.envelopeId === envelope.id && editingField?.field === 'payCycleAmount') {
                handleInlineEdit(envelope.id!, 'payCycleAmount', editingField.value, editingField.relatedValue);
              }
              setFocusedField(null);
              setEditingField(null);
            }}
            className="h-6 w-full text-xs text-right border-0 bg-transparent focus:bg-white focus:border-gray-200 rounded-none focus:rounded text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0.00"
          />
        </td>
        
        {/* Annual Amount */}
        <td className="w-24">
          <Input
            type="text"
            inputMode="decimal"
            value={focusedField?.envelopeId === envelope.id && focusedField?.field === 'annualAmount' ? 
              (editingField?.envelopeId === envelope.id && editingField?.field === 'annualAmount' ? editingField.value : '') : 
              annualAmount.toFixed(2)}
            onChange={(e) => {
              const newValue = e.target.value;
              const newPayCycle = (parseFloat(newValue || '0') / (payCycle === 'weekly' ? 52 : payCycle === 'fortnightly' ? 26 : 12)).toFixed(2);
              setEditingField({envelopeId: envelope.id!, field: 'annualAmount', value: newValue, relatedValue: newPayCycle});
              // Real-time save on each keystroke
              handleInlineEdit(envelope.id!, 'annualAmount', newValue, newPayCycle);
            }}
            onFocus={() => {
              setFocusedField({envelopeId: envelope.id!, field: 'annualAmount'});
              setEditingField({envelopeId: envelope.id!, field: 'annualAmount', value: '', relatedValue: ''});
            }}
            onBlur={() => {
              if (editingField?.envelopeId === envelope.id && editingField?.field === 'annualAmount') {
                handleInlineEdit(envelope.id!, 'annualAmount', editingField.value, editingField.relatedValue);
              }
              setFocusedField(null);
              setEditingField(null);
            }}
            className="h-6 w-full text-xs text-right border-0 bg-transparent focus:bg-white focus:border-gray-200 rounded-none focus:rounded text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0.00"
          />
        </td>
        
        {/* Opening Balance */}
        <td className="w-24">
          <Input
            type="text"
            inputMode="decimal"
            value={focusedField?.envelopeId === envelope.id && focusedField?.field === 'openingBalance' ? 
              (editingField?.envelopeId === envelope.id && editingField?.field === 'openingBalance' ? editingField.value : '') : 
              Number(openingBalance || 0).toFixed(2)}
            onChange={(e) => {
              setEditingField({envelopeId: envelope.id!, field: 'openingBalance', value: e.target.value});
              // Real-time save on each keystroke
              handleInlineEdit(envelope.id!, 'openingBalance', e.target.value);
            }}
            onFocus={() => {
              setFocusedField({envelopeId: envelope.id!, field: 'openingBalance'});
              setEditingField({envelopeId: envelope.id!, field: 'openingBalance', value: ''});
            }}
            onBlur={() => {
              if (editingField?.envelopeId === envelope.id && editingField?.field === 'openingBalance') {
                handleInlineEdit(envelope.id!, 'openingBalance', editingField.value);
              }
              setFocusedField(null);
              setEditingField(null);
            }}
            className="h-6 w-full text-xs text-right border-0 bg-transparent focus:bg-white focus:border-gray-200 rounded-none focus:rounded text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0.00"
          />
        </td>
        
        {/* Current Balance */}
        <td className="w-16 text-right text-xs">
          ${currentBalance.toFixed(2)}
        </td>
        
        {/* Expected Balance */}
        <td className="w-16 text-right text-xs">
          ${expectedBalance.toFixed(2)}
        </td>
        
        {/* Status */}
        <td className="w-12">
          {(() => {
            if (Math.abs(balanceDifference) < 1) {
              return <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1 py-0">✓</Badge>;
            } else if (balanceDifference > 0) {
              return <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs px-1 py-0">+${balanceDifference.toFixed(0)}</Badge>;
            } else {
              return <Badge variant="destructive" className="text-xs px-1 py-0">-${Math.abs(balanceDifference).toFixed(0)}</Badge>;
            }
          })()}
        </td>
        
        {/* Delete Button */}
        <td className="w-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
            onClick={() => deleteEnvelopeMutation.mutate(envelope.id!)}
            title="Delete envelope"
          >
            <Trash2 className="h-2 w-2" />
          </Button>
        </td>
      </tr>
    );
  };

  const pageContent = (
    <div className={isMobile ? "p-1 pb-20 space-y-6" : "p-4 space-y-6"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zero-Based Budget Setup</h1>
          <p className="text-muted-foreground">Plan and organise your complete budget system</p>
        </div>
        <Dialog open={showEnvelopeForm} onOpenChange={setShowEnvelopeForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Envelope
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Envelope</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Envelope name"
                value={newEnvelope.name}
                onChange={(e) => setNewEnvelope({...newEnvelope, name: e.target.value})}
              />
              <Select 
                value={newEnvelope.typeId.toString()} 
                onValueChange={(value) => setNewEnvelope({...newEnvelope, typeId: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">💼 Income</SelectItem>
                  <SelectItem value="2">💰 Expense</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder={`Per ${payCycle === "fortnightly" ? "fortnight" : payCycle} amount`}
                value={newEnvelope.budget}
                onChange={(e) => setNewEnvelope({...newEnvelope, budget: e.target.value})}
              />
              <Input
                placeholder="Notes (optional)"
                value={newEnvelope.notes}
                onChange={(e) => setNewEnvelope({...newEnvelope, notes: e.target.value})}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreateEnvelope} className="flex-1">
                  Create Envelope
                </Button>
                <Button variant="outline" onClick={() => setShowEnvelopeForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pay Cycle Configuration */}
      <div className="bg-card p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-3">Pay Cycle Configuration</h3>
        <div className="flex items-center gap-4">
          <label htmlFor="payCycle" className="text-sm font-medium">
            How often do you get paid?
          </label>
          <Select 
            value={(user as any)?.payCycle || "monthly"} 
            onValueChange={async (value) => {
              try {
                const response = await fetch('/api/user/settings', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ payCycle: value })
                });
                
                if (response.ok) {
                  queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
                } else {
                  throw new Error('Failed to update pay cycle');
                }
              } catch (error) {
                console.error('Failed to update pay cycle:', error);
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This determines how the "Per" column calculates budget amounts from your annual totals.
        </p>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalIncome.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              per {payCycle === "fortnightly" ? "fortnight" : payCycle}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalExpenses.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              per {payCycle === "fortnightly" ? "fortnight" : payCycle}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Difference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(difference).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {difference >= 0 ? 'Surplus' : 'Overspent'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income & Expense Tables */}
      {(envelopes as any[]).length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          No envelopes created yet. Click "Add Envelope" to start building your budget.
        </p>
      ) : (
        <div className="space-y-8">
          {/* Income Section */}
          {incomeEnvelopes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-600">Income Envelopes</h3>
              </div>
              <div className="budget-table-container">
                <table className="budget-table">
                  <thead>
                    <tr>
                      <th className="w-32 text-sm">Envelope<br />Name</th>
                      <th className="w-24 text-sm">Schedule</th>
                      <th className="w-24 text-sm">Per<br /><span className="text-blue-600 font-semibold">{payCycle === "fortnightly" ? "Fortnight" : payCycle === "weekly" ? "Week" : "Month"}</span></th>
                      <th className="w-24 text-sm">Annual</th>
                      <th className="w-24 text-sm">Opening</th>
                      <th className="w-16 text-sm">Current</th>
                      <th className="w-16 text-sm">Expected</th>
                      <th className="w-12 text-sm">Status</th>
                      <th className="w-6 text-sm">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeEnvelopes.map((envelope: any, index: number) => 
                      renderEnvelopeRow(envelope, index)
                    )}
                    {/* Income Subtotal Row */}
                    <tr className="bg-green-50 border-t-2 border-green-200">
                      <td className="font-bold text-green-700" colSpan={2}>
                        Income Subtotal
                      </td>
                      <td className="font-bold text-green-700 text-right">
                        ${incomeEnvelopes.reduce((sum, env) => sum + parseFloat(env.payCycleAmount || '0'), 0).toFixed(2)}
                      </td>
                      <td className="font-bold text-green-700 text-right">
                        ${incomeEnvelopes.reduce((sum, env) => sum + parseFloat(env.annualAmount || '0'), 0).toFixed(2)}
                      </td>
                      <td className="font-bold text-green-700 text-right">
                        ${incomeEnvelopes.reduce((sum, env) => sum + parseFloat(env.openingBalance || '0'), 0).toFixed(2)}
                      </td>
                      <td className="font-bold text-green-700 text-right">
                        ${incomeEnvelopes.reduce((sum, env) => sum + parseFloat(env.currentBalance || '0'), 0).toFixed(2)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expense Section */}
          {expenseEnvelopes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-600">Expense Envelopes</h3>
              </div>
              <div className="budget-table-container">
                <table className="budget-table">
                  <thead>
                    <tr>
                      <th className="w-32 text-sm">Envelope<br />Name</th>
                      <th className="w-24 text-sm">Schedule</th>
                      <th className="w-24 text-sm">Per<br /><span className="text-blue-600 font-semibold">{payCycle === "fortnightly" ? "Fortnight" : payCycle === "weekly" ? "Week" : "Month"}</span></th>
                      <th className="w-24 text-sm">Annual</th>
                      <th className="w-24 text-sm">Opening</th>
                      <th className="w-16 text-sm">Current</th>
                      <th className="w-16 text-sm">Expected</th>
                      <th className="w-12 text-sm">Status</th>
                      <th className="w-6 text-sm">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseEnvelopes.map((envelope: any, index: number) => 
                      renderEnvelopeRow(envelope, index)
                    )}
                    {/* Expense Subtotal Row */}
                    <tr className="bg-red-50 border-t-2 border-red-200">
                      <td className="font-bold text-red-700" colSpan={2}>
                        Expense Subtotal
                      </td>
                      <td className="font-bold text-red-700 text-right">
                        ${expenseEnvelopes.reduce((sum, env) => sum + parseFloat(env.payCycleAmount || '0'), 0).toFixed(2)}
                      </td>
                      <td className="font-bold text-red-700 text-right">
                        ${expenseEnvelopes.reduce((sum, env) => sum + parseFloat(env.annualAmount || '0'), 0).toFixed(2)}
                      </td>
                      <td className="font-bold text-red-700 text-right">
                        ${expenseEnvelopes.reduce((sum, env) => sum + parseFloat(env.openingBalance || '0'), 0).toFixed(2)}
                      </td>
                      <td className="font-bold text-red-700 text-right">
                        ${expenseEnvelopes.reduce((sum, env) => sum + parseFloat(env.currentBalance || '0'), 0).toFixed(2)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grand Total Row */}
          <div className="bg-slate-100 p-4 rounded-lg">
            <div className="grid grid-cols-6 gap-4 text-sm font-bold">
              <div className="col-span-2">Net Difference (Income - Expenses)</div>
              <div className={`text-right ${difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${difference.toFixed(2)}
              </div>
              <div className={`text-right ${difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${(difference * (payCycle === 'weekly' ? 52 : payCycle === 'fortnightly' ? 26 : 12)).toFixed(2)} annual
              </div>
              <div className="col-span-2"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader />
        {pageContent}
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        {pageContent}
      </div>
    </div>
  );
}