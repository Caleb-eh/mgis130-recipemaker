/**
 * PROCESSING & PRESENTATION LAYER: 2_scripts/script.js
 * Manages searchable ingredient selection, solid/liquid unit menus,
 * editable localStorage pantry items, live TheMealDB recipe discovery,
 * and automatic per-serving nutrition estimation.
 */

// Storage keys for browser persistence
const STORAGE_KEYS = {
  PANTRY: "pantryToPlate_pantry_v1",
  MEALS: "pantryToPlate_meals_v1",
  GOALS: "pantryToPlate_goals_v1"
};

// Unit choices by physical state
const UNITS_BY_TYPE = {
  solid: ["grams", "ounces"],
  liquid: ["teaspoons", "tablespoons", "cups", "mLs", "Ls"]
};

// Application state
let state = {
  pantry: [],
  loggedMeals: [],
  goals: { ...SAMPLE_DATA.defaultGoals },
  sortBy: "best-match",
  recipes: [...SAMPLE_DATA.recipes],
  isLiveApi: false,
  selectedIngredient: null, // { name, type }
  editingIndex: null // index in state.pantry when editing an existing item
};

// ==========================================
// 1. INITIALIZATION & LOCAL STORAGE
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  loadStateFromStorage();
  bindEvents();
  renderAll();
  refreshRecipesFromApi();
});

/**
 * Loads saved pantry items and today's meal log from localStorage.
 * Normalizes any older pantry items into { name, type, amount, unit }.
 */
function loadStateFromStorage() {
  try {
    const savedPantry = localStorage.getItem(STORAGE_KEYS.PANTRY);
    const savedMeals = localStorage.getItem(STORAGE_KEYS.MEALS);
    const savedGoals = localStorage.getItem(STORAGE_KEYS.GOALS);

    if (savedPantry) {
      const parsed = JSON.parse(savedPantry);
      state.pantry = parsed.map((item) => {
        if (item.amount !== undefined && item.unit) return item;
        const catalogMatch = COMMON_INGREDIENTS.find(
          (c) => normalizeText(c.name) === normalizeText(item.name)
        );
        const type = catalogMatch ? catalogMatch.type : "solid";
        return {
          name: item.name,
          type,
          amount: 100,
          unit: type === "liquid" ? "mLs" : "grams"
        };
      });
    }

    if (savedMeals) state.loggedMeals = JSON.parse(savedMeals);
    if (savedGoals) state.goals = JSON.parse(savedGoals);
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    showStatus("Could not load saved browser data. Starting fresh.", "warning");
  }
}

/**
 * Saves current pantry and logged meals to browser localStorage.
 */
function saveStateToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(state.pantry));
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(state.loggedMeals));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
    showStatus("Warning: Browser storage is full or disabled.", "warning");
  }
}

// ==========================================
// 2. EVENT LISTENERS
// ==========================================

function bindEvents() {
  // Open "+ Add Ingredient" picker
  document.getElementById("open-add-ingredient-btn").addEventListener("click", () => {
    openIngredientPicker();
  });

  // Cancel / close picker
  document.getElementById("close-picker-btn").addEventListener("click", () => {
    closeIngredientPicker();
  });

  // Live search input for common ingredients
  document.getElementById("ingredient-search-input").addEventListener("input", (event) => {
    renderIngredientSearchResults(event.target.value);
  });

  // Switch back from amount step to ingredient search step
  document.getElementById("change-ingredient-btn").addEventListener("click", () => {
    state.selectedIngredient = null;
    state.editingIndex = null;
    showSearchStep();
  });

  // Submit amount and unit to save (or update) ingredient in localStorage
  document.getElementById("ingredient-amount-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.selectedIngredient) return;

    const amountVal = parseFloat(document.getElementById("ingredient-amount-input").value);
    const unitVal = document.getElementById("ingredient-unit-select").value;

    if (isNaN(amountVal) || amountVal <= 0) {
      showStatus("Please enter a valid amount greater than 0.", "warning");
      return;
    }

    savePantryIngredient({
      name: state.selectedIngredient.name,
      type: state.selectedIngredient.type,
      amount: amountVal,
      unit: unitVal
    });

    closeIngredientPicker();
  });

  // Load starter pantry button
  document.getElementById("load-sample-pantry-btn").addEventListener("click", () => {
    state.pantry = SAMPLE_DATA.starterPantry.map((item) => ({ ...item }));
    saveStateToStorage();
    renderAll();
    refreshRecipesFromApi();
    showStatus("Starter pantry loaded!", "success");
  });

  // Clear all pantry items
  document.getElementById("clear-pantry-btn").addEventListener("click", () => {
    state.pantry = [];
    saveStateToStorage();
    renderAll();
    refreshRecipesFromApi();
    showStatus("Pantry cleared.", "info");
  });

  // Reset today's meal log
  document.getElementById("reset-log-btn").addEventListener("click", () => {
    state.loggedMeals = [];
    saveStateToStorage();
    renderNutritionDashboard();
    showStatus("Today's nutrition log has been reset.", "info");
  });

  // Sort dropdown change
  document.getElementById("sort-select").addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    renderRecipeFeed();
  });
}

