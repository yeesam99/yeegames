<script setup>
defineProps({
  piece: {
    type: Object,
    required: true,
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  stackCount: {
    type: Number,
    default: 1,
  },
  selectable: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['select'])
</script>

<template>
  <button
    class="piece"
    :class="{ selectable }"
    type="button"
    :style="{ left: `${x}%`, top: `${y}%`, '--piece-color': color }"
    :aria-label="`${piece.id} 말`"
    @click.stop="$emit('select', piece.id)"
  >
    <span class="piece-ring" aria-hidden="true"></span>
    <span class="piece-body">
      {{ stackCount > 1 ? `x${stackCount}` : piece.number }}
    </span>
  </button>
</template>

<style scoped>
.piece {
  position: absolute;
  z-index: 4;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: default;
  padding: 0;
  transform: translate(-50%, -50%);
}

.piece.selectable {
  cursor: pointer;
}

.piece-ring {
  position: absolute;
  inset: -8px;
  border: 2px solid #111111;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.08);
  opacity: 0;
}

.piece.selectable .piece-ring {
  opacity: 1;
}

.piece-body {
  position: relative;
  z-index: 1;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 3px solid #111111;
  border-radius: 999px;
  background: var(--piece-color);
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  line-height: 1;
}
</style>
