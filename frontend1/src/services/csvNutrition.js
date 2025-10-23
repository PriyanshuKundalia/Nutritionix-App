// csvNutritionService.js - Service to load and search the complete nutrition.csv dataset

class CSVNutritionService {
  constructor() {
    this.foods = [];
    this.isLoaded = false;
    this.loadPromise = null;
  }

  // Load the CSV file and parse all foods
  async loadCSV() {
    if (this.isLoaded) return this.foods;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this._fetchAndParseCSV();
    return this.loadPromise;
  }

  async _fetchAndParseCSV() {
    try {
      // In development, we'll need to serve the CSV from the public folder
      const response = await fetch('/nutrition.csv');
      if (!response.ok) {
        throw new Error(`Failed to load nutrition.csv: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      this.foods = this._parseCSV(csvText);
      this.isLoaded = true;
      
      console.log(`✅ Loaded ${this.foods.length} foods from nutrition.csv`);
      return this.foods;
    } catch (error) {
      console.error('Error loading CSV:', error);
      // Fallback to sample data if CSV fails to load
      this.foods = this._getFallbackData();
      this.isLoaded = true;
      return this.foods;
    }
  }

  _parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const foods = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this._parseCSVLine(lines[i]);
      if (values.length >= 77) {
        const food = this._mapCSVToFood(headers, values);
        if (food && food.name && food.name.trim()) {
          foods.push(food);
        }
      }
    }

    return foods;
  }

  _parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim()); // Push the last value
    return values;
  }

  _mapCSVToFood(headers, values) {
    try {
      const getValue = (index) => values[index] || '';
      const getNumericValue = (index) => {
        const val = getValue(index);
        const num = parseFloat(val.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      return {
        id: parseInt(getValue(0)) || Math.random(),
        name: getValue(1).replace(/"/g, '').trim(),
        serving_size: getValue(2) || '100 g',
        
        // Basic macronutrients
        calories: getNumericValue(3),
        total_fat: getNumericValue(4),
        saturated_fat: getNumericValue(5),
        cholesterol: getNumericValue(6),
        sodium: getNumericValue(7),
        
        // Protein (column 37)
        protein: getNumericValue(37),
        
        // Carbohydrates (column 61)
        carbohydrate: getNumericValue(61),
        fiber: getNumericValue(62),
        sugar: getNumericValue(63),
        
        // Additional micronutrients
        calcium: getNumericValue(28),
        iron: getNumericValue(30),
        magnesium: getNumericValue(31),
        phosphorus: getNumericValue(33),
        potassium: getNumericValue(34),
        zinc: getNumericValue(36),
        
        // Vitamins
        vitamin_c: getNumericValue(17),
        vitamin_a: getNumericValue(14),
        vitamin_b6: getNumericValue(16),
        vitamin_b12: getNumericValue(15),
        
        // Water content
        water: getNumericValue(76),
        
        // Default unit for calculations
        unit: 'g',
        
        // Create categories based on food name for better searching
        category: this._categorizeFood(getValue(1)),
      };
    } catch (error) {
      console.warn('Error parsing food item:', error);
      return null;
    }
  }

  _categorizeFood(name) {
    const lowercaseName = name.toLowerCase();
    
    if (lowercaseName.includes('chicken') || lowercaseName.includes('beef') || 
        lowercaseName.includes('pork') || lowercaseName.includes('lamb') ||
        lowercaseName.includes('turkey') || lowercaseName.includes('meat')) {
      return 'meat';
    }
    
    if (lowercaseName.includes('fish') || lowercaseName.includes('salmon') ||
        lowercaseName.includes('tuna') || lowercaseName.includes('shrimp')) {
      return 'seafood';
    }
    
    if (lowercaseName.includes('milk') || lowercaseName.includes('cheese') ||
        lowercaseName.includes('yogurt') || lowercaseName.includes('butter')) {
      return 'dairy';
    }
    
    if (lowercaseName.includes('apple') || lowercaseName.includes('banana') ||
        lowercaseName.includes('orange') || lowercaseName.includes('berry')) {
      return 'fruit';
    }
    
    if (lowercaseName.includes('broccoli') || lowercaseName.includes('spinach') ||
        lowercaseName.includes('carrot') || lowercaseName.includes('lettuce')) {
      return 'vegetable';
    }
    
    if (lowercaseName.includes('rice') || lowercaseName.includes('bread') ||
        lowercaseName.includes('pasta') || lowercaseName.includes('wheat')) {
      return 'grain';
    }
    
    return 'other';
  }

  // Search foods by name with fuzzy matching
  searchFoods(query, limit = 10) {
    if (!this.isLoaded) {
      console.warn('CSV not loaded yet');
      return [];
    }

    if (!query || query.trim().length === 0) {
      return this.foods.slice(0, limit);
    }

    const searchTerm = query.toLowerCase().trim();
    const results = [];

    // Exact matches first
    const exactMatches = this.foods.filter(food => 
      food.name.toLowerCase().includes(searchTerm)
    );

    // Add partial matches
    const partialMatches = this.foods.filter(food => {
      const words = searchTerm.split(' ');
      return words.some(word => 
        food.name.toLowerCase().includes(word) && 
        !exactMatches.includes(food)
      );
    });

    results.push(...exactMatches.slice(0, limit));
    if (results.length < limit) {
      results.push(...partialMatches.slice(0, limit - results.length));
    }

    return results;
  }

  // Get all foods (with optional limit)
  getAllFoods(limit = 50) {
    if (!this.isLoaded) {
      console.warn('CSV not loaded yet');
      return [];
    }
    return this.foods.slice(0, limit);
  }

  // Calculate nutrition for a specific quantity
  calculateNutrition(food, quantity, unit = 'g') {
    // Base serving size is typically 100g for most entries
    const baseServingSize = 100;
    const multiplier = quantity / baseServingSize;

    return {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round((food.protein * multiplier) * 10) / 10,
      carbs: Math.round((food.carbohydrate * multiplier) * 10) / 10,
      total_fat: Math.round((food.total_fat * multiplier) * 10) / 10,
      fiber: Math.round((food.fiber * multiplier) * 10) / 10,
      sugar: Math.round((food.sugar * multiplier) * 10) / 10,
      sodium: Math.round(food.sodium * multiplier),
      calcium: Math.round(food.calcium * multiplier),
      iron: Math.round((food.iron * multiplier) * 10) / 10,
      potassium: Math.round(food.potassium * multiplier),
      saturated_fat: Math.round((food.saturated_fat * multiplier) * 10) / 10,
      cholesterol: Math.round(food.cholesterol * multiplier),
    };
  }

  // Get food statistics
  getStats() {
    return {
      totalFoods: this.foods.length,
      categories: {
        meat: this.foods.filter(f => f.category === 'meat').length,
        seafood: this.foods.filter(f => f.category === 'seafood').length,
        dairy: this.foods.filter(f => f.category === 'dairy').length,
        fruit: this.foods.filter(f => f.category === 'fruit').length,
        vegetable: this.foods.filter(f => f.category === 'vegetable').length,
        grain: this.foods.filter(f => f.category === 'grain').length,
        other: this.foods.filter(f => f.category === 'other').length,
      }
    };
  }

  _getFallbackData() {
    // Fallback sample data in case CSV fails to load
    return [
      {
        id: 1,
        name: "Chicken Breast, cooked",
        serving_size: "100 g",
        calories: 165,
        protein: 31,
        carbohydrate: 0,
        total_fat: 3.6,
        fiber: 0,
        sugar: 0,
        sodium: 74,
        calcium: 15,
        iron: 0.9,
        potassium: 256,
        unit: 'g',
        category: 'meat'
      },
      {
        id: 2,
        name: "Broccoli, raw",
        serving_size: "100 g",
        calories: 34,
        protein: 2.8,
        carbohydrate: 7,
        total_fat: 0.4,
        fiber: 2.6,
        sugar: 1.5,
        sodium: 33,
        calcium: 47,
        iron: 0.7,
        potassium: 316,
        unit: 'g',
        category: 'vegetable'
      }
    ];
  }
}

// Create and export a singleton instance
const csvNutritionService = new CSVNutritionService();
export default csvNutritionService;