import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Plus, X, Tag, Check } from "lucide-react";
import { Label as LabelType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TransactionLabelsProps {
  transactionId: number;
  className?: string;
}

export default function TransactionLabels({ transactionId, className }: TransactionLabelsProps) {
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allLabels = [] } = useQuery({
    queryKey: ['/api/labels'],
  });

  const { data: transactionLabels = [] } = useQuery({
    queryKey: ['/api/transactions', transactionId, 'labels'],
  });

  const updateLabelsMutation = useMutation({
    mutationFn: async (labelIds: number[]) => {
      return apiRequest(`/api/transactions/${transactionId}/labels`, {
        method: 'POST',
        body: JSON.stringify({ labelIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', transactionId, 'labels'] });
      toast({
        title: "Labels updated",
        description: "Transaction labels have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update labels.",
        variant: "destructive",
      });
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return apiRequest('/api/labels', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/labels'] });
      setNewLabelName("");
      setSelectedColor("#3b82f6");
      toast({
        title: "Label created",
        description: "New label has been created.",
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

  const handleLabelToggle = (labelId: number) => {
    const currentLabelIds = transactionLabels.map((l: LabelType) => l.id);
    const isSelected = currentLabelIds.includes(labelId);
    
    const newLabelIds = isSelected
      ? currentLabelIds.filter(id => id !== labelId)
      : [...currentLabelIds, labelId];
    
    updateLabelsMutation.mutate(newLabelIds);
  };

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      createLabelMutation.mutate({
        name: newLabelName.trim(),
        color: selectedColor
      });
    }
  };

  const colors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1"
  ];

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        {transactionLabels.map((label: LabelType) => (
          <Badge
            key={label.id}
            variant="secondary"
            style={{ backgroundColor: `${label.color}20`, color: label.color, borderColor: label.color }}
            className="text-xs"
          >
            {label.name}
          </Badge>
        ))}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
              <Tag className="h-3 w-3 mr-1" />
              Labels
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search labels..." />
              <CommandList>
                <CommandEmpty>No labels found.</CommandEmpty>
                <CommandGroup>
                  {allLabels.map((label: LabelType) => {
                    const isSelected = transactionLabels.some((tl: LabelType) => tl.id === label.id);
                    return (
                      <CommandItem
                        key={label.id}
                        onSelect={() => handleLabelToggle(label.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span>{label.name}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <div className="p-2 space-y-2">
                    <Label htmlFor="new-label" className="text-sm font-medium">
                      Create New Label
                    </Label>
                    <Input
                      id="new-label"
                      placeholder="Label name"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="h-8"
                    />
                    <div className="flex items-center gap-1">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            selectedColor === color ? 'border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCreateLabel}
                      disabled={!newLabelName.trim() || createLabelMutation.isPending}
                      className="w-full h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create Label
                    </Button>
                  </div>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}