
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPageUrl } from "@/utils";
import { TrendingUp, Search, Star, HelpCircle, AlertCircle as LucideAlertCircleIcon, FlaskConical, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from "@/entities/User";

export default function Layout({ children, currentPageName }) {
  const router = useRouter();
  const [navItems, setNavItems] = useState([]);

  useEffect(() => {
    const updateUserNav = async () => {
      const baseNavItems = [
        {
          name: "Dashboard",
          displayName: "Search",
          path: createPageUrl("Dashboard"),
          icon: Search,
          description: "Analyze stocks"
        },
        {
          name: "SuggestedStocks",
          displayName: "Watchlist",
          path: createPageUrl("SuggestedStocks"),
          icon: Star,
          description: "View your watchlist"
        },
        {
            name: "CompareStocks",
            displayName: "Compare",
            path: createPageUrl("CompareStocks"),
            icon: BarChart2,
            description: "Compare dividend stocks"
        }
      ];

      try {
        const currentUser = await User.me();
        if (currentUser && currentUser.role === 'admin') {
          setNavItems([
            ...baseNavItems,
            {
              name: "EtoroLabs",
              displayName: "eToro Labs",
              path: createPageUrl("EtoroLabs"),
              icon: FlaskConical,
              description: "Explore eToro data & tools"
            }
          ]);
        } else {
          setNavItems(baseNavItems);
        }
      } catch (error) {
        setNavItems(baseNavItems);
      }
    };

    updateUserNav();
  }, [currentPageName]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col scrollbar-dark">
      <header className="bg-card/80 backdrop-blur-md shadow-lg shadow-black/10 border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div 
              onClick={() => router.push("/")} 
              className="flex items-center group cursor-pointer"
            >
              <TrendingUp className="h-8 w-8 text-primary mr-3 group-hover:text-primary/80 transition-colors" />
              <h1 className="text-xl font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                Dividend Analyzer
              </h1>
            </div>
            
            <div className="flex items-center space-x-1 md:space-x-3">
              <nav className="hidden sm:flex space-x-1 md:space-x-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPageName === item.name;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      title={item.displayName || item.name}
                      className={`flex items-center px-2 py-2 md:px-3 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className={`h-4 w-4 md:mr-2 ${isActive ? "text-primary" : ""}`} />
                      <span className="hidden md:inline">{item.displayName || item.name}</span>
                    </Link>
                  );
                })}
              </nav>
              <Dialog>
                <DialogTrigger asChild>
                  <span className="inline-flex items-center justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground hover:text-foreground hover:bg-accent text-sm ml-1 sm:ml-2 focus-visible:ring-primary"
                    >
                      <HelpCircle className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">How it Works</span>
                    </Button>
                  </span>
                </DialogTrigger>
                <DialogContent className="w-full h-[100dvh] max-w-full max-h-full rounded-none sm:w-auto sm:h-auto sm:max-w-xl md:max-w-2xl sm:rounded-lg sm:max-h-[85vh] bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl text-foreground">How it Works</DialogTitle>
                    <DialogDescription className="text-sm sm:text-base text-left py-2 sm:py-3 max-h-[calc(100dvh-120px)] sm:max-h-[70vh] overflow-y-auto text-muted-foreground">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 text-foreground">Getting Started:</h4>
                          <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                            <li>Search for a stock using the ticker symbol or company name.</li>
                            <li>The AI will attempt to automatically fetch comprehensive financial data for the stock.</li>
                            <li>Review and complete any missing information on the "Stats" tab. You can also use the "Fetch with AI" button on this tab to try and populate more fields.</li>
                            <li>Explore "Analysis" for key metric evaluations and "Trends" for historical performance charts.</li>
                            <li>Your analyzed stocks are saved and accessible from the "Watchlist" tab.</li>
                          </ol>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2 text-foreground">Key Metrics Explained:</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><strong className="text-foreground">Dividend Yield:</strong> Annual dividend per share / stock price. A measure of dividend return.</li>
                            <li><strong className="text-foreground">P/E Ratio:</strong> Stock price / Earnings Per Share (EPS). Higher P/E can indicate higher growth expectations.</li>
                            <li><strong className="text-foreground">Payout Ratio:</strong> Dividends per share / EPS. Percentage of earnings paid as dividends.</li>
                            <li><strong className="text-foreground">5Y Div Growth:</strong> Average annual dividend growth over 5 years.</li>
                            <li><strong className="text-foreground">Chowder Number:</strong> Dividend Yield + 5Y Div Growth. Often, &gt;11-12 is considered good.</li>
                            <li><strong className="text-foreground">ROE:</strong> Net Income / Shareholder Equity. Measures profitability. &gt;15% is often good.</li>
                            <li><strong className="text-foreground">Beta:</strong> Stock's volatility vs. market. &lt;1 less volatile, &gt;1 more volatile.</li>
                          </ul>
                        </div>
                      </div>
                      <Alert variant="destructive" className="mt-3 sm:mt-4 bg-destructive/10 border-destructive/50 text-destructive-foreground">
                        <LucideAlertCircleIcon className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-xs sm:text-sm">
                          Financial data provided by AI may not always be 100% accurate or up-to-date. Always cross-reference with official sources before making investment decisions. This tool is for informational purposes only and not financial advice.
                        </AlertDescription>
                      </Alert>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow bg-background">
        {children}
      </main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.3)] z-40">
          <div className="flex justify-around items-stretch h-16">
              {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPageName === item.name;
                  return (
                      <Link
                          key={item.name + "-mobile"}
                          href={item.path}
                          title={item.description}
                          className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset relative ${ 
                              isActive 
                                ? "text-primary"
                                : "text-muted-foreground hover:text-primary/80"
                          }`}
                      >
                          <Icon className={`h-6 w-6 mb-0.5`} />
                          <span 
                            className={`text-[10px] font-medium tracking-tight ${isActive ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {item.displayName || item.name}
                          </span>
                      </Link>
                  );
              })}
          </div>
      </nav>
      <div className="sm:hidden h-16"></div> 
    </div>
  );
}
