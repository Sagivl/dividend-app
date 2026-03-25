import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  TrendingUp,
  Scale,
  Shield,
  Zap,
  Target,
  Search,
  Sparkles,
  BarChart2,
  ArrowRight,
  ArrowLeft,
  Check,
  Mail,
} from "lucide-react";

const STEPS = {
  EMAIL: 0,
  GOAL: 1,
  RISK: 2,
  TOUR: 3,
};

const investmentGoals = [
  {
    id: "income",
    title: "Generate Income",
    description: "Focus on high-yield dividend stocks for regular cash flow",
    icon: DollarSign,
    color: "text-green-400",
    bgColor: "bg-green-900/30",
    borderColor: "border-green-600",
  },
  {
    id: "growth",
    title: "Grow Dividends",
    description: "Prioritize stocks with high dividend growth potential",
    icon: TrendingUp,
    color: "text-blue-400",
    bgColor: "bg-blue-900/30",
    borderColor: "border-blue-600",
  },
  {
    id: "balanced",
    title: "Balanced Approach",
    description: "Mix of income and growth for diversified returns",
    icon: Scale,
    color: "text-purple-400",
    bgColor: "bg-purple-900/30",
    borderColor: "border-purple-600",
  },
];

const riskTolerances = [
  {
    id: "conservative",
    title: "Conservative",
    description: "Lower volatility, stable blue-chip companies",
    icon: Shield,
    color: "text-emerald-400",
    bgColor: "bg-emerald-900/30",
    borderColor: "border-emerald-600",
  },
  {
    id: "moderate",
    title: "Moderate",
    description: "Balance of stability and growth potential",
    icon: Target,
    color: "text-amber-400",
    bgColor: "bg-amber-900/30",
    borderColor: "border-amber-600",
  },
  {
    id: "aggressive",
    title: "Aggressive",
    description: "Higher risk for potentially higher returns",
    icon: Zap,
    color: "text-red-400",
    bgColor: "bg-red-900/30",
    borderColor: "border-red-600",
  },
];

const tourFeatures = [
  {
    icon: Search,
    title: "Search & Analyze",
    description: "Search for any dividend stock and get detailed fundamental analysis",
  },
  {
    icon: Sparkles,
    title: "AI Suggestions",
    description: "Get personalized stock recommendations based on your criteria",
  },
  {
    icon: BarChart2,
    title: "Compare Stocks",
    description: "Side-by-side comparison with AI-powered insights",
  },
];

export default function OnboardingModal({ open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const handleNext = () => {
    if (currentStep < STEPS.TOUR) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > STEPS.EMAIL) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete({
      email: email.trim().toLowerCase(),
      investment_goal: selectedGoal,
      risk_tolerance: selectedRisk,
    });
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canProceed = () => {
    if (currentStep === STEPS.EMAIL) return isValidEmail(email);
    if (currentStep === STEPS.GOAL) return selectedGoal !== null;
    if (currentStep === STEPS.RISK) return selectedRisk !== null;
    return true;
  };

  const renderOptionCard = (option, isSelected, onSelect) => {
    const Icon = option.icon;
    return (
      <button
        key={option.id}
        onClick={() => onSelect(option.id)}
        className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
          isSelected
            ? `${option.bgColor} ${option.borderColor} shadow-lg`
            : "bg-slate-700/50 border-slate-600 hover:border-slate-500 hover:bg-slate-700"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${
              isSelected ? option.bgColor : "bg-slate-600"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${isSelected ? option.color : "text-slate-300"}`}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={`font-semibold ${
                  isSelected ? option.color : "text-slate-200"
                }`}
              >
                {option.title}
              </h3>
              {isSelected && <Check className={`h-4 w-4 ${option.color}`} />}
            </div>
            <p className="text-sm text-slate-400 mt-1">{option.description}</p>
          </div>
        </div>
      </button>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.EMAIL:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900/30 mb-4">
                <Mail className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-slate-300">
                Enter your email to personalize your experience
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>
        );

      case STEPS.GOAL:
        return (
          <div className="space-y-3">
            {investmentGoals.map((goal) =>
              renderOptionCard(goal, selectedGoal === goal.id, setSelectedGoal)
            )}
          </div>
        );

      case STEPS.RISK:
        return (
          <div className="space-y-3">
            {riskTolerances.map((risk) =>
              renderOptionCard(risk, selectedRisk === risk.id, setSelectedRisk)
            )}
          </div>
        );

      case STEPS.TOUR:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 mb-4">
                <Sparkles className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-slate-300">
                We've pre-loaded some popular dividend stocks for you to explore.
                Here's what you can do:
              </p>
            </div>
            <div className="space-y-3">
              {tourFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/50"
                  >
                    <div className="p-2 rounded-lg bg-green-900/30">
                      <Icon className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-200">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.EMAIL:
        return "Welcome to Dividend Analyzer";
      case STEPS.GOAL:
        return "What's your investment goal?";
      case STEPS.RISK:
        return "What's your risk tolerance?";
      case STEPS.TOUR:
        return "You're all set!";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case STEPS.EMAIL:
        return "Let's get you started";
      case STEPS.GOAL:
        return "Help us personalize your experience";
      case STEPS.RISK:
        return "We'll adjust suggestions based on your comfort level";
      case STEPS.TOUR:
        return "Start exploring dividend opportunities";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[500px] bg-slate-800 border-slate-700 text-slate-200 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            {[STEPS.EMAIL, STEPS.GOAL, STEPS.RISK, STEPS.TOUR].map((step) => (
              <div
                key={step}
                className={`h-2 w-12 rounded-full transition-colors ${
                  step <= currentStep ? "bg-green-500" : "bg-slate-600"
                }`}
              />
            ))}
          </div>
          <DialogTitle className="text-xl text-center text-slate-100">
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400">
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[50vh] overflow-y-auto">
          {renderStepContent()}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2 pt-4 border-t border-slate-700">
          {currentStep > STEPS.EMAIL ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < STEPS.TOUR ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-[#3FB923] hover:bg-green-600 text-white disabled:bg-slate-600 disabled:text-slate-400"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleComplete}
              className="bg-[#3FB923] hover:bg-green-600 text-white"
            >
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