// ==========================================
// 3. INGREDIENT PICKER & PANTRY CRUD
// ==========================================

function openIngredientPicker() {
  state.selectedIngredient = null;
  state.editingIndex = null;

  const panel = document.getElementById("ingredient-picker-panel");
  const openBtn = document.getElementById("open-add-ingredient-btn");
  const searchInput = document.getElementById("ingredient-search-input");

  panel.classList.remove("hidden");
  openBtn.classList.add("hidden");
  searchInput.value = "";
  showSearchStep();
  renderIngredientSearchResults("");
  searchInput.focus();
}

function closeIngredientPicker() {
  state.selectedIngredient = null;
  state.editingIndex = null;

  document.getElementById("ingredient-picker-panel").classList.add("hidden");
  document.getElementById("open-add-ingredient-btn").classList.remove("hidden");
}

function showSearchStep() {
  document.getElementById("picker-step-title").textContent = "Search Common Ingredients";
  document.getElementById("picker-search-step").classList.remove("hidden");
  document.getElementById("ingredient-amount-form").classList.add("hidden");
}

/**
 * Selects an ingredient (either from search or when clicking Edit on a saved item)
 * and opens the solid/liquid unit menu.
 */
function selectIngredientForAmount(ingredient, existingAmount = "", existingUnit = "", editIndex = null) {
  state.selectedIngredient = { name: ingredient.name, type: ingredient.type };
  state.editingIndex = editIndex;

  document.getElementById("picker-step-title").textContent =
    editIndex !== null ? "Edit Ingredient Amount" : "Enter Amount & Unit";
  document.getElementById("picker-search-step").classList.add("hidden");
  document.getElementById("ingredient-amount-form").classList.remove("hidden");

  document.getElementById("selected-ing-name").textContent = ingredient.name;
  const typeBadge = document.getElementById("selected-ing-type-badge");
  typeBadge.textContent = ingredient.type;
  typeBadge.className = `type-badge ${ingredient.type}`;

  // Populate allowed units for solid vs liquid
  const unitSelect = document.getElementById("ingredient-unit-select");
  const allowedUnits = UNITS_BY_TYPE[ingredient.type] || UNITS_BY_TYPE.solid;
  unitSelect.innerHTML = allowedUnits
    .map((u) => `<option value="${u}">${u}</option>`)
    .join("");

  if (existingUnit && allowedUnits.includes(existingUnit)) {
    unitSelect.value = existingUnit;
  }

  const amountInput = document.getElementById("ingredient-amount-input");
  amountInput.value = existingAmount;
  amountInput.focus();
}

/**
 * Opens the amount/unit menu pre-filled with a saved pantry item so the user can edit it.
 */
function editPantryItem(index) {
  const item = state.pantry[index];
  if (!item) return;

  document.getElementById("ingredient-picker-panel").classList.remove("hidden");
  document.getElementById("open-add-ingredient-btn").classList.add("hidden");

  selectIngredientForAmount(
    { name: item.name, type: item.type || "solid" },
    item.amount,
    item.unit,
    index
  );
}

