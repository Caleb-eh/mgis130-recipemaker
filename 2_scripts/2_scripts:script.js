/**
 * PROCESSING & PRESENTATION LAYER: 2_scripts/script.js
 * Manages pantry state, ingredient matching, nutrition totals,
 * localStorage persistence, and DOM updates.
 */

// Storage keys for browser persistence
const STORAGE_KEYS = {
  PANTRY: "pantryToPlate_pantry_v1",
  MEALS: "pantryToPlate_meals_v1",
  GOALS: "pantryToPlate_goals_v1"
};

// Application state
let state = {
  pantry: [],
  loggedMeals: [],
  goals: { ...SAMPLE_DATA.defaultGoals },
  sortBy: "best-match"
};

// ==========================================
// 1. INITIALIZATION & LOCAL STORAGE
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  loadStateFromStorage();
  bindEvents();
  renderAll();
});

/**
 * Loads saved pantry items and today's meal log from localStorage.
 */
function loadStateFromStorage() {
  try {
    const savedPantry = localStorage.getItem(STORAGE_KEYS.PANTRY);
    const savedMeals = localStorage.getItem(STORAGE_KEYS.MEALS);
    const savedGoals = localStorage.getItem(STORAGE_KEYS.GOALS);

    if (savedPantry) state.pantry = JSON.parse(savedPantry);
    if (savedMeals) state.loggedMeals = JSON.parse(savedMeals);
    if (savedGoals) state.goals = JSON.parse(savedGoals);
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    showStatus("Could not load saved browser data. Starting fresh.", "warning");
  }
}

/**
 * Saves current pantry and logged meals to localStorage.
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
  // Add ingredient form
  const pantryForm = document.getElementById("pantry-form");
  pantryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const nameInput = document.getElementById("ingredient-input");
    const qtyInput = document.getElementById("quantity-input");

    const rawName = nameInput.value.trim();
    const rawQty = qtyInput.value.trim();

    if (!rawName) return;

    addPantryItem(rawName, rawQty);
    nameInput.value = "";
    qtyInput.value = "";
    nameInput.focus();
  });

  // Load starter pantry button
  document.getElementById("load-sample-pantry-btn").addEventListener("click", () => {
    state.pantry = SAMPLE_DATA.starterPantry.map((item) => ({ ...item }));
    saveStateToStorage();
    renderAll();
    showStatus("Starter pantry loaded! Matching recipes updated.", "success");
  });

  // Clear all pantry items
  document.getElementById("clear-pantry-btn").addEventListener("click", () => {
    state.pantry = [];
    saveStateToStorage();
    renderAll();
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
// 3. PROCESSING LAYER (RULES & CALCULATIONS)
// ==========================================

/**
 * Normalizes ingredient text for reliable matching (lowercase, trimmed, basic singularization).
 */
