import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import TransactionItem from "@/components/transaction-item";
import NewTransactionDialog from "@/components/new-transaction-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem 
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CalendarIcon, 
  Search, 
  Download, 
  Filter, 
  Plus, 
  ChevronDown,
  Edit3,
  Minus,
  X,
  Check,
  Tag,
  Camera,
  Trash2,
  Upload
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import type { Transaction, Account, Envelope, Label as LabelType } from "@shared/schema";

export default function Transactions() {
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedEnvelopes, setSelectedEnvelopes] = useState<string[]>([]);
  
  // Transaction editing state
  const [editingTransaction, setEditingTransaction] = useState<number | null>(null);
  const [transactionEnvelopes, setTransactionEnvelopes] = useState<{[key: number]: {envelopeId: number; amount: string}[]}>({});
  const [transactionDescriptions, setTransactionDescriptions] = useState<{[key: number]: string}>({});
  const [transactionLabels, setTransactionLabels] = useState<{[key: number]: number[]}>({});
  const [labelSearch, setLabelSearch] = useState("");
  const [labelDialogOpen, setLabelDialogOpen] = useState<number | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [transactionReceipts, setTransactionReceipts] = useState<{[key: number]: File | null}>({});
  const [splitMode, setSplitMode] = useState<{[key: number]: boolean}>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<number | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvAccountId, setCsvAccountId] = useState<string>("");
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);

  // Check for envelope filter and new transaction flag in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const envelopeParam = urlParams.get('envelope');
    const newParam = urlParams.get('new');
    const noDateFilterParam = urlParams.get('noDateFilter');
    
    if (envelopeParam) {
      setSelectedEnvelopes([envelopeParam]);
    }
    
    if (newParam === 'true') {
      setShowNewTransactionDialog(true);
    }
    
    // If noDateFilter is true, set date range to show all transactions
    if (noDateFilterParam === 'true') {
      setDateRange({
        from: new Date(2020, 0, 1),
        to: new Date(2030, 11, 31)
      });
    }
    
    // Clear the URL parameters after processing
    if (envelopeParam || newParam || noDateFilterParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ['/api/envelopes'],
  });

  const { data: labels = [] } = useQuery<LabelType[]>({
    queryKey: ['/api/labels'],
  });

  const { data: merchantMemory = [] } = useQuery({
    queryKey: ['/api/merchant-memory'],
    queryFn: async () => {
      const response = await fetch('/api/merchant-memory');
      const data = await response.json();
      console.log('Merchant memory loaded:', data);
      return data;
    },
  });

  const hasTransactionBeenEdited = (transactionId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return false;
    
    // Check if envelopes have been modified
    const currentEnvelopes = transactionEnvelopes[transactionId] || [];
    const originalEnvelopes = transaction.transactionEnvelopes || [];
    
    // Check if description has been modified
    const currentDescription = transactionDescriptions[transactionId];
    const originalDescription = transaction.description;
    
    // Check if labels have been modified
    const currentLabels = transactionLabels[transactionId] || [];
    const originalLabels = transaction.transactionLabels?.map(tl => tl.labelId) || [];
    
    const envelopesChanged = JSON.stringify(currentEnvelopes) !== JSON.stringify(originalEnvelopes);
    const descriptionChanged = currentDescription !== undefined && currentDescription !== originalDescription;
    const labelsChanged = JSON.stringify(currentLabels.sort()) !== JSON.stringify(originalLabels.sort());
    
    return envelopesChanged || descriptionChanged || labelsChanged;
  };



  const canApproveTransaction = (transactionId: number) => {
    const envelopes = transactionEnvelopes[transactionId] || [];
    const hasValidEnvelopes = envelopes.length > 0 && envelopes.every(env => env.envelopeId > 0);
    const totalAmount = Math.abs(envelopes.reduce((sum, env) => sum + parseFloat(env.amount || '0'), 0));
    const transaction = transactions.find(t => t.id === transactionId);
    const transactionAmount = Math.abs(parseFloat(transaction?.amount || '0'));
    
    console.log(`canApproveTransaction(${transactionId}):`, {
      envelopes,
      hasValidEnvelopes,
      totalAmount,
      transactionAmount,
      amountMatch: Math.abs(totalAmount - transactionAmount) < 0.01,
      result: hasValidEnvelopes && Math.abs(totalAmount - transactionAmount) < 0.01
    });
    
    return hasValidEnvelopes && Math.abs(totalAmount - transactionAmount) < 0.01;
  };

  // Transaction editing functions and mutations
  const updateDescriptionMutation = useMutation({
    mutationFn: async ({ transactionId, description }: { transactionId: number; description: string }) => {
      return apiRequest('PATCH', `/api/transactions/${transactionId}`, { description });
    },
    onSuccess: (_, { transactionId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setTransactionDescriptions(prev => {
        const updated = { ...prev };
        delete updated[transactionId];
        return updated;
      });
      toast({
        title: "Description updated",
        description: "Transaction description has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update description.",
        variant: "destructive",
      });
    },
  });

  const approveTransactionMutation = useMutation({
    mutationFn: async (data: { transactionId: number; envelopes: Array<{ envelopeId: number; amount: string }>; description?: string; labelIds: number[] }) => {
      console.log("Approve mutation data:", data);
      return apiRequest('POST', `/api/transactions/${data.transactionId}/approve`, {
        envelopes: data.envelopes,
        description: data.description,
        labelIds: data.labelIds
      });
    },
    onSuccess: (_, variables) => {
      console.log("Approve success:", variables);
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      
      // Clear local state for this transaction since it's now saved
      const transactionId = variables.transactionId;
      setTransactionEnvelopes(prev => {
        const updated = { ...prev };
        delete updated[transactionId];
        return updated;
      });
      setTransactionDescriptions(prev => {
        const updated = { ...prev };
        delete updated[transactionId];
        return updated;
      });
      setTransactionLabels(prev => {
        const updated = { ...prev };
        delete updated[transactionId];
        return updated;
      });
      
      toast({
        title: "Transaction updated",
        description: "Transaction changes have been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Approve error:", error);
      const errorMessage = error?.message || "Failed to approve transaction";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: async (data: { name: string; colour: string }) => {
      return apiRequest('POST', '/api/labels', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/labels'] });
      setNewLabelName("");
      setShowCreateLabel(false);
      toast({
        title: "Label created",
        description: "New label has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create label.",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return apiRequest('DELETE', `/api/transactions/${transactionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setDeleteConfirmOpen(null);
      toast({
        title: "Transaction deleted",
        description: "Transaction has been permanently removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteTransactionsMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      return apiRequest('DELETE', '/api/transactions', { transactionIds });
    },
    onSuccess: (_, transactionIds) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setSelectedTransactions(new Set());
      setIsAllSelected(false);
      toast({
        title: "Transactions deleted",
        description: `${transactionIds.length} transactions have been permanently removed.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete selected transactions.",
        variant: "destructive",
      });
    },
  });

  // Selection helper functions
  const handleSelectTransaction = (transactionId: number, checked: boolean) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(transactionId);
      } else {
        newSet.delete(transactionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allTransactionIds = new Set(displayedTransactions.map(t => t.id));
      setSelectedTransactions(allTransactionIds);
      setIsAllSelected(true);
    } else {
      setSelectedTransactions(new Set());
      setIsAllSelected(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedTransactions.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    const transactionIds = Array.from(selectedTransactions);
    bulkDeleteTransactionsMutation.mutate(transactionIds);
    setShowBulkDeleteConfirm(false);
  };

  const initializeEnvelopes = (transaction: Transaction) => {
    if (!transactionEnvelopes[transaction.id]) {
      // If transaction has existing envelopes, use them; otherwise start with empty envelope
      const existingEnvelopes = transaction.transactionEnvelopes || [];
      const transactionAmount = Math.abs(parseFloat(transaction.amount)).toFixed(2);
      const initialEnvelopes = existingEnvelopes.length > 0 
        ? existingEnvelopes.map((te: any) => ({
            envelopeId: te.envelopeId || 0,
            amount: te.amount || transactionAmount
          }))
        : [{ envelopeId: 0, amount: transactionAmount }];
      
      setTransactionEnvelopes(prev => ({
        ...prev,
        [transaction.id]: initialEnvelopes
      }));
    }
    if (!transactionDescriptions[transaction.id] && !transaction.description) {
      setTransactionDescriptions(prev => ({
        ...prev,
        [transaction.id]: ""
      }));
    }
    if (!transactionLabels[transaction.id]) {
      setTransactionLabels(prev => ({
        ...prev,
        [transaction.id]: []
      }));
    }
  };

  const handleEnvelopeChange = (transactionId: number, index: number, field: 'envelopeId' | 'amount', value: string) => {
    setTransactionEnvelopes(prev => {
      const current = prev[transactionId] || [];
      const updated = [...current];
      if (field === 'envelopeId') {
        updated[index] = { ...updated[index], envelopeId: parseInt(value) };
      } else {
        updated[index] = { ...updated[index], amount: value };
      }
      return { ...prev, [transactionId]: updated };
    });
  };

  const toggleSplitMode = (transactionId: number) => {
    setSplitMode(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };

  const addEnvelopeAllocation = (transactionId: number) => {
    setTransactionEnvelopes(prev => {
      const current = prev[transactionId] || [];
      const transaction = displayedTransactions.find(t => t.id === transactionId);
      const remainingAmount = transaction ? calculateRemainingAmount(transactionId, transaction.amount) : "0.00";
      
      return { 
        ...prev, 
        [transactionId]: [...current, { envelopeId: 0, amount: remainingAmount }] 
      };
    });
  };

  const removeEnvelopeAllocation = (transactionId: number, index: number) => {
    setTransactionEnvelopes(prev => {
      const current = prev[transactionId] || [];
      // Don't allow removing the last allocation
      if (current.length <= 1) return prev;
      
      const updated = current.filter((_, i) => i !== index);
      return { ...prev, [transactionId]: updated };
    });
  };

  const calculateRemainingAmount = (transactionId: number, transactionAmount: string) => {
    const allocations = transactionEnvelopes[transactionId] || [];
    const totalAllocated = allocations.reduce((sum, allocation) => 
      sum + parseFloat(allocation.amount || '0'), 0
    );
    const remaining = parseFloat(transactionAmount) - totalAllocated;
    return Math.max(0, remaining).toFixed(2);
  };

  const toggleLabel = (transactionId: number, labelId: number) => {
    setTransactionLabels(prev => {
      const current = prev[transactionId] || [];
      const isSelected = current.includes(labelId);
      
      if (isSelected) {
        return {
          ...prev,
          [transactionId]: current.filter(id => id !== labelId)
        };
      } else {
        return {
          ...prev,
          [transactionId]: [...current, labelId]
        };
      }
    });
  };

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      createLabelMutation.mutate({
        name: newLabelName.trim(),
        colour: randomColor
      });
    }
  };



  const initializeTransactionEdit = (transaction: Transaction) => {
    if (!transactionEnvelopes[transaction.id]) {
      // Load existing envelope assignments or create initial one
      const existingEnvelopes = transaction.transactionEnvelopes || [];
      const transactionAmount = Math.abs(parseFloat(transaction.amount)).toFixed(2);
      const initialEnvelopes = existingEnvelopes.length > 0 
        ? existingEnvelopes.map((te: any) => ({
            envelopeId: te.envelopeId || 0,
            amount: Math.abs(parseFloat(te.amount || transactionAmount)).toFixed(2)
          }))
        : [{ envelopeId: 0, amount: transactionAmount }];
      
      setTransactionEnvelopes(prev => ({
        ...prev,
        [transaction.id]: initialEnvelopes
      }));
    }
    if (!transactionDescriptions[transaction.id]) {
      setTransactionDescriptions(prev => ({
        ...prev,
        [transaction.id]: transaction.description || ""
      }));
    }
    if (!transactionLabels[transaction.id]) {
      const existingLabels = transaction.transactionLabels?.map(tl => tl.labelId) || [];
      setTransactionLabels(prev => ({
        ...prev,
        [transaction.id]: existingLabels
      }));
    }
    if (!transactionReceipts[transaction.id]) {
      setTransactionReceipts(prev => ({
        ...prev,
        [transaction.id]: null
      }));
    }
  };

  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(labelSearch.toLowerCase())
  );

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Check if date range has been modified from default (current month to today)
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const todayEnd = new Date().setHours(23, 59, 59, 999);
  const hasCustomDateRange = dateRange.from.getTime() !== currentMonthStart.getTime() || 
                             dateRange.to.getTime() < todayEnd;

  // Check if any filters other than search and date are actively applied
  const hasActiveNonSearchDateFilters = selectedAccount !== "all" || selectedEnvelopes.length > 0;

  // Filter transactions based on search and date range
  const filteredTransactions = transactions.filter(transaction => {
    // Search filter (always applied if present)
    const matchesSearch = activeSearchTerm === "" || 
      transaction.merchant.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
      (transaction.description && transaction.description.toLowerCase().includes(activeSearchTerm.toLowerCase())) ||
      Math.abs(parseFloat(transaction.amount)).toString().includes(activeSearchTerm);

    // Date filter (always applied when date range is customized)
    const transactionDate = new Date(transaction.date);
    const matchesDate = transactionDate >= dateRange.from && transactionDate <= dateRange.to;

    // If only search is active and no custom date range, skip date filtering
    if (activeSearchTerm !== "" && !hasActiveNonSearchDateFilters && !hasCustomDateRange) {
      return matchesSearch;
    }

    // If only date range is active (and other filters are default), apply only date and search filters
    if (hasCustomDateRange && !hasActiveNonSearchDateFilters) {
      return matchesSearch && matchesDate;
    }

    // If no filters are applied, show recent transactions without date filtering
    if (activeSearchTerm === "" && !hasActiveNonSearchDateFilters && !hasCustomDateRange) {
      return true; // Show all transactions, will be limited by pageSize
    }

    // Apply all filters when multiple filters are active
    const matchesAccount = selectedAccount === "all" || transaction.accountId.toString() === selectedAccount;
    
    // Apply envelope filters if selected
    let matchesEnvelope = true;
    if (selectedEnvelopes.length > 0) {
      const hasEnvelopes = transaction.transactionEnvelopes && transaction.transactionEnvelopes.length > 0;
      if (!hasEnvelopes) {
        matchesEnvelope = false;
      } else {
        matchesEnvelope = transaction.transactionEnvelopes.some((te: any) => 
          selectedEnvelopes.includes(te.envelopeName || '')
        );
      }
    }
    
    return matchesDate && matchesSearch && matchesAccount && matchesEnvelope;
  });

  // Sort transactions by date (most recent first) and limit by page size
  const sortedTransactions = [...filteredTransactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const displayedTransactions = sortedTransactions.slice(0, pageSize);

  // Initialize merchant memory suggestions for pending transactions
  useEffect(() => {
    console.log('useEffect triggered:', { 
      merchantMemoryLength: merchantMemory.length, 
      displayedTransactionsLength: displayedTransactions.length,
      merchantMemory: merchantMemory.slice(0, 3) // Show first 3 for debugging
    });
    
    if (merchantMemory.length > 0 && displayedTransactions.length > 0) {
      const updates: { [key: number]: { envelopeId: number; amount: string }[] } = {};
      
      displayedTransactions.forEach(transaction => {
        if (!transaction.isApproved) {
          const currentEnvelopes = transactionEnvelopes[transaction.id] || [];
          const hasNoValidEnvelopes = currentEnvelopes.length === 0 || currentEnvelopes[0]?.envelopeId === 0;
          
          if (hasNoValidEnvelopes) {
            const merchantSuggestion = merchantMemory.find(mem => mem.merchant === transaction.merchant);
            if (merchantSuggestion?.lastEnvelopeId) {
              const transactionAmount = Math.abs(parseFloat(transaction.amount)).toFixed(2);
              console.log(`Setting envelope for ${transaction.merchant} (${transaction.id}): envelope ${merchantSuggestion.lastEnvelopeId}, amount ${transactionAmount}`);
              updates[transaction.id] = [{ 
                envelopeId: merchantSuggestion.lastEnvelopeId, 
                amount: transactionAmount 
              }];
            }
          }
        }
      });
      
      if (Object.keys(updates).length > 0) {
        setTransactionEnvelopes(prev => ({
          ...prev,
          ...updates
        }));
      }
    }
  }, [merchantMemory, displayedTransactions]);

  const getAccountName = (accountId: number) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : "Unknown Account";
  };

  const handleQuickDateRange = (months: number) => {
    const endDate = endOfMonth(subMonths(new Date(), months - 1));
    const startDate = startOfMonth(subMonths(new Date(), months));
    setDateRange({ from: startDate, to: endDate });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setActiveSearchTerm("");
    setSelectedAccount("all");
    setSelectedEnvelopes([]);
    setDateRange({
      from: new Date(2020, 0, 1),
      to: new Date(2030, 11, 31)
    });
    setPageSize(25);
  };

  const handleSearch = () => {
    setActiveSearchTerm(searchTerm);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Merchant', 'Description', 'Amount', 'Account'].join(','),
      ...displayedTransactions.map(t => [
        format(new Date(t.date), 'yyyy-MM-dd'),
        `"${t.merchant}"`,
        `"${t.description || ''}"`,
        t.amount,
        `"${getAccountName(t.accountId)}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // CSV Import Mutation
  const csvImportMutation = useMutation({
    mutationFn: async ({ file, accountId }: { file: File; accountId: string }) => {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('accountId', accountId);
      
      const response = await fetch('/api/transactions/import-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to import CSV');
        } catch (e) {
          throw new Error(`Failed to import CSV: ${response.status} ${response.statusText}`);
        }
      }
      
      try {
        const responseText = await response.text();
        console.log('CSV Import Response:', responseText);
        return JSON.parse(responseText);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        throw new Error('Invalid response from server');
      }
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Import Successful",
        description: `Imported ${data.imported} transactions successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setShowCsvImport(false);
      setCsvFile(null);
      setCsvAccountId("");
      setCsvPreview([]);
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // CSV File Handling
  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setShowCsvImport(true);
      // Read and preview file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n').slice(0, 6); // Show first 5 rows + header
        const parsedRows = rows.map(row => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        });
        setCsvPreview(parsedRows);
      };
      reader.readAsText(file);
    }
  };

  const triggerCsvFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        setCsvFile(file);
        setShowCsvImport(true);
        // Read and preview file
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const rows = text.split('\n').slice(0, 6); // Show first 5 rows + header
          const parsedRows = rows.map(row => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < row.length; i++) {
              const char = row[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          });
          setCsvPreview(parsedRows);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleCsvImport = () => {
    if (csvFile && csvAccountId) {
      csvImportMutation.mutate({ file: csvFile, accountId: csvAccountId });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-1 md:p-4 lg:p-6 space-y-2 md:space-y-6 min-w-0 pb-20 md:pb-6">
            <div className="flex items-center justify-between px-2 md:px-0">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Transactions</h1>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={triggerCsvFileInput}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
                <NewTransactionDialog 
                  open={showNewTransactionDialog} 
                  onOpenChange={setShowNewTransactionDialog}
                  trigger={
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Transaction
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Compact Filters */}
            <Card className="border-l-4 border-l-blue-500 mx-1 md:mx-0">
              <CardContent className="p-2 md:p-4">
                <div className="space-y-2 md:space-y-3">
                  {/* Search Row */}
                  <div className="flex gap-1 md:gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={handleSearchKeyPress}
                        className="pl-8 pr-8 h-7 md:h-8 text-xs md:text-sm"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleSearch}
                      className="h-8 px-3 text-xs"
                    >
                      Search
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-8 px-3 text-xs"
                    >
                      Clear
                    </Button>
                    <Button onClick={exportTransactions} variant="outline" size="sm" className="h-8 px-3 text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>

                  {/* Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-1 md:gap-2">
                    <div className="md:col-span-2 grid grid-cols-2 gap-0.5 md:gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="justify-start text-xs h-8">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {format(dateRange.from, "dd/MM/yy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="justify-start text-xs h-8">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {format(dateRange.to, "dd/MM/yy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger className="h-7 md:h-8 text-xs">
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 justify-between text-xs">
                          <span>
                            {selectedEnvelopes.length === 0 
                              ? "Envelopes" 
                              : `${selectedEnvelopes.length} selected`}
                          </span>
                          <ChevronDown className="ml-2 h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="select-all-envelopes"
                              checked={selectedEnvelopes.length === envelopes.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEnvelopes(envelopes.map(env => env.id.toString()));
                                } else {
                                  setSelectedEnvelopes([]);
                                }
                              }}
                              className="rounded"
                            />
                            <label htmlFor="select-all-envelopes" className="text-sm font-medium">
                              Select All
                            </label>
                          </div>
                          <div className="border-t pt-2">
                            {envelopes.map((envelope) => (
                              <div key={envelope.id} className="flex items-center space-x-2 py-1">
                                <input
                                  type="checkbox"
                                  id={`envelope-${envelope.id}`}
                                  checked={selectedEnvelopes.includes(envelope.id.toString())}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEnvelopes(prev => [...prev, envelope.id.toString()]);
                                    } else {
                                      setSelectedEnvelopes(prev => prev.filter(id => id !== envelope.id.toString()));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <label htmlFor={`envelope-${envelope.id}`} className="text-sm flex items-center cursor-pointer">
                                  <span className="mr-2">{envelope.icon}</span>
                                  {envelope.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <div className="max-w-[80px]">
                      <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="200">200</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card className="mx-1 md:mx-0">
              <CardHeader className="p-2 md:p-6 pb-2 md:pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm md:text-base">
                    Transaction History
                    <Badge variant="secondary" className="ml-1 md:ml-2 text-xs">
                      {displayedTransactions.length} of {filteredTransactions.length}
                    </Badge>
                  </CardTitle>
                  {filteredTransactions.length > pageSize && (
                    <p className="text-sm text-muted-foreground">
                      Showing first {pageSize} results. Increase page size to see more.
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 md:p-6">
                {displayedTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No transactions found matching your criteria.</p>
                  </div>
                ) : (
                  <div className="space-y-0.5 md:space-y-1 min-w-0">
                    {/* Bulk actions header */}
                    {selectedTransactions.size > 0 && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded mb-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                          />
                          <span className="text-sm font-medium">
                            {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                          disabled={bulkDeleteTransactionsMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {bulkDeleteTransactionsMutation.isPending ? "Deleting..." : "Delete Selected"}
                        </Button>
                      </div>
                    )}
                    
                    {/* Header row with select all checkbox */}
                    <div className="flex items-center gap-2 p-2 border-b border-gray-300 bg-gray-50 text-xs font-medium text-gray-600">
                      <div className="w-8 flex justify-center">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </div>
                      <div className="flex-1">Transaction Details</div>
                      <div className="w-16 text-right">Amount</div>
                      <div className="w-16 text-center">Status</div>
                    </div>
                    
                    {displayedTransactions.map((transaction) => (
                      <div key={transaction.id} className="min-w-0">
                        {/* Three-line condensed layout */}
                        <div className="border-b border-gray-200 md:border md:rounded px-1 md:px-3 py-0.5 md:py-2 hover:bg-muted/20 transition-colors min-w-0">
                          {/* Line 1: Checkbox + Merchant + Amount + Status */}
                          <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                            <div className="w-8 flex justify-center flex-shrink-0">
                              <Checkbox
                                checked={selectedTransactions.has(transaction.id)}
                                onCheckedChange={(checked) => handleSelectTransaction(transaction.id, checked as boolean)}
                              />
                            </div>
                            <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0 overflow-hidden">
                              <span className="font-medium text-xs md:text-sm truncate flex-shrink">{transaction.merchant}</span>
                              {transaction.description && (
                                <span className="text-xs text-muted-foreground truncate hidden md:inline flex-shrink">- {transaction.description}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                              <span className="font-medium text-xs md:text-sm whitespace-nowrap">
                                ${parseFloat(transaction.amount).toFixed(2)}
                              </span>
                              {transaction.isApproved ? (
                                <Badge variant="default" className="text-xs px-1 py-0 h-3 md:h-4 bg-blue-100 text-blue-700 md:bg-green-100 md:text-green-700">
                                  ✓
                                </Badge>
                              ) : transaction.transactionEnvelopes && transaction.transactionEnvelopes.length > 0 ? (
                                <Badge variant="secondary" className="text-xs px-1 py-0 h-3 md:h-4 bg-yellow-100 text-yellow-700">
                                  <span className="md:hidden">⏳</span>
                                  <span className="hidden md:inline">⏳</span>
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs px-1 py-0 h-3 md:h-4 bg-red-100 text-red-700">
                                  <span className="md:hidden">!</span>
                                  <span className="hidden md:inline">Unmatched</span>
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Line 2: Date + Account + Bank Import Details + Envelope Assignment */}
                          <div className="flex items-center gap-1 md:gap-2 text-xs text-muted-foreground mb-0.5 md:mb-1 min-w-0 overflow-hidden">
                            <span className="text-xs flex-shrink-0">{format(new Date(transaction.date), "dd/MM/yy")}</span>
                            <span className="flex-shrink-0">•</span>
                            <Badge variant="outline" className="text-xs px-1 py-0 h-3 md:h-4 flex-shrink-0">
                              {getAccountName(transaction.accountId)}
                            </Badge>
                            {/* Bank import details next to account */}
                            {(transaction.bankReference || transaction.bankMemo) && (
                              <>
                                <span className="flex-shrink-0">•</span>
                                <span className="text-[10px] italic text-left break-words overflow-hidden">
                                  {transaction.bankReference && `Ref: ${transaction.bankReference}`}
                                  {transaction.bankReference && transaction.bankMemo && ', '}
                                  {transaction.bankMemo && `Memo: ${transaction.bankMemo}`}
                                </span>
                              </>
                            )}
                            {transaction.transactionEnvelopes && transaction.transactionEnvelopes.length > 0 ? (
                              <>
                                <span className="flex-shrink-0">•</span>
                                <span className="text-xs font-medium text-black truncate flex-1 min-w-0">
                                  {transaction.transactionEnvelopes.map((te: any, idx: number) => (
                                    <span key={idx}>
                                      {te.envelopeName}
                                      {idx < transaction.transactionEnvelopes.length - 1 ? ', ' : ''}
                                    </span>
                                  ))}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="flex-shrink-0">•</span>
                                <span className="text-xs text-gray-400 italic flex-shrink-0">No envelope</span>
                              </>
                            )}
                          </div>

                          {/* Line 3: Labels + Action Buttons */}
                          <div className="flex items-center justify-between min-w-0 overflow-hidden">
                            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                              {/* Show label names if available */}
                              {transactionLabels[transaction.id] && transactionLabels[transaction.id].length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground hidden md:inline">Labels:</span>
                                  {transactionLabels[transaction.id].slice(0, 1).map((labelId, idx) => {
                                    const label = labels.find(l => l.id === labelId);
                                    return label ? (
                                      <Badge
                                        key={labelId}
                                        variant="outline"
                                        className="text-xs px-1 py-0 h-3 md:h-4"
                                        style={{ backgroundColor: label.colour + '20', borderColor: label.colour, color: label.colour }}
                                      >
                                        {label.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                  {transactionLabels[transaction.id].length > 1 && (
                                    <span className="text-xs text-muted-foreground">+{transactionLabels[transaction.id].length - 1}</span>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 md:h-6 text-xs px-1 md:px-2 flex-shrink-0"
                                onClick={() => toggleSplitMode(transaction.id)}
                              >
                                Split
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 md:h-6 text-xs px-1 md:px-2 flex-shrink-0"
                                onClick={() => setLabelDialogOpen(transaction.id)}
                              >
                                <span className="md:hidden">🏷️</span>
                                <span className="hidden md:inline">Labels</span>
                              </Button>

                              {/* Quick approve button for pending transactions with suggested envelopes */}
                              {!transaction.isApproved && (() => {
                                const canApprove = canApproveTransaction(transaction.id);
                                return canApprove && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-5 md:h-6 text-xs px-1 md:px-2 bg-blue-600 hover:bg-blue-700 text-white md:bg-green-600 md:hover:bg-green-700"
                                    onClick={() => {
                                      approveTransactionMutation.mutate({
                                        transactionId: transaction.id,
                                        envelopes: transactionEnvelopes[transaction.id] || [],
                                        description: transactionDescriptions[transaction.id],
                                        labelIds: transactionLabels[transaction.id] || [],
                                        receipt: transactionReceipts[transaction.id] || null
                                      });
                                    }}
                                    disabled={approveTransactionMutation.isPending}
                                  >
                                    ✓
                                  </Button>
                                );
                              })()}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 md:h-6 text-xs px-1 md:px-2"
                                onClick={() => {
                                  if (editingTransaction === transaction.id) {
                                    setEditingTransaction(null);
                                  } else {
                                    initializeTransactionEdit(transaction);
                                    setEditingTransaction(transaction.id);
                                  }
                                }}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 md:h-6 text-xs px-1 md:px-2 text-red-500 hover:text-red-700 hover:border-red-300"
                                onClick={() => setDeleteConfirmOpen(transaction.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Split interface - positioned underneath the transaction row */}
                        {splitMode[transaction.id] && (
                          <div className="mt-1 md:mt-2 mx-1 md:mx-4 p-1 md:p-3 bg-muted/10 border-t md:border md:rounded-lg space-y-1 md:space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Split Transaction</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 md:h-6 text-xs px-1 md:px-2"
                                onClick={() => addEnvelopeAllocation(transaction.id)}
                              >
                                + Add Split
                              </Button>
                            </div>
                            
                            {transactionEnvelopes[transaction.id]?.map((allocation, index) => (
                              <div key={index} className="flex items-center gap-1 md:gap-2 bg-background p-1 md:p-2 rounded border">
                                <div className="flex-1">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        className="h-6 md:h-7 text-xs justify-between w-full"
                                      >
                                        {(() => {
                                          const selectedEnvelope = envelopes.find(e => e.id === allocation.envelopeId);
                                          return selectedEnvelope ? (
                                            <span className="flex items-center gap-1">
                                              <span className="text-xs">{selectedEnvelope.icon}</span>
                                              <span className="truncate text-xs">{selectedEnvelope.name}</span>
                                            </span>
                                          ) : <span className="text-xs">Select envelope...</span>;
                                        })()}
                                        <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[280px] p-0">
                                      <Command>
                                        <CommandInput placeholder="Search envelopes..." className="h-9" />
                                        <CommandEmpty>No envelope found.</CommandEmpty>
                                        <CommandGroup className="max-h-60 overflow-auto">
                                          {envelopes.map((envelope) => (
                                            <CommandItem
                                              key={envelope.id}
                                              value={envelope.name}
                                              onSelect={() => handleEnvelopeChange(transaction.id, index, 'envelopeId', envelope.id.toString())}
                                            >
                                              <span className="flex items-center gap-2">
                                                <span>{envelope.icon}</span>
                                                <span>{envelope.name}</span>
                                              </span>
                                              <Check
                                                className={`ml-auto h-4 w-4 ${
                                                  allocation.envelopeId === envelope.id
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                }`}
                                              />
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="w-20 md:w-24">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={allocation.amount}
                                    onChange={(e) => handleEnvelopeChange(transaction.id, index, 'amount', e.target.value)}
                                    className="h-6 md:h-7 text-xs"
                                    placeholder="0.00"
                                  />
                                </div>
                                {transactionEnvelopes[transaction.id]?.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 md:h-7 w-6 md:w-7 p-0 text-red-500 hover:text-red-700"
                                    onClick={() => removeEnvelopeAllocation(transaction.id, index)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            
                            {/* Balance indicator */}
                            {(() => {
                              const allocations = transactionEnvelopes[transaction.id] || [];
                              const totalAllocated = allocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || '0'), 0);
                              const transactionAmount = parseFloat(transaction.amount);
                              const remaining = transactionAmount - totalAllocated;
                              
                              return (
                                <div className="flex items-center justify-between text-xs pt-2 border-t">
                                  <span>Transaction: ${Math.abs(transactionAmount).toFixed(2)}</span>
                                  <span>Allocated: ${totalAllocated.toFixed(2)}</span>
                                  <span className={`font-medium ${
                                    Math.abs(remaining) < 0.01 ? 'text-green-600' : 
                                    remaining > 0 ? 'text-blue-600' : 'text-red-600'
                                  }`}>
                                    {Math.abs(remaining) < 0.01 ? 'Complete' : 
                                     remaining > 0 ? `Remaining: $${remaining.toFixed(2)}` : 
                                     `Over: $${Math.abs(remaining).toFixed(2)}`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Expanded editing interface */}
                        {editingTransaction === transaction.id && (
                          <div className="mt-1 md:mt-2 p-1 md:p-3 bg-muted/20 border-t md:border md:rounded-lg space-y-2 md:space-y-3">
                            {/* Top row: Envelope + Amount + Status */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-[30%]">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="h-7 text-sm justify-between"
                                    >
                                      {(() => {
                                        const selectedEnvelopeId = transactionEnvelopes[transaction.id]?.[0]?.envelopeId || 0;
                                        const selectedEnvelope = envelopes.find(e => e.id === selectedEnvelopeId);
                                        return selectedEnvelope ? (
                                          <span className="flex items-center gap-2">
                                            <span>{selectedEnvelope.icon}</span>
                                            <span className="truncate">{selectedEnvelope.name}</span>
                                          </span>
                                        ) : "Select envelope...";
                                      })()}
                                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search envelopes..." className="h-9" />
                                      <CommandEmpty>No envelope found.</CommandEmpty>
                                      <CommandGroup className="max-h-60 overflow-auto">
                                        {envelopes.map((envelope) => (
                                          <CommandItem
                                            key={envelope.id}
                                            value={envelope.name}
                                            onSelect={() => handleEnvelopeChange(transaction.id, 0, 'envelopeId', envelope.id.toString())}
                                          >
                                            <span className="flex items-center gap-2">
                                              <span>{envelope.icon}</span>
                                              <span>{envelope.name}</span>
                                            </span>
                                            <Check
                                              className={`ml-auto h-4 w-4 ${
                                                (transactionEnvelopes[transaction.id]?.[0]?.envelopeId || 0) === envelope.id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              
                              <div className="w-36">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={transactionEnvelopes[transaction.id]?.[0]?.amount || transaction.amount}
                                  onChange={(e) => handleEnvelopeChange(transaction.id, 0, 'amount', e.target.value)}
                                  className="h-7 text-sm"
                                  placeholder="0.00"
                                  min="0"
                                  max="999999.99"
                                />
                              </div>
                              
                              <Badge variant={transaction.isApproved ? "default" : "secondary"} className="text-xs shrink-0">
                                {transaction.isApproved ? "Approved" : "Pending"}
                              </Badge>
                            </div>
                            
                            {/* Bottom row: Description + Labels + Actions */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-[30%]">
                                <Input
                                  value={transactionDescriptions[transaction.id] !== undefined 
                                    ? transactionDescriptions[transaction.id] 
                                    : transaction.description || ""}
                                  onChange={(e) => setTransactionDescriptions(prev => ({
                                    ...prev,
                                    [transaction.id]: e.target.value
                                  }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newDescription = transactionDescriptions[transaction.id] !== undefined 
                                        ? transactionDescriptions[transaction.id] 
                                        : "";
                                      updateDescriptionMutation.mutate({
                                        transactionId: transaction.id,
                                        description: newDescription
                                      });
                                    }
                                  }}
                                  className="h-8 text-sm"
                                  placeholder="Add description..."
                                />
                              </div>
                              
                              {/* Save description button */}
                              {(transactionDescriptions[transaction.id] !== undefined && 
                                transactionDescriptions[transaction.id] !== (transaction.description || "")) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Save description"
                                  onClick={() => {
                                    const newDescription = transactionDescriptions[transaction.id] !== undefined 
                                      ? transactionDescriptions[transaction.id] 
                                      : "";
                                    updateDescriptionMutation.mutate({
                                      transactionId: transaction.id,
                                      description: newDescription
                                    });
                                  }}
                                  disabled={updateDescriptionMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-sm px-3"
                                onClick={() => addEnvelopeAllocation(transaction.id)}
                                title="Split transaction"
                              >
                                Split
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-sm px-3"
                                title="Add labels"
                                onClick={() => setLabelDialogOpen(transaction.id)}
                              >
                                Labels
                              </Button>

                              {/* Receipt upload */}
                              <div className="flex items-center">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 5 * 1024 * 1024) { // 5MB limit
                                        console.error("File too large");
                                        return;
                                      }
                                      
                                      if (!file.type.startsWith('image/')) {
                                        console.error("Invalid file type");
                                        return;
                                      }
                                      
                                      setTransactionReceipts(prev => ({
                                        ...prev,
                                        [transaction.id]: file
                                      }));
                                    }
                                  }}
                                  className="hidden"
                                  id={`receipt-upload-${transaction.id}`}
                                />
                                <label 
                                  htmlFor={`receipt-upload-${transaction.id}`}
                                  className="cursor-pointer"
                                >
                                  <Button
                                    type="button"
                                    variant={transactionReceipts[transaction.id] ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    asChild
                                    title="Upload receipt"
                                  >
                                    <span>
                                      {transactionReceipts[transaction.id] ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <Camera className="h-3 w-3" />
                                      )}
                                    </span>
                                  </Button>
                                </label>
                                
                                {transactionReceipts[transaction.id] && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 ml-1"
                                    onClick={() => {
                                      setTransactionReceipts(prev => ({
                                        ...prev,
                                        [transaction.id]: null
                                      }));
                                    }}
                                    title="Remove receipt"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              
                              {/* Only show approve button for unapproved transactions OR if edits have been made to approved ones */}
                              {(!transaction.isApproved || hasTransactionBeenEdited(transaction.id)) && (
                                <Button
                                  size="sm"
                                  className={`h-7 text-xs px-3 ${
                                    transaction.isApproved && hasTransactionBeenEdited(transaction.id)
                                      ? "bg-green-600 hover:bg-green-700 text-white"
                                      : ""
                                  }`}
                                  disabled={!canApproveTransaction(transaction.id) || approveTransactionMutation.isPending}
                                  onClick={() => {
                                    approveTransactionMutation.mutate({
                                      transactionId: transaction.id,
                                      envelopes: transactionEnvelopes[transaction.id] || [],
                                      description: transactionDescriptions[transaction.id],
                                      labelIds: transactionLabels[transaction.id] || [],
                                      receipt: transactionReceipts[transaction.id] || null
                                    });
                                  }}
                                >
                                  {approveTransactionMutation.isPending ? "..." : (transaction.isApproved ? "Update" : "Approve")}
                                </Button>
                              )}
                            </div>
                            
                            {/* Split amounts (if more than one) */}
                            {(transactionEnvelopes[transaction.id]?.length || 0) > 1 && (
                              <div className="space-y-1 pt-1 border-t">
                                {transactionEnvelopes[transaction.id]?.slice(1).map((allocation, index) => (
                                  <div key={index + 1} className="flex items-center gap-2">
                                    <div className="flex-1 max-w-[30%]">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className="h-6 text-sm justify-between"
                                          >
                                            {(() => {
                                              const selectedEnvelope = envelopes.find(e => e.id === allocation.envelopeId);
                                              return selectedEnvelope ? (
                                                <span className="flex items-center gap-2">
                                                  <span>{selectedEnvelope.icon}</span>
                                                  <span className="truncate">{selectedEnvelope.name}</span>
                                                </span>
                                              ) : "Select envelope...";
                                            })()}
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                          <Command>
                                            <CommandInput placeholder="Search envelopes..." className="h-9" />
                                            <CommandEmpty>No envelope found.</CommandEmpty>
                                            <CommandGroup className="max-h-60 overflow-auto">
                                              {envelopes.map((envelope) => (
                                                <CommandItem
                                                  key={envelope.id}
                                                  value={envelope.name}
                                                  onSelect={() => handleEnvelopeChange(transaction.id, index + 1, 'envelopeId', envelope.id.toString())}
                                                >
                                                  <span className="flex items-center gap-2">
                                                    <span>{envelope.icon}</span>
                                                    <span>{envelope.name}</span>
                                                  </span>
                                                  <Check
                                                    className={`ml-auto h-4 w-4 ${
                                                      allocation.envelopeId === envelope.id
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                    }`}
                                                  />
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    
                                    <div className="w-36">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={allocation.amount}
                                        onChange={(e) => handleEnvelopeChange(transaction.id, index + 1, 'amount', e.target.value)}
                                        className="h-6 text-sm"
                                        placeholder="0.00"
                                        min="0"
                                        max="999999.99"
                                      />
                                    </div>
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => removeEnvelopeAllocation(transaction.id, index + 1)}
                                      title="Remove split"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                
                                {/* Remaining amount indicator */}
                                {(() => {
                                  const remaining = calculateRemainingAmount(transaction.id, transaction.amount);
                                  const remainingFloat = parseFloat(remaining);
                                  if (remainingFloat > 0.01) {
                                    return (
                                      <div className="text-xs text-blue-600 text-center pt-1">
                                        Remaining to allocate: ${remaining}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                            
                            {/* Amount validation */}
                            {(() => {
                              const envelopes = transactionEnvelopes[transaction.id] || [];
                              const totalAllocated = envelopes
                                .reduce((sum, env) => sum + Math.abs(parseFloat(env.amount || '0')), 0);
                              const transactionAmount = Math.abs(parseFloat(transaction.amount));
                              const difference = Math.abs(totalAllocated - transactionAmount);
                              

                              
                              // Only show validation if there are envelopes assigned
                              if (envelopes.length === 0) {
                                return null;
                              }
                              
                              if (difference >= 0.01) {
                                const isOverAllocated = totalAllocated > transactionAmount;
                                return (
                                  <div className={`text-xs text-center pt-1 border-t ${isOverAllocated ? 'text-red-600' : 'text-orange-600'}`}>
                                    {isOverAllocated ? 'Over-allocated' : 'Under-allocated'}: ${difference.toFixed(2)}
                                  </div>
                                );
                              }
                              return (
                                <div className="text-xs text-green-600 text-center pt-1 border-t">
                                  ✓ Amounts match
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {isMobile && <MobileBottomNav />}

      {/* Labels Selection Dialog */}
      {labelDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Select Labels</h3>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => {
                  setLabelDialogOpen(null);
                  setLabelSearch("");
                  setShowCreateLabel(false);
                  setNewLabelName("");
                }}
              >
                OK
              </Button>
            </div>
            
            <div className="mb-3">
              <Input
                placeholder="Search labels..."
                value={labelSearch}
                onChange={(e) => setLabelSearch(e.target.value)}
                className="h-8 text-xs"
              />
              
              {/* Create new label option */}
              {labelSearch && !filteredLabels.some(l => l.name.toLowerCase() === labelSearch.toLowerCase()) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => {
                    setNewLabelName(labelSearch);
                    setShowCreateLabel(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create "{labelSearch}"
                </Button>
              )}
              
              {/* Manual create label button */}
              {!showCreateLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 h-6 text-xs text-muted-foreground"
                  onClick={() => setShowCreateLabel(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add new label
                </Button>
              )}
              
              {/* Create label input */}
              {showCreateLabel && (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="Label name..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLabelName.trim()) {
                        handleCreateLabel();
                      }
                      if (e.key === 'Escape') {
                        setShowCreateLabel(false);
                        setNewLabelName("");
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-6 text-xs flex-1"
                      onClick={handleCreateLabel}
                      disabled={!newLabelName.trim() || createLabelMutation.isPending}
                    >
                      {createLabelMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        setShowCreateLabel(false);
                        setNewLabelName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              {filteredLabels.map(label => {
                const isSelected = (transactionLabels[labelDialogOpen] || []).includes(label.id);
                return (
                  <div
                    key={label.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    onClick={() => toggleLabel(labelDialogOpen, label.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.colour }}
                    />
                    <span className="text-sm flex-1">{label.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-green-600" />}
                  </div>
                );
              })}
              
              {filteredLabels.length === 0 && !showCreateLabel && (
                <div className="text-center text-gray-500 text-sm py-4">
                  {labelSearch ? `No labels matching "${labelSearch}"` : 'No labels created yet'}
                </div>
              )}
            </div>
            
            {/* Selected labels preview */}
            {(transactionLabels[labelDialogOpen] || []).length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-600 mb-2">Selected ({(transactionLabels[labelDialogOpen] || []).length}):</div>
                <div className="flex flex-wrap gap-1">
                  {(transactionLabels[labelDialogOpen] || []).map(labelId => {
                    const label = labels.find(l => l.id === labelId);
                    if (!label) return null;
                    return (
                      <Badge
                        key={labelId}
                        variant="secondary"
                        className="text-xs h-5 px-2 cursor-pointer"
                        style={{ backgroundColor: label.colour + '20', color: label.colour }}
                        onClick={() => toggleLabel(labelDialogOpen, label.id)}
                        title="Click to remove"
                      >
                        {label.name}
                        <X className="h-2 w-2 ml-1" />
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-lg mb-2">Delete Transaction</h3>
            <p className="text-gray-600 text-sm mb-4">
              Are you sure you want to delete this transaction? This action cannot be reversed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setDeleteConfirmOpen(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => deleteTransactionMutation.mutate(deleteConfirmOpen)}
                disabled={deleteTransactionMutation.isPending}
              >
                {deleteTransactionMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''}? 
              This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      {showCsvImport && csvFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-semibold text-lg">Import CSV Transactions</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCsvImport(false);
                  setCsvFile(null);
                  setCsvAccountId("");
                  setCsvPreview([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium mb-2">
                  Select Account for Import
                </label>
                <Select value={csvAccountId} onValueChange={setCsvAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {csvPreview.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <label className="block text-sm font-medium mb-2 flex-shrink-0">
                    Preview (First 5 rows)
                  </label>
                  <div className="border rounded-lg flex-1 min-h-0">
                    <table className="w-full text-sm">
                      <tbody>
                        {csvPreview.map((row, index) => (
                          <tr key={index} className={index === 0 ? "bg-gray-50 font-medium" : ""}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 border-r">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCsvImport(false);
                    setCsvFile(null);
                    setCsvAccountId("");
                    setCsvPreview([]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCsvImport}
                  disabled={!csvAccountId || csvImportMutation.isPending}
                  className="flex-1"
                >
                  {csvImportMutation.isPending ? "Importing..." : "Import Transactions"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