/**
 * Saves a new ingredient or updates an existing one in the pantry and localStorage.
 */
function savePantryIngredient(newItem) {
  if (state.editingIndex !== null && state.pantry[state.editingIndex]) {
    state.pantry[state.editingIndex] = newItem;
    showStatus(`Updated "${newItem.name}" (${newItem.amount} ${newItem.unit}).`, "success");
  } else {
    const existingIndex = state.pantry.findIndex(
      (item) => normalizeText(item.name) === normalizeText(newItem.name)
    );

    if (existingIndex > -1) {
      state.pantry[existingIndex] = newItem;
      showStatus(`Updated "${newItem.name}" (${newItem.amount} ${newItem.unit}).`, "info");
    } else {
      state.pantry.push(newItem);
      showStatus(`Added "${newItem.name}" (${newItem.amount} ${newItem.unit}) to pantry.`, "success");
    }
  }

  saveStateToStorage();
  renderAll();
  refreshRecipesFromApi();
}

/**
 * Removes an ingredient from the pantry by index.
 */
function removePantryItem(index) {
  state.pantry.splice(index, 1);
  saveStateToStorage();
  renderAll();
  refreshRecipesFromApi();
}

// ==========================================
// 4. DATA LAYER API FETCH (THEMEALDB KEYLESS)
// ==========================================

/**
 * Fetches live recipes from TheMealDB using the user's pantry ingredients.
 * Falls back gracefully to SAMPLE_DATA.recipes if offline or pantry is empty.
 */
