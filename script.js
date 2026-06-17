const viewport = document.getElementById("mapViewport");
const mapCanvas = document.querySelector(".map-canvas");
const modal = document.getElementById("infoModal");
const landingScreen = document.getElementById("landingScreen");
const teamGridTrack = document.getElementById("teamGridTrack");
const teamGridViewport = document.getElementById("teamGridViewport");
const teamPageDots = document.getElementById("teamPageDots");
const teamModal = document.getElementById("teamModal");
const teamModalImage = document.getElementById("teamModalImage");
const teamMemberList = document.getElementById("teamMemberList");
const closeTeamModalButton = document.getElementById("closeTeamModalButton");
const openMapButton = document.getElementById("openMapButton");
const mapZoomControls = document.getElementById("mapZoomControls");
const hintCard = document.getElementById("hintCard");
const infoImage = document.getElementById("infoImage");
const title = document.getElementById("infoTitle");
const description = document.getElementById("infoDescription");
const closeModalButton = document.getElementById("closeModalButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");

const BASE_WIDTH = 1215;
const BASE_HEIGHT = 852;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const ZOOM_STEP = 0.1;
const { loadNodes, loadTeams, NODES_STORAGE_KEY, TEAMS_STORAGE_KEY } = window.TreasureMapData;

let scale = 1;
let pinchState = null;
let nodes = loadNodes();
let teams = loadTeams();
let selectedTeamId = null;
let mapUnlocked = false;
let dragPanState = null;
let currentTeamPage = 0;
let teamSwipeState = null;
const TEAMS_PER_PAGE = 6;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(touches) {
  const [firstTouch, secondTouch] = touches;
  return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
}

function getTouchCenter(touches) {
  const [firstTouch, secondTouch] = touches;
  return {
    x: (firstTouch.clientX + secondTouch.clientX) / 2,
    y: (firstTouch.clientY + secondTouch.clientY) / 2,
  };
}

function resizeCanvas(nextScale) {
  mapCanvas.style.width = `${BASE_WIDTH * nextScale}px`;
  mapCanvas.style.height = `${BASE_HEIGHT * nextScale}px`;
}

function centerViewportOn(contentX, contentY) {
  const maxScrollLeft = Math.max(0, mapCanvas.offsetWidth - viewport.clientWidth);
  const maxScrollTop = Math.max(0, mapCanvas.offsetHeight - viewport.clientHeight);
  const targetScrollLeft = contentX * scale - viewport.clientWidth / 2;
  const targetScrollTop = contentY * scale - viewport.clientHeight / 2;

  viewport.scrollLeft = clamp(targetScrollLeft, 0, maxScrollLeft);
  viewport.scrollTop = clamp(targetScrollTop, 0, maxScrollTop);
}

function getMinScale() {
  const widthFitScale = viewport.clientWidth / BASE_WIDTH;
  const heightFitScale = viewport.clientHeight / BASE_HEIGHT;
  return Math.max(MIN_SCALE, widthFitScale, heightFitScale);
}

function setScale(nextScale, focalPoint = null) {
  const clampedScale = clamp(nextScale, getMinScale(), MAX_SCALE);

  if (clampedScale === scale) {
    return;
  }

  const previousScale = scale;
  const viewportX = focalPoint?.viewportX ?? viewport.clientWidth / 2;
  const viewportY = focalPoint?.viewportY ?? viewport.clientHeight / 2;
  const contentX = focalPoint?.contentX ?? (viewport.scrollLeft + viewportX) / previousScale;
  const contentY = focalPoint?.contentY ?? (viewport.scrollTop + viewportY) / previousScale;

  scale = clampedScale;
  resizeCanvas(scale);

  viewport.scrollLeft = Math.max(0, contentX * scale - viewportX);
  viewport.scrollTop = Math.max(0, contentY * scale - viewportY);
}

function getNodeById(nodeId) {
  return nodes.find((node) => node.id === nodeId) ?? null;
}

function getTeamById(teamId) {
  return teams.find((team) => team.id === teamId) ?? null;
}

function getTeamRingColor(teamId) {
  const match = /(\d+)$/.exec(teamId);
  const palette = [
    "#6ddc44",
    "#ffd84d",
    "#ff6ce1",
    "#171717",
    "#6f34cc",
    "#ef2626",
    "#1d7df5",
    "#20bc8e",
    "#f59c1a",
    "#f25c8c",
    "#4f6aee",
    "#b85722",
    "#2ea992",
  ];
  const index = match ? Number(match[1]) - 1 : 0;
  return palette[index % palette.length];
}

