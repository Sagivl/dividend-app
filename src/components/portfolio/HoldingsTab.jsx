'use client';

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, Pencil, Trash2, Plus, ExternalLink, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown, ChevronUp, X, List, DollarSign, Trophy } from "lucide-react";
import PortfolioSummary from "./PortfolioSummary";
import PortfolioAllocation from "./PortfolioAllocation";
import DividendTimeline from "./DividendTimeline";
import EditPositionDialog from "./EditPositionDialog";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}%`;
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString('en-US', { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined) return "—";
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

function SwipeableCard({ children, onEdit, onDelete }) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  
  const actionWidth = 160;
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

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Action buttons revealed on swipe */}
      <motion.div 
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ opacity: actionsOpacity, scale: actionsScale }}
      >
        <button
          onClick={() => {
            closeActions();
            onEdit();
          }}
          className="w-[80px] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 flex flex-col items-center justify-center gap-1.5 text-white transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Pencil className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold">Edit</span>
        </button>
        <button
          onClick={() => {
            closeActions();
            onDelete();
          }}
          className="w-[80px] bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 flex flex-col items-center justify-center gap-1.5 text-white transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Trash2 className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold">Delete</span>
        </button>
      </motion.div>

      {/* Main card content */}
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

export default function HoldingsTab({ 
  positions, 
  totals, 
  portfolioYield, 
  onUpdate, 
  onDelete,
  onAddClick 
}) {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editPosition, setEditPosition] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'marketValue', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [inlineEdit, setInlineEdit] = useState(null);

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
    { id: 'all', label: 'All', icon: List, description: 'All your holdings' },
    { id: 'high-yield', label: 'High Yield', icon: DollarSign, description: 'Dividend yield > 4%' },
    { id: 'gainers', label: 'Gainers', icon: TrendingUp, description: 'Positions in profit' },
    { id: 'losers', label: 'Losers', icon: TrendingDown, description: 'Positions at a loss' },
    { id: 'top-income', label: 'Top Income', icon: Trophy, description: 'Top 5 income generators' },
  ];

  const toggleCardExpanded = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const enrichedPositions = useMemo(() => {
    return positions.map(pos => {
      const totalCostBasis = pos.totalCostBasis || (pos.cost_basis ? pos.cost_basis * pos.shares : null);
      const gainLoss = totalCostBasis ? pos.marketValue - totalCostBasis : null;
      const gainLossPercent = totalCostBasis ? (gainLoss / totalCostBasis) * 100 : null;
      return {
        ...pos,
        gainLoss,
        gainLossPercent
      };
    });
  }, [positions]);

  const filteredByChip = useMemo(() => {
    switch (activeFilter) {
      case 'high-yield':
        return enrichedPositions.filter(pos => (pos.dividendYield || 0) > 4);
      case 'gainers':
        return enrichedPositions.filter(pos => pos.gainLoss !== null && pos.gainLoss > 0);
      case 'losers':
        return enrichedPositions.filter(pos => pos.gainLoss !== null && pos.gainLoss < 0);
      case 'top-income':
        return [...enrichedPositions]
          .sort((a, b) => (b.annualIncome || 0) - (a.annualIncome || 0))
          .slice(0, 5);
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
        case 'yieldOnCost':
          aVal = a.yieldOnCost ?? -Infinity;
          bVal = b.yieldOnCost ?? -Infinity;
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

  if (positions.length === 0) {
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
      />

      {/* Portfolio Allocation and Dividend Timeline - Shows when 2+ positions */}
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

      {/* Dividend Timeline for single position */}
      {positions.length === 1 && (
        <div className="mb-4 sm:mb-6">
          <DividendTimeline 
            positions={enrichedPositions}
          />
        </div>
      )}

      {/* Holdings Card - Unified container for filters and content */}
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg mb-3">Holdings</CardTitle>
          
          {/* Filter Tabs - Shows when there are 3+ positions */}
          {positions.length >= 3 && (
            <div className="overflow-x-auto pb-1 -mx-2 px-2">
              <div className="flex gap-2 min-w-max">
                {filterOptions.map((filter) => {
                  const FilterIcon = filter.icon;
                  const isActive = activeFilter === filter.id;
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
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Input - Shows when there are 5+ positions */}
          {positions.length >= 5 && (
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticker or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 bg-slate-800/50 border-slate-700"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing {sortedPositions.length} of {positions.length} positions
                </p>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
        {sortedPositions.map((position) => {
          const isExpanded = expandedCards[position.id];
          const totalCostBasis = position.totalCostBasis || (position.cost_basis ? position.cost_basis * position.shares : null);
          const gainLoss = totalCostBasis ? position.marketValue - totalCostBasis : null;
          const gainLossPercent = totalCostBasis ? (gainLoss / totalCostBasis) * 100 : null;
          
          return (
            <SwipeableCard
              key={position.id}
              onEdit={() => handleEdit(position)}
              onDelete={() => handleDelete(position)}
            >
              <Card className="bg-card/50 overflow-hidden">
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
                          <div className="font-semibold text-base">{position.ticker}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {position.stock?.name || "—"}
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Shares</div>
                        <div className="font-medium">{formatNumber(position.shares, position.shares % 1 === 0 ? 0 : 4)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Value</div>
                        <div className="font-medium">{formatCurrency(position.marketValue)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Yield</div>
                        <div className={position.dividendYield > 0 ? "text-green-500 font-medium" : "font-medium"}>
                          {formatPercent(position.dividendYield)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Annual Income</div>
                        <div className="font-medium text-green-500">{formatCurrency(position.annualIncome)}</div>
                      </div>
                    </div>

                    {/* Expandable Section */}
                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Current Price</div>
                            <div className="font-medium">{formatCurrency(position.currentPrice)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Gain/Loss</div>
                            {gainLoss !== null ? (
                              <div className={cn(
                                "font-medium",
                                gainLoss >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {gainLoss >= 0 ? '+' : ''}{formatCompactCurrency(gainLoss)}
                                <span className="text-xs ml-1">
                                  ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                                </span>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-sm">No cost basis</div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Cost Basis</div>
                            <div className="font-medium">
                              {totalCostBasis ? formatCurrency(totalCostBasis) : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Yield on Cost</div>
                            <div className={cn(
                              "font-medium",
                              position.yieldOnCost && position.yieldOnCost > position.dividendYield ? "text-green-500" : ""
                            )}>
                              {position.yieldOnCost !== null ? formatPercent(position.yieldOnCost) : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>

                    {/* Expand/Collapse Toggle */}
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

        {/* No results message */}
        {sortedPositions.length === 0 && searchQuery && (
          <Card className="bg-card/50">
            <CardContent className="py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No positions match "{searchQuery}"</p>
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
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader column="ticker" label="Stock" />
                  <SortableHeader column="shares" label="Shares" className="text-right" />
                  <SortableHeader column="currentPrice" label="Price" className="text-right" />
                  <SortableHeader column="marketValue" label="Value" className="text-right" />
                  <SortableHeader column="gainLossPercent" label="Gain/Loss" className="text-right" />
                  <SortableHeader column="dividendYield" label="Yield" className="text-right" />
                  <SortableHeader column="annualIncome" label="Annual Income" className="text-right" />
                  <SortableHeader column="yieldOnCost" label="Yield on Cost" className="text-right" />
                  <TableHead className="w-[120px] text-right sticky right-0 bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPositions.map((position) => (
                  <TableRow key={position.id} className="group">
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
                          <div className="font-medium">{position.ticker}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {position.stock?.name || "—"}
                          </div>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <InlineEditableCell
                        position={position}
                        field="shares"
                        value={position.shares}
                        formatFn={(v) => formatNumber(v, v % 1 === 0 ? 0 : 4)}
                        className="font-medium"
                      />
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
                            {position.gainLossPercent >= 0 ? '+' : ''}{position.gainLossPercent.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No cost basis</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={position.dividendYield > 0 ? "text-green-500" : ""}>
                        {formatPercent(position.dividendYield)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      {formatCurrency(position.annualIncome)}
                    </TableCell>
                    <TableCell className="text-right">
                      {position.yieldOnCost !== null ? (
                        <span className={position.yieldOnCost > position.dividendYield ? "text-green-500" : ""}>
                          {formatPercent(position.yieldOnCost)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-background">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick action buttons - always visible */}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* No results message for desktop */}
          {sortedPositions.length === 0 && searchQuery && (
            <div className="py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No positions match "{searchQuery}"</p>
              <Button 
                variant="link" 
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                Clear search
              </Button>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
