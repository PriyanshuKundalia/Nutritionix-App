import fs from 'fs';
import path from 'path';

// Function to parse CSV data and create a JSON file
const parseNutritionData = () => {
  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'nutrition.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const foodData = [];
    
    // Process each line (skip header)
    for (let i = 1; i < Math.min(lines.length, 1000); i++) { // Limit to first 1000 foods
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      if (values.length < headers.length) continue;
      
      try {
        const food = {
          id: parseInt(values[0]) || i,
          name: values[1]?.replace(/"/g, '').trim() || `Unknown Food ${i}`,
          serving_size: values[2]?.replace(/"/g, '').trim() || '100 g',
          calories: parseFloat(values[3]) || 0,
          total_fat: parseFloat(values[4]?.replace(/g/g, '')) || 0,
          saturated_fat: parseFloat(values[5]?.replace(/g/g, '')) || 0,
          cholesterol: parseFloat(values[6]?.replace(/mg/g, '')) || 0,
          sodium: parseFloat(values[7]?.replace(/mg/g, '')) || 0,
          protein: parseFloat(values[37]) || 0,
          carbs: parseFloat(values[52]) || 0,
          fiber: parseFloat(values[53]) || 0,
          sugar: parseFloat(values[54]) || 0,
          calcium: parseFloat(values[29]?.replace(/mg/g, '')) || 0,
          iron: parseFloat(values[31]?.replace(/mg/g, '')) || 0,
          potassium: parseFloat(values[35]?.replace(/mg/g, '')) || 0
        };
        
        // Only add foods with valid names and some nutritional data
        if (food.name && food.name !== 'Unknown Food' && food.calories > 0) {
          foodData.push(food);
        }
      } catch (error) {
        console.warn(`Error parsing line ${i}:`, error.message);
      }
    }
    
    // Write to JSON file
    const jsonPath = path.join(process.cwd(), 'src', 'data', 'nutrition-database.json');
    
    // Create directory if it doesn't exist
    const dir = path.dirname(jsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(jsonPath, JSON.stringify(foodData, null, 2));
    
    console.log(`✅ Successfully parsed ${foodData.length} foods from CSV`);
    console.log(`📄 JSON file created at: ${jsonPath}`);
    
    return foodData;
  } catch (error) {
    console.error('❌ Error parsing nutrition data:', error);
    return [];
  }
};

// Run if this file is executed directly
if (typeof window === 'undefined') {
  parseNutritionData();
}

export default parseNutritionData;