// const Alexa = require('ask-sdk-core');
const axios = require('axios')
const {SpoonacularAPIKey} = require('../secrets.js')
//let recipe = {};
// let ingredientArr = [];

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
      `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientStr}&number=1&ranking=2&ignorePantry=true&apiKey=${SpoonacularAPIKey}`
    )

    let id = res.data[0].id
    res = await axios.get(
      `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=false&amount=1&apiKey=${SpoonacularAPIKey}`
    )
    console.log(
      'recipe is ',
      res.data.instructions
        .split('                                                          ')
        .join('\n ++')
        .split('                               ')
        .join('. ')
    )
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

//getFromSpoon('ingredientByName', 0, [], 'apple')
//getFromSpoon('ingredientById', 9266, [], null)
//getFromSpoon('findByIngredients', 0, [ 'chicken', 'tortilla'], null)
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
