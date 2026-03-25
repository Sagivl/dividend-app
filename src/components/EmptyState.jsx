import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Search, TrendingUp } from "lucide-react";

const defaultQuickAddTickers = ["JNJ", "KO", "O", "PG", "ABBV"];

export default function EmptyState({
  icon: Icon = Sparkles,
  title = "Build Your Dividend Portfolio",
  subtitle = "Start by searching for dividend stocks you're interested in analyzing",
  quickAddTickers = defaultQuickAddTickers,
  onQuickAdd,
  showQuickAdd = true,
  actionLabel = "Search for a stock",
  onAction,
}) {
  return (
    <Card className="bg-slate-800 border-dashed border-slate-600 border-2">
      <CardContent className="p-6 sm:p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 mb-4">
          <Icon className="h-8 w-8 text-green-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">{subtitle}</p>

        {showQuickAdd && quickAddTickers.length > 0 && onQuickAdd && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-3 flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Popular dividend stocks
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickAddTickers.map((ticker) => (
                <Button
                  key={ticker}
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickAdd(ticker)}
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-green-500 hover:text-green-400 transition-colors"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {ticker}
                </Button>
              ))}
            </div>
          </div>
        )}

        {onAction && (
          <Button
            onClick={onAction}
            className="bg-[#3FB923] hover:bg-green-600 text-white"
          >
            <Search className="h-4 w-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
