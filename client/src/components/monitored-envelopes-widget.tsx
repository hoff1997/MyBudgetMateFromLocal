import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Envelope } from "@shared/schema";

export default function MonitoredEnvelopesWidget() {
  const [showAll, setShowAll] = useState(false);

  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ['/api/envelopes'],
  });

  const monitoredEnvelopes = envelopes.filter(env => env.isMonitored);
  const displayedEnvelopes = showAll ? monitoredEnvelopes : monitoredEnvelopes.slice(0, 4);

  if (monitoredEnvelopes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Monitored Envelopes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No envelopes are being monitored. Edit envelopes to enable monitoring.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Monitored Envelopes
            <Badge variant="secondary" className="text-xs">
              {monitoredEnvelopes.length}
            </Badge>
          </CardTitle>
          {monitoredEnvelopes.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="h-6 text-xs"
            >
              {showAll ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Show All
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedEnvelopes.map((envelope) => {
          const balance = parseFloat(envelope.currentBalance);

          return (
            <div 
              key={envelope.id} 
              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => window.location.href = `/transactions?envelope=${encodeURIComponent(envelope.name)}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg">{envelope.icon}</span>
                <div className="flex-1 min-w-0">
                  {/* Single Line Layout for both Mobile and Desktop */}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm truncate">{envelope.name}</h4>
                    <div className={`text-base font-bold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${balance.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}