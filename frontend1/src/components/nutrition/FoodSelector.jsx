import React, { useState, useEffect, useRef } from 'react';
import { searchFoods, getAllFoods, calculateNutrition, getCommonUnits } from '../../services/nutrition';
import { analyzeFood, getHealthierAlternatives, getHealthColor, getHealthLevelText } from '../../utils/healthAnalysis';
import './FoodSelector.css';

const FoodSelector = ({ onFoodSelect, selectedFood = null, clearSelection = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFoodItem, setSelectedFoodItem] = useState(selectedFood);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('g');
  const [nutritionInfo, setNutritionInfo] = useState(null);
  const [healthAnalysis, setHealthAnalysis] = useState(null);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceTimeout = useRef(null);

  const units = getCommonUnits();

  // Load initial foods when component mounts
  useEffect(() => {
    const loadInitialFoods = async () => {
      try {
        console.log('Loading initial foods...');
        const initialFoods = await getAllFoods(10); // Get first 10 foods
        console.log('Initial foods loaded:', initialFoods);
        if (initialFoods.length > 0) {
          setSearchResults(initialFoods);
          setIsDropdownOpen(true);
        }
      } catch (error) {
        console.error('Error loading initial foods:', error);
      }
    };

    loadInitialFoods();
  }, []);

  // Clear selection when parent requests it
  useEffect(() => {
    if (clearSelection) {
      handleClearSelection();
    }
  }, [clearSelection]);

  // Handle search with debouncing
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchTerm]);

  // Calculate nutrition when food, quantity, or unit changes
  useEffect(() => {
    if (selectedFoodItem && quantity > 0) {
      const nutrition = calculateNutrition(selectedFoodItem, quantity, unit);
      setNutritionInfo(nutrition);
      
      // Perform health analysis
      const analysis = analyzeFood(selectedFoodItem, nutrition);
      setHealthAnalysis(analysis);
    } else {
      setNutritionInfo(null);
      setHealthAnalysis(null);
    }
  }, [selectedFoodItem, quantity, unit]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (query) => {
    console.log('Searching for:', query);
    
    if (!query.trim()) {
      // Show initial foods when search is empty
      try {
        const initialFoods = await getAllFoods(10);
        setSearchResults(initialFoods);
        setIsDropdownOpen(initialFoods.length > 0);
      } catch (error) {
        console.error('Error loading initial foods:', error);
        setSearchResults([]);
        setIsDropdownOpen(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchFoods(query, 20);
      console.log('Search results:', results);
      setSearchResults(results);
      setIsDropdownOpen(results.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setIsDropdownOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFoodSelect = (food) => {
    setSelectedFoodItem(food);
    setSearchTerm(food.name);
    setIsDropdownOpen(false);
    setQuantity(100); // Reset to default quantity
    setUnit('g'); // Reset to default unit
  };

  const handleClearSelection = () => {
    setSelectedFoodItem(null);
    setSearchTerm('');
    setSearchResults([]);
    setQuantity(100);
    setUnit('g');
    setNutritionInfo(null);
    setHealthAnalysis(null);
    setIsDropdownOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleAddFood = () => {
    if (selectedFoodItem && nutritionInfo && onFoodSelect) {
      onFoodSelect({
        food: selectedFoodItem,
        quantity,
        unit,
        nutrition: nutritionInfo
      });
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (!value.trim()) {
      setSelectedFoodItem(null);
      setNutritionInfo(null);
    }
  };

  const handleInputFocus = async () => {
    if (searchResults.length > 0) {
      setIsDropdownOpen(true);
    } else if (!searchTerm.trim()) {
      // Load initial foods if none are loaded and search is empty
      try {
        const initialFoods = await getAllFoods(10);
        setSearchResults(initialFoods);
        setIsDropdownOpen(initialFoods.length > 0);
      } catch (error) {
        console.error('Error loading initial foods on focus:', error);
      }
    }
  };

  const formatNutritionValue = (value, unit = '') => {
    if (value === null || value === undefined) return '0';
    return `${value}${unit}`;
  };

  return (
    <div className="food-selector">
      <div className="search-section">
        <div className="search-container" ref={dropdownRef}>
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for foods..."
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              className="search-input"
            />
            {isLoading && <div className="search-loading">Searching...</div>}
            {selectedFoodItem && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="clear-selection-btn"
                title="Clear selection"
              >
                ×
              </button>
            )}
          </div>

          {isDropdownOpen && searchResults.length > 0 && (
            <div className="search-dropdown">
              <div className="dropdown-header">
                <span>Found {searchResults.length} foods</span>
              </div>
              <div className="dropdown-list">
                {searchResults.map((food) => (
                  <div
                    key={food.id}
                    className={`dropdown-item ${selectedFoodItem?.id === food.id ? 'selected' : ''}`}
                    onClick={() => handleFoodSelect(food)}
                  >
                    <div className="food-info">
                      <div className="food-name">{food.name}</div>
                      <div className="food-meta">
                        {food.calories} cal • {food.serving_size}
                      </div>
                    </div>
                    <div className="food-macros">
                      <span>P: {food.protein}g</span>
                      <span>C: {food.carbs}g</span>
                      <span>F: {food.total_fat}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedFoodItem && (
        <div className="quantity-section">
          <h4>Selected: {selectedFoodItem.name}</h4>
          
          <div className="quantity-inputs">
            <div className="input-group">
              <label htmlFor="quantity">Quantity:</label>
              <input
                id="quantity"
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="quantity-input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="unit">Unit:</label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="unit-select"
              >
                {units.map((unitOption) => (
                  <option key={unitOption.value} value={unitOption.value}>
                    {unitOption.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {nutritionInfo && (
            <div className="nutrition-preview">
              <h5>Nutritional Information ({quantity} {unit})</h5>
              <div className="nutrition-grid">
                <div className="nutrition-main">
                  <div className="nutrition-item calories">
                    <span className="value">{nutritionInfo.calories}</span>
                    <span className="label">Calories</span>
                  </div>
                </div>
                
                <div className="nutrition-macros">
                  <div className="nutrition-item">
                    <span className="value">{formatNutritionValue(nutritionInfo.protein, 'g')}</span>
                    <span className="label">Protein</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="value">{formatNutritionValue(nutritionInfo.carbs, 'g')}</span>
                    <span className="label">Carbs</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="value">{formatNutritionValue(nutritionInfo.total_fat, 'g')}</span>
                    <span className="label">Fat</span>
                  </div>
                </div>

                <div className="nutrition-details">
                  <div className="nutrition-item small">
                    <span className="value">{formatNutritionValue(nutritionInfo.fiber, 'g')}</span>
                    <span className="label">Fiber</span>
                  </div>
                  <div className="nutrition-item small">
                    <span className="value">{formatNutritionValue(nutritionInfo.sugar, 'g')}</span>
                    <span className="label">Sugar</span>
                  </div>
                  <div className="nutrition-item small">
                    <span className="value">{formatNutritionValue(nutritionInfo.sodium, 'mg')}</span>
                    <span className="label">Sodium</span>
                  </div>
                </div>
              </div>

              {/* Health Analysis Section */}
              {healthAnalysis && (
                <div className="health-analysis">
                  <div className="health-header">
                    <div 
                      className="health-level"
                      style={{ 
                        color: getHealthColor(healthAnalysis.level),
                        backgroundColor: `${getHealthColor(healthAnalysis.level)}15`
                      }}
                    >
                      {getHealthLevelText(healthAnalysis.level)}
                      <span className="health-score">({healthAnalysis.score}/100)</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  {healthAnalysis.highlights && healthAnalysis.highlights.length > 0 && (
                    <div className="health-section highlights">
                      <h6>✨ Health Benefits:</h6>
                      <ul>
                        {healthAnalysis.highlights.map((highlight, index) => (
                          <li key={index} className="highlight">{highlight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {healthAnalysis.warnings && healthAnalysis.warnings.length > 0 && (
                    <div className="health-section warnings">
                      <h6>⚠️ Things to Consider:</h6>
                      <ul>
                        {healthAnalysis.warnings.map((warning, index) => (
                          <li key={index} className="warning">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {healthAnalysis.recommendations && healthAnalysis.recommendations.length > 0 && (
                    <div className="health-section recommendations">
                      <h6>💡 Smart Tips:</h6>
                      <ul>
                        {healthAnalysis.recommendations.map((rec, index) => (
                          <li key={index} className="recommendation">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Healthier Alternatives */}
                  {healthAnalysis.level === 'poor' || healthAnalysis.level === 'fair' ? (
                    (() => {
                      const alternatives = getHealthierAlternatives(selectedFoodItem.name);
                      return alternatives.length > 0 ? (
                        <div className="health-section alternatives">
                          <h6>🥗 Healthier Alternatives:</h6>
                          <ul>
                            {alternatives.map((alt, index) => (
                              <li key={index} className="alternative">{alt}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null;
                    })()
                  ) : null}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddFood}
                className="add-food-btn"
              >
                Add to Meal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FoodSelector;