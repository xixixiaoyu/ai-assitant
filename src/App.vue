<template>
  <div class="app">
    <ChatInterface />
  </div>
</template>

<script setup lang="ts">
import ChatInterface from './components/ChatInterface.vue'
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Open Sans', 'Helvetica Neue', sans-serif;
}

.app {
  min-height: 100vh;
  background: #fff;
}
</style>
