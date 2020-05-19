const AWS = require('aws-sdk')
const getFromSpoon = require('./spoonacular')
// const { v4: uuidv4 } = require("uuid");

AWS.config.update({region: 'us-east-2'})
const docClient = new AWS.DynamoDB.DocumentClient()

const findOrCreateUser = async (userId) => {
  try {
    const userParams = {
      TableName: 'users',
      Key: {id: userId},
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
    if (prevIngredients[ingredient]) {
      prevIngredients[ingredient].quantity++
    } else {
      prevIngredients[ingredient] = {
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
    return getFromSpoon('findByIngredients', 0, ingredientsArray, null)
  } catch (err) {
    console.error(
      'Unable to read stock. Error JSON:',
      JSON.stringify(err, null, 2)
    )
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
  const params = {
    TableName: 'users',
    Key: {
      id: alexaId,
    },
    UpdateExpression:
      'set first_name = :f, last_name=:l, password=:p, salt=:s, email=:e',
    ExpressionAttributeValues: {
      ':f': userData.first_name,
      ':l': userData.last_name,
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
  getFridgeById,
  getRecipeById,
  getRecipeByTitle,
  getRecipe,
  findOrCreateUser,
  removeIngredientFromFridge,
  connectAlexaToWeb,
}
