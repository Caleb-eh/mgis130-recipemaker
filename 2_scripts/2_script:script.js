/**
 * DATA LAYER: 1_data/data.js
 * Holds sample pantry items, daily nutrition goals, fallback sample recipes,
 * and an ingredient nutrition lookup dictionary for live API recipes.
 */

const SAMPLE_DATA = {
  // Default daily macro targets for the nutrition dashboard
  defaultGoals: {
    calories: 2000,
    protein: 150,
    carbs: 220,
    fat: 65
  },

  // Starter pantry items users can load with one click to test matching
  starterPantry: [
    { name: "chicken breast", quantity: "2 lbs" },
    { name: "brown rice", quantity: "3 cups" },
    { name: "spinach", quantity: "1 bag" },
    { name: "eggs", quantity: "6" },
    { name: "olive oil", quantity: "1 bottle" },
    { name: "garlic", quantity: "4 cloves" },
    { name: "black beans", quantity: "1 can" },
    { name: "oats", quantity: "2 cups" }
  ],

  // Fallback sample recipe catalog (used when pantry is empty or offline)
  recipes: [
    {
      id: "rec-1",
      title: "Garlic Herb Chicken & Spinach Rice Bowl",
      prepTime: "25 mins",
      servings: 1,
      ingredients: [
        "chicken breast",
        "brown rice",
        "spinach",
        "garlic",
        "olive oil",
        "lemon"
      ],
      nutrition: {
        calories: 540,
        protein: 46,
        carbs: 52,
        fat: 15
      },
      instructions: [
        "Season chicken breast with minced garlic, salt, and pepper.",
        "Heat olive oil in a skillet over medium-high heat and cook chicken 6 minutes per side until cooked through.",
        "Toss fresh spinach into the warm skillet for 1 minute until wilted.",
        "Serve sliced chicken and wilted spinach over cooked brown rice with a squeeze of lemon."
      ]
    },
    {
      id: "rec-2",
      title: "High-Protein Spinach & Egg Scramble",
      prepTime: "10 mins",
      servings: 1,
      ingredients: [
        "eggs",
        "spinach",
        "olive oil",
        "garlic",
        "feta cheese"
      ],
      nutrition: {
        calories: 340,
        protein: 24,
        carbs: 6,
        fat: 24
      },
      instructions: [
        "Whisk 3 eggs in a bowl with a pinch of salt and black pepper.",
        "Warm olive oil and minced garlic in a non-stick pan over medium heat.",
        "Add spinach and cook until wilted, then pour in eggs and gently scramble.",
        "Top with crumbled feta cheese and serve warm."
      ]
    },
    {
      id: "rec-3",
      title: "Southwest Black Bean & Rice Skillet",
      prepTime: "15 mins",
      servings: 1,
      ingredients: [
        "black beans",
        "brown rice",
        "garlic",
        "olive oil",
        "salsa",
        "avocado"
      ],
      nutrition: {
        calories: 480,
        protein: 16,
        carbs: 74,
        fat: 14
      },
      instructions: [
        "Heat olive oil in a skillet and sauté minced garlic for 30 seconds.",
        "Stir in rinsed black beans, cooked brown rice, and salsa; simmer for 5 minutes.",
        "Transfer to a bowl and top with sliced avocado."
      ]
    },
    {
      id: "rec-4",
      title: "Savory Garlic Oats with Fried Egg",
      prepTime: "12 mins",
      servings: 1,
      ingredients: [
        "oats",
        "eggs",
        "spinach",
        "garlic",
        "olive oil"
      ],
      nutrition: {
        calories: 390,
        protein: 18,
        carbs: 48,
        fat: 14
      },
      instructions: [
        "Simmer rolled oats in water or broth with a pinch of salt and garlic powder for 5 minutes.",
        "Stir fresh spinach into the hot oats until wilted.",
        "Fry an egg in olive oil to your preferred doneness and place on top of the oats."
      ]
    },
    {
      id: "rec-5",
      title: "Mediterranean Chicken & Bean Salad",
      prepTime: "15 mins",
      servings: 1,
      ingredients: [
        "chicken breast",
        "black beans",
        "spinach",
        "olive oil",
        "cherry tomatoes",
        "cucumber"
      ],
      nutrition: {
        calories: 460,
        protein: 42,
        carbs: 30,
        fat: 18
      },
      instructions: [
        "Dice cooked chicken breast and combine in a large bowl with rinsed black beans and fresh spinach.",
        "Add halved cherry tomatoes and diced cucumber.",
        "Drizzle with olive oil, season to taste, and toss well."
      ]
    },
    {
      id: "rec-6",
      title: "Peanut Butter Banana Protein Oats",
      prepTime: "8 mins",
      servings: 1,
      ingredients: [
        "oats",
        "banana",
        "peanut butter",
        "milk"
      ],
      nutrition: {
        calories: 450,
        protein: 16,
        carbs: 62,
        fat: 16
      },
      instructions: [
        "Cook oats in milk over medium heat for 5 minutes until creamy.",
        "Stir in peanut butter until melted.",
        "Top with sliced banana and serve immediately."
      ]
    }
  ]
};

