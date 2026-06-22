const mapViewport = document.getElementById("mapViewport");
const mapCanvas = document.getElementById("mapCanvas");
const mapImage = mapCanvas.querySelector(".map-image");
const mapWorkspace = document.querySelector(".map-workspace");
const teamWorkspace = document.getElementById("teamWorkspace");
const mapDetailsPanel = document.getElementById("mapDetailsPanel");
const teamDetailsPanel = document.getElementById("teamDetailsPanel");
const iconGrid = document.getElementById("iconGrid");
const teamPickerGrid = document.getElementById("teamPickerGrid");
const mapTabButton = document.getElementById("mapTabButton");
const teamsTabButton = document.getElementById("teamsTabButton");
const saveNodesButton = document.getElementById("saveNodesButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const addNodeButton = document.getElementById("addNodeButton");
const deleteNodeButton = document.getElementById("deleteNodeButton");
const resetNodesButton = document.getElementById("resetNodesButton");
const copyJsonButton = document.getElementById("copyJsonButton");
const saveStatus = document.getElementById("saveStatus");
const panelTitle = document.getElementById("panelTitle");
const teamPanelTitle = document.getElementById("teamPanelTitle");
const titleInput = document.getElementById("nodeTitle");
const descriptionInput = document.getElementById("nodeDescription");
const xInput = document.getElementById("nodeX");
const yInput = document.getElementById("nodeY");
const nodeImageFileInput = document.getElementById("nodeImageFile");
const nodeImagePreview = document.getElementById("nodeImagePreview");
const resetNodeImageButton = document.getElementById("resetNodeImageButton");
const teamNameInput = document.getElementById("teamName");
const teamImageFileInput = document.getElementById("teamImageFile");
const teamImagePreview = document.getElementById("teamImagePreview");
const resetTeamImageButton = document.getElementById("resetTeamImageButton");
const teamMembersInput = document.getElementById("teamMembers");
const exportOutput = document.getElementById("exportOutput");
const {
  ICONS,
  DEFAULT_LOCATION_IMAGE,
  DEFAULT_NODES,
  DEFAULT_TEAMS,
  loadNodes,
  saveNodes,
  loadTeams,
  saveTeams,
  NODES_STORAGE_KEY,
  TEAMS_STORAGE_KEY,
} = window.TreasureMapData;
const BASE_WIDTH = 1215;
const BASE_HEIGHT = 852;
const MAX_SCALE = 2;
const ZOOM_STEP = 0.1;
const DEPLOY_DATA_FILE_NAME = "map-content.js";

let nodes = loadNodes();
let teams = loadTeams();
let selectedNodeId = null;
let selectedTeamId = teams[0]?.id ?? null;
let dragState = null;
let isDirty = false;
let scale = 1;
let activeTab = "map";

function cloneNodes(nodeList) {
  return nodeList.map((node) => ({ ...node }));
}

function cloneTeams(teamList) {
  return teamList.map((team) => ({
    ...team,
    members: [...team.members],
  }));
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

function getLocationImagePath(fileName) {
  return fileName.startsWith("data:") ? fileName : `../images/Location/${fileName}`;
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

function getSelectedTeam() {
  return teams.find((team) => team.id === selectedTeamId) ?? null;
}

function setFormDisabled(isDisabled) {
  [titleInput, descriptionInput, xInput, yInput, nodeImageFileInput].forEach((field) => {
    field.disabled = isDisabled;
  });
  deleteNodeButton.disabled = isDisabled;
  resetNodeImageButton.disabled = isDisabled;
  iconGrid.querySelectorAll(".icon-choice").forEach((button) => {
    button.disabled = isDisabled;
  });
}

function updateExport() {
  exportOutput.value = JSON.stringify({ nodes, teams }, null, 2);
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

function getDeployableContent() {
  return {
    icons: [...ICONS],
    defaultLocationImage: DEFAULT_LOCATION_IMAGE,
    nodes: nodes.map((node) => ({ ...node })),
    teams: teams.map((team) => ({
      ...team,
      members: [...team.members],
    })),
  };
}

function createDeployableContentScript() {
  return [
    "(function attachTreasureMapContent(global) {",
    `  global.TreasureMapContent = ${JSON.stringify(getDeployableContent(), null, 2)};`,
    "})(window);",
    "",
  ].join("\n");
}

async function saveDeployableContentFile() {
  const fileContents = createDeployableContentScript();

  if (typeof window.showSaveFilePicker === "function") {
    const handle = await window.showSaveFilePicker({
      suggestedName: DEPLOY_DATA_FILE_NAME,
      types: [
        {
          description: "Treasure Map data",
          accept: {
            "text/javascript": [".js"],
          },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(fileContents);
    await writable.close();
    return "file";
  }

  const blob = new Blob([fileContents], { type: "text/javascript" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = DEPLOY_DATA_FILE_NAME;
  link.click();
  URL.revokeObjectURL(downloadUrl);
  return "download";
}

async function persistNodes(message = "Changes saved to main app") {
  try {
    nodes = saveNodes(nodes);
    teams = saveTeams(teams);
    const exportMethod = await saveDeployableContentFile();
    updateExport();
    const statusMessage =
      exportMethod === "file"
        ? "Saved locally and wrote deployable map-content.js"
        : "Saved locally and downloaded deployable map-content.js";
    setDirtyState(false, message === "Changes saved to main app" ? statusMessage : message);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      setDirtyState(true, "Save cancelled before deployable data file was written.");
      return;
    }

    const failureMessage =
      error instanceof DOMException && error.name === "QuotaExceededError"
        ? "Save failed: image data is too large. Use smaller images."
        : "Save failed. Please try again.";

    setDirtyState(true, failureMessage);
  }
}

function optimizeImageFile(file, { maxWidth, maxHeight, mimeType = "image/webp", quality = 0.82 }) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas context is unavailable"));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL(mimeType, quality));
      };

      image.onerror = () => {
        reject(new Error("Selected image could not be loaded"));
      };

      if (typeof reader.result !== "string") {
        reject(new Error("Selected image could not be read"));
        return;
      }

      image.src = reader.result;
    };

    reader.onerror = () => {
      reject(new Error("Selected image could not be read"));
    };

    reader.readAsDataURL(file);
  });
}

function updateForm() {
  const node = getSelectedNode();

  if (!node) {
    panelTitle.textContent = "No node selected";
    titleInput.value = "";
    descriptionInput.value = "";
    xInput.value = "";
    yInput.value = "";
    nodeImagePreview.src = getLocationImagePath(DEFAULT_LOCATION_IMAGE);
    nodeImagePreview.alt = "Location placeholder preview";
    setFormDisabled(true);
    updateIconPicker();
    return;
  }

  panelTitle.textContent = node.title || node.id;
  titleInput.value = node.title;
  descriptionInput.value = node.description;
  xInput.value = node.x;
  yInput.value = node.y;
  nodeImagePreview.src = getLocationImagePath(node.image);
  nodeImagePreview.alt = `${node.title} preview`;
  setFormDisabled(false);
  updateIconPicker();
}

function updateTeamPicker() {
  teamPickerGrid.querySelectorAll(".team-choice").forEach((button) => {
    const isSelected = button.dataset.teamId === selectedTeamId;
    button.classList.toggle("is-selected", isSelected);
  });
}

function updateTeamForm() {
  const team = getSelectedTeam();

  if (!team) {
    return;
  }

  teamPanelTitle.textContent = team.name;
  teamNameInput.value = team.name;
  teamImagePreview.src = team.image;
  teamImagePreview.alt = `${team.name} graphic`;
  teamMembersInput.value = team.members.join("\n");
  updateTeamPicker();
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

function populateTeamPicker() {
  teams.forEach((team) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "team-choice";
    button.dataset.teamId = team.id;

    const image = document.createElement("img");
    image.src = team.image;
    image.alt = "";

    const label = document.createElement("span");
    label.className = "team-choice-name";
    label.textContent = team.name;

    button.append(image, label);
    button.addEventListener("click", () => {
      selectedTeamId = team.id;
      updateTeamForm();
    });

    teamPickerGrid.append(button);
  });
}

function renderTeamPicker() {
  teamPickerGrid.replaceChildren();
  populateTeamPicker();
  updateTeamForm();
}

function setActiveTab(nextTab) {
  activeTab = nextTab;
  const isMapTab = nextTab === "map";

  mapWorkspace.classList.toggle("hidden", !isMapTab);
  mapDetailsPanel.classList.toggle("hidden", !isMapTab);
  teamWorkspace.classList.toggle("hidden", isMapTab);
  teamDetailsPanel.classList.toggle("hidden", isMapTab);

  mapTabButton.classList.toggle("is-active", isMapTab);
  teamsTabButton.classList.toggle("is-active", !isMapTab);
  mapTabButton.setAttribute("aria-selected", isMapTab ? "true" : "false");
  teamsTabButton.setAttribute("aria-selected", isMapTab ? "false" : "true");
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
  renderTeamPicker();
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

function syncSelectedTeam(mutator) {
  const team = getSelectedTeam();

  if (!team) {
    return;
  }

  mutator(team);
  markDirty();
  renderTeamPicker();
  updateExport();
}

saveNodesButton.addEventListener("click", async () => {
  await persistNodes();
});

mapTabButton.addEventListener("click", () => {
  setActiveTab("map");
});

teamsTabButton.addEventListener("click", () => {
  setActiveTab("teams");
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
  teams = cloneTeams(DEFAULT_TEAMS);
  selectedNodeId = nodes[0]?.id ?? null;
  selectedTeamId = teams[0]?.id ?? null;
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

nodeImageFileInput.addEventListener("change", async () => {
  const file = nodeImageFileInput.files?.[0];

  if (!file) {
    return;
  }

  try {
    const dataUrl = await optimizeImageFile(file, {
      maxWidth: 960,
      maxHeight: 640,
      quality: 0.8,
    });

    syncSelectedNode((node) => {
      node.image = dataUrl;
    });
  } catch {
    setDirtyState(true, "Image update failed. Please try another file.");
  }

  nodeImageFileInput.value = "";
});

resetNodeImageButton.addEventListener("click", () => {
  syncSelectedNode((node) => {
    node.image = DEFAULT_LOCATION_IMAGE;
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

teamNameInput.addEventListener("input", () => {
  syncSelectedTeam((team) => {
    team.name = teamNameInput.value.trim() || team.id;
  });
});

teamMembersInput.addEventListener("input", () => {
  syncSelectedTeam((team) => {
    team.members = teamMembersInput.value
      .split("\n")
      .map((member) => member.trim())
      .filter(Boolean);
  });
});

teamImageFileInput.addEventListener("change", async () => {
  const file = teamImageFileInput.files?.[0];

  if (!file) {
    return;
  }

  try {
    const dataUrl = await optimizeImageFile(file, {
      maxWidth: 320,
      maxHeight: 320,
      quality: 0.82,
    });

    syncSelectedTeam((team) => {
      team.image = dataUrl;
    });
  } catch {
    setDirtyState(true, "Image update failed. Please try another file.");
  }

  teamImageFileInput.value = "";
});

resetTeamImageButton.addEventListener("click", () => {
  const selectedIndex = teams.findIndex((team) => team.id === selectedTeamId);

  if (selectedIndex === -1) {
    return;
  }

  syncSelectedTeam((team) => {
    team.image = DEFAULT_TEAMS[selectedIndex].image;
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
setActiveTab("map");

window.addEventListener("load", () => {
  scale = getMinScale();
  resizeCanvas(scale);
  mapViewport.scrollLeft = Math.max(0, (mapCanvas.scrollWidth - mapViewport.clientWidth) / 2);
  mapViewport.scrollTop = Math.max(0, (mapCanvas.scrollHeight - mapViewport.clientHeight) / 2);
  selectedNodeId = nodes[0]?.id ?? null;
  selectedTeamId = teams[0]?.id ?? null;
  render();
});

window.addEventListener("resize", () => {
  setScale(scale);
});

window.addEventListener("storage", (event) => {
  if (isDirty) {
    setDirtyState(true, "Unsaved changes in editor. External saved data is available.");
    return;
  }

  if (event.key === NODES_STORAGE_KEY) {
    nodes = loadNodes();
  }

  if (event.key === TEAMS_STORAGE_KEY) {
    teams = loadTeams();
  }

  if (!nodes.some((node) => node.id === selectedNodeId)) {
    selectedNodeId = nodes[0]?.id ?? null;
  }

  if (!teams.some((team) => team.id === selectedTeamId)) {
    selectedTeamId = teams[0]?.id ?? null;
  }

  render();
  setDirtyState(false, "Editor refreshed from saved main app data");
});
