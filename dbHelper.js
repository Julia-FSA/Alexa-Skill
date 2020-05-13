const AWS = require("aws-sdk");
// const { v4: uuidv4 } = require("uuid");
const getFromSpoon = require('./spoonacular')

AWS.config.update({region: "us-east-2"});
// const tableName = "ingredients";

// var dbHelper = function () { };
const docClient = new AWS.DynamoDB.DocumentClient();


const getRecipeById = async (recipeId) => {
    try {
        const params = {
            TableName: 'recipes',
            Key: {id: recipeId}
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
            Key: {title: recipeTitle}
        }
        let data = await docClient.get(params).promise()
        console.log(`recipe ${recipeTitle} is:`, data.Item)
    } catch (err) {
        console.log(err)
    }
}


const addIngredientToFridge = async (ingredient, unit) => {
        try {
            let result = await docClient.get({
            TableName: 'stocks',
            Key: {id: 0}
          }).promise()
        let prevIngredients = result.Item.ingredients;
        if(prevIngredients[ingredient]){
            prevIngredients[ingredient].quantity++;
        }
        else {
            prevIngredients[ingredient] = 
            {
                "quantity": 1,
                "unit": unit
            }
        }
        const params = {
            TableName: 'stocks',
            Key:{id:0},
            UpdateExpression: 'set ingredients = :ingred',
            ExpressionAttributeValues: {
              ':ingred': prevIngredients
            }
        };
//         const res = await docClient.update(params).promise();
//         resolve(res.data);
//         } catch (error) {
//             return reject("Unable to update")
//         }
    });
};

const removeIngredientFromFridge = (ingredient) => {
    try {
      let result = await docClient.get({
            TableName: 'stocks',
            Key: {id: 0}
          }).promise();
        let prevIngredients = result.Item.ingredients;
        if(prevIngredients[ingredient]){
            delete prevIngredients[ingredient];
        }
        const params = {
            TableName: 'stocks',
            Key:{id:0},
            UpdateExpression: 'set ingredients = :ingred',
            ExpressionAttributeValues: {
              ':ingred': prevIngredients
            }
        };
      
       await docClient.update(params).promise();
      
    } catch (err) {
      console.log(err)
    }
}


const getRecipe = async (alexaId) => {
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
      let params = {
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
}

// dbHelper.prototype.removeRecipe = (movie, userID) => {
//     return new Promise((resolve, reject) => {
//         const params = {
//             TableName: tableName,
//             Key: {
//                 "userId": userID,
//                 "movieTitle": movie
//             },
//             ConditionExpression: "attribute_exists(movieTitle)"
//         }
//         docClient.delete(params, function (err, data) {
//             if (err) {
//                 console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
//                 return reject(JSON.stringify(err, null, 2))
//             }
//             console.log(JSON.stringify(err));
//             console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
//             resolve()
//         })
//     });
// }

module.exports = {
    addIngredientToFridge,
    getRecipeById,
    getRecipeByTitle,
    getRecipe,
    removeIngredientFromFridge
}