/* eslint-disable complexity */
// const Alexa = require('ask-sdk-core');
const axios = require('axios')
const {SpoonacularAPIKey} = require('../secrets.js')
//let recipe = {};
// let ingredientArr = [];
const recipeFormatter = (recipe) => {
  console.log('formatter', recipe);
  let rec = {
    id: recipe.id,
    ingredients: [],
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    steps: [],
    title: recipe.title,
    vegan: recipe.vegan,
    vegetarian: recipe.vegetarian,
  }
  recipe.analyzedInstructions[0].steps.forEach((step) => {
    rec.steps.push(`Step ${step.number}: ${step.step}`)
    step.ingredients.forEach((ingredient) => {
      if (!rec.ingredients.includes(ingredient.id)) {
        rec.ingredients.push(ingredient.id, `${ingredient.name}`)
      }
    })
  })
  return rec
}

const getFromSpoon = async (caseType, id, ingredients, name) => {
  if (caseType === 'ingredientByName') {
    axios
      .get(
        `https://api.spoonacular.com/food/ingredients/autocomplete?query=${name}&metaInformation=true&number=1&apiKey=${SpoonacularAPIKey}`
      )
      .then((ingredient) => {
        console.log('ingredient is ', ingredient)
      })
  }

  if (caseType === 'ingredientById') {
    axios
      .get(
        `https://api.spoonacular.com/food/ingredients/${id}/information?amount=1&apiKey=${SpoonacularAPIKey}`
      )
      .then((ingredient) => {
        console.log('ingredient is ', ingredient.data)
      })
  }

  if (caseType === 'findByIngredients') {
    let ingredientStr = ''
    for (let i = 0; i < ingredients.length; i++) {
      if (i === ingredients.length - 1) ingredientStr += ingredients[i]
      else ingredientStr += ingredients[i] + ',+'
    }
    let res = await axios.get(
      `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientStr}&number=10&ranking=2&ignorePantry=true&apiKey=${SpoonacularAPIKey}`
    )
    
    const filteredRecipe = res.data.filter(recipe => {
      return recipe.missedIngredientCount === res.data[0].missedIngredientCount;
    })
    .sort(function(a, b){return b.likes - a.likes;});
    // console.log(filteredRecipe);
    let goodRecipe;
    for(let i = 0; i < filteredRecipe.length; i++){
      let id = filteredRecipe[i].id;
      const response = await axios.get(
        `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=false&amount=1&apiKey=${SpoonacularAPIKey}`
      )
      if(response.data.analyzedInstructions.length){
        goodRecipe = response.data;
        break;
      }
    }

    // res = await axios.get(
    //   `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=false&amount=1&apiKey=${SpoonacularAPIKey}`
    // )
    // const dirtyRecipe = `recipe is for "${res.data.title}." The first step is:
    //   ${res.data.instructions
    //     .split('                                                          ')
    //     .join('\n ++')
    //     .split('                               ')
    //     .join('. ')}`
    // console.log(recipeFormatter(res.data))
    return recipeFormatter(goodRecipe);
  }

  if (caseType === 'recipeById') {
    axios
      .get(
        `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=false&amount=1&apiKey=${SpoonacularAPIKey}`
      )
      .then((recipe) => {
        console.log('recipe is ', recipe.data)
      })
  }
}

module.exports = getFromSpoon

// getFromSpoon('ingredientByName', 0, [], 'apple')
//getFromSpoon('ingredientById', 9266, [], null)
async function log(){
  console.log('recipe found', await getFromSpoon(
    'findByIngredients',
    0,
    ['garlic','chicken','parsley','peppers','onions','corn','cheese'],
    null
  ));
}
log();
//,'parsley','peppers','onions','corn','cheese'
// getFromSpoon('recipeById', 531683, [], null)

// {  "id": 0,
// "title": "mac & cheese",
//   "steps": "step 1. lksdfjlaskdjf; step 2. asdjflakdsjf; step 3. ajsdfajkhsdfkjah ...",
//     "ingredients": "cheese, chicken breast, garlice, onion, peppers",
//       "readyInMinutes": 30,
//         "servings": 4,
//           "vegetarian": false,

//            "vegan": false
//           }