function getTeamPages() {
  const pages = [];

  for (let index = 0; index < teams.length; index += TEAMS_PER_PAGE) {
    pages.push(teams.slice(index, index + TEAMS_PER_PAGE));
  }

  return pages;
}

function getIconPath(fileName) {
  return `./Icons/${fileName}`;
}

function getLocationImagePath(fileName) {
  return fileName.startsWith("data:") ? fileName : `./images/Location/${fileName}`;
}

function renderNodes() {
  mapCanvas.querySelectorAll(".map-node").forEach((nodeElement) => nodeElement.remove());

  nodes.forEach((node) => {
    const button = document.createElement("button");
    button.className = "map-node";
    button.type = "button";
    button.dataset.nodeId = node.id;
    button.setAttribute("aria-label", `Open info for ${node.title}`);
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;

    const icon = document.createElement("img");
    icon.src = getIconPath(node.icon);
    icon.alt = "";

    button.append(icon);
    button.addEventListener("click", () => openModal(node.id));
    mapCanvas.append(button);
  });
}

function renderTeams() {
  const teamPages = getTeamPages();
  currentTeamPage = clamp(currentTeamPage, 0, Math.max(0, teamPages.length - 1));
  teamGridTrack.replaceChildren();
  teamPageDots.replaceChildren();

  teamPages.forEach((pageTeams, pageIndex) => {
    const page = document.createElement("div");
    page.className = "team-grid-page";

    pageTeams.forEach((team) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "team-card";
      button.dataset.teamId = team.id;
      button.style.setProperty("--team-ring", getTeamRingColor(team.id));

      const shell = document.createElement("span");
      shell.className = "team-card-shell";

      const graphic = document.createElement("span");
      graphic.className = "team-card-graphic";

      const image = document.createElement("img");
      image.src = team.image;
      image.alt = "";

      const label = document.createElement("span");
      label.className = "team-card-name";
      label.textContent = team.name;

      graphic.append(image);
      shell.append(graphic);
      button.append(shell, label);
      button.addEventListener("click", () => openTeamModal(team.id));
      page.append(button);
    });

    teamGridTrack.append(page);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "team-page-dot";
    dot.setAttribute("aria-label", `Go to team page ${pageIndex + 1}`);
    dot.classList.toggle("is-active", pageIndex === currentTeamPage);
    dot.addEventListener("click", () => setTeamPage(pageIndex));
    teamPageDots.append(dot);
  });

  updateTeamPagePosition();
}

function updateTeamPagePosition() {
  teamGridTrack.style.transform = `translateX(-${currentTeamPage * 100}%)`;
  teamPageDots.querySelectorAll(".team-page-dot").forEach((dot, index) => {
    dot.classList.toggle("is-active", index === currentTeamPage);
  });
}

function setTeamPage(pageIndex) {
  currentTeamPage = clamp(pageIndex, 0, Math.max(0, getTeamPages().length - 1));
  updateTeamPagePosition();
}

function openTeamModal(teamId) {
  const team = getTeamById(teamId);

  if (!team) {
    return;
  }

  selectedTeamId = team.id;
  teamModalImage.src = team.image;
  teamModalImage.alt = `${team.name} graphic`;
  document.getElementById("teamModalTitle").textContent = team.name;
  teamMemberList.replaceChildren();

  team.members.forEach((member) => {
    const item = document.createElement("li");
    item.textContent = member;
    teamMemberList.append(item);
  });

  teamModal.classList.remove("hidden");
  teamModal.setAttribute("aria-hidden", "false");
}

function closeTeamModal() {
  teamModal.classList.add("hidden");
  teamModal.setAttribute("aria-hidden", "true");
}

function unlockMap() {
  mapUnlocked = true;
  landingScreen.classList.add("hidden");
  closeTeamModal();
  viewport.classList.remove("is-blurred");
  mapZoomControls.classList.remove("hidden");
  hintCard.classList.remove("hidden");
}

function openModal(nodeId) {
  const node = getNodeById(nodeId);

  if (!node) {
    return;
  }

  title.textContent = node.title;
  description.textContent = node.description;
  infoImage.src = getLocationImagePath(node.image);
  infoImage.alt = `${node.title} preview`;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function stopDragPan() {
  dragPanState = null;
  viewport.classList.remove("is-dragging");
}

modal.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
    closeModal();
  }
});

