const Scene = require('Scene'),
      Reactive = require('Reactive'),
      Materials = require('Materials'),
      Textures = require('Textures'),
      NativeUI = require('NativeUI'),
      Shaders = require('Shaders'),
      DeviceMotion = require('DeviceMotion'),
      TouchGestures = require('TouchGestures'),
      Diagnostics = require('Diagnostics');

const DEFAULT_LEVEL = 0;
const MAX_BLOCK = 25;
const LEVEL_2_STEPS = 10;
const LEVEL_3_STEPS = 15;
const BLOCK_SHIFT = 0.1;
const LINE_COMPENSATION = 0.002469135802;

const initPicker = async () => {
  const [
    level1,
    level2,
    level3
  ] = await Promise.all([
    Textures.findFirst('level-1'),
    Textures.findFirst('level-2'),
    Textures.findFirst('level-3')
  ]);
  const picker = NativeUI.picker;
  picker.configure({
    selectedIndex: DEFAULT_LEVEL,
    items: [
      { image_texture: level1 },
      { image_texture: level2 },
      { image_texture: level3 }
    ]
  });
  picker.visible = true;

  return picker;
};

const initShadow = async () => {
  const shadowRotation = await Scene.root.findFirst('shadowRotation');
  const rotation = Reactive.quaternionFromEuler(
    DeviceMotion.worldTransform.rotationX,
    DeviceMotion.worldTransform.rotationY,
    DeviceMotion.worldTransform.rotationZ
  ).conjugate().eulerAngles;
  shadowRotation.transform.rotationX = rotation.x.sub(Math.PI / 2);
  shadowRotation.transform.rotationY = rotation.y;
  shadowRotation.transform.rotationZ = rotation.z;

  const [
    shadowAnchor,
    segmentation,
    button,
    buttonMaterial,
    textureOn,
    textureOff
  ] = await Promise.all([
    Scene.root.findFirst('shadowAnchor'),
    Scene.root.findFirst('segmentation'),
    Scene.root.findFirst('button-shadow'),
    Materials.findFirst('button-shadow'),
    Textures.findFirst('button-shadow-on'),
    Textures.findFirst('button-shadow-off')
  ]);
  let shadowEnabled = false;
  shadowAnchor.hidden = true;
  segmentation.hidden = false;

  TouchGestures.onTap(button).subscribe((gesture) => {
    shadowEnabled = !shadowEnabled;
    buttonMaterial.setTextureSlot(
      Shaders.DefaultMaterialTextures.DIFFUSE,
      shadowEnabled ? textureOn.signal : textureOff.signal
    );
    shadowAnchor.hidden = !shadowEnabled;
    segmentation.hidden = shadowEnabled;
  });
};

const selectLevel = (blocks, index) => {
  if (index == 0) {
    showDefaultLevel(blocks);
  } else if (index == 1) {
    generateLevel(blocks, LEVEL_2_STEPS);
  } else {
    generateLevel(blocks, LEVEL_3_STEPS);
  }
};

const showDefaultLevel = (blocks) => {
  blocks.map(block => block.hidden = true);

  positionBlock(blocks, 0, 0);
  positionBlock(blocks, 1, 1);
  positionBlock(blocks, 2, 2);
  positionBlock(blocks, 3, 3, 1);
  positionBlock(blocks, 4, 3, -1);
  positionBlock(blocks, 5, 4);
  positionBlock(blocks, 6, 5, 1);
  positionBlock(blocks, 7, 5, -1);
  positionBlock(blocks, 8, 6);
  positionHome(blocks, 7);
};

const generateLevel = (blocks, steps) => {
  blocks.map(block => block.hidden = true);

  let currentBlock = 0;
  let doubleBlocks = 2; // 2 to guarantee first block to be single
  for (let i = 0; i < steps; i++) {
    if (Math.random() > 0.6 || doubleBlocks > 1) {
      positionBlock(blocks, currentBlock, i, 0);
      currentBlock += 1;
      doubleBlocks = 0;
    } else {
      doubleBlocks++;
      positionBlock(blocks, currentBlock, i, -1);
      positionBlock(blocks, currentBlock + 1, i, 1);
      currentBlock += 2
    }
  }
positionHome(blocks, steps);
};

const positionBlock = (blocks, blockIndex, step, shift = 0) => {
  const block = blocks[blockIndex];
  block.hidden = false;
  block.transform.y = Reactive.val(
    BLOCK_SHIFT * step - LINE_COMPENSATION * step
  );
  if (shift > 0) {
    block.transform.x = Reactive.val(BLOCK_SHIFT / 2 - LINE_COMPENSATION / 2);
  } else if (shift < 0) {
    block.transform.x = Reactive.val(- BLOCK_SHIFT / 2 + LINE_COMPENSATION / 2);
  } else {
    block.transform.x = 0;
  }
};

const positionHome = (blocks, step) => {
  positionBlock(blocks, blocks.length - 1, step);
}

(async function() {
  await initShadow();
  const picker = await initPicker();
  const blocks = await Promise.all(new Array(MAX_BLOCK).fill(0).map((_, index) => {
    return Scene.root.findFirst('block-' + (index + 1));
  }));
  blocks.push(await Scene.root.findFirst('block-home'));

  picker.selectedIndex.monitor().subscribe((event) => {
    const level = event.newValue;
    selectLevel(blocks, level);
  });

  selectLevel(blocks, DEFAULT_LEVEL);
})();