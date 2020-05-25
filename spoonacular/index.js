/* eslint-disable complexity */
// const Alexa = require('ask-sdk-core');
const axios = require("axios");
const { SpoonacularAPIKey } = require("../secrets.js");
//let recipe = {};
// let ingredientArr = [];
const recipeFormatter = (recipe) => {
  console.log("formatter", recipe);
  let rec;
  if (recipe !== undefined) {
    rec = {
      id: recipe.id,
      image: recipe.image,
      ingredients: [],
      readyInMinutes: recipe.readyInMinutes,
      servings: recipe.servings,
      steps: [],
      title: recipe.title,
      vegan: recipe.vegan,
      vegetarian: recipe.vegetarian,
      likes: recipe.aggregateLikes,
    };
    recipe.analyzedInstructions[0].steps.forEach((step) => {
      let res = step.step.replace(/\.(?=[^\s])/g, ". ");
      rec.steps.push(`Step ${step.number}: ${res} `);
    });
    recipe.extendedIngredients.forEach((ingr) => {
      let ingrObj = {
        id: ingr.id,
        name: ingr.name,
        amount: ingr.measures.us.amount,
        unit: ingr.measures.us.unitLong,
        image: ingr.image,
      };
      rec.ingredients.push(ingrObj);
    });

    return rec;
  }
  return rec;
};

const getFromSpoon = async (caseType, id, ingredients, name) => {
  if (caseType === "ingredientByName") {
    try {
      if (name.includes(" ")) {
        name = name.replace(/\s/g, "-");
      }
      let ingredient = await axios.get(
        `https://api.spoonacular.com/food/ingredients/autocomplete?query=${name}&metaInformation=true&number=1&apiKey=${SpoonacularAPIKey}`
      );
        console.log('get from spoon', ingredient.data[0])
      return ingredient.data[0];

    } catch (err) {
      console.error(err);
    }
  }

  if (caseType === "findByIngredients") {
    let ingredientStr = "";
    for (let i = 0; i < ingredients.length; i++) {
      if (i === ingredients.length - 1) ingredientStr += ingredients[i];
      else ingredientStr += ingredients[i] + ",+";
    }
    if (ingredientStr.includes(" ")) {
      ingredientStr = ingredientStr.replace(/\s/g, "-");
    }
    let res = await axios.get(
      `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientStr}&ranking=2&ignorePantry=true&number=4&apiKey=${SpoonacularAPIKey}`
    );
    if (!res.data.length) {
      return;
    }

    const filteredRecipe = res.data
      .filter((recipe) => {
        return (
          recipe.missedIngredientCount === res.data[0].missedIngredientCount
        );
      })
      .sort(function(a, b) {
        return b.likes - a.likes;
      });
    let goodRecipe = {};
    let backupRecipe = {};

    for (let i = 0; i < filteredRecipe.length; i++) {
      if (goodRecipe.length && backupRecipe.length) {
        break;
      }
      const response = await axios.get(
        `https://api.spoonacular.com/recipes/${filteredRecipe[i].id}/information?instructionsRequired=true&includeNutrition=false&amount=1&apiKey=${SpoonacularAPIKey}`
      );
      console.log("apicall");
      if (
        response.data.analyzedInstructions.length &&
        response.data.extendedIngredients.length > 0
      ) {
        if (!goodRecipe.id) {
          goodRecipe = recipeFormatter(response.data);
        } else {
          backupRecipe = await recipeFormatter(response.data);
        }
      }
    }

    return [goodRecipe, backupRecipe];
  }
};

module.exports = { getFromSpoon };
