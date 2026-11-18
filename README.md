# mgis130-recipemaker
# Pantry-to-Plate: Recipe Finder & Nutrition Tracker

**Pantry-to-Plate** is a web application that helps users turn the ingredients they already have in their kitchen into actionable meal ideas while automatically tracking daily nutritional intake. By combining ingredient-based recipe discovery with real-time macro and calorie analysis, the app bridges the gap between reducing household food waste and hitting personal nutrition goals.

---

## Who This App Is For

* **Home Cooks & Busy Professionals:** Anyone staring at a half-full fridge who wants practical meal ideas without making an extra trip to the grocery store.
* **Budget-Conscious Shoppers & Students:** People looking to minimize food waste and stretch their grocery budget by prioritizing ingredients they already own.
* **Health & Fitness Trackers:** Users who want to monitor daily calories, protein, carbohydrates, and fats directly from the meals they cook at home without manually logging every raw ingredient from scratch.

---

## What the App Does

1. **Kitchen Pantry Management:** Users add, edit, and remove available ingredients (with optional quantities) to maintain an up-to-date virtual pantry.
2. **Ingredient-Driven Recipe Search:** Queries an external Recipe API using the user's current pantry list, ranking recipes by how many owned ingredients they use and clearly highlighting any missing items.
3. **Automated Nutrition Lookup & Logging:** Connects to a separate Nutrition API to retrieve detailed macro and calorie profiles for selected recipes or individual ingredients, allowing users to log meals toward a daily intake summary.
4. **Offline-Ready Local Persistence:** Saves pantry inventory and daily nutrition logs directly in the browser so user data persists across sessions without requiring account registration.

---

## System Architecture

The application is structured into three distinct layers to keep external API communication, business logic, and user interface rendering cleanly separated.

### 1. Data Layer (External APIs & Local Storage)
The Data Layer is responsible for retrieving raw recipe and nutritional data from third-party services and persisting user state on the client device.
* **Recipe API Service (`src/services/recipeApi.js`):** Handles outbound HTTP requests to the external Recipe API (e.g., Spoonacular / Edamam), passing pantry ingredient arrays and returning raw recipe matches, ingredient lists, and preparation instructions.
* **Nutrition API Service (`src/services/nutritionApi.js`):** Queries the Nutrition API (e.g., USDA FoodData Central / Nutritionix) with recipe ingredients or serving sizes to fetch raw caloric and macronutrient breakdowns.
* **Client-Side Persistence (`localStorage`):** Stores the user's active pantry list, daily logged meals, and target nutrition goals locally in the browser for instant reloads and offline access.
* **Mock Data Fallback:** Provides local sample JSON payloads so the app can be developed, tested, and demonstrated without exhausting live API rate limits.

### 2. Processing Layer (State Management & Business Logic)
The Processing Layer acts as the bridge between raw data and the user interface, transforming external API responses into structured, user-ready insights.
* **Ingredient Normalization & Matching:** Cleans user-entered ingredient strings (trimming whitespace, standardizing plurals/casing) and calculates match ratios to distinguish between *ingredients on hand* and *missing ingredients*.
* **Nutritional Aggregation:** Parses per-serving or per-ingredient nutrient payloads from the Nutrition API, scales values based on chosen portion sizes, and sums daily totals (Calories, Protein, Carbs, Fat) against user targets.
* **Application State & Error Handling:** Coordinates asynchronous loading states, caches recent API responses to prevent duplicate requests, and gracefully handles network failures or API quota limits.

### 3. Presentation Layer (User Interface & Components)
The Presentation Layer renders the interactive front-end experience, translating processed application state into a responsive, accessible layout.
* **Pantry Input Panel:** An interactive form and tag/list view allowing users to quickly add, search, or clear ingredients currently in their kitchen.
* **Recipe Discovery Feed:** Displays matched recipes as scannable cards showing preparation time, ingredient match count, missing-item badges, and expandable cooking instructions.
* **Nutrition Dashboard & Meal Log:** Visualizes daily calorie and macronutrient progress (via progress bars or summary counters) alongside a chronological log of meals eaten today.
* **Responsive Layout:** Adapts seamlessly across desktop and mobile viewports so users can check recipes on a laptop or glance at ingredient lists on a phone while cooking.
