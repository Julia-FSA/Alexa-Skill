const AWS = require('aws-sdk')
const db = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-2'
})

exports.handler = async (event) => {
    const params = {
        TableName: 'test',
        Item: event,
    }
    
    const test_id = 'pear'
    params.Item.test_id = test_id;
    params.Item.AlbumTitle = 'testing1234'
    
    return await db.put(params).promise()
};