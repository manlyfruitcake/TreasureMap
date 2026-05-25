const nodes = {
  "dummy-cove": {
    title: "Seventh Hell",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum tellus elit sed risus.",
  },
};

const viewport = document.getElementById("mapViewport");
const mapCanvas = document.querySelector(".map-canvas");
const modal = document.getElementById("infoModal");
const title = document.getElementById("infoTitle");
const description = document.getElementById("infoDescription");
const closeModalButton = document.getElementById("closeModalButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");

const BASE_WIDTH = 1215;
const BASE_HEIGHT = 852;
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;
const ZOOM_STEP = 0.1;

let scale = 1;
let pinchState = null;

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

function openModal(nodeId) {
  const node = nodes[nodeId];

  if (!node) {
    return;
  }

  title.textContent = node.title;
  description.textContent = node.description;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll(".map-node").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.nodeId));
});

modal.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
    closeModal();
  }
});

closeModalButton.addEventListener("click", closeModal);

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

window.addEventListener("load", () => {
  scale = getMinScale();
  resizeCanvas(scale);
  viewport.scrollLeft = 360;
  viewport.scrollTop = 48;
});

window.addEventListener("resize", () => {
  setScale(scale);
});