closeModalButton.addEventListener("click", closeModal);
closeTeamModalButton.addEventListener("click", closeTeamModal);
openMapButton.addEventListener("click", unlockMap);

teamModal.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.dataset.closeTeamModal === "true") {
    closeTeamModal();
  }
});

teamGridViewport.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) {
    return;
  }

  teamSwipeState = {
    startX: event.touches[0].clientX,
    startY: event.touches[0].clientY,
  };
}, { passive: true });

teamGridViewport.addEventListener("touchend", (event) => {
  if (!teamSwipeState || event.changedTouches.length !== 1) {
    teamSwipeState = null;
    return;
  }

  const deltaX = event.changedTouches[0].clientX - teamSwipeState.startX;
  const deltaY = event.changedTouches[0].clientY - teamSwipeState.startY;
  teamSwipeState = null;

  if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) {
    return;
  }

  if (deltaX < 0) {
    setTeamPage(currentTeamPage + 1);
    return;
  }

  setTeamPage(currentTeamPage - 1);
}, { passive: true });

zoomInButton.addEventListener("click", () => {
  setScale(scale + ZOOM_STEP);
});

zoomOutButton.addEventListener("click", () => {
  setScale(scale - ZOOM_STEP);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

viewport.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length !== 2) {
      return;
    }

    const bounds = viewport.getBoundingClientRect();
    const center = getTouchCenter(event.touches);

    pinchState = {
      initialDistance: getTouchDistance(event.touches),
      initialScale: scale,
      contentX: (viewport.scrollLeft + (center.x - bounds.left)) / scale,
      contentY: (viewport.scrollTop + (center.y - bounds.top)) / scale,
    };
  },
  { passive: true }
);

viewport.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length !== 2 || !pinchState) {
      return;
    }

    event.preventDefault();

    const bounds = viewport.getBoundingClientRect();
    const center = getTouchCenter(event.touches);
    const nextDistance = getTouchDistance(event.touches);
    const nextScale = pinchState.initialScale * (nextDistance / pinchState.initialDistance);

    setScale(nextScale, {
      viewportX: center.x - bounds.left,
      viewportY: center.y - bounds.top,
      contentX: pinchState.contentX,
      contentY: pinchState.contentY,
    });
  },
  { passive: false }
);

viewport.addEventListener("touchend", (event) => {
  if (event.touches.length < 2) {
    pinchState = null;
  }
});

viewport.addEventListener("touchcancel", () => {
  pinchState = null;
});

viewport.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") {
    return;
  }

  if (!(event.target instanceof HTMLElement)) {
    return;
  }

  if (event.target.closest(".map-node, .zoom-button, .hint-card, .info-card, .team-modal-card")) {
    return;
  }

  dragPanState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startScrollLeft: viewport.scrollLeft,
    startScrollTop: viewport.scrollTop,
  };

  viewport.classList.add("is-dragging");
});

viewport.addEventListener("pointermove", (event) => {
  if (!dragPanState || dragPanState.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - dragPanState.startX;
  const deltaY = event.clientY - dragPanState.startY;

  viewport.scrollLeft = dragPanState.startScrollLeft - deltaX;
  viewport.scrollTop = dragPanState.startScrollTop - deltaY;
});

viewport.addEventListener("pointerup", (event) => {
  if (!dragPanState || dragPanState.pointerId !== event.pointerId) {
    return;
  }

  stopDragPan();
});

viewport.addEventListener("pointercancel", (event) => {
  if (!dragPanState || dragPanState.pointerId !== event.pointerId) {
    return;
  }

  stopDragPan();
});

viewport.addEventListener("pointerleave", () => {
  if (!dragPanState) {
    return;
  }

  stopDragPan();
});

window.addEventListener("load", () => {
  nodes = loadNodes();
  teams = loadTeams();
  renderNodes();
  renderTeams();
  scale = getMinScale();
  resizeCanvas(scale);
  centerViewportOn(BASE_WIDTH / 2, BASE_HEIGHT / 2);
});

window.addEventListener("resize", () => {
  setScale(scale);
});

window.addEventListener("storage", (event) => {
  if (event.key === NODES_STORAGE_KEY) {
    nodes = loadNodes();
    renderNodes();

    if (!modal.classList.contains("hidden")) {
      closeModal();
    }
  }

  if (event.key === TEAMS_STORAGE_KEY) {
    teams = loadTeams();
    renderTeams();

    if (!teamModal.classList.contains("hidden") && selectedTeamId) {
      openTeamModal(selectedTeamId);
    }
  }
});
