'use client';

import React, { useState } from "react";
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
import { MoreHorizontal, Pencil, Trash2, Plus, ExternalLink, TrendingUp } from "lucide-react";
import PortfolioSummary from "./PortfolioSummary";
import EditPositionDialog from "./EditPositionDialog";
import { createPageUrl } from "@/utils";

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Yield</TableHead>
                  <TableHead className="text-right">Annual Income</TableHead>
                  <TableHead className="text-right">Yield on Cost</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
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
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(position.shares, position.shares % 1 === 0 ? 0 : 4)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(position.currentPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(position.marketValue)}
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
