<template>
    <div class="avatar" :class="{ 'has-avatar': avatar }">
        <img v-if="avatar" :src="avatar" alt="avatar">
        <span v-else class="avatar-letter">{{ userKey.charAt(0).toUpperCase() }}</span>
    </div>
</template>

<script setup lang="ts">


const props = defineProps<{
    avatar?: string;
    userKey: string;
}>();

console.log(props.userKey);
</script>

<style scoped>
.avatar {
    width: 72px;
    aspect-ratio: 1/1;
    height: auto;
    border-radius: 150px;
    background-color: var(--purple-color);
    border: 1px solid var(--purple-color);
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-letter {
    font-size: 48px;
    color: white;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
</style>