'use client';

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import {
  MoreHorizontal, Pencil, Trash2, Plus, ExternalLink,
  TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown,
  Search, ChevronDown, ChevronUp, X, List,
  ShoppingCart, Link2, Clock, XCircle, RefreshCw, AlertCircle,
  Loader2, Info,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import PortfolioSummary from "./PortfolioSummary";
import PortfolioAllocation from "./PortfolioAllocation";
import DividendTimeline from "./DividendTimeline";
import EditPositionDialog from "./EditPositionDialog";
import TradeDialog from "../trading/TradeDialog";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, useMotionValue, useTransform } from "framer-motion";

function formatCurrency(value) {
  if (value === null || value === undefined) return "\u2014";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined) return "\u2014";
  return `${value.toFixed(2)}%`;
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return "\u2014";
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined) return "\u2014";
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: 'compact'
    }).format(value);
  }
  return formatCurrency(value);
}

function SourceBadge({ source, className }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0 h-4 font-medium",
        source === 'etoro'
          ? 'text-teal-400 border-teal-400/30 bg-teal-400/5'
          : 'text-slate-400 border-slate-400/30 bg-slate-400/5',
        className
      )}
    >
      {source === 'etoro' ? 'eToro' : 'Manual'}
    </Badge>
  );
}

function SwipeableCard({ children, actions = [] }) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);

  const actionWidth = actions.length * 80;
  const threshold = -50;

  const actionsOpacity = useTransform(x, [-actionWidth, -20, 0], [1, 0.5, 0]);
  const actionsScale = useTransform(x, [-actionWidth, -20, 0], [1, 0.9, 0.9]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x < threshold) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const closeActions = () => {
    setIsOpen(false);
  };

  if (actions.length === 0) {
    return <div className="rounded-lg">{children}</div>;
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ opacity: actionsOpacity, scale: actionsScale }}
      >
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => {
              closeActions();
              action.onClick();
            }}
            className={cn(
              "w-[80px] flex flex-col items-center justify-center gap-1.5 text-white transition-all active:scale-95",
              action.className
            )}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              {action.icon}
            </div>
            <span className="text-xs font-semibold">{action.label}</span>
          </button>
        ))}
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen ? -actionWidth : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ x }}
        className="relative bg-background touch-pan-y"
        onClick={() => isOpen && closeActions()}
      >
        {children}
      </motion.div>
    </div>
  );
}

const EMPTY_FILTER_MESSAGES = {
  etoro: { title: "No eToro positions", description: "Your eToro account has no open positions. Search for a stock and use Buy to start trading." },
  manual: { title: "No manual positions", description: "You haven't added any positions manually yet. Use the Add Stock button above." },
};

