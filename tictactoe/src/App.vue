<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css?family=Roboto+Mono&display=swap');
* {
  font-family: 'Roboto Mono', monospace;
}
body, html {
  height: 100%;
  background-color: rgb(52, 150, 182);
}
#app {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
