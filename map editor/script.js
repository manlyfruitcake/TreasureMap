const ICONS = [
  "iconBallroom.png",
  "iconBallroom_onHold.png",
  "iconBeach.png",
  "iconBeachShore.png",
  "iconBeachShore_onHold.png",
  "iconBeach_onHold.png",
  "iconDiving.png",
  "iconDiving_onHold.png",
  "iconEnemies.png",
  "iconEnemies_onHold.png",
  "iconGazebo.png",
  "iconGazebo_onHold.png",
  "iconGym.png",
  "iconGym_onHold.png",
  "iconHotelRoom.png",
  "iconHotelRoom_onHold.png",
  "iconKrakatau.png",
  "iconKrakatau_onHold.png",
  "iconLighthouse.png",
  "iconLighthouse_onHold.png",
  "iconMusholla.png",
  "iconMusholla_onHold.png",
  "iconParking.png",
  "iconParking_onHold.png",
  "iconPlayground.png",
  "iconPlayground_onHold.png",
  "iconPool.png",
  "iconPool_onHold.png",
  "iconReceptionist.png",
  "iconReceptionist_onHold.png",
  "iconRestaurant.png",
  "iconRestaurant_onHold.png",
  "iconSeasideTerrace.png",
  "iconSeasideTerrace_onHold.png",
];

const mapViewport = document.getElementById("mapViewport");
const mapCanvas = document.getElementById("mapCanvas");
const mapImage = mapCanvas.querySelector(".map-image");
const addNodeButton = document.getElementById("addNodeButton");
const deleteNodeButton = document.getElementById("deleteNodeButton");
const copyJsonButton = document.getElementById("copyJsonButton");
const panelTitle = document.getElementById("panelTitle");
const titleInput = document.getElementById("nodeTitle");
const descriptionInput = document.getElementById("nodeDescription");
const iconSelect = document.getElementById("nodeIcon");
const xInput = document.getElementById("nodeX");
const yInput = document.getElementById("nodeY");
const exportOutput = document.getElementById("exportOutput");

const nodes = [];
let selectedNodeId = null;
let nodeCount = 0;
let dragState = null;

function createDefaultNode(x, y) {
  nodeCount += 1;

  return {
    id: `area-${nodeCount}`,
    title: `Area ${nodeCount}`,
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

function formatCoordinate(value) {
  return Number(value.toFixed(1));
}

function populateIconSelect() {
  ICONS.forEach((iconName) => {
    const option = document.createElement("option");
    option.value = iconName;
    option.textContent = iconName.replace(".png", "");
    iconSelect.append(option);
  });
}

function getSelectedNode() {
  return nodes.find((node) => node.id === selectedNodeId) ?? null;
}

function setFormDisabled(isDisabled) {
  [titleInput, descriptionInput, iconSelect, xInput, yInput].forEach((field) => {
    field.disabled = isDisabled;
  });
  deleteNodeButton.disabled = isDisabled;
}

function updateExport() {
  exportOutput.value = JSON.stringify(nodes, null, 2);
}

function updateForm() {
  const node = getSelectedNode();

  if (!node) {
    panelTitle.textContent = "No node selected";
    titleInput.value = "";
    descriptionInput.value = "";
    iconSelect.value = ICONS[0];
    xInput.value = "";
    yInput.value = "";
    setFormDisabled(true);
    return;
  }

  panelTitle.textContent = node.title || node.id;
  titleInput.value = node.title;
  descriptionInput.value = node.description;
  iconSelect.value = node.icon;
  xInput.value = node.x;
  yInput.value = node.y;
  setFormDisabled(false);
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

  const label = document.createElement("span");
  label.className = "map-node-label";
  label.textContent = node.title;

  button.append(icon, label);

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
    updateExport();
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
    nodeElement.querySelector(".map-node-label").textContent = node.title;
    mapCanvas.append(nodeElement);
  });

  updateForm();
  updateExport();
}

function addNodeAt(x, y) {
  const node = createDefaultNode(formatCoordinate(x), formatCoordinate(y));
  nodes.push(node);
  selectedNodeId = node.id;
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
  render();
}

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

iconSelect.addEventListener("change", () => {
  syncSelectedNode((node) => {
    node.icon = iconSelect.value;
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

populateIconSelect();
setFormDisabled(true);
updateExport();

window.addEventListener("load", () => {
  mapViewport.scrollLeft = Math.max(0, (mapCanvas.scrollWidth - mapViewport.clientWidth) / 2);
  mapViewport.scrollTop = Math.max(0, (mapCanvas.scrollHeight - mapViewport.clientHeight) / 2);
});
