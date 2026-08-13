<script setup>
defineProps({
  message: { type: Object, required: true },
  nested: { type: Boolean, default: false },
})
</script>

<template>
  <div class="message" :class="{ 'is-nested': nested }">
    <div class="message__head">
      <span class="message__author" :class="{ 'is-admin': message.isAdmin }">
        {{ message.author }}
      </span>
      <span v-if="message.isAdmin" class="message__badge">Admin</span>
      <span v-else-if="message.location" class="message__location">{{ message.location }}</span>
      <span class="message__date muted">{{ message.createdAt }}</span>
    </div>

    <p class="message__content">{{ message.content }}</p>

    <div v-if="message.images?.length" class="message__images">
      <img v-for="(src, i) in message.images" :key="i" :src="src" alt="" loading="lazy" />
    </div>

    <div class="message__foot muted">
      <span>👍 {{ message.likeCount }}</span>
      <span v-if="message.replyCount">💬 {{ message.replyCount }}</span>
    </div>

    <div v-if="message.replies?.length" class="message__replies">
      <MessageItem
        v-for="reply in message.replies"
        :key="reply.id"
        :message="reply"
        nested
      />
    </div>
  </div>
</template>

<style scoped>
.message {
  padding: 14px 15px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--panel);
}

.message.is-nested {
  margin-top: 8px;
  border-radius: var(--radius-sm);
  background: var(--panel-raised);
}

.message__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.message__author {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

.message__author.is-admin {
  color: var(--accent-strong);
}

.message__badge {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 700;
}

.message__location {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--panel-raised);
  color: var(--text-muted);
  font-size: 11px;
}

.message__date {
  margin-left: auto;
  font-size: 12px;
}

.message__content {
  margin: 0;
  color: var(--text-dim);
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.message__images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.message__images img {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  object-fit: cover;
}

.message__foot {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  font-size: 12.5px;
}

.message__replies {
  margin-top: 6px;
  padding-left: 14px;
  border-left: 2px solid var(--border);
}
</style>
