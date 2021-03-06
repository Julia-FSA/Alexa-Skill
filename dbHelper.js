const AWS = require('aws-sdk')
const { getFromSpoon } = require('./spoonacular')

AWS.config.update({region: 'us-east-2'})
const docClient = new AWS.DynamoDB.DocumentClient()

const findOrCreateUser = async (userId) => {
  try {
    const userParams = {
      TableName: 'users',
      Key: {id: userId},
      UpdateExpression: 'set recipes = if_not_exists(recipes, :recipes)',
      ExpressionAttributeValues: {
        ':recipes': [],
      },

    }

    const stocksParams = {
      TableName: 'stocks',
      Key: {id: userId},
      UpdateExpression: 'set ingredients = if_not_exists(ingredients, :ingred)',
      ExpressionAttributeValues: {
        ':ingred': {},
      },
    }

    await docClient.update(userParams).promise()
    await docClient.update(stocksParams).promise()
  } catch (err) {
    console.log(err)
  }
}

const putRecipeInDB = async (recipe, userId) => {
  try {
    let result = await docClient
    .get({
      TableName: 'users',
      Key: {id: userId},
    })
    .promise()
  let prevRecipes = result.Item.recipes
    if (!prevRecipes.includes(recipe.id)){
      prevRecipes.push(recipe.id)
      const params = {
          TableName: 'users',
          Key: {id: userId},
          UpdateExpression: 'set recipes = :recipes',
          ExpressionAttributeValues: {
            ':recipes': prevRecipes,
          },
        }
        await docClient.update(params).promise()
    }


    const params = {
      TableName: 'recipes',
      Key: {id: recipe.id},
      UpdateExpression: 'set ingredients = :ingredients, readyInMinutes = :readyInMinutes, image = :image, servings = :servings, steps = :steps, title = :title, vegan = :vegan, vegetarian = :vegetarian, likes = :likes',
       ExpressionAttributeValues: {
        ':ingredients': recipe.ingredients,
        ':readyInMinutes': recipe.readyInMinutes,
        ':image': recipe.image,
        ':servings': recipe.servings,
        ':steps': recipe.steps,
        ':title': recipe.title,
        ':vegan': recipe.vegan,
        ':vegetarian': recipe.vegetarian,
        ':likes': recipe.likes,
       },
    }
    await docClient.update(params).promise()
  } catch (err) {
    console.log(err)
  }
}

const getFridgeById = async (userId) => {
  try {
    const params = {
      TableName: 'stocks',
      Key: {id: userId},
    }
    let data = await docClient.get(params).promise()
    console.log('data.Item.ingredients', data.Item.ingredients)
    return data.Item.ingredients
  } catch (err) {
    console.log(err)
  }
}

const getRecipeById = async (recipeId) => {
  try {
    const params = {
      TableName: 'recipes',
      Key: {id: recipeId},
    }
    let data = await docClient.get(params).promise()
    console.log(`recipe ${recipeId} is:`, data.Item)
  } catch (err) {
    console.log(err)
  }
}

const getRecipeByTitle = async (recipeTitle) => {
  try {
    const params = {
      TableName: 'recipes',
      Key: {title: recipeTitle},
    }
    let data = await docClient.get(params).promise()
    console.log(`recipe ${recipeTitle} is:`, data.Item)
  } catch (err) {
    console.log(err)
  }
}

const addIngredientToFridge = async (userId, ingredient, unit) => {
  try {
    let result = await docClient
      .get({
        TableName: 'stocks',
        Key: {id: userId},
      })
      .promise()
    let prevIngredients = result.Item.ingredients
    if (prevIngredients[ingredient.name]) {
      prevIngredients[ingredient].quantity++
    } else {
      prevIngredients[ingredient.name] = {

        image: ingredient.image,
        id: ingredient.id,
        quantity: 1,
        unit: unit,
      }
    }
    const params = {
      TableName: 'stocks',
      Key: {id: userId},
      UpdateExpression: 'set ingredients = :ingred',
      ExpressionAttributeValues: {
        ':ingred': prevIngredients,
      },
    }
    await docClient.update(params).promise()
  } catch (error) {
    console.log(error)
  }
}

