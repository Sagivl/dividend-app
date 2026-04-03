'use client';

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Clock } from "lucide-react";
import { format, differenceInDays, parseISO, isValid, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function getPaymentFrequency(distributionSequence) {
  if (!distributionSequence) return 4;
  const seq = distributionSequence.toLowerCase();
  if (seq.includes('monthly')) return 12;
  if (seq.includes('semi') || seq.includes('bi-annual')) return 2;
  if (seq.includes('annual') && !seq.includes('semi')) return 1;
  return 4;
}

function getUpcomingDividends(positions, maxCount = 3) {
  const now = new Date();
  const dividends = [];

  positions.forEach(pos => {
    const stock = pos.stock;
    if (!stock) return;

    const frequency = getPaymentFrequency(stock.div_distribution_sequence);
    const paymentAmount = (pos.annualIncome || 0) / frequency;
    
    if (paymentAmount <= 0) return;

    let payDate = null;
    let dateType = 'estimated';

    if (stock.dividend_pay_date) {
      try {
        const parsed = parseISO(stock.dividend_pay_date);
        if (isValid(parsed)) {
          if (parsed >= now) {
            payDate = parsed;
            dateType = 'confirmed';
          } else {
            const monthsToAdd = frequency === 12 ? 1 : frequency === 4 ? 3 : frequency === 2 ? 6 : 12;
            payDate = addMonths(parsed, monthsToAdd);
            while (payDate < now) {
              payDate = addMonths(payDate, monthsToAdd);
            }
            dateType = 'estimated';
          }
        }
      } catch (e) {}
    }

    if (!payDate && stock.ex_date) {
      try {
        const exDate = parseISO(stock.ex_date);
        if (isValid(exDate)) {
          const estimatedPayDate = new Date(exDate);
          estimatedPayDate.setDate(estimatedPayDate.getDate() + 14);
          if (estimatedPayDate >= now) {
            payDate = estimatedPayDate;
            dateType = 'estimated';
          }
        }
      } catch (e) {}
    }

    if (!payDate) {
      const monthsFromNow = frequency === 12 ? 1 : frequency === 4 ? 3 : frequency === 2 ? 6 : 12;
      payDate = addMonths(now, monthsFromNow);
      payDate.setDate(15);
      dateType = 'estimated';
    }

    dividends.push({
      ticker: pos.ticker,
      name: stock.name,
      logo: stock.logo50x50,
      date: payDate,
      dateType,
      amount: paymentAmount,
      daysUntil: differenceInDays(payDate, now)
    });
  });

  return dividends
    .sort((a, b) => a.date - b.date)
    .slice(0, maxCount);
}

export default function DividendTimeline({ positions, className }) {
  const upcomingDividends = useMemo(() => getUpcomingDividends(positions, 3), [positions]);

  if (!positions || positions.length === 0 || upcomingDividends.length === 0) {
    return null;
  }

  const totalUpcoming = upcomingDividends.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card className={cn("bg-card/50", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Upcoming Dividends
          </CardTitle>
          <span className="text-sm text-green-500 font-semibold">
            {formatCurrency(totalUpcoming)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20 hidden sm:block" />
          
          <div className="space-y-3">
            {upcomingDividends.map((dividend, index) => (
              <div 
                key={`${dividend.ticker}-${index}`}
                className="relative flex items-center gap-3 sm:gap-4 pl-0 sm:pl-10"
              >
                {/* Timeline dot */}
                <div className="hidden sm:block absolute left-2 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                
                {/* Content */}
                <div className="flex items-center gap-3 flex-1 min-w-0 p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  {/* Logo */}
                  {dividend.logo ? (
                    <img 
                      src={dividend.logo} 
                      alt={dividend.ticker}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                  )}
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm sm:text-base">{dividend.ticker}</span>
                      {dividend.dateType === 'estimated' && (
                        <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
                          Est.
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {dividend.daysUntil === 0 
                        ? 'Today' 
                        : dividend.daysUntil === 1 
                          ? 'Tomorrow'
                          : `In ${dividend.daysUntil} days`} 
                      <span className="mx-1">•</span>
                      {format(dividend.date, 'MMM d')}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <div className="font-bold text-green-500 text-sm sm:text-base">
                      {formatCurrency(dividend.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View all link */}
        <div className="mt-3 pt-3 border-t border-slate-700/50 text-center">
          <span className="text-xs text-muted-foreground">
            View the Calendar tab for all dividend dates
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
