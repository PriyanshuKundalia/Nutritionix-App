// Health analysis utility for food recommendations
export const analyzeFood = (food, nutritionInfo) => {
  if (!food || !nutritionInfo) return null;

  const analysis = {
    score: 0,
    level: 'good', // good, fair, poor
    warnings: [],
    recommendations: [],
    highlights: [],
    alternatives: []
  };

  const { calories, protein, carbs, total_fat, fiber, sugar, sodium } = nutritionInfo;
  
  // Calculate nutritional density (nutrients per calorie)
  const proteinPerCalorie = protein / Math.max(calories, 1);
  const fiberPerCalorie = fiber / Math.max(calories, 1);
  const sugarPerCalorie = sugar / Math.max(calories, 1);
  const sodiumPerCalorie = sodium / Math.max(calories, 1);

  // Start with base score
  let score = 50;

  // Positive factors (increase score)
  if (proteinPerCalorie > 0.15) { // High protein density
    score += 15;
    analysis.highlights.push('High in protein - great for muscle building and satiety');
  }
  
  if (fiberPerCalorie > 0.08) { // High fiber density
    score += 15;
    analysis.highlights.push('High in fiber - supports digestive health and helps you feel full');
  }
  
  if (calories < 100 && (protein > 5 || fiber > 3)) { // Low calorie, high nutrients
    score += 10;
    analysis.highlights.push('Nutrient-dense with relatively few calories');
  }

  // Negative factors (decrease score)
  if (calories > 400 && proteinPerCalorie < 0.05 && fiberPerCalorie < 0.02) {
    score -= 20;
    analysis.warnings.push('⚠️ High in calories but low in beneficial nutrients like protein and fiber');
    analysis.recommendations.push('Consider pairing with protein-rich foods or reducing portion size');
  }

  if (sugarPerCalorie > 0.25) { // High sugar relative to calories
    score -= 15;
    analysis.warnings.push('⚠️ High in sugar - may cause energy spikes and crashes');
    analysis.recommendations.push('Try to balance with protein or healthy fats to slow sugar absorption');
  }

  if (sodiumPerCalorie > 2) { // High sodium density
    score -= 10;
    analysis.warnings.push('⚠️ High in sodium - may contribute to high blood pressure');
    analysis.recommendations.push('Drink plenty of water and balance with potassium-rich foods');
  }

  if (total_fat > 20 && calories > 300) { // Very high fat and calories
    score -= 10;
    analysis.warnings.push('⚠️ High in calories and fat - consider a smaller portion');
  }

  if (carbs > 50 && fiber < 3) { // High carbs, low fiber
    score -= 8;
    analysis.warnings.push('⚠️ High in refined carbs with little fiber');
    analysis.recommendations.push('Look for whole grain alternatives for sustained energy');
  }

  // Special food category analysis
  const foodNameLower = food.name.toLowerCase();
  
  // Processed foods
  if (foodNameLower.includes('cookies') || foodNameLower.includes('candy') || 
      foodNameLower.includes('cake') || foodNameLower.includes('soda')) {
    score -= 15;
    analysis.warnings.push('🍭 Highly processed food - limited nutritional value');
    analysis.alternatives.push('Try fresh fruits, nuts, or dark chocolate for a healthier treat');
  }

  // Fried foods
  if (foodNameLower.includes('fried') || foodNameLower.includes('chips')) {
    score -= 12;
    analysis.warnings.push('🍟 Fried food - high in unhealthy fats');
    analysis.alternatives.push('Consider baked, grilled, or air-fried alternatives');
  }

  // Healthy whole foods
  if (foodNameLower.includes('broccoli') || foodNameLower.includes('spinach') || 
      foodNameLower.includes('kale') || foodNameLower.includes('quinoa')) {
    score += 20;
    analysis.highlights.push('🥬 Excellent choice! This is a nutrient-dense whole food');
  }

  // Lean proteins
  if (foodNameLower.includes('chicken breast') || foodNameLower.includes('salmon') || 
      foodNameLower.includes('tofu') || foodNameLower.includes('lentils')) {
    score += 15;
    analysis.highlights.push('💪 Great protein source for muscle building and repair');
  }

  // Nuts and seeds
  if (foodNameLower.includes('nuts') || foodNameLower.includes('seeds') || 
      foodNameLower.includes('almond') || foodNameLower.includes('walnut')) {
    score += 10;
    analysis.highlights.push('🥜 Good source of healthy fats and protein');
    if (calories > 500) {
      analysis.recommendations.push('Nuts are calorie-dense - a small handful is usually enough');
    }
  }

  // Determine final level
  score = Math.max(0, Math.min(100, score)); // Clamp between 0-100
  analysis.score = score;

  if (score >= 70) {
    analysis.level = 'excellent';
  } else if (score >= 50) {
    analysis.level = 'good';
  } else if (score >= 30) {
    analysis.level = 'fair';
  } else {
    analysis.level = 'poor';
  }

  // Add general recommendations based on score
  if (score < 40) {
    analysis.recommendations.push('💡 Consider this as an occasional treat rather than a regular choice');
    analysis.recommendations.push('🥗 Balance your day with nutrient-dense vegetables and lean proteins');
  }

  return analysis;
};

// Get healthier alternatives based on food category
export const getHealthierAlternatives = (foodName) => {
  const name = foodName.toLowerCase();
  const alternatives = [];

  if (name.includes('white rice')) {
    alternatives.push('Brown rice, quinoa, or cauliflower rice');
  } else if (name.includes('white bread')) {
    alternatives.push('Whole grain bread, sourdough, or lettuce wraps');
  } else if (name.includes('pasta')) {
    alternatives.push('Whole wheat pasta, zucchini noodles, or shirataki noodles');
  } else if (name.includes('soda') || name.includes('cola')) {
    alternatives.push('Sparkling water with fruit, herbal tea, or infused water');
  } else if (name.includes('chips')) {
    alternatives.push('Baked vegetable chips, air-popped popcorn, or mixed nuts');
  } else if (name.includes('ice cream')) {
    alternatives.push('Frozen yogurt, nice cream (frozen bananas), or sorbet');
  } else if (name.includes('candy')) {
    alternatives.push('Fresh berries, dates, or dark chocolate (70%+ cacao)');
  } else if (name.includes('cookies')) {
    alternatives.push('Oat cookies with nuts, energy balls, or fruit with nut butter');
  } else if (name.includes('fried')) {
    alternatives.push('Baked, grilled, or air-fried versions of the same food');
  }

  return alternatives;
};

// Get color coding for health levels
export const getHealthColor = (level) => {
  const colors = {
    excellent: '#22c55e', // Green
    good: '#84cc16',      // Light green
    fair: '#f59e0b',      // Orange
    poor: '#ef4444'       // Red
  };
  return colors[level] || colors.fair;
};

// Get health level text
export const getHealthLevelText = (level) => {
  const texts = {
    excellent: 'Excellent Choice! 🌟',
    good: 'Good Choice ✅',
    fair: 'Fair Choice ⚠️',
    poor: 'Consider Alternatives 🚨'
  };
  return texts[level] || 'Unknown';
};

export default {
  analyzeFood,
  getHealthierAlternatives,
  getHealthColor,
  getHealthLevelText
};