const removeIngredientFromFridge = async (ingredient, userId) => {
  try {
    let result = await docClient
      .get({
        TableName: 'stocks',
        Key: {id: userId},
      })
      .promise()
    let prevIngredients = result.Item.ingredients
    if (prevIngredients[ingredient]) {
      delete prevIngredients[ingredient]
    }
    const params = {
      TableName: 'stocks',
      Key: {id: userId},
      UpdateExpression: 'set ingredients = :ingred',
      ExpressionAttributeValues: {
        ':ingred': prevIngredients,
      },
    }

    await docClient.update(params).promise()
  } catch (err) {
    console.log(err)
  }
}

const getSelectedRecipe = async (userId) => {
  try {
    let params = {
      TableName: 'users',
      Key: {
        id: userId,
      },
    }
    const data = await docClient.get(params).promise()
    console.log(data)
    return data.Item.selectedRecipe;

  } catch (err) {
    console.error(err)
  }
}


const getRecipe = async (userId) => {
  try {
    // step 1. get ingredients in stock
    let params = {
      TableName: 'stocks',
      Key: {
        id: userId,
      },
    }

    const data = await docClient.get(params).promise()
    let ingredientsArray = Object.keys(data.Item.ingredients)
    console.log('getStock succeeded! You have:', ingredientsArray)

    // step 2. ping Spoonacular API
    let spoonCall = await getFromSpoon('findByIngredients', 0, ingredientsArray, null)
    console.log("spooncall",spoonCall)
    return spoonCall
  } catch (err) {
    console.error(
      'Unable to read stock. Error JSON:',
      err)
  }
}

// Utility function for "connectAlexaToWeb" below
// step 3. delete the web user row
const deleteWebUser = async (webUserData, uuid) => {
  const params = {
    TableName: 'users',
    Key: {
      id: webUserData.id,
    },
  }

  await docClient.delete(params, function (err, data) {
    if (err) {
      console.error(
        'Unable to delete item. Error JSON:',
        JSON.stringify(err, null, 2)
      )
    } else {
      console.log('SUCCESSFULLY DELETED >>>>>>>>>>>>>>>>', data)
    }
  })
}

// Utility function for "connectAlexaToWeb" below
// step 2. copyz the info to the row where the PK is Alexa Id
const copyUserData = async (alexaId, userData, passcode) => {
  console.log(alexaId,userData, passcode )
  const params = {
    TableName: 'users',
    Key: {
      id: alexaId,
    },
    UpdateExpression:
      'set firstName = :f, lastName=:l, password=:p, salt=:s, email=:e',
    ExpressionAttributeValues: {
      ':f': userData.firstName,
      ':l': userData.lastName,
      ':p': userData.password,
      ':s': userData.salt,
      ':e': userData.email,
    },
    ReturnValues: 'ALL_NEW',
  }

  await docClient.update(params, function (err, data) {
    if (err) {
      console.error(
        'Unable to add item. Error JSON:',
        JSON.stringify(err, null, 2)
      )
    } else {
      deleteWebUser(userData, passcode)
    }
  })
}

const connectAlexaToWeb = async (alexaId, passcode) => {
  // step 1. find the web user

  passcode = +passcode

  try {
    let params = {
      TableName: 'users',
      FilterExpression: '#passcode = :passcode',
      ExpressionAttributeNames: {
        '#passcode': 'passcode',
      },
      ExpressionAttributeValues: {
        ':passcode': passcode,
      },
    }

    await docClient.scan(params, function (err, data) {
      if (err) {
        console.error(
          'Unable to read item. Error JSON:',
          JSON.stringify(err, null, 2)
        )
      } else {
        let result = data.Items[0]
        console.log('result in connect alexa to web',result)
        copyUserData(alexaId, result, passcode)

      }
    })
  } catch (err) {
    console.error(
      'Unable to read stock. Error JSON:',
      JSON.stringify(err, null, 2)
    )
  }
}

const clearFridge = async (userId) => {
  try {
    const stocksParams = {
      TableName: 'stocks',
      Key: {id: userId},
      UpdateExpression: 'set ingredients = :ingred',
      ExpressionAttributeValues: {
        ':ingred': {},
      },
    }
    await docClient.update(stocksParams).promise()
  } catch (err) {
    console.log(err)
  }
}

module.exports = {
  clearFridge,
  addIngredientToFridge,
  getSelectedRecipe,
  putRecipeInDB,
  getFridgeById,
  getRecipeById,
  getRecipeByTitle,
  getRecipe,
  findOrCreateUser,
  removeIngredientFromFridge,
  connectAlexaToWeb,
}