/**
 * Per-serving estimated nutrition lookup for common recipe ingredients.
 * Used by the processing layer to calculate macros for live API recipes.
 */
const INGREDIENT_NUTRITION = {
  // Proteins
  chicken: { calories: 220, protein: 35, carbs: 0, fat: 8 },
  beef: { calories: 260, protein: 28, carbs: 0, fat: 16 },
  pork: { calories: 240, protein: 26, carbs: 0, fat: 14 },
  salmon: { calories: 250, protein: 25, carbs: 0, fat: 15 },
  fish: { calories: 180, protein: 26, carbs: 0, fat: 7 },
  tuna: { calories: 140, protein: 28, carbs: 0, fat: 2 },
  shrimp: { calories: 120, protein: 24, carbs: 1, fat: 2 },
  egg: { calories: 75, protein: 6, carbs: 1, fat: 5 },
  tofu: { calories: 110, protein: 12, carbs: 3, fat: 6 },
  bean: { calories: 130, protein: 8, carbs: 23, fat: 1 },
  lentil: { calories: 130, protein: 9, carbs: 22, fat: 1 },
  chickpea: { calories: 140, protein: 8, carbs: 24, fat: 2 },

  // Grains & Starches
  rice: { calories: 180, protein: 4, carbs: 38, fat: 1 },
  pasta: { calories: 200, protein: 7, carbs: 40, fat: 1 },
  noodle: { calories: 190, protein: 6, carbs: 38, fat: 1 },
  bread: { calories: 140, protein: 5, carbs: 26, fat: 2 },
  oat: { calories: 150, protein: 5, carbs: 27, fat: 3 },
  potato: { calories: 130, protein: 3, carbs: 30, fat: 0 },
  flour: { calories: 110, protein: 3, carbs: 23, fat: 0 },
  cornstarch: { calories: 30, protein: 0, carbs: 7, fat: 0 },

  // Dairy & Fats
  milk: { calories: 90, protein: 6, carbs: 9, fat: 3 },
  cheese: { calories: 115, protein: 7, carbs: 1, fat: 9 },
  butter: { calories: 100, protein: 0, carbs: 0, fat: 11 },
  oil: { calories: 110, protein: 0, carbs: 0, fat: 12 },
  cream: { calories: 100, protein: 1, carbs: 1, fat: 10 },
  yogurt: { calories: 90, protein: 9, carbs: 7, fat: 2 },
  avocado: { calories: 120, protein: 2, carbs: 6, fat: 11 },
  "peanut butter": { calories: 140, protein: 6, carbs: 5, fat: 12 },

  // Vegetables & Fruits
  spinach: { calories: 15, protein: 2, carbs: 2, fat: 0 },
  broccoli: { calories: 30, protein: 2, carbs: 6, fat: 0 },
  carrot: { calories: 25, protein: 1, carbs: 6, fat: 0 },
  onion: { calories: 25, protein: 1, carbs: 6, fat: 0 },
  tomato: { calories: 25, protein: 1, carbs: 5, fat: 0 },
  pepper: { calories: 20, protein: 1, carbs: 5, fat: 0 },
  mushroom: { calories: 20, protein: 2, carbs: 3, fat: 0 },
  vegetable: { calories: 35, protein: 2, carbs: 7, fat: 0 },
  banana: { calories: 105, protein: 1, carbs: 27, fat: 0 },
  lemon: { calories: 10, protein: 0, carbs: 3, fat: 0 },

  // Sauces, Seasonings & Pantry Staples
  "soy sauce": { calories: 15, protein: 2, carbs: 2, fat: 0 },
  sugar: { calories: 50, protein: 0, carbs: 13, fat: 0 },
  honey: { calories: 60, protein: 0, carbs: 17, fat: 0 },
  garlic: { calories: 5, protein: 0, carbs: 1, fat: 0 },
  ginger: { calories: 5, protein: 0, carbs: 1, fat: 0 },
  salt: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  water: { calories: 0, protein: 0, carbs: 0, fat: 0 },

  // Fallback for unrecognized ingredients
  _default: { calories: 45, protein: 2, carbs: 6, fat: 2 }
};