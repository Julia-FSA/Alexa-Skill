var AWS = require("aws-sdk");
// const { v4: uuidv4 } = require("uuid");

AWS.config.update({region: "us-east-2"});
const tableName = "ingredients";

var dbHelper = function () { };
var docClient = new AWS.DynamoDB.DocumentClient();

dbHelper.prototype.addIngredientToFridge = async (ingredient, unit) => {
        try {
            console.log('addIngredientToFridge()')
            let result = await docClient.get({
            TableName: 'stocks',
            Key: {id: 0}
          }).promise()
          console.log('result', result)
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
        const res = await docClient.update(params).promise();
        resolve(res.data);
        } catch (error) {
            return reject("Unable to update")
        }
    });
};

dbHelper.prototype.removeIngredientFromFridge = (ingredient) => {
    return new Promise(async (resolve, reject) => {
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
        try {
            const res = await docClient.update(params).promise();
            resolve(res.data);
        } catch (error) {
            return reject("Unable to update")
        }
    });
};

dbHelper.prototype.getRecipe = (userID) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            KeyConditionExpression: "#userID = :user_id",
            ExpressionAttributeNames: {
                "#userID": "userId"
            },
            ExpressionAttributeValues: {
                ":user_id": userID
            }
        }
        docClient.query(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

dbHelper.prototype.removeRecipe = (movie, userID) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Key: {
                "userId": userID,
                "movieTitle": movie
            },
            ConditionExpression: "attribute_exists(movieTitle)"
        }
        docClient.delete(params, function (err, data) {
            if (err) {
                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            }
            console.log(JSON.stringify(err));
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            resolve()
        })
    });
}

module.exports = new dbHelper();