function normalizeText(text) {
  let clean = text.toLowerCase().trim();
  if (clean.endsWith("es") && clean.length > 4 && !clean.endsWith("rices")) {
    clean = clean.slice(0, -2);
  } else if (clean.endsWith("s") && clean.length > 3 && !clean.endsWith("ss") && !clean.endsWith("oats") && !clean.endsWith("beans")) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

/**
 * Adds or updates an ingredient in the user's pantry.
 */
function addPantryItem(name, quantity) {
  const normalizedNew = normalizeText(name);
  const existingIndex = state.pantry.findIndex(
    (item) => normalizeText(item.name) === normalizedNew
  );

  if (existingIndex > -1) {
    // Update existing item quantity if provided
    state.pantry[existingIndex].name = name.toLowerCase();
    if (quantity) {
      state.pantry[existingIndex].quantity = quantity;
    }
    showStatus(`Updated "${name}" in your pantry.`, "info");
  } else {
    state.pantry.push({
      name: name.toLowerCase(),
      quantity: quantity || ""
    });
  }

  saveStateToStorage();
  renderAll();
}

/**
 * Removes an ingredient from the pantry by index.
 */
function removePantryItem(index) {
  state.pantry.splice(index, 1);
  saveStateToStorage();
  renderAll();
}

/**
 * Compares recipe ingredients against current pantry and computes match metrics.
 */
function evaluateRecipes() {
  const normalizedPantry = state.pantry.map((item) => normalizeText(item.name));

  const evaluated = SAMPLE_DATA.recipes.map((recipe) => {
    const owned = [];
    const missing = [];

    recipe.ingredients.forEach((ing) => {
      const normIng = normalizeText(ing);
      // Match if pantry item equals or contains the ingredient word
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

  // Sort evaluated recipes based on selected dropdown option
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
    // Default: "best-match"
    return b.matchPercent - a.matchPercent || a.missingIngredients.length - b.missingIngredients.length;
  });
}

/**
 * Logs a selected recipe into today's nutrition intake.
 */
function logRecipeMeal(recipeId) {
  const recipe = SAMPLE_DATA.recipes.find((r) => r.id === recipeId);
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

/**
 * Removes a single logged meal entry by logId.
 */
function removeLoggedMeal(logId) {
  state.loggedMeals = state.loggedMeals.filter((meal) => meal.logId !== logId);
  saveStateToStorage();
  renderNutritionDashboard();
}

/**
 * Sums total macros across all meals logged today.
 */
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
// 4. PRESENTATION LAYER (DOM RENDERING)
// ==========================================

function renderAll() {
  renderPantry();
  renderNutritionDashboard();
  renderRecipeFeed();
}

/**
 * Renders the user's pantry list and item counter.
 */
function renderPantry() {
  const listEl = document.getElementById("pantry-list");
  const countEl = document.getElementById("pantry-count");

  const count = state.pantry.length;
  countEl.textContent = `${count} ${count === 1 ? "item" : "items"} in pantry`;

  if (count === 0) {
    listEl.innerHTML = `<li class="empty-state">Your pantry is empty. Add ingredients above or load the starter pantry.</li>`;
    return;
  }

  listEl.innerHTML = state.pantry
    .map(
      (item, index) => `
      <li class="pantry-item">
        <div class="pantry-item-info">
          <span class="pantry-item-name">${escapeHtml(item.name)}</span>
          ${item.quantity ? `<span class="pantry-item-qty">${escapeHtml(item.quantity)}</span>` : ""}
        </div>
        <button
          type="button"
          class="btn-remove"
          aria-label="Remove ${escapeHtml(item.name)}"
          onclick="removePantryItem(${index})"
        >&times;</button>
      </li>
    `
    )
    .join("");
}

/**
 * Renders macro progress bars and today's logged meals list.
 */
function renderNutritionDashboard() {
  const totals = calculateDailyTotals();
  const { goals } = state;

  // Update text numbers
  document.getElementById("total-calories").textContent = totals.calories;
  document.getElementById("goal-calories").textContent = goals.calories;
  document.getElementById("total-protein").textContent = `${totals.protein}g`;
  document.getElementById("goal-protein").textContent = goals.protein;
  document.getElementById("total-carbs").textContent = `${totals.carbs}g`;
  document.getElementById("goal-carbs").textContent = goals.carbs;
  document.getElementById("total-fat").textContent = `${totals.fat}g`;
  document.getElementById("goal-fat").textContent = goals.fat;

  // Update progress bar widths (capped at 100%)
  updateProgressBar("bar-calories", totals.calories, goals.calories);
  updateProgressBar("bar-protein", totals.protein, goals.protein);
  updateProgressBar("bar-carbs", totals.carbs, goals.carbs);
  updateProgressBar("bar-fat", totals.fat, goals.fat);

  // Render logged meals
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

/**
 * Renders the ranked recipe cards with owned/missing ingredient badges and instructions.
 */
function renderRecipeFeed() {
  const feedEl = document.getElementById("recipe-feed");
  const summaryEl = document.getElementById("recipe-summary-text");
  const rankedRecipes = evaluateRecipes();

  if (state.pantry.length === 0) {
    summaryEl.textContent = "Showing all sample recipes. Add ingredients to rank by pantry match.";
  } else {
    const readyCount = rankedRecipes.filter((r) => r.missingIngredients.length === 0).length;
    summaryEl.textContent = `Found ${rankedRecipes.length} recipes (${readyCount} ready to cook with zero missing items).`;
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
              <span class="recipe-meta">Prep: ${escapeHtml(recipe.prepTime)} &bull; ${recipe.servings} serving</span>
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

/**
 * Displays a temporary status banner for user feedback.
 */
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

/**
 * Escapes HTML special characters to prevent injection from user-typed pantry text.
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}