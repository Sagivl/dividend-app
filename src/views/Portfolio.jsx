'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Portfolio } from "@/entities/Portfolio";
import { Stock } from "@/entities/Stock";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Wallet, Calendar, Plus, Loader2 } from "lucide-react";
import HoldingsTab from "../components/portfolio/HoldingsTab";
import DividendCalendar from "../components/portfolio/DividendCalendar";
import AddPositionDialog from "../components/portfolio/AddPositionDialog";
import { fetchHybridStockData } from "../functions/hybridDataFetcher";
import { toast } from "react-hot-toast";

export default function PortfolioView() {
  const [positions, setPositions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [stocksMap, setStocksMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("holdings");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [portfolioData, stocksData] = await Promise.all([
        Portfolio.list(),
        Stock.list()
      ]);

      setPositions(portfolioData);
      setStocks(stocksData);

      const map = {};
      stocksData.forEach(stock => {
        if (stock.ticker) {
          map[stock.ticker.toUpperCase()] = stock;
        }
      });
      setStocksMap(map);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
      toast.error("Failed to load portfolio");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const enrichedPositions = positions.map(position => {
    const stock = stocksMap[position.ticker];
    const currentPrice = stock?.price || 0;
    const dividendYield = stock?.dividend_yield || 0;
    const annualDividendPerShare = currentPrice * (dividendYield / 100);
    const annualIncome = position.shares * annualDividendPerShare;
    const marketValue = position.shares * currentPrice;
    const yieldOnCost = position.cost_basis 
      ? (annualIncome / position.cost_basis) * 100 
      : null;

    return {
      ...position,
      stock,
      currentPrice,
      dividendYield,
      annualDividendPerShare,
      annualIncome,
      marketValue,
      yieldOnCost
    };
  });

  const totals = enrichedPositions.reduce((acc, pos) => ({
    totalValue: acc.totalValue + pos.marketValue,
    totalIncome: acc.totalIncome + pos.annualIncome,
    totalCost: acc.totalCost + (pos.cost_basis || 0)
  }), { totalValue: 0, totalIncome: 0, totalCost: 0 });

  const portfolioYield = totals.totalValue > 0 
    ? (totals.totalIncome / totals.totalValue) * 100 
    : 0;

  const handleAddPosition = async (data) => {
    try {
      let stockData = stocksMap[data.ticker.toUpperCase()];
      
      if (!stockData) {
        toast.loading(`Fetching data for ${data.ticker}...`, { id: 'fetch-stock' });
        const result = await fetchHybridStockData(data.ticker);
        toast.dismiss('fetch-stock');
        
        if (result.success) {
          const newStock = await Stock.create(result.data);
          stockData = newStock;
          setStocksMap(prev => ({
            ...prev,
            [newStock.ticker.toUpperCase()]: newStock
          }));
          setStocks(prev => [newStock, ...prev]);
        }
      }

      const newPosition = await Portfolio.create(data);
      setPositions(prev => [newPosition, ...prev]);
      setIsAddDialogOpen(false);
      toast.success(`Added ${data.shares} shares of ${data.ticker.toUpperCase()}`);
    } catch (error) {
      console.error("Error adding position:", error);
      toast.error(error.message || "Failed to add position");
      throw error;
    }
  };

  const handleUpdatePosition = async (id, data) => {
    try {
      const updated = await Portfolio.update(id, data);
      setPositions(prev => prev.map(p => p.id === id ? updated : p));
      toast.success("Position updated");
    } catch (error) {
      console.error("Error updating position:", error);
      toast.error("Failed to update position");
    }
  };

  const handleDeletePosition = async (id) => {
    try {
      await Portfolio.delete(id);
      setPositions(prev => prev.filter(p => p.id !== id));
      toast.success("Position removed");
    } catch (error) {
      console.error("Error deleting position:", error);
      toast.error("Failed to remove position");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl pb-20 sm:pb-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">My Portfolio</h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="gap-1.5 sm:gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Stock</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 sm:mb-6">
          <TabsTrigger value="holdings" className="gap-2 px-4">
            <Wallet className="h-4 w-4" />
            Holdings
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 px-4">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          <HoldingsTab
            positions={enrichedPositions}
            totals={totals}
            portfolioYield={portfolioYield}
            onUpdate={handleUpdatePosition}
            onDelete={handleDeletePosition}
            onAddClick={() => setIsAddDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <DividendCalendar
            positions={enrichedPositions}
            stocksMap={stocksMap}
          />
        </TabsContent>
      </Tabs>

      <AddPositionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddPosition}
        existingStocks={stocks}
        existingPositions={positions}
      />
    </div>
  );
}
