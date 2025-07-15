import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Zap, MoreHorizontal, GitBranch } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateRuleDialog from "@/components/create-rule-dialog";
import type { Transaction } from "@shared/schema";

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const [showCreateRule, setShowCreateRule] = useState(false);
  const amount = parseFloat(transaction.amount);
  const isIncome = amount > 0;

  const getTransactionIcon = () => {
    if (isIncome) {
      return <Plus className="h-4 w-4 text-green-600" />;
    }
    
    // Simple icon mapping based on merchant and description
    const merchantLower = transaction.merchant.toLowerCase();
    const descriptionLower = transaction.description?.toLowerCase() || "";
    
    if (merchantLower.includes('grocery') || merchantLower.includes('whole foods') || 
        merchantLower.includes('safeway') || descriptionLower.includes('grocery') || 
        descriptionLower.includes('food')) {
      return <ShoppingCart className="h-4 w-4 text-blue-600" />;
    }
    if (merchantLower.includes('electric') || merchantLower.includes('pg&e') || 
        merchantLower.includes('utility') || descriptionLower.includes('utility')) {
      return <Zap className="h-4 w-4 text-yellow-600" />;
    }
    
    return <ShoppingCart className="h-4 w-4 text-blue-600" />;
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isIncome ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {getTransactionIcon()}
          </div>
          <div>
            <p className="font-medium text-foreground">{transaction.merchant}</p>
            {transaction.description && (
              <p className="text-xs text-muted-foreground">{transaction.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {format(new Date(transaction.date), 'MMM d')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
            {isIncome ? '+' : ''}${Math.abs(amount).toFixed(2)}
          </span>
          {!transaction.isApproved && (
            <Badge variant="secondary" className="text-xs">Pending</Badge>
          )}
          
          {transaction.isApproved && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowCreateRule(true)}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Create Rule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <CreateRuleDialog
        transaction={transaction}
        open={showCreateRule}
        onOpenChange={setShowCreateRule}
      />
    </>
  );
}
