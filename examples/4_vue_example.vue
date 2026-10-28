<template>
  <div ref="container" class="activity-player-view"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { ActivityPlayer } from '@mhmttosun/dnd/player';
import '@mhmttosun/dnd/player.css';

const props = defineProps({
  data: {
    type: Object,
    default: null
  },
  src: {
    type: String,
    default: null
  },
  sound: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['complete', 'step', 'drop', 'reset']);

const container = ref(null);
let player = null;

onMounted(() => {
  if (!container.value) return;

  player = new ActivityPlayer({
    target: container.value,
    data: props.data,
    src: props.src,
    sound: props.sound,
    onComplete: (stats) => emit('complete', stats),
    onStep: (state) => emit('step', state),
    onDrop: (dropInfo) => emit('drop', dropInfo),
    onReset: (state) => emit('reset', state)
  });
});

watch(() => props.sound, (newVal) => {
  if (player) player.setSound(newVal);
});

onUnmounted(() => {
  if (player) {
    player.destroy();
    player = null;
  }
});
</script>

<style scoped>
.activity-player-view {
  width: 100%;
  height: 600px;
  position: relative;
}
</style>
