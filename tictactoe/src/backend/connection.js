const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient()

const connectionTable = process.env.CONNECTIONS_TABLE

async function connect (connectionId) {
  await dynamodb.put({
    TableName: connectionTable,
    Item: {
      connectionId,
      ttl: parseInt((Date.now() / 1000) + 3600)
    }
  }).promise()
}

async function disconnect (connectionId) {
  await dynamodb.delete({
    TableName: connectionTable,
    Key: { connectionId }
  }).promise()
}

module.exports.handler = async (event, context) => {
  const { requestContext: { connectionId, eventType } } = event
  if (eventType === 'CONNECT') {
    await connect(connectionId)
  } else if (eventType === 'DISCONNECT') {
    await disconnect(connectionId)
  } else {
    console.log(`Unhandled event type ${eventType}`)
  }

  return { statusCode: 200 }
}