export default function HoldingsTab({
  positions,
  totals,
  portfolioYield,
  onUpdate,
  onDelete,
  onAddClick,
  pendingOrders = [],
  availableCash,
  instrumentMap = {},
  resolvedSymbols = {},
  onCancelOrder,
  onRefreshEtoro,
  etoroRefreshing,
  etoroLoading,
  etoroError,
  etoroLastSynced,
}) {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editPosition, setEditPosition] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'marketValue', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [inlineEdit, setInlineEdit] = useState(null);
  const [tradeDialog, setTradeDialog] = useState(null);
  const lastSyncedText = etoroLastSynced
    ? `Updated ${etoroLastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  const InlineEditableCell = ({ position, field, value, formatFn, className }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = React.useRef(null);

    const startEditing = () => {
      setEditValue(value?.toString() || '');
      setIsEditing(true);
      setInlineEdit({ id: position.id, field });
    };

    const handleSave = () => {
      const numValue = parseFloat(editValue);
      if (!isNaN(numValue) && numValue >= 0) {
        onUpdate(position.id, { [field]: numValue });
      }
      setIsEditing(false);
      setInlineEdit(null);
    };

    const handleCancel = () => {
      setIsEditing(false);
      setInlineEdit(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    React.useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            step="any"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-20 px-1.5 py-0.5 text-sm text-right bg-slate-800 border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      );
    }

    return (
      <span
        onDoubleClick={startEditing}
        className={cn(
          "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors",
          className
        )}
        title="Double-click to edit"
      >
        {formatFn ? formatFn(value) : value}
      </span>
    );
  };

  const filterOptions = [
    { id: 'all', label: 'All', icon: List },
    { id: 'etoro', label: 'eToro', icon: TrendingUp },
    { id: 'manual', label: 'Manual', icon: Pencil },
  ];

  const toggleCardExpanded = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const enrichedPositions = useMemo(() => {
    return positions.map(pos => ({
      ...pos,
      gainLoss: pos.pnl,
      gainLossPercent: pos.pnlPercent,
    }));
  }, [positions]);

  const filterCounts = useMemo(() => {
    const counts = { all: 0, etoro: 0, manual: 0 };
    enrichedPositions.forEach(pos => {
      counts.all++;
      if (pos.source === 'etoro') counts.etoro++;
      if (pos.source === 'manual') counts.manual++;
    });
    return counts;
  }, [enrichedPositions]);

  const filteredByChip = useMemo(() => {
    switch (activeFilter) {
      case 'etoro':
        return enrichedPositions.filter(pos => pos.source === 'etoro');
      case 'manual':
        return enrichedPositions.filter(pos => pos.source === 'manual');
      default:
        return enrichedPositions;
    }
  }, [enrichedPositions, activeFilter]);

  const filteredPositions = useMemo(() => {
    if (!searchQuery.trim()) return filteredByChip;
    const query = searchQuery.toLowerCase().trim();
    return filteredByChip.filter(pos =>
      pos.ticker?.toLowerCase().includes(query) ||
      pos.stock?.name?.toLowerCase().includes(query)
    );
  }, [filteredByChip, searchQuery]);

  const sortedPositions = useMemo(() => {
    const sorted = [...filteredPositions];
    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'ticker':
          aVal = a.ticker || '';
          bVal = b.ticker || '';
          break;
        case 'shares':
          aVal = a.shares || 0;
          bVal = b.shares || 0;
          break;
        case 'currentPrice':
          aVal = a.currentPrice || 0;
          bVal = b.currentPrice || 0;
          break;
        case 'marketValue':
          aVal = a.marketValue || 0;
          bVal = b.marketValue || 0;
          break;
        case 'dividendYield':
          aVal = a.dividendYield || 0;
          bVal = b.dividendYield || 0;
          break;
        case 'annualIncome':
          aVal = a.annualIncome || 0;
          bVal = b.annualIncome || 0;
          break;
        case 'gainLossPercent':
          aVal = a.gainLossPercent ?? -Infinity;
          bVal = b.gainLossPercent ?? -Infinity;
          break;
        default:
          return 0;
      }

      if (sortConfig.key === 'ticker') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredPositions, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortableHeader = ({ column, label, className }) => {
    const isActive = sortConfig.key === column;
    return (
      <TableHead
        className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
        onClick={() => handleSort(column)}
      >
        <div className={cn("flex items-center gap-1", className?.includes('text-right') && "justify-end")}>
          <span>{label}</span>
          {isActive ? (
            sortConfig.direction === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
        </div>
      </TableHead>
    );
  };

  const handleViewStock = (ticker) => {
    if (!ticker || ticker.startsWith('ID:')) return;
    router.push(`${createPageUrl("Dashboard")}?ticker=${ticker}`);
  };

  const handleDelete = (position) => {
    setDeleteConfirm(position);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (position) => {
    setEditPosition(position);
  };

  const handleEditSubmit = (data) => {
    onUpdate(editPosition.id, data);
    setEditPosition(null);
  };

  const handleBuy = (position) => {
    setTradeDialog({
      mode: 'buy',
      instrumentId: position.instrumentId || position.stock?.instrumentId || null,
      ticker: position.ticker,
      name: position.stock?.name || '',
      currentPrice: position.currentPrice || null,
      logo: position.stock?.logo50x50 || null,
      isOpen: position.stock?.isCurrentlyTradable !== false,
    });
  };

  const handleSell = (position) => {
    const target = position.subPositions ? position.subPositions[0] : position;
    setTradeDialog({
      mode: 'sell',
      instrumentId: target.instrumentId,
      ticker: position.ticker,
      name: position.stock?.name || '',
      currentPrice: position.currentPrice || null,
      logo: position.stock?.logo50x50 || null,
      isOpen: true,
      positionId: target.positionId,
      positionUnits: target.shares,
    });
  };

  const getSymbolForInstrumentId = useCallback((instId) => {
    const stock = instrumentMap[instId];
    if (stock?.ticker) return stock.ticker;
    if (resolvedSymbols[instId]) return resolvedSymbols[instId];
    return `ID:${instId}`;
  }, [instrumentMap, resolvedSymbols]);

  const getSwipeActions = (position) => {
    if (position.source === 'etoro') {
      return [{
        label: 'Sell',
        icon: <TrendingDown className="h-5 w-5" />,
        onClick: () => handleSell(position),
        className: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600",
      }];
    }
    return [
      {
        label: 'Edit',
        icon: <Pencil className="h-5 w-5" />,
        onClick: () => handleEdit(position),
        className: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600",
      },
      {
        label: 'Delete',
        icon: <Trash2 className="h-5 w-5" />,
        onClick: () => handleDelete(position),
        className: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600",
      },
    ];
  };

  const hasPendingOrders = pendingOrders.length > 0;

  const renderEmptyFilterState = () => {
    const msg = EMPTY_FILTER_MESSAGES[activeFilter];
    if (!msg) return null;
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <h4 className="text-sm font-medium mb-1">{msg.title}</h4>
        <p className="text-xs text-muted-foreground max-w-xs">{msg.description}</p>
        <Button
          variant="link"
          size="sm"
          onClick={() => setActiveFilter('all')}
          className="mt-2 text-xs"
        >
          Show all positions
        </Button>
      </div>
    );
  };

  if (positions.length === 0 && !etoroLoading) {
    return (
      <Card className="bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Start Building Your Portfolio</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Track your dividend stocks to see projected income and payment dates.
          </p>
          <Button onClick={onAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Stock
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PortfolioSummary
        totals={totals}
        portfolioYield={portfolioYield}
        positionCount={positions.length}
        availableCash={availableCash}
        onFilterChange={setActiveFilter}
      />

      {etoroError && (
        <Card className="bg-red-500/5 border-red-500/20 mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-400">eToro data unavailable</p>
              <p className="text-xs text-muted-foreground truncate">{etoroError}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefreshEtoro}
              disabled={etoroRefreshing}
              className="gap-1.5 shrink-0 text-red-400 border-red-400/30 hover:bg-red-500/10"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", etoroRefreshing && "animate-spin")} />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}


      {positions.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <PortfolioAllocation
            positions={enrichedPositions}
            totalValue={totals.totalValue}
          />
          <DividendTimeline
            positions={enrichedPositions}
          />
        </div>
      )}

      {positions.length === 1 && (
        <div className="mb-4 sm:mb-6">
          <DividendTimeline
            positions={enrichedPositions}
          />
        </div>
      )}

      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Positions</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[260px]">
                    <p>Swipe cards for quick actions. Some stocks appear in both Manual and eToro sources and are shown as separate rows.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {hasPendingOrders && (
                <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px] px-1.5">
                  <Clock className="h-3 w-3 mr-1" />
                  {pendingOrders.length} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastSyncedText && (
                <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
                  {lastSyncedText}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshEtoro}
                disabled={etoroRefreshing}
                className="gap-1.5"
              >
                <RefreshCw className={cn("h-4 w-4", etoroRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {positions.length >= 3 && (
            <div className="overflow-x-auto pb-1 -mx-2 px-2">
              <div className="flex gap-2 min-w-max">
                {filterOptions.map((filter) => {
                  const FilterIcon = filter.icon;
                  const isActive = activeFilter === filter.id;
                  const count = filterCounts[filter.id] || 0;
                  return (
                    <Button
                      key={filter.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter(filter.id)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap transition-colors",
                        isActive
                          ? "bg-[#3FB923] hover:bg-green-600 text-white border-[#3FB923]"
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                      )}
                    >
                      <FilterIcon className="h-3.5 w-3.5" />
                      {filter.label}
                      {filter.id !== 'all' && (
                        <span className={cn(
                          "text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full",
                          isActive
                            ? "bg-white/20"
                            : "bg-slate-700 text-slate-400"
                        )}>
                          {count}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

        </CardHeader>

        <CardContent>
          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {sortedPositions.map((position) => {
              const isExpanded = expandedCards[position.id];

              return (
                <SwipeableCard
                  key={position.id}
                  actions={getSwipeActions(position)}
                >
                  <Card className={cn(
                    "bg-card/50 overflow-hidden",
                    position.source === 'etoro' && "border-l-2 border-l-teal-500/30"
                  )}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleCardExpanded(position.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <button
                            onClick={() => handleViewStock(position.ticker)}
                            className="flex items-center gap-2 hover:text-primary transition-colors text-left"
                          >
                            {position.stock?.logo50x50 && (
                              <img
                                src={position.stock.logo50x50}
                                alt={position.ticker}
                                className="w-10 h-10 rounded"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-base">{position.ticker}</span>
                                <SourceBadge source={position.source} />
                                {position.subPositions && (
                                  <span className="text-[10px] text-muted-foreground/70 font-medium">
                                    {"\u00d7"}{position.subPositions.length}
                                  </span>
                                )}
                                {position.hasDuplicate && (
                                  <Link2 className="h-3 w-3 text-amber-400" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {position.stock?.name || "\u2014"}
                              </div>
                            </div>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {position.source === 'etoro' ? (
                                <DropdownMenuItem onClick={() => handleSell(position)}>
                                  <TrendingDown className="h-4 w-4 mr-2" />
                                  Sell
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  {position.instrumentId && (
                                    <DropdownMenuItem onClick={() => handleBuy(position)}>
                                      <ShoppingCart className="h-4 w-4 mr-2" />
                                      Buy on eToro
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleEdit(position)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(position)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Reordered: Value & P/L first, then Shares & Income */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Value</div>
                            <div className="font-semibold">{formatCurrency(position.marketValue)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">P&L</div>
                            {position.gainLoss !== null ? (
                              <div className={cn(
                                "font-semibold",
                                position.gainLoss >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {position.gainLoss >= 0 ? '+' : ''}{formatCompactCurrency(position.gainLoss)}
                                <span className="text-[10px] ml-0.5 font-medium">
                                  {position.gainLossPercent >= 0 ? '+' : ''}{position.gainLossPercent?.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-sm">{"\u2014"}</div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              {position.source === 'etoro' ? 'Units' : 'Shares'}
                            </div>
                            <div className="font-medium">{formatNumber(position.shares, position.shares % 1 === 0 ? 0 : 4)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Income</div>
                            <div className={cn("font-medium", position.annualIncome > 0 ? "text-green-500" : "text-muted-foreground")}>
                              {position.annualIncome > 0 ? formatCurrency(position.annualIncome) : "\u2014"}
                            </div>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-muted-foreground">Current Price</div>
                                <div className="font-medium">{formatCurrency(position.currentPrice)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {position.source === 'etoro'
                                    ? (position.subPositions ? 'Avg. Open Rate' : 'Open Rate')
                                    : 'Cost Basis'}
                                </div>
                                <div className="font-medium">
                                  {position.cost_basis ? formatCurrency(position.cost_basis) : "\u2014"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Yield</div>
                                <div className={cn("font-medium", position.dividendYield > 0 ? "text-green-500" : "text-muted-foreground")}>
                                  {position.dividendYield > 0 ? formatPercent(position.dividendYield) : "\u2014"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Yield on Cost</div>
                                <div className={cn(
                                  "font-medium",
                                  position.yieldOnCost && position.yieldOnCost > position.dividendYield ? "text-green-500" : ""
                                )}>
                                  {position.yieldOnCost !== null ? formatPercent(position.yieldOnCost) : "\u2014"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>

                        <CollapsibleTrigger asChild>
                          <button className="w-full mt-3 pt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-slate-700/30">
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Show more
                              </>
                            )}
                          </button>
                        </CollapsibleTrigger>
                      </CardContent>
                    </Collapsible>
                  </Card>
                </SwipeableCard>
              );
            })}

            {etoroLoading && (
              <Card className="bg-card/50 border-dashed">
                <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Syncing eToro positions...</span>
                </CardContent>
              </Card>
            )}

            {sortedPositions.length === 0 && searchQuery && (
              <Card className="bg-card/50">
                <CardContent className="py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No positions match &quot;{searchQuery}&quot;</p>
                  <Button
                    variant="link"
                    onClick={() => setSearchQuery('')}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </CardContent>
              </Card>
            )}

            {sortedPositions.length === 0 && !searchQuery && activeFilter !== 'all' && renderEmptyFilterState()}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="ticker" label="Stock" />
                    <SortableHeader column="shares" label="Shares" className="text-right" />
                    <SortableHeader column="currentPrice" label="Price" className="text-right" />
                    <SortableHeader column="marketValue" label="Value" className="text-right" />
                    <SortableHeader column="gainLossPercent" label="Gain/Loss" className="text-right" />
                    <SortableHeader column="dividendYield" label="Yield" className="text-right" />
                    <SortableHeader column="annualIncome" label="Income" className="text-right" />
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPositions.map((position) => (
                    <TableRow
                      key={position.id}
                      className={cn(
                        "group",
                        position.source === 'etoro' && "bg-teal-500/[0.025] hover:bg-teal-500/[0.05]"
                      )}
                    >
                      <TableCell>
                        <button
                          onClick={() => handleViewStock(position.ticker)}
                          className="flex items-center gap-2 hover:text-primary transition-colors text-left"
                        >
                          {position.stock?.logo50x50 && (
                            <img
                              src={position.stock.logo50x50}
                              alt={position.ticker}
                              className="w-6 h-6 rounded"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{position.ticker}</span>
                              <SourceBadge source={position.source} />
                              {position.subPositions && (
                                <span className="text-[10px] text-muted-foreground/70 font-medium">
                                  {"\u00d7"}{position.subPositions.length}
                                </span>
                              )}
                              {position.hasDuplicate && (
                                <Link2 className="h-3 w-3 text-amber-400" title="Same ticker in both sources" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {position.stock?.name || "\u2014"}
                            </div>
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {position.source === 'manual' ? (
                          <InlineEditableCell
                            position={position}
                            field="shares"
                            value={position.shares}
                            formatFn={(v) => formatNumber(v, v % 1 === 0 ? 0 : 4)}
                            className="font-medium"
                          />
                        ) : (
                          formatNumber(position.shares, position.shares % 1 === 0 ? 0 : 4)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(position.currentPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(position.marketValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {position.gainLoss !== null ? (
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "font-medium",
                              position.gainLoss >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {position.gainLoss >= 0 ? '+' : ''}{formatCompactCurrency(position.gainLoss)}
                            </span>
                            <span className={cn(
                              "text-xs",
                              position.gainLossPercent >= 0 ? "text-green-500/80" : "text-red-500/80"
                            )}>
                              {position.gainLossPercent >= 0 ? '+' : ''}{position.gainLossPercent?.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{"\u2014"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {position.dividendYield > 0 ? (
                          <span className="text-green-500">{formatPercent(position.dividendYield)}</span>
                        ) : (
                          <span className="text-muted-foreground">{"\u2014"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {position.annualIncome > 0 ? (
                          <span className="font-medium text-green-500">{formatCurrency(position.annualIncome)}</span>
                        ) : (
                          <span className="text-muted-foreground">{"\u2014"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {position.source === 'etoro' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSell(position)}
                              className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <TrendingDown className="h-3.5 w-3.5" />
                              Sell
                            </Button>
                          ) : (
                            <>
                              {position.instrumentId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleBuy(position)}
                                  className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                  title="Buy on eToro"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(position)}
                                className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                title="Edit position"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(position)}
                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                title="Delete position"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {etoroLoading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Syncing eToro positions...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {sortedPositions.length === 0 && searchQuery && (
              <div className="py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No positions match &quot;{searchQuery}&quot;</p>
                <Button
                  variant="link"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            )}

            {sortedPositions.length === 0 && !searchQuery && activeFilter !== 'all' && renderEmptyFilterState()}
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders Section */}
      {hasPendingOrders && (
        <Card className="bg-card/50 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Pending Orders
              <Badge variant="outline" className="text-amber-400 border-amber-400/30 ml-1">
                {pendingOrders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile view */}
            <div className="space-y-3 md:hidden">
              {pendingOrders.map((order) => {
                const symbol = getSymbolForInstrumentId(order.instrumentId);
                const stock = instrumentMap[order.instrumentId];
                return (
                  <Card key={order.orderId} className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {stock?.logo50x50 && (
                            <img src={stock.logo50x50} alt={symbol} className="w-10 h-10 rounded" />
                          )}
                          <div>
                            <div className="font-semibold text-base">{symbol}</div>
                            <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs mt-0.5">
                              <Clock className="h-3 w-3 mr-1" />
                              {order.isLimitOrder ? 'Limit' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCancelOrder(order.orderId, !!order.isLimitOrder)}
                          className="gap-1 text-red-400 border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Amount</div>
                          <div className="font-medium">{formatCurrency(order.amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Units</div>
                          <div className="font-medium">{formatNumber(order.amountInUnits, 4)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Direction</div>
                          <div className={cn('font-medium', order.isBuy ? 'text-green-500' : 'text-red-500')}>
                            {order.isBuy ? 'Buy' : 'Sell'}
                          </div>
                        </div>
                        {order.isLimitOrder && order.rate ? (
                          <div>
                            <div className="text-xs text-muted-foreground">Target Rate</div>
                            <div className="font-medium text-sm">{formatNumber(order.rate, 2)}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs text-muted-foreground">Created</div>
                            <div className="font-medium text-sm">
                              {new Date(order.openDateTime).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop view */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instrument</TableHead>
                    <TableHead className="text-right">Direction</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => {
                    const symbol = getSymbolForInstrumentId(order.instrumentId);
                    const stock = instrumentMap[order.instrumentId];
                    return (
                      <TableRow key={order.orderId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {stock?.logo50x50 && (
                              <img src={stock.logo50x50} alt={symbol} className="w-6 h-6 rounded" />
                            )}
                            <span className="font-medium">{symbol}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            order.isBuy
                              ? 'text-green-500 border-green-500/30'
                              : 'text-red-400 border-red-400/30'
                          )}>
                            {order.isBuy ? 'Buy' : 'Sell'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(order.amountInUnits, 4)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {order.isLimitOrder && order.rate
                            ? `@ ${formatNumber(order.rate, 2)}`
                            : new Date(order.openDateTime).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {order.isLimitOrder ? 'Limit' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onCancelOrder(order.orderId, !!order.isLimitOrder)}
                            className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteConfirm?.ticker} from your portfolio?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editPosition && (
        <EditPositionDialog
          open={!!editPosition}
          onOpenChange={() => setEditPosition(null)}
          position={editPosition}
          onSubmit={handleEditSubmit}
        />
      )}

      {tradeDialog && (
        <TradeDialog
          open={!!tradeDialog}
          onOpenChange={(open) => {
            if (!open) {
              onRefreshEtoro();
              setTradeDialog(null);
            }
          }}
          {...tradeDialog}
        />
      )}
    </div>
  );
}
