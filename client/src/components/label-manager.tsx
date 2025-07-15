import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit3, Trash2, Tag } from "lucide-react";
import { Label as LabelType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function LabelManager() {
  const [editingLabel, setEditingLabel] = useState<LabelType | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: labels = [] } = useQuery({
    queryKey: ['/api/labels'],
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
      setNewLabelColor("#3b82f6");
      setCreateDialogOpen(false);
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

  const updateLabelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; color: string } }) => {
      return apiRequest(`/api/labels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/labels'] });
      setEditingLabel(null);
      setEditDialogOpen(false);
      toast({
        title: "Label updated",
        description: "Label has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update label.",
        variant: "destructive",
      });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/labels/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/labels'] });
      toast({
        title: "Label deleted",
        description: "Label has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete label.",
        variant: "destructive",
      });
    },
  });

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      createLabelMutation.mutate({
        name: newLabelName.trim(),
        color: newLabelColor
      });
    }
  };

  const handleEditLabel = (label: LabelType) => {
    setEditingLabel(label);
    setEditName(label.name);
    setEditColor(label.color);
    setEditDialogOpen(true);
  };

  const handleUpdateLabel = () => {
    if (editingLabel && editName.trim()) {
      updateLabelMutation.mutate({
        id: editingLabel.id,
        data: {
          name: editName.trim(),
          color: editColor
        }
      });
    }
  };

  const colors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1"
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Transaction Labels
          </CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Label
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Label</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="label-name">Label Name</Label>
                  <Input
                    id="label-name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Enter label name"
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newLabelColor === color ? 'border-foreground' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleCreateLabel}
                  disabled={!newLabelName.trim() || createLabelMutation.isPending}
                  className="w-full"
                >
                  Create Label
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {labels.length === 0 ? (
            <p className="text-muted-foreground text-sm">No labels created yet.</p>
          ) : (
            labels.map((label: LabelType) => (
              <div key={label.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="font-medium">{label.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditLabel(label)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLabelMutation.mutate(label.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-label-name">Label Name</Label>
              <Input
                id="edit-label-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter label name"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-2 mt-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      editColor === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={handleUpdateLabel}
              disabled={!editName.trim() || updateLabelMutation.isPending}
              className="w-full"
            >
              Update Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}