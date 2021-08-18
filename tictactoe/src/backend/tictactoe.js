const AWS = require('aws-sdk')
const apig = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.APIG_ENDPOINT
  // endpoint: 'http://localhost:3001'
})
const dynamodb = new AWS.DynamoDB.DocumentClient()

const connectionTable = process.env.CONNECTIONS_TABLE
const gameTable = process.env.GAME_TABLE

async function getGameState () {
  const now = new Date().getTime() / 1000
  const dbResult = await dynamodb.scan({
    TableName: gameTable,
    ProjectionExpression: '#state, #ttl',
    FilterExpression: '#ttl >= :now',
    ExpressionAttributeNames: {
      '#ttl': 'ttl',
      '#state': 'state'
    },
    ExpressionAttributeValues: {
      ':now': now
    }
  }).promise()
  if (dbResult.Items.length === 0) {
    return null
  }
  return dbResult.Items[0].state
}

async function createGameState () {
  const gameState = {
    board: [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ],
    player1: null,
    player2: null,
    turn: null,
    symbol: null
  }
  await saveGameState(gameState)
  return gameState
}

async function getOrCreateGameState () {
  let gameState = await getGameState()
  if (gameState === null) {
    gameState = await createGameState()
  }
  return gameState
}

async function saveGameState (gameState) {
  await dynamodb.put({
    TableName: gameTable,
    Item: {
      id: 1,
      ttl: parseInt((Date.now() / 1000) + 60),
      state: gameState
    }
  }).promise()
}

function threeInARow (gameState, symbol) {
  // Horizontal rows
  for (let i = 0; i < 3; i++) {
    if (gameState.board[0][i] === symbol && gameState.board[1][i] === symbol && gameState.board[2][i] === symbol) {
      return true
    }
  }

  // Vertical rows
  for (let i = 0; i < 3; i++) {
    if (gameState.board[i][0] === symbol && gameState.board[i][1] === symbol && gameState.board[i][2] === symbol) {
      return true
    }
  }

  // Diagonals
  if (gameState.board[0][0] === symbol && gameState.board[1][1] === symbol && gameState.board[2][2] === symbol) {
    return true
  }
  if (gameState.board[2][0] === symbol && gameState.board[1][1] === symbol && gameState.board[0][2] === symbol) {
    return true
  }

  return false
}

async function nextTurn (gameState) {
  if (gameState.turn === gameState.player1) {
    gameState.turn = gameState.player2
    gameState.symbol = 'o'
  } else if (gameState.turn === gameState.player2) {
    gameState.turn = gameState.player1
    gameState.symbol = 'x'
  }
  if (threeInARow(gameState, 'x')) {
    gameState.winner = 'player1'
    gameState.turn = null
    gameState.symbol = null
  } else if (threeInARow(gameState, 'o')) {
    gameState.winner = 'player2'
    gameState.turn = null
    gameState.symbol = null
  }
}

async function join (connectionId) {
  const gameState = await getOrCreateGameState()
  let saved = false
  if (!gameState.player1) {
    gameState.player1 = connectionId
    saved = true
  } else if (!gameState.player2) {
    gameState.player2 = connectionId
    saved = true
  }
  if (!gameState.turn) {
    gameState.turn = gameState.player1
    gameState.symbol = 'x'
    saved = true
  }
  if (saved) {
    await saveGameState(gameState)
  }
  console.log(gameState)
  const data = JSON.stringify(gameState)
  await sendMessage(connectionId, JSON.stringify({ connectionId }))
  await sendMessageAll(data)
}

async function getAllConnections (ExclusiveStartKey) {
  const { Items, LastEvaluatedKey } = await dynamodb.scan({
    TableName: connectionTable,
    AttributesToGet: ['connectionId'],
    ExclusiveStartKey
  }).promise()
  const connections = Items.map(({ connectionId }) => connectionId)
  if (LastEvaluatedKey) {
    connections.push(...await getAllConnections(LastEvaluatedKey))
  }
  return connections
}

async function sendMessage (connectionId, data) {
  try {
    await apig.postToConnection({
      ConnectionId: connectionId,
      Data: data
    }).promise()
  } catch (err) {
    // Ignore if connection no longer exists
    if (err.statusCode !== 400 && err.statusCode !== 410) {
      throw err
    }
  }
}

async function sendMessageAll (data) {
  const connections = await getAllConnections()
  await Promise.all(
    connections.map(connectionId => sendMessage(connectionId, data))
  )
}

function getPossibleMoves (gameState) {
  const moves = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (gameState.board[i][j] === '') {
        moves.push({ x: i, y: j })
      }
    }
  }
  return moves
}

function isGameOver (gameState) {
  return !!gameState.winner || getPossibleMoves(gameState).length === 0
}

async function move (connectionId, body) {
  const gameState = await getGameState()
  if (gameState.turn === connectionId) {
    body = JSON.parse(body)
    const { x, y } = body
    if (gameState.board[x][y] === '' && connectionId === gameState.turn) {
      gameState.board[x][y] = gameState.symbol
      await nextTurn(gameState)
      await saveGameState(gameState)
      if (isGameOver(gameState)) {
        createGameState()
        gameState.isOver = true
      }

      const data = JSON.stringify(gameState)
      await sendMessageAll(data)
    }
  }
}

exports.handler = async function (event) {
  const { body, requestContext: { connectionId, routeKey } } = event
  console.log(connectionId)
  console.log(body)
  switch (routeKey) {
    case 'join':
      await join(connectionId)
      break
    case 'move':
      await move(connectionId, body)
      break
  }
  return { statusCode: 200 }
}
