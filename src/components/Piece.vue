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
  <g class="piece" :class="{ selectable }" @click.stop="$emit('select', piece.id)">
    <circle v-if="selectable" :cx="x" :cy="y" r="23" class="piece-ring" />
    <circle :cx="x" :cy="y" r="15" class="piece-body" :fill="color" />
    <text :x="x" :y="y + 5" text-anchor="middle" class="piece-label">
      {{ stackCount > 1 ? `x${stackCount}` : piece.number }}
    </text>
  </g>
</template>

<style scoped>
.piece {
  cursor: default;
}

.piece.selectable {
  cursor: pointer;
}

.piece-ring {
  fill: rgba(17, 17, 17, 0.08);
  stroke: #111111;
  stroke-width: 2;
}

.piece-body {
  stroke: #111111;
  stroke-width: 3;
}

.piece-label {
  fill: #ffffff;
  font-size: 12px;
  font-weight: 900;
  pointer-events: none;
}
</style>
