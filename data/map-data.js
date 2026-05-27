(function attachTreasureMapData(global) {
  const STORAGE_KEY = "treasure-map:nodes";

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

  const DEFAULT_NODES = [
    {
      id: "area-1",
      title: "Seventh Hell",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum tellus elit sed risus.",
      icon: "iconRestaurant.png",
      x: 48,
      y: 43,
    },
  ];

  function cloneNodes(nodes) {
    return nodes.map((node) => ({ ...node }));
  }

  function normalizeNode(node, index) {
    const fallbackIcon = ICONS[0];
    const x = Number(node.x);
    const y = Number(node.y);

    return {
      id: typeof node.id === "string" && node.id.trim() ? node.id : `area-${index + 1}`,
      title: typeof node.title === "string" && node.title.trim() ? node.title : `Area ${index + 1}`,
      description: typeof node.description === "string" ? node.description : "",
      icon: typeof node.icon === "string" && ICONS.includes(node.icon) ? node.icon : fallbackIcon,
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50,
    };
  }

  function loadNodes() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return cloneNodes(DEFAULT_NODES);
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return cloneNodes(DEFAULT_NODES);
      }

      return parsed.map(normalizeNode);
    } catch {
      return cloneNodes(DEFAULT_NODES);
    }
  }

  function saveNodes(nodes) {
    const normalized = Array.isArray(nodes) ? nodes.map(normalizeNode) : cloneNodes(DEFAULT_NODES);
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetNodes() {
    global.localStorage.removeItem(STORAGE_KEY);
    return cloneNodes(DEFAULT_NODES);
  }

  global.TreasureMapData = {
    STORAGE_KEY,
    ICONS,
    DEFAULT_NODES,
    loadNodes,
    saveNodes,
    resetNodes,
  };
})(window);