async function refreshRecipesFromApi() {
  const badgeEl = document.getElementById("data-mode-badge");

  if (state.pantry.length === 0) {
    state.recipes = [...SAMPLE_DATA.recipes];
    state.isLiveApi = false;
    badgeEl.textContent = "Sample Data Mode";
    renderRecipeFeed();
    return;
  }

  badgeEl.textContent = "Searching Live Recipes...";

  try {
    // Query up to the first 2 pantry ingredients to gather relevant recipes
    const queryItems = state.pantry.slice(0, 2);
    const mealIdSet = new Set();

    for (const item of queryItems) {
      const cleanQuery = encodeURIComponent(item.name.trim().replace(/\s+/g, "_"));
      const filterUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${cleanQuery}`;
      const res = await fetch(filterUrl, { cache: "no-store" });
      if (!res.ok) continue;

      const data = await res.json();
      if (Array.isArray(data.meals)) {
        data.meals.slice(0, 5).forEach((m) => mealIdSet.add(m.idMeal));
      }
    }

    if (mealIdSet.size === 0) {
      state.recipes = [...SAMPLE_DATA.recipes];
      state.isLiveApi = false;
      badgeEl.textContent = "Sample Data (No API Match)";
      renderRecipeFeed();
      return;
    }

    // Fetch full details (ingredients, measures, instructions) for up to 6 matched meals
    const idsToFetch = Array.from(mealIdSet).slice(0, 6);
    const detailPromises = idsToFetch.map((id) =>
      fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );

    const detailResults = await Promise.all(detailPromises);
    const liveRecipes = detailResults
      .map((res) => (res && Array.isArray(res.meals) && res.meals[0] ? normalizeMealDbRecipe(res.meals[0]) : null))
      .filter(Boolean);

    if (liveRecipes.length > 0) {
      state.recipes = liveRecipes;
      state.isLiveApi = true;
      badgeEl.textContent = "Live TheMealDB API";
    } else {
      state.recipes = [...SAMPLE_DATA.recipes];
      state.isLiveApi = false;
      badgeEl.textContent = "Sample Data Mode";
    }
  } catch (error) {
    console.error("Live recipe API error:", error);
    state.recipes = [...SAMPLE_DATA.recipes];
    state.isLiveApi = false;
    badgeEl.textContent = "Offline Sample Mode";
    showStatus("Could not reach live recipe service—showing offline sample recipes.", "warning");
  }

  renderRecipeFeed();
}

/**
 * Converts a raw TheMealDB meal object (strIngredient1..20, strInstructions)
 * into our internal recipe shape with estimated per-serving macros.
 */
function normalizeMealDbRecipe(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const rawIng = meal[`strIngredient${i}`];
    if (rawIng && rawIng.trim() !== "") {
      ingredients.push(rawIng.trim().toLowerCase());
    }
  }

  // Split instructions into clean readable steps
  const rawSteps = (meal.strInstructions || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    id: `mealdb-${meal.idMeal}`,
    title: meal.strMeal || "Untitled Recipe",
    prepTime: meal.strArea ? `${meal.strArea} Cuisine` : "30 mins",
    servings: 1,
    ingredients,
    nutrition: estimateRecipeNutrition(ingredients),
    instructions: rawSteps.length > 0 ? rawSteps : ["Follow standard preparation steps."]
  };
}

/**
 * Estimates per-serving calories, protein, carbs, and fat from an ingredient list
 * using the INGREDIENT_NUTRITION dictionary in 1_data/data.js.
 */
function estimateRecipeNutrition(ingredients) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const keys = Object.keys(INGREDIENT_NUTRITION).filter((k) => k !== "_default");

  ingredients.forEach((ing) => {
    const lowerIng = ing.toLowerCase();
    const matchedKey = keys.find((key) => lowerIng.includes(key));
    const profile = matchedKey ? INGREDIENT_NUTRITION[matchedKey] : INGREDIENT_NUTRITION._default;

    totals.calories += profile.calories;
    totals.protein += profile.protein;
    totals.carbs += profile.carbs;
    totals.fat += profile.fat;
  });

  return totals;
}

// ==========================================
// 5. PROCESSING LAYER (MATCHING & TOTALS)
// ==========================================

function normalizeText(text) {
  let clean = text.toLowerCase().trim();
  if (clean.endsWith("es") && clean.length > 4 && !clean.endsWith("rices")) {
    clean = clean.slice(0, -2);
  } else if (
    clean.endsWith("s") &&
    clean.length > 3 &&
    !clean.endsWith("ss") &&
    !clean.endsWith("oats") &&
    !clean.endsWith("beans")
  ) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

function evaluateRecipes() {
  const normalizedPantry = state.pantry.map((item) => normalizeText(item.name));

  const evaluated = state.recipes.map((recipe) => {
    const owned = [];
    const missing = [];

    recipe.ingredients.forEach((ing) => {
      const normIng = normalizeText(ing);
      const isOwned = normalizedPantry.some(
        (pItem) => pItem === normIng || pItem.includes(normIng) || normIng.includes(pItem)
      );

      if (isOwned) {
        owned.push(ing);
      } else {
        missing.push(ing);
      }
    });

    const totalCount = recipe.ingredients.length;
    const matchPercent = totalCount > 0 ? Math.round((owned.length / totalCount) * 100) : 0;

    return {
      ...recipe,
      ownedIngredients: owned,
      missingIngredients: missing,
      matchPercent
    };
  });

  return evaluated.sort((a, b) => {
    if (state.sortBy === "fewest-missing") {
      return a.missingIngredients.length - b.missingIngredients.length || b.matchPercent - a.matchPercent;
    }
    if (state.sortBy === "highest-protein") {
      return b.nutrition.protein - a.nutrition.protein;
    }
    if (state.sortBy === "lowest-calories") {
      return a.nutrition.calories - b.nutrition.calories;
    }
    return b.matchPercent - a.matchPercent || a.missingIngredients.length - b.missingIngredients.length;
  });
}

function logRecipeMeal(recipeId) {
  const recipe = state.recipes.find((r) => r.id === recipeId);
  if (!recipe) return;

  const mealEntry = {
    logId: Date.now().toString(),
    title: recipe.title,
    calories: recipe.nutrition.calories,
    protein: recipe.nutrition.protein,
    carbs: recipe.nutrition.carbs,
    fat: recipe.nutrition.fat,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };

  state.loggedMeals.unshift(mealEntry);
  saveStateToStorage();
  renderNutritionDashboard();
  showStatus(`Logged "${recipe.title}" (+${recipe.nutrition.calories} kcal)!`, "success");
}

function removeLoggedMeal(logId) {
  state.loggedMeals = state.loggedMeals.filter((meal) => meal.logId !== logId);
  saveStateToStorage();
  renderNutritionDashboard();
}

function calculateDailyTotals() {
  return state.loggedMeals.reduce(
    (totals, meal) => {
      totals.calories += meal.calories;
      totals.protein += meal.protein;
      totals.carbs += meal.carbs;
      totals.fat += meal.fat;
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ==========================================
// 6. PRESENTATION LAYER (DOM RENDERING)
// ==========================================

function renderAll() {
  renderPantry();
  renderNutritionDashboard();
  renderRecipeFeed();
}

/**
 * Renders filtered common ingredients inside the search bar dropdown.
 */
function renderIngredientSearchResults(query) {
  const resultsEl = document.getElementById("ingredient-search-results");
  const cleanQuery = query.trim().toLowerCase();

  const matches = COMMON_INGREDIENTS.filter((item) =>
    item.name.toLowerCase().includes(cleanQuery)
  );

  if (matches.length === 0) {
    resultsEl.innerHTML = `<li class="empty-state">No matching common ingredient found.</li>`;
    return;
  }

  resultsEl.innerHTML = matches
    .map(
      (item) => `
      <li>
        <button
          type="button"
          class="search-result-btn"
          onclick="handlePickCommonIngredient('${escapeHtml(item.name)}', '${item.type}')"
        >
          <span>${escapeHtml(item.name)}</span>
          <span class="type-badge ${item.type}">${item.type}</span>
        </button>
      </li>
    `
    )
    .join("");
}

function handlePickCommonIngredient(name, type) {
  selectIngredientForAmount({ name, type }, "", "", null);
}

/**
 * Renders the user's saved pantry list with Edit and Remove controls.
 */
function renderPantry() {
  const listEl = document.getElementById("pantry-list");
  const countEl = document.getElementById("pantry-count");

  const count = state.pantry.length;
  countEl.textContent = `${count} ${count === 1 ? "item" : "items"} in pantry`;

  if (count === 0) {
    listEl.innerHTML = `<li class="empty-state">Your pantry is empty. Click "+ Add Ingredient" above to get started.</li>`;
    return;
  }

  listEl.innerHTML = state.pantry
    .map(
      (item, index) => `
      <li class="pantry-item">
        <div class="pantry-item-info">
          <span class="pantry-item-name">${escapeHtml(item.name)}</span>
          <span class="pantry-item-qty">${escapeHtml(String(item.amount))} ${escapeHtml(item.unit)}</span>
        </div>
        <div class="pantry-item-actions">
          <button
            type="button"
            class="btn-edit"
            aria-label="Edit ${escapeHtml(item.name)}"
            onclick="editPantryItem(${index})"
          >Edit</button>
          <button
            type="button"
            class="btn-remove"
            aria-label="Remove ${escapeHtml(item.name)}"
            onclick="removePantryItem(${index})"
          >&times;</button>
        </div>
      </li>
    `
    )
    .join("");
}

function renderNutritionDashboard() {
  const totals = calculateDailyTotals();
  const { goals } = state;

  document.getElementById("total-calories").textContent = totals.calories;
  document.getElementById("goal-calories").textContent = goals.calories;
  document.getElementById("total-protein").textContent = `${totals.protein}g`;
  document.getElementById("goal-protein").textContent = goals.protein;
  document.getElementById("total-carbs").textContent = `${totals.carbs}g`;
  document.getElementById("goal-carbs").textContent = goals.carbs;
  document.getElementById("total-fat").textContent = `${totals.fat}g`;
  document.getElementById("goal-fat").textContent = goals.fat;

  updateProgressBar("bar-calories", totals.calories, goals.calories);
  updateProgressBar("bar-protein", totals.protein, goals.protein);
  updateProgressBar("bar-carbs", totals.carbs, goals.carbs);
  updateProgressBar("bar-fat", totals.fat, goals.fat);

  const mealListEl = document.getElementById("meal-log-list");
  if (state.loggedMeals.length === 0) {
    mealListEl.innerHTML = `<li class="empty-state">No meals logged yet today. Click "Log Meal" on any recipe.</li>`;
    return;
  }

  mealListEl.innerHTML = state.loggedMeals
    .map(
      (meal) => `
      <li class="meal-log-item">
        <div>
          <div class="meal-log-title">${escapeHtml(meal.title)}</div>
          <div class="meal-log-meta">
            ${meal.time} &bull; ${meal.calories} kcal &bull; ${meal.protein}g P / ${meal.carbs}g C / ${meal.fat}g F
          </div>
        </div>
        <button
          type="button"
          class="btn-remove"
          aria-label="Delete logged meal ${escapeHtml(meal.title)}"
          onclick="removeLoggedMeal('${meal.logId}')"
        >&times;</button>
      </li>
    `
    )
    .join("");
}

function updateProgressBar(elementId, current, goal) {
  const bar = document.getElementById(elementId);
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  bar.style.width = `${pct}%`;
  bar.classList.toggle("over-goal", current > goal);
}

function renderRecipeFeed() {
  const feedEl = document.getElementById("recipe-feed");
  const summaryEl = document.getElementById("recipe-summary-text");
  const rankedRecipes = evaluateRecipes();

  if (state.pantry.length === 0) {
    summaryEl.textContent = "Showing sample recipes. Add ingredients to fetch live matches.";
  } else {
    const readyCount = rankedRecipes.filter((r) => r.missingIngredients.length === 0).length;
    summaryEl.textContent = `Found ${rankedRecipes.length} recipes (${readyCount} ready with zero missing items).`;
  }

  feedEl.innerHTML = rankedRecipes
    .map((recipe) => {
      const matchBadgeClass =
        recipe.matchPercent >= 80
          ? "badge-high"
          : recipe.matchPercent >= 40
          ? "badge-mid"
          : "badge-low";

      const ingredientTags = recipe.ingredients
        .map((ing) => {
          const isOwned = recipe.ownedIngredients.includes(ing);
          return `<span class="ing-tag ${isOwned ? "ing-owned" : "ing-missing"}">
            ${isOwned ? "&#10003;" : "+"} ${escapeHtml(ing)}
          </span>`;
        })
        .join("");

      const stepsHtml = recipe.instructions
        .map((step) => `<li>${escapeHtml(step)}</li>`)
        .join("");

      return `
        <article class="card recipe-card">
          <div class="recipe-header">
            <div>
              <h3 class="recipe-title">${escapeHtml(recipe.title)}</h3>
              <span class="recipe-meta">${escapeHtml(recipe.prepTime)} &bull; ${recipe.servings} serving (est. macros)</span>
            </div>
            <span class="match-badge ${matchBadgeClass}">
              ${recipe.matchPercent}% Match (${recipe.ownedIngredients.length}/${recipe.ingredients.length})
            </span>
          </div>

          <div class="recipe-macros">
            <span><strong>${recipe.nutrition.calories}</strong> kcal</span>
            <span><strong>${recipe.nutrition.protein}g</strong> Protein</span>
            <span><strong>${recipe.nutrition.carbs}g</strong> Carbs</span>
            <span><strong>${recipe.nutrition.fat}g</strong> Fat</span>
          </div>

          <div class="recipe-ingredients">
            <div class="ing-legend">Ingredients (green = in pantry, gray = missing):</div>
            <div class="ing-tags-wrap">${ingredientTags}</div>
          </div>

          <details class="recipe-instructions">
            <summary>View Cooking Instructions</summary>
            <ol>${stepsHtml}</ol>
          </details>

          <div class="recipe-actions">
            <button
              type="button"
              class="btn-primary"
              onclick="logRecipeMeal('${recipe.id}')"
            >
              + Log Meal to Today's Macros
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

let bannerTimeout = null;
function showStatus(message, type = "info") {
  const banner = document.getElementById("status-banner");
  banner.textContent = message;
  banner.className = `status-banner status-${type}`;
  banner.classList.remove("hidden");

  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    banner.classList.add("hidden");
  }, 3500);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}