/* eslint-disable complexity */
// const Alexa = require('ask-sdk-core');
const axios = require("axios");
const { SpoonacularAPIKey } = require("../secrets.js");
//let recipe = {};
// let ingredientArr = [];
const recipeFormatter = (recipe) => {
  // console.log('formatter', recipe);
  let rec = {
    id: recipe.id,
    ingredients: [],
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    steps: [],
    title: recipe.title,
    vegan: recipe.vegan,
    vegetarian: recipe.vegetarian,
  };
  recipe.analyzedInstructions[0].steps.forEach((step) => {
    let res = step.step.replace(/\.(?=[^\s])/g, ". ")
    rec.steps.push(`Step ${step.number}: ${res} `);
  });
  recipe.extendedIngredients.forEach((ingr) => {
    let ingrObj = {
      id: ingr.id,
      name: ingr.name,
      amount: ingr.measures.us.amount,
      unit: ingr.measures.us.unitLong,
      img: ingr.image,
    }
    rec.ingredients.push(ingrObj);
  })

  return rec;
};

const getFromSpoon = async (caseType, id, ingredients, name) => {
  // console.log('getFromSpoon() inpupts:', caseType, id, ingredients, name)
  if (caseType === 'ingredientByName') {
    try {
      if(name.includes(' ')){
        name = str.replace(/\s/g, '')
      }
      let ingredient = await axios.get(
        `https://api.spoonacular.com/food/ingredients/autocomplete?query=${name}&metaInformation=true&number=1&apiKey=${SpoonacularAPIKey}`)

        console.log(ingredient.data)
        return ingredient.data[0];

      } catch (err) {
        console.error(err)
      }

  }

  // if (caseType === "ingredientById") {
  //   axios
  //     .get(
  //       `https://api.spoonacular.com/food/ingredients/${id}/information?amount=1&apiKey=${SpoonacularAPIKey}`
  //     )
  //     .then((ingredient) => {
  //       console.log("ingredient is ", ingredient.data);
  //     });
  // }

  if (caseType === "findByIngredients") {
    let ingredientStr = "";
    for (let i = 0; i < ingredients.length; i++) {
      if (i === ingredients.length - 1) ingredientStr += ingredients[i];
      else ingredientStr += ingredients[i] + ",+";
    }
    let res = await axios.get(
      `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientStr}&ranking=2&ignorePantry=true&number=3&apiKey=${SpoonacularAPIKey}`
    );

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
      if (goodRecipe.hasOwnProperty(id) && backupRecipe.hasOwnProperty(id)) {
        break;
      }
      const response = await axios.get(
        `https://api.spoonacular.com/recipes/${filteredRecipe[i].id}/information?includeNutrition=false&amount=1&apiKey=${SpoonacularAPIKey}`
      );
        console.log(response.data)
      if (response.data.analyzedInstructions.length && response.data.extendedIngredients.length) {
        if (!goodRecipe.id) {
          goodRecipe = recipeFormatter(response.data);
        } else {
          backupRecipe = recipeFormatter(response.data);
        }
      }
    }

    return [goodRecipe, backupRecipe];
  }

  // if (caseType === "recipeById") {
  //   axios
  //     .get(
  //       `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=false&amount=1&apiKey=${SpoonacularAPIKey}`
  //     )
  //     .then((recipe) => {
  //       console.log("recipe is ", recipe.data);
  //     });
  // }
};

module.exports = { getFromSpoon } ;

