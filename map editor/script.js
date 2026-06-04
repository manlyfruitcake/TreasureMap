const mapViewport = document.getElementById("mapViewport");
const mapCanvas = document.getElementById("mapCanvas");
const mapImage = mapCanvas.querySelector(".map-image");
const iconGrid = document.getElementById("iconGrid");
const saveNodesButton = document.getElementById("saveNodesButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const addNodeButton = document.getElementById("addNodeButton");
const deleteNodeButton = document.getElementById("deleteNodeButton");
const resetNodesButton = document.getElementById("resetNodesButton");
const copyJsonButton = document.getElementById("copyJsonButton");
const saveStatus = document.getElementById("saveStatus");
const panelTitle = document.getElementById("panelTitle");
const titleInput = document.getElementById("nodeTitle");
const descriptionInput = document.getElementById("nodeDescription");
const xInput = document.getElementById("nodeX");
const yInput = document.getElementById("nodeY");
const exportOutput = document.getElementById("exportOutput");
const { ICONS, DEFAULT_NODES, loadNodes, saveNodes, STORAGE_KEY } = window.TreasureMapData;
const BASE_WIDTH = 1215;
const BASE_HEIGHT = 852;
const MAX_SCALE = 2;
const ZOOM_STEP = 0.1;

let nodes = loadNodes();
let selectedNodeId = null;
let dragState = null;
let isDirty = false;
let scale = 1;

function cloneNodes(nodeList) {
  return nodeList.map((node) => ({ ...node }));
}

function createDefaultNode(x, y) {
  const nextIndex = nodes.reduce((maxValue, node) => {
    const match = /^area-(\d+)$/.exec(node.id);
    return match ? Math.max(maxValue, Number(match[1])) : maxValue;
  }, 0) + 1;

  return {
    id: `area-${nextIndex}`,
    title: `Area ${nextIndex}`,
    description: "",
    icon: ICONS[0],
    x,
    y,
  };
}

function getIconPath(fileName) {
  return `../Icons/${fileName}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMinScale() {
  const widthFitScale = mapViewport.clientWidth / BASE_WIDTH;
  const heightFitScale = mapViewport.clientHeight / BASE_HEIGHT;
  return Math.min(1, Math.max(widthFitScale, heightFitScale));
}

function resizeCanvas(nextScale) {
  mapCanvas.style.width = `${BASE_WIDTH * nextScale}px`;
  mapCanvas.style.height = `${BASE_HEIGHT * nextScale}px`;
}

function setScale(nextScale, focalPoint = null) {
  const clampedScale = clamp(nextScale, getMinScale(), MAX_SCALE);

  if (clampedScale === scale) {
    return;
  }

  const previousScale = scale;
  const viewportX = focalPoint?.viewportX ?? mapViewport.clientWidth / 2;
  const viewportY = focalPoint?.viewportY ?? mapViewport.clientHeight / 2;
  const contentX = focalPoint?.contentX ?? (mapViewport.scrollLeft + viewportX) / previousScale;
  const contentY = focalPoint?.contentY ?? (mapViewport.scrollTop + viewportY) / previousScale;

  scale = clampedScale;
  resizeCanvas(scale);

  const maxScrollLeft = Math.max(0, mapCanvas.offsetWidth - mapViewport.clientWidth);
  const maxScrollTop = Math.max(0, mapCanvas.offsetHeight - mapViewport.clientHeight);
  const nextScrollLeft = contentX * scale - viewportX;
  const nextScrollTop = contentY * scale - viewportY;

  mapViewport.scrollLeft = clamp(nextScrollLeft, 0, maxScrollLeft);
  mapViewport.scrollTop = clamp(nextScrollTop, 0, maxScrollTop);
}

function formatCoordinate(value) {
  return Number(value.toFixed(1));
}

function populateIconPicker() {
  ICONS.forEach((iconName) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-choice";
    button.dataset.iconName = iconName;
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", iconName.replace(".png", ""));

    const preview = document.createElement("img");
    preview.src = getIconPath(iconName);
    preview.alt = "";

    button.append(preview);
    button.addEventListener("click", () => {
      syncSelectedNode((node) => {
        node.icon = iconName;
      });
    });

    iconGrid.append(button);
  });
}

function getSelectedNode() {
  return nodes.find((node) => node.id === selectedNodeId) ?? null;
}

function setFormDisabled(isDisabled) {
  [titleInput, descriptionInput, xInput, yInput].forEach((field) => {
    field.disabled = isDisabled;
  });
  deleteNodeButton.disabled = isDisabled;
  iconGrid.querySelectorAll(".icon-choice").forEach((button) => {
    button.disabled = isDisabled;
  });
}

function updateExport() {
  exportOutput.value = JSON.stringify(nodes, null, 2);
}

function setDirtyState(nextDirty, message = nextDirty ? "Unsaved changes" : "All changes saved") {
  isDirty = nextDirty;
  saveNodesButton.disabled = !nextDirty;
  saveStatus.textContent = message;
  saveStatus.classList.toggle("is-dirty", nextDirty);
}

function markDirty() {
  setDirtyState(true);
  updateExport();
}

function persistNodes(message = "Changes saved to main app") {
  nodes = saveNodes(nodes);
  updateExport();
  setDirtyState(false, message);
}

function updateForm() {
  const node = getSelectedNode();

  if (!node) {
    panelTitle.textContent = "No node selected";
    titleInput.value = "";
    descriptionInput.value = "";
    xInput.value = "";
    yInput.value = "";
    setFormDisabled(true);
    updateIconPicker();
    return;
  }

  panelTitle.textContent = node.title || node.id;
  titleInput.value = node.title;
  descriptionInput.value = node.description;
  xInput.value = node.x;
  yInput.value = node.y;
  setFormDisabled(false);
  updateIconPicker();
}

function updateIconPicker() {
  const selectedNode = getSelectedNode();

  iconGrid.querySelectorAll(".icon-choice").forEach((button) => {
    const isSelected = selectedNode?.icon === button.dataset.iconName;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-selected", isSelected ? "true" : "false");
  });
}

function updateSelectedNodeStyles() {
  mapCanvas.querySelectorAll(".map-node").forEach((nodeElement) => {
    nodeElement.classList.toggle("is-selected", nodeElement.dataset.nodeId === selectedNodeId);
  });
}

function createNodeElement(node) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "map-node";
  button.dataset.nodeId = node.id;
  button.setAttribute("aria-label", `Edit ${node.title}`);

  const icon = document.createElement("img");
  icon.alt = "";
  icon.src = getIconPath(node.icon);

  button.append(icon);

  button.addEventListener("click", () => {
    selectedNodeId = node.id;
    updateSelectedNodeStyles();
    updateForm();
  });

  button.addEventListener("pointerdown", (event) => {
    selectedNodeId = node.id;
    dragState = {
      id: node.id,
      pointerId: event.pointerId,
    };
    button.setPointerCapture(event.pointerId);
    updateSelectedNodeStyles();
    updateForm();
  });

  button.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.id !== node.id || dragState.pointerId !== event.pointerId) {
      return;
    }

    const bounds = mapCanvas.getBoundingClientRect();
    const nextX = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100);
    const nextY = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100);
    node.x = formatCoordinate(nextX);
    node.y = formatCoordinate(nextY);
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    updateForm();
    markDirty();
  });

  button.addEventListener("pointerup", () => {
    dragState = null;
  });

  button.addEventListener("pointercancel", () => {
    dragState = null;
  });

  return button;
}

function render() {
  mapCanvas.querySelectorAll(".map-node").forEach((nodeElement) => nodeElement.remove());

  nodes.forEach((node) => {
    const nodeElement = createNodeElement(node);
    nodeElement.style.left = `${node.x}%`;
    nodeElement.style.top = `${node.y}%`;

    if (node.id === selectedNodeId) {
      nodeElement.classList.add("is-selected");
    }

    nodeElement.querySelector("img").src = getIconPath(node.icon);
    mapCanvas.append(nodeElement);
  });

  updateForm();
  updateExport();
}

function addNodeAt(x, y) {
  const node = createDefaultNode(formatCoordinate(x), formatCoordinate(y));
  nodes.push(node);
  selectedNodeId = node.id;
  markDirty();
  render();
}

function getCanvasCoordinatesFromViewport(clientX, clientY) {
  const bounds = mapCanvas.getBoundingClientRect();
  return {
    x: clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100),
    y: clamp(((clientY - bounds.top) / bounds.height) * 100, 0, 100),
  };
}

function syncSelectedNode(mutator) {
  const node = getSelectedNode();

  if (!node) {
    return;
  }

  mutator(node);
  markDirty();
  render();
}

saveNodesButton.addEventListener("click", () => {
  persistNodes();
});

zoomInButton.addEventListener("click", () => {
  setScale(scale + ZOOM_STEP);
});

zoomOutButton.addEventListener("click", () => {
  setScale(scale - ZOOM_STEP);
});

addNodeButton.addEventListener("click", () => {
  addNodeAt(50, 50);
});

deleteNodeButton.addEventListener("click", () => {
  const index = nodes.findIndex((node) => node.id === selectedNodeId);

  if (index === -1) {
    return;
  }

  nodes.splice(index, 1);
  selectedNodeId = nodes[index]?.id ?? nodes[index - 1]?.id ?? null;
  markDirty();
  render();
});

resetNodesButton.addEventListener("click", () => {
  nodes = cloneNodes(DEFAULT_NODES);
  selectedNodeId = nodes[0]?.id ?? null;
  markDirty();
  render();
});

mapCanvas.addEventListener("click", (event) => {
  if (event.target !== mapCanvas && event.target !== mapImage) {
    return;
  }

  const coordinates = getCanvasCoordinatesFromViewport(event.clientX, event.clientY);
  addNodeAt(coordinates.x, coordinates.y);
});

titleInput.addEventListener("input", () => {
  syncSelectedNode((node) => {
    node.title = titleInput.value || node.id;
  });
});

descriptionInput.addEventListener("input", () => {
  syncSelectedNode((node) => {
    node.description = descriptionInput.value;
  });
});

xInput.addEventListener("input", () => {
  syncSelectedNode((node) => {
    node.x = formatCoordinate(clamp(Number(xInput.value) || 0, 0, 100));
  });
});

yInput.addEventListener("input", () => {
  syncSelectedNode((node) => {
    node.y = formatCoordinate(clamp(Number(yInput.value) || 0, 0, 100));
  });
});

copyJsonButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(exportOutput.value);
    copyJsonButton.textContent = "Copied";
    window.setTimeout(() => {
      copyJsonButton.textContent = "Copy JSON";
    }, 1200);
  } catch {
    copyJsonButton.textContent = "Copy failed";
    window.setTimeout(() => {
      copyJsonButton.textContent = "Copy JSON";
    }, 1200);
  }
});

populateIconPicker();
setFormDisabled(true);
updateExport();
setDirtyState(false);

window.addEventListener("load", () => {
  scale = getMinScale();
  resizeCanvas(scale);
  mapViewport.scrollLeft = Math.max(0, (mapCanvas.scrollWidth - mapViewport.clientWidth) / 2);
  mapViewport.scrollTop = Math.max(0, (mapCanvas.scrollHeight - mapViewport.clientHeight) / 2);
  selectedNodeId = nodes[0]?.id ?? null;
  render();
});

window.addEventListener("resize", () => {
  setScale(scale);
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) {
    return;
  }

  if (isDirty) {
    setDirtyState(true, "Unsaved changes in editor. External saved data is available.");
    return;
  }

  nodes = loadNodes();

  if (!nodes.some((node) => node.id === selectedNodeId)) {
    selectedNodeId = nodes[0]?.id ?? null;
  }

  render();
  setDirtyState(false, "Editor refreshed from saved main app data");
});
