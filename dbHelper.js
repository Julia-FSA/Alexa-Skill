var AWS = require('aws-sdk')
// const { v4: uuidv4 } = require("uuid");
const getFromSpoon = require('./spoonacular')

AWS.config.update({region: 'us-east-2'})
const tableName = 'ingredients'

var dbHelper = function () {}
var docClient = new AWS.DynamoDB.DocumentClient()

dbHelper.prototype.addIngredientToFridge = (ingredient, unit) => {
  return new Promise(async (resolve, reject) => {
    let result = await docClient
      .get({
        TableName: 'stocks',
        Key: {id: 0},
      })
      .promise()
    let prevIngredients = result.Item.ingredients
    const params = {
      TableName: 'stocks',
      Key: {id: 0},
      UpdateExpression: 'set ingredients = :ingred',
      ExpressionAttributeValues: {
        ':ingred': [
          ...prevIngredients,
          {
            ingredientName: `${ingredient}`,
            ingredientQuantity: 1,
            unit: `${unit}`,
          },
        ],
      },
    }
    docClient.update(params, (err, data) => {
      if (err) {
        console.log('Unable to update =>', JSON.stringify(err))
        return reject('Unable to update')
      }
      console.log('Saved Data, ', JSON.stringify(data))
      resolve(data)
    })
  })
}

dbHelper.prototype.getRecipe = async (alexaId) => {
  return new Promise(async (resolve, reject) => {
    // step 1. get userId tied to alexaId
    try {
      let data = await docClient
        .scan({
          TableName: 'users',
          FilterExpression: '#alexa_id = :alexa_id',
          ExpressionAttributeNames: {
            '#alexa_id': 'alexa_id',
          },
          ExpressionAttributeValues: {
            ':alexa_id': alexaId,
          },
        })
        .promise()
      let {stock_id} = data.Items[0]
      console.log('getUser succeeded! StockId is:', stock_id)

      // step 2. get ingredients in stock
      var params = {
        TableName: 'stocks',
        Key: {
          id: stock_id,
        },
      }
      data = await docClient.get(params).promise()
      let ingredientsArray = Object.keys(data.Item.ingredients)
      console.log('getStock succeeded! You have:', ingredientsArray)

      // step 3. ping Spoonacular API
      getFromSpoon('findByIngredients', 0, ingredientsArray, null)
    } catch (err) {
      console.error(
        'Unable to read stock. Error JSON:',
        JSON.stringify(err, null, 2)
      )
    }
  })
}

dbHelper.prototype.removeRecipe = (movie, userID) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: tableName,
      Key: {
        userId: userID,
        movieTitle: movie,
      },
      ConditionExpression: 'attribute_exists(movieTitle)',
    }
    docClient.delete(params, function (err, data) {
      if (err) {
        console.error(
          'Unable to delete item. Error JSON:',
          JSON.stringify(err, null, 2)
        )
        return reject(JSON.stringify(err, null, 2))
      }
      console.log(JSON.stringify(err))
      console.log('DeleteItem succeeded:', JSON.stringify(data, null, 2))
      resolve()
    })
  })
}

module.exports = new dbHelper()
