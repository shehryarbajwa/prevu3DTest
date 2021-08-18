<template>
  <div>
    <div>
      <p>player1: {{ player1 }} <span v-if="connectionId === player1">(You)</span></p>
      <p>player2: {{ player2  }} <span v-if="connectionId === player2">(You)</span></p>
      <p>turn: {{ playerTurn }} <span v-if="connectionId === turn">(You)</span></p>
    </div>
    <div v-if="board.length" class="tictactoe-board">
      <div v-for="(n, i) in 3" :key="i">
        <div v-for="(n, j) in 3" :key="j">
          <cell @click="move(i, j)" :value="board[i][j]"></cell>
        </div>
      </div>
    </div>
    <div v-else>
      Loading...
    </div>
    <div v-if="isOver">
      <p v-if="winner">Winner: {{ winner }}</p>
      <p v-else>Draw</p>
      <p>Refresh the page to join a new game</p>
    </div>
  </div>
</template>

<script>
import Cell from '@/components/Cell.vue'

export default {
  name: 'TicTacToe',
  components: { Cell },
  data: () => ({
    board: [],
    player1: null,
    player2: null,
    turn: null,
    connectionId: null,
    winner: null,
    isOver: false
  }),
  computed: {
    playerTurn () {
      if (this.player1 === this.turn) {
        return 'player1'
      } else if (this.player2 === this.turn) {
        return 'player2'
      }
      return ''
    }
  },
  created () {
    const ws = new WebSocket('wss://70fb45uuob.execute-api.us-east-1.amazonaws.com/dev')
    // const ws = new WebSocket('ws://localhost:3001')
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'join' }))
    }
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      console.log(data)
      if (data.connectionId) {
        this.connectionId = data.connectionId
      } else {
        this.board = data.board
        this.player1 = data.player1
        this.player2 = data.player2
        this.turn = data.turn
        if (data.isOver) {
          this.isOver = true
          this.winner = data.winner
          if (this.winner) {
            alert(`${this.winner} has won`)
          } else {
            alert('Draw')
          }
          this.ws.close()
        }
      }
    }
    this.ws = ws
  },
  destroyed () {
    this.ws.close()
  },
  methods: {
    move (x, y) {
      if (this.board[x][y] !== '') {
        alert('Illegal move')
      } else if (this.connectionId !== this.turn) {
        alert('It\'s not your turn')
      } else if (!this.player1 || !this.player2) {
        alert('Wait for players to join')
      } else {
        if (this.player1 === this.turn) {
          this.board[x][y] = 'x'
        } else if (this.player2 === this.turn) {
          this.board[x][y] = 'o'
        }
        this.$forceUpdate()
        this.ws.send(JSON.stringify({ action: 'move', x, y }))
      }
    }
  }
}
</script>

<style>
.tictactoe-board {
  display: flex;
  flex-wrap: wrap;
  width: 204px;
  height: 204px;
}
</style>
