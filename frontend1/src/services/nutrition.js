// Enhanced nutrition service using the complete CSV dataset
import csvNutritionService from './csvNutrition.js';

let isInitialized = false;

const initializeService = async () => {
  if (!isInitialized) {
    try {
      await csvNutritionService.loadCSV();
      isInitialized = true;
      console.log('✅ Nutrition service initialized with CSV data');
    } catch (error) {
      console.error('❌ Failed to initialize nutrition service:', error);
    }
  }
};

// Auto-initialize when imported
initializeService();

// Search for foods by name
export const searchFoods = async (query, limit = 10) => {
  await initializeService();
  return csvNutritionService.searchFoods(query, limit);
};

// Get all foods with optional limit
export const getAllFoods = async (limit = 20) => {
  await initializeService();
  return csvNutritionService.getAllFoods(limit);
};

// Calculate nutrition for a specific quantity and unit
export const calculateNutrition = (food, quantity, unit = 'g') => {
  return csvNutritionService.calculateNutrition(food, quantity, unit);
};

// Get common units for the UI (backward compatibility)
export const getCommonUnits = () => {
  return [
    { value: 'g', label: 'grams (g)' },
    { value: 'kg', label: 'kilograms (kg)' },
    { value: 'oz', label: 'ounces (oz)' },
    { value: 'lb', label: 'pounds (lb)' },
    { value: 'cup', label: 'cup' },
    { value: 'tbsp', label: 'tablespoon' },
    { value: 'tsp', label: 'teaspoon' },
    { value: 'piece', label: 'piece/item' },
    { value: 'slice', label: 'slice' },
    { value: 'serving', label: 'serving' }
  ];
};

// Format nutrition value for display
export const formatNutritionValue = (value, unit = '') => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0' + (unit ? unit : '');
  }
  
  if (typeof value === 'string') {
    value = parseFloat(value) || 0;
  }
  
  if (value < 10) {
    return (Math.round(value * 10) / 10).toFixed(1) + (unit ? unit : '');
  } else {
    return Math.round(value).toString() + (unit ? unit : '');
  }
};

// Export default service object
export default {
  searchFoods,
  getAllFoods,
  calculateNutrition,
  getCommonUnits,
  formatNutritionValue,
  initializeService
};