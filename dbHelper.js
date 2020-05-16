const AWS = require('aws-sdk')
// const getFromSpoon = require('./spoonacular')
// const { v4: uuidv4 } = require("uuid");

AWS.config.update({region: 'us-east-2'})
const docClient = new AWS.DynamoDB.DocumentClient()

// const findOrCreateUser = async (userId) => {
//   try {
//     const userParams = {
//       TableName: 'users',
//       Key: {id: userId},
//     }

//     const stocksParams = {
//       TableName: 'stocks',
//       Key: {id: userId},
//       UpdateExpression: 'set ingredients = if_not_exists(ingredients, :ingred)',
//       ExpressionAttributeValues: {
//         ':ingred': {},
//       },
//     }

//     await docClient.update(userParams).promise()
//     await docClient.update(stocksParams).promise()
//   } catch (err) {
//     console.log(err)
//   }
// }

// const getFridgeById = async (userId) => {
//   try {
//     const params = {
//       TableName: 'stocks',
//       Key: {id: userId},
//     }
//     let data = await docClient.get(params).promise()
//     console.log('data.Item.ingredients', data.Item.ingredients)
//     return data.Item.ingredients
//   } catch (err) {
//     console.log(err)
//   }
// }

// const getRecipeById = async (recipeId) => {
//   try {
//     const params = {
//       TableName: 'recipes',
//       Key: {id: recipeId},
//     }
//     let data = await docClient.get(params).promise()
//     console.log(`recipe ${recipeId} is:`, data.Item)
//   } catch (err) {
//     console.log(err)
//   }
// }

// const getRecipeByTitle = async (recipeTitle) => {
//   try {
//     const params = {
//       TableName: 'recipes',
//       Key: {title: recipeTitle},
//     }
//     let data = await docClient.get(params).promise()
//     console.log(`recipe ${recipeTitle} is:`, data.Item)
//   } catch (err) {
//     console.log(err)
//   }
// }

// const addIngredientToFridge = async (userId, ingredient, unit) => {
//   try {
//     let result = await docClient
//       .get({
//         TableName: 'stocks',
//         Key: {id: userId},
//       })
//       .promise()
//     let prevIngredients = result.Item.ingredients
//     if (prevIngredients[ingredient]) {
//       prevIngredients[ingredient].quantity++
//     } else {
//       prevIngredients[ingredient] = {
//         quantity: 1,
//         unit: unit,
//       }
//     }
//     const params = {
//       TableName: 'stocks',
//       Key: {id: userId},
//       UpdateExpression: 'set ingredients = :ingred',
//       ExpressionAttributeValues: {
//         ':ingred': prevIngredients,
//       },
//     }
//     await docClient.update(params).promise()
//   } catch (error) {
//     console.log(error)
//   }
// }

// const removeIngredientFromFridge = async (ingredient, userId) => {
//   try {
//     let result = await docClient
//       .get({
//         TableName: 'stocks',
//         Key: {id: userId},
//       })
//       .promise()
//     let prevIngredients = result.Item.ingredients
//     if (prevIngredients[ingredient]) {
//       delete prevIngredients[ingredient]
//     }
//     const params = {
//       TableName: 'stocks',
//       Key: {id: userId},
//       UpdateExpression: 'set ingredients = :ingred',
//       ExpressionAttributeValues: {
//         ':ingred': prevIngredients,
//       },
//     }

//     await docClient.update(params).promise()
//   } catch (err) {
//     console.log(err)
//   }
// }

// const getRecipe = async (userId) => {
//   try {
//     // step 1. get ingredients in stock
//     let params = {
//       TableName: 'stocks',
//       Key: {
//         id: userId,
//       },
//     }

//     const data = await docClient.get(params).promise()
//     let ingredientsArray = Object.keys(data.Item.ingredients)
//     console.log('getStock succeeded! You have:', ingredientsArray)

//     // step 2. ping Spoonacular API
//     return getFromSpoon('findByIngredients', 0, ingredientsArray, null)
//   } catch (err) {
//     console.error(
//       'Unable to read stock. Error JSON:',
//       JSON.stringify(err, null, 2)
//     )
//   }
// }

// Utility function for "connectAlexaToWeb"
// step 3. delete the web user row
const deleteWebUser = async (webUserData, uuid) => {
  // console.log('webUserData >>>>>>>>>>>>>>', webUserData)
  if (webUserData.id.slice(0, 8) === uuid) {
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
        // console.log('STEP3 >>>>>>>>>>>>>>>>', data)
        // console.log('DeleteItem succeeded:', JSON.stringify(data, null, 2))
      }
    })
  } else {
    console.error("uuid didn't match")
  }
}

// Utility function for "connectAlexaToWeb"
// step 2. copyz the info to the row where the PK is Alexa Id
const copyUserData = async (alexaId, userData, uuid) => {
  if (userData.id.slice(0, 8) === uuid) {
    const params = {
      TableName: 'users',
      Key: {
        id: alexaId,
      },
      UpdateExpression:
        'set first_name = :f, last_name=:l, password=:p, salt=:s, email=:e, made_recipe_ids=:m, saved_recipe_ids=:r',
      ExpressionAttributeValues: {
        ':f': userData.first_name,
        ':l': userData.last_name,
        ':p': userData.password,
        ':s': userData.salt,
        ':e': userData.email,
        ':m': userData.made_recipe_ids,
        ':r': userData.saved_recipe_ids,
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
        // console.log('STEP2 >>>>>>>>>>>>>>>>', userData)
        deleteWebUser(userData, uuid)
      }
    })
  } else {
    console.error("uuid didn't match")
  }
}

const connectAlexaToWeb = async (alexaId, email, uuid) => {
  try {
    // step 1. find the web user
    let params = {
      TableName: 'users',
      FilterExpression: '#email = :email',
      ExpressionAttributeNames: {
        '#email': 'email',
      },
      ExpressionAttributeValues: {
        ':email': email,
      },
    }
    // const data = await docClient.get(params).promise()

    await docClient.scan(params, function (err, data) {
      if (err) {
        console.error(
          'Unable to read item. Error JSON:',
          JSON.stringify(err, null, 2)
        )
      } else {
        let result = data.Items[0]
        if (!result.made_recipe_ids) {
          result.made_recipe_ids = []
        }
        if (!result.saved_recipe_ids) {
          result.saved_recipe_ids = []
        }
        // console.log('STEP1 >>>>>>>>>>>>>>>>', result)
        // let oldResult = result
        copyUserData(alexaId, result, uuid)
        // console.log('oldResult >>>>>>>>>>>>', oldResult)
        // deleteWebUser(oldResult, uuid)
      }
    })
  } catch (err) {
    console.error(
      'Unable to read stock. Error JSON:',
      JSON.stringify(err, null, 2)
    )
  }
}

// step 4. show UUID on Julia Cooks website
// Q: How is alexa ID getting added to stocks and users tables???

connectAlexaToWeb(
  'AFXZQ4AVIUNHOSKAXLXHO65MTRLPZAV7KJ7F2UHXFZ7LNHTG4GHT4QQGDJLNGXD7L43QUOAHKQIKGR5M22ZODS4MI3DL53IKI2CJ33M6SXLK6W664MOLBIUVOY45XXX5CFU2ZS672LN4OX7TVEJ2KPM4PM5UXAXJZWDYZ7OOMUAZAJ4HCLAVO2ZMCEJHKCFHOSIEH6OOTRGYL2Y',
  'john@email.com',
  '42d75ab8'
)

// module.exports = {
//   addIngredientToFridge,
//   getFridgeById,
//   getRecipeById,
//   getRecipeByTitle,
//   getRecipe,
//   findOrCreateUser,
//   removeIngredientFromFridge,
//   connectAlexaToWeb,
// }
