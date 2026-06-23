(function attachTreasureMapData(global) {
  const NODES_STORAGE_KEY = "treasure-map:nodes";
  const TEAMS_STORAGE_KEY = "treasure-map:teams";
  const BUILTIN_ICONS = [
    "Icon_Poolside.png",
    "Icon_Restaurant.png",
    "icon_Ballroom.png",
    "icon_Beach.png",
    "icon_BeachShore.png",
    "icon_coffeeBreak.png",
    "icon_Chopper.png",
    "icon_Diving.png",
    "icon_Gazebo.png",
    "icon_Gym.png",
    "icon_Krakatau.png",
    "icon_Lighthouse.png",
    "icon_Luffy.png",
    "icon_Monster.png",
    "icon_Musholla.png",
    "icon_Nami.png",
    "icon_Park.png",
    "icon_Parking.png",
    "icon_Receptionist.png",
    "icon_Robin.png",
    "icon_Rooms.png",
    "icon_Sanji.png",
    "icon_Usopp.png",
    "icon_Zoro.png",
  ];
  const contentOverride = global.TreasureMapContent ?? {};
  const overrideIcons = Array.isArray(contentOverride.icons)
    ? contentOverride.icons.filter((icon) => typeof icon === "string" && icon.trim())
    : [];
  const ICONS = [...new Set([...overrideIcons, ...BUILTIN_ICONS])];
  const BUILTIN_DEFAULT_LOCATION_IMAGE = "placeholder.svg";
  const BUILTIN_LOCATION_IMAGES = [
    "placeholder.svg",
    "Screenshot 2026-06-22 at 14.46.36.png",
    "Receptionist.jpg",
    "Parking Area (Residence).jpeg",
    "Pool Side.jpeg",
    "Parking Area (Residence1).jpeg",
    "image 4.png",
    "CHILDREN PLAYGROUND.jpg",
    "Grass Area (CPG).jpg",
    "Musholla.jpeg",
    "Musholla.png",
    "PENDOPO ROUND TABLE 1.jpg",
    "Seaside Terrace.jpeg",
    "Grass Area (Marina).jpg",
    "PARKING AREA (Marina).jpeg",
    "GYM.jpg",
    "Meeting Room (6).jpg",
    "Superior Room.jpg",
    "LIGHTHOUSE.jpg",
    "POOLSIDE.jpeg",
    "CHILDREN PLAYGROUND (1).jpg",
    "Gazebo Krakatau.jpg",
    "PremierDeluxe2-EDIITT.jpg",
    "PARKING AREA (Lighthouse).jpeg",
  ];
  const overrideLocationImages = Array.isArray(contentOverride.locationImages)
    ? contentOverride.locationImages.filter((image) => typeof image === "string" && image.trim())
    : [];
  const LOCATION_IMAGES = [...new Set([...overrideLocationImages, ...BUILTIN_LOCATION_IMAGES])];
  const DEFAULT_LOCATION_IMAGE =
    typeof contentOverride.defaultLocationImage === "string" && contentOverride.defaultLocationImage.trim()
      ? contentOverride.defaultLocationImage
      : BUILTIN_DEFAULT_LOCATION_IMAGE;
  const BUILTIN_DEFAULT_NODES = [
    {
      id: "area-1",
      title: "Seventh Hell",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum tellus elit sed risus.",
      icon: "Icon_Restaurant.png",
      image: DEFAULT_LOCATION_IMAGE,
      x: 48,
      y: 43,
    },
  ];

  function createPlaceholderImage(teamIndex) {
    const hue = (teamIndex * 27) % 360;
    const label = `Team ${teamIndex + 1}`;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="hsl(${hue} 75% 72%)" />
            <stop offset="100%" stop-color="hsl(${(hue + 38) % 360} 65% 42%)" />
          </linearGradient>
        </defs>
        <rect width="320" height="200" rx="28" fill="url(#g)" />
        <circle cx="250" cy="56" r="38" fill="rgba(255,255,255,0.18)" />
        <circle cx="78" cy="156" r="52" fill="rgba(255,255,255,0.12)" />
        <path d="M48 146c24-34 60-54 110-54s88 20 114 54" fill="none" stroke="rgba(255,255,255,0.48)" stroke-width="14" stroke-linecap="round" />
        <text x="34" y="52" fill="white" font-family="Baloo 2, Arial, sans-serif" font-size="28" font-weight="700">${label}</text>
        <text x="34" y="88" fill="rgba(255,255,255,0.88)" font-family="Nunito, Arial, sans-serif" font-size="18">Placeholder Graphic</text>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  const BUILTIN_DEFAULT_TEAMS = Array.from({ length: 13 }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    image: createPlaceholderImage(index),
    members: [`Member ${index + 1}A`, `Member ${index + 1}B`, `Member ${index + 1}C`],
  }));

  function cloneNodes(nodes) {
    return nodes.map((node) => ({ ...node }));
  }

  function cloneTeams(teams) {
    return teams.map((team) => ({
      ...team,
      members: Array.isArray(team.members) ? [...team.members] : [],
    }));
  }

  function normalizeDefaultNode(node, index) {
    const fallbackIcon = ICONS[0];
    const x = Number(node?.x);
    const y = Number(node?.y);

    return {
      id: typeof node?.id === "string" && node.id.trim() ? node.id : `area-${index + 1}`,
      title: typeof node?.title === "string" && node.title.trim() ? node.title : `Area ${index + 1}`,
      description: typeof node?.description === "string" ? node.description : "",
      icon: typeof node?.icon === "string" && ICONS.includes(node.icon) ? node.icon : fallbackIcon,
      image: typeof node?.image === "string" && node.image.trim() ? node.image : DEFAULT_LOCATION_IMAGE,
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50,
    };
  }

  function normalizeDefaultTeam(team, index) {
    const fallbackTeam = BUILTIN_DEFAULT_TEAMS[index] ?? BUILTIN_DEFAULT_TEAMS[0];
    const members = Array.isArray(team?.members)
      ? team.members
          .map((member) => (typeof member === "string" ? member.trim() : ""))
          .filter(Boolean)
      : fallbackTeam.members;

    return {
      id: typeof team?.id === "string" && team.id.trim() ? team.id : fallbackTeam.id,
      name: typeof team?.name === "string" && team.name.trim() ? team.name : fallbackTeam.name,
      image: typeof team?.image === "string" && team.image.trim() ? team.image : fallbackTeam.image,
      members: members.length ? members : [...fallbackTeam.members],
    };
  }

  const DEFAULT_NODES_SOURCE = Array.isArray(contentOverride.nodes) && contentOverride.nodes.length
    ? contentOverride.nodes
    : BUILTIN_DEFAULT_NODES;
  const DEFAULT_NODES = DEFAULT_NODES_SOURCE.map(normalizeDefaultNode);

  const DEFAULT_TEAMS_SOURCE = Array.isArray(contentOverride.teams) && contentOverride.teams.length
    ? contentOverride.teams
    : BUILTIN_DEFAULT_TEAMS;
  const DEFAULT_TEAMS = DEFAULT_TEAMS_SOURCE.map(normalizeDefaultTeam);

  function normalizeNode(node, index) {
    const fallbackIcon = ICONS[0];
    const x = Number(node.x);
    const y = Number(node.y);

    return {
      id: typeof node.id === "string" && node.id.trim() ? node.id : `area-${index + 1}`,
      title: typeof node.title === "string" && node.title.trim() ? node.title : `Area ${index + 1}`,
      description: typeof node.description === "string" ? node.description : "",
      icon: typeof node.icon === "string" && ICONS.includes(node.icon) ? node.icon : fallbackIcon,
      image: typeof node.image === "string" && node.image.trim() ? node.image : DEFAULT_LOCATION_IMAGE,
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50,
    };
  }

  function normalizeTeam(team, index) {
    const fallbackTeam = DEFAULT_TEAMS[index] ?? DEFAULT_TEAMS[0];
    const members = Array.isArray(team.members)
      ? team.members
          .map((member) => (typeof member === "string" ? member.trim() : ""))
          .filter(Boolean)
      : fallbackTeam.members;

    return {
      id: typeof team.id === "string" && team.id.trim() ? team.id : fallbackTeam.id,
      name: typeof team.name === "string" && team.name.trim() ? team.name : fallbackTeam.name,
      image: typeof team.image === "string" && team.image.trim() ? team.image : fallbackTeam.image,
      members: members.length ? members : [...fallbackTeam.members],
    };
  }

  function loadNodes() {
    try {
      const raw = global.localStorage.getItem(NODES_STORAGE_KEY);

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
    global.localStorage.setItem(NODES_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetNodes() {
    global.localStorage.removeItem(NODES_STORAGE_KEY);
    return cloneNodes(DEFAULT_NODES);
  }

  function loadTeams() {
    try {
      const raw = global.localStorage.getItem(TEAMS_STORAGE_KEY);

      if (!raw) {
        return cloneTeams(DEFAULT_TEAMS);
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return cloneTeams(DEFAULT_TEAMS);
      }

      const normalized = DEFAULT_TEAMS.map((team, index) => normalizeTeam(parsed[index] ?? team, index));
      return normalized;
    } catch {
      return cloneTeams(DEFAULT_TEAMS);
    }
  }

  function saveTeams(teams) {
    const normalized = DEFAULT_TEAMS.map((team, index) => normalizeTeam(Array.isArray(teams) ? teams[index] ?? team : team, index));
    global.localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetTeams() {
    global.localStorage.removeItem(TEAMS_STORAGE_KEY);
    return cloneTeams(DEFAULT_TEAMS);
  }

  global.TreasureMapData = {
    NODES_STORAGE_KEY,
    TEAMS_STORAGE_KEY,
    ICONS,
    LOCATION_IMAGES,
    DEFAULT_LOCATION_IMAGE,
    DEFAULT_NODES,
    DEFAULT_TEAMS,
    loadNodes,
    saveNodes,
    resetNodes,
    loadTeams,
    saveTeams,
    resetTeams,
  };
})(window);
