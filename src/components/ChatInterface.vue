<template>
  <div class="chat-container">
    <div class="chat-header">
      <h1>AI 助手</h1>
    </div>

    <div class="chat-main">
      <div class="chat-history" ref="chatHistoryRef">
        <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
          <div class="avatar">
            {{ message.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="content" v-html="renderMessage(message.content)"></div>
        </div>
        <div v-if="isLoading" class="message assistant">
          <div class="avatar">🤖</div>
          <div class="content loading">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>

      <div class="input-area">
        <textarea
          v-model="userInput"
          placeholder="请输入您的问题..."
          @keydown.enter.prevent="sendMessage"
          :disabled="isLoading"
          rows="3"
        ></textarea>
        <div class="button-group">
          <button v-if="isLoading" @click="stopGenerating" class="stop-btn">停止生成</button>
          <button @click="sendMessage" :disabled="!userInput.trim() || isLoading">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { useElementSize } from '@vueuse/core'
import MarkdownIt from 'markdown-it'
import 'highlight.js/styles/github.css'
import { getAIStreamResponse, abortCurrentRequest, type Message } from '../services/ai'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const messages = ref<Message[]>([])
const userInput = ref('')
const chatHistoryRef = ref<HTMLElement>()
const isLoading = ref(false)

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return

  const userMessage = userInput.value
  userInput.value = ''

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: userMessage,
  })

  // 添加空的助手消息用于流式显示
  messages.value.push({
    role: 'assistant',
    content: '',
  })

  await scrollToBottom()
  isLoading.value = true

  try {
    let currentResponse = ''
    await getAIStreamResponse(
      messages.value.slice(0, -1), // 不包含空的助手消息
      chunk => {
        if (chunk === '[DONE]') {
          isLoading.value = false
        } else if (chunk === '[ABORTED]') {
          isLoading.value = false
          messages.value[messages.value.length - 1].content = currentResponse + '\n\n[已停止生成]'
        } else {
          currentResponse += chunk
          messages.value[messages.value.length - 1].content = currentResponse
          scrollToBottom()
        }
      }
    )
  } catch (error) {
    isLoading.value = false
    messages.value[messages.value.length - 1].content =
      '抱歉，发生了错误：' + (error instanceof Error ? error.message : '未知错误')
  }

  await scrollToBottom()
}

const stopGenerating = () => {
  abortCurrentRequest()
}

onUnmounted(() => {
  abortCurrentRequest()
})

// 渲染消息内容（支持 Markdown）
const renderMessage = (content: string) => {
  return md.render(content)
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (chatHistoryRef.value) {
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
  }
}
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.chat-header {
  background: #fff;
  padding: 16px 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.chat-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1976d2;
  font-weight: 600;
}

.chat-main {
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 24px;
  box-sizing: border-box;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.message {
  display: flex;
  margin-bottom: 24px;
  gap: 16px;
  max-width: 88%;
}

.message.assistant {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message.user {
  margin-right: auto;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.content {
  padding: 16px 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-size: 15px;
  line-height: 1.6;
  max-width: 100%;
}

.message.user .content {
  background: #1976d2;
  color: #fff;
}

.message.assistant .content {
  background: #fff;
  white-space: pre-wrap;
  word-break: break-word;
  animation: typing 0.05s steps(1);
}

.input-area {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  resize: none;
  font-size: 15px;
  margin-bottom: 12px;
  background: #f8f9fa;
  transition: border-color 0.3s, background 0.3s;
}

textarea:focus {
  outline: none;
  border-color: #1976d2;
  background: #fff;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

button {
  padding: 0 24px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.3s;
}

button:not(.stop-btn) {
  background: #1976d2;
  color: white;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.stop-btn {
  background: #dc3545;
  color: white;
}

.stop-btn:hover {
  background: #c82333;
}

.loading {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 60px;
  justify-content: center;
}

.dot {
  width: 8px;
  height: 8px;
  background: #1976d2;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

/* 保持现有的动画关键帧定义 */
@keyframes typing {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .chat-main {
    padding: 16px;
  }

  .chat-history {
    padding: 16px;
  }

  .message {
    max-width: 100%;
  }

  .input-area {
    padding: 16px;
  }

  .button-group {
    flex-direction: column;
  }

  button {
    width: 100%;
    height: 44px;
  }
}

/* 滚动条美化 */
.chat-history::-webkit-scrollbar {
  width: 8px;
}

.chat-history::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.chat-history::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.chat-history::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
