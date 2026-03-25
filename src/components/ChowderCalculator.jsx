// ChowderCalculator.js - Centralized Chowder calculation with validation
export class ChowderCalculator {
  /**
   * Calculate Chowder Number: Dividend Yield + 5-Year Dividend Growth Rate
   * @param {object} stock - Stock object with dividend data
   * @returns {number|null} - Calculated Chowder number or null if cannot calculate
   */
  static calculate(stock) {
    if (!stock) return null;

    // Get dividend yield
    const dividendYield = this.parseNumericValue(stock.dividend_yield);
    
    // Get 5-year dividend growth rate
    const divGrowth5y = this.parseNumericValue(stock.avg_div_growth_5y);

    // Both values must be valid numbers to calculate Chowder
    if (dividendYield === null || divGrowth5y === null) {
      return null;
    }

    // Calculate Chowder: Dividend Yield + 5Y Growth Rate
    const chowder = dividendYield + divGrowth5y;
    
    // Round to 1 decimal place for consistency
    return Math.round(chowder * 10) / 10;
  }

  /**
   * Parse a value to a valid number or return null
   * @param {any} value - Value to parse
   * @returns {number|null} - Parsed number or null
   */
  static parseNumericValue(value) {
    if (value === null || value === undefined || value === '') return null;
    
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : parseFloat(value);
    
    return isNaN(numValue) ? null : numValue;
  }

  /**
   * Test cases to validate Chowder calculation
   */
  static runTests() {
    const testCases = [
      {
        name: "MRK Test Case",
        stock: { dividend_yield: 2.57, avg_div_growth_5y: 1.1 },
        expected: 3.7
      },
      {
        name: "String Values",
        stock: { dividend_yield: "2.57", avg_div_growth_5y: "1.1" },
        expected: 3.7
      },
      {
        name: "High Chowder Stock",
        stock: { dividend_yield: 4.5, avg_div_growth_5y: 8.2 },
        expected: 12.7
      },
      {
        name: "Missing Dividend Yield",
        stock: { dividend_yield: null, avg_div_growth_5y: 5.0 },
        expected: null
      },
      {
        name: "Missing Growth Rate",
        stock: { dividend_yield: 3.0, avg_div_growth_5y: null },
        expected: null
      },
      {
        name: "Zero Values",
        stock: { dividend_yield: 0, avg_div_growth_5y: 2.5 },
        expected: 2.5
      },
      {
        name: "Negative Growth",
        stock: { dividend_yield: 3.0, avg_div_growth_5y: -1.5 },
        expected: 1.5
      },
      {
        name: "Invalid String Values",
        stock: { dividend_yield: "N/A", avg_div_growth_5y: "invalid" },
        expected: null
      },
      {
        name: "Values with Commas",
        stock: { dividend_yield: "2,570", avg_div_growth_5y: "1,100" },
        expected: 3670
      }
    ];

    console.log("🧪 Running Chowder Calculator Tests...");
    
    let passed = 0;
    let failed = 0;

    testCases.forEach(testCase => {
      const result = this.calculate(testCase.stock);
      const success = result === testCase.expected;
      
      if (success) {
        passed++;
        console.log(`✅ ${testCase.name}: ${result} (expected: ${testCase.expected})`);
      } else {
        failed++;
        console.error(`❌ ${testCase.name}: ${result} (expected: ${testCase.expected})`);
      }
    });

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed };
  }
}

// Run tests in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  ChowderCalculator.runTests();
}