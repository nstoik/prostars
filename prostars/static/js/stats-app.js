// =============================================================
//  Prostars Stats App — Vue 3 (CDN) + Tabulator 6
//  Reads window.PROSTARS_CONFIG injected by the Jinja template.
// =============================================================

const { createApp, ref, computed, onMounted, nextTick } = Vue;

// ── Utilities ────────────────────────────────────────────────

function getTopN(data, key, n, higherIsBetter) {
  const valid = data.filter(r => {
    const v = parseFloat(r[key]);
    return !isNaN(v) && v != null;
  });
  valid.sort((a, b) =>
    higherIsBetter
      ? parseFloat(b[key]) - parseFloat(a[key])
      : parseFloat(a[key]) - parseFloat(b[key])
  );
  return valid.slice(0, n).map((r, i) => ({
    rank: i + 1,
    name: r.Name,
    value: r[key],
  }));
}

const THREE_DECIMAL_KEYS = new Set([
  "AVG", "OBP", "SLG", "OPS", "GAA", "SO_Pct", "SO_SvPct", "BB/7", "K/7",
]);

function formatStatValue(value, key) {
  const v = parseFloat(value);
  if (isNaN(v)) return String(value);
  return THREE_DECIMAL_KEYS.has(key) ? v.toFixed(3) : String(value);
}

// heatStats keyed by tableId → { fieldName → { min, max, range, higherIsBetter } }
// Formatters read from this at render time so updating it + replaceData refreshes colours.
const tabHeatStats = {};

function computeHeatStats(tableId, data, heatmapColumns) {
  const stats = {};
  heatmapColumns.forEach(hc => {
    const values = data
      .map(r => parseFloat(r[hc.key]))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);
    if (values.length > 1) {
      stats[hc.key] = {
        min: values[0],
        max: values[values.length - 1],
        range: values[values.length - 1] - values[0],
        higherIsBetter: hc.higherIsBetter,
      };
    }
  });
  tabHeatStats[tableId] = stats;
}

function getHeatClass(value, info) {
  if (!info || info.range === 0) return "";
  const pct = (parseFloat(value) - info.min) / info.range;
  const eff = info.higherIsBetter ? pct : 1 - pct;
  if (eff >= 0.90) return "cell-heat-9";
  if (eff >= 0.80) return "cell-heat-8";
  if (eff >= 0.70) return "cell-heat-7";
  if (eff >= 0.60) return "cell-heat-6";
  if (eff >= 0.50) return "cell-heat-5";
  if (eff >= 0.40) return "cell-heat-4";
  if (eff >= 0.30) return "cell-heat-3";
  if (eff >= 0.20) return "cell-heat-2";
  if (eff >= 0.10) return "cell-heat-1";
  return "cell-heat-0";
}

// ── Data filtering ────────────────────────────────────────────

function filterData(data, filterState, filterItems) {
  const active = filterItems
    .map(item => {
      const sel = filterState[item] || [];
      return sel.length > 0 ? { field: item, values: sel } : null;
    })
    .filter(Boolean);

  if (active.length === 0) return data;
  return data.filter(row =>
    active.every(({ field, values }) => values.includes(String(row[field])))
  );
}

// ── Session-cached data fetch ─────────────────────────────────

const SESSION_TTL = 15 * 60 * 1000;

async function fetchTableData(sport, tableId) {
  const dataKey = `${sport}__${tableId}__data`;
  const tsKey   = `${sport}__${tableId}__ts`;

  const stored = sessionStorage.getItem(dataKey);
  const ts     = sessionStorage.getItem(tsKey);
  if (stored && ts && (Date.now() - parseInt(ts)) < SESSION_TTL) {
    return JSON.parse(stored);
  }

  const body = new FormData();
  body.append("table_id", "#" + tableId);

  const resp = await fetch(`/stats/${sport}/load_default/`, {
    method: "POST",
    body,
  });
  if (!resp.ok) throw new Error(`Server returned ${resp.status}`);

  const json = await resp.json();
  sessionStorage.setItem(dataKey, JSON.stringify(json.row_data));
  sessionStorage.setItem(tsKey,   String(Date.now()));
  return json.row_data;
}

// ── Tabulator management ──────────────────────────────────────

const tabulatorInstances = {};

function formatIP(decimalIP) {
  const thirds = Math.round(decimalIP * 3);
  const innings = Math.floor(thirds / 3);
  const rem = thirds % 3;
  return rem === 0 ? String(innings) : `${innings} ${rem}/3`;
}

function ipToNum(v) {
  const parts = String(v).trim().split(/\s+/);
  let n = parseFloat(parts[0]) || 0;
  if (parts.length > 1) {
    const frac = parts[1].split("/");
    if (frac.length === 2) n += parseInt(frac[0], 10) / parseInt(frac[1], 10);
  }
  return n;
}

function buildTabulatorColumns(tabConfig) {
  const { headers, headerTitles, fieldMap, heatmapColumns, tableId } = tabConfig;
  const heatFields = new Set((heatmapColumns || []).map(hc => hc.key));

  const columns = [
    {
      title: "#",
      formatter: function(cell) { return cell.getRow().getPosition(true); },
      width: 42,
      frozen: true,
      headerSort: false,
      resizable: false,
      cssClass: "col-rank",
    },
  ];

  headers.slice(1).forEach((header, idx) => {
    const field = (fieldMap && fieldMap[header]) || header;
    const isNameCol = idx === 0;

    const col = {
      title: header,
      field: field,
      frozen: isNameCol,
      resizable: false,
      headerTooltip: headerTitles[header] || header,
    };

    if (header === "IP") {
      col.sorter = function(a, b) { return ipToNum(a) - ipToNum(b); };
    }

    // Formatter reads heatStats at render time so scale updates with filters
    if (heatFields.has(field)) {
      col.formatter = function(cell) {
        const el = cell.getElement();
        el.className = el.className.split(" ").filter(c => !c.startsWith("cell-heat-")).join(" ");
        const heatInfo = tabHeatStats[tableId]?.[field];
        if (heatInfo) {
          const cls = getHeatClass(cell.getValue(), heatInfo);
          if (cls) el.classList.add(cls);
        }
        return cell.getValue() != null ? String(cell.getValue()) : "";
      };
    }

    columns.push(col);
  });

  return columns;
}

function initTabulator(tabConfig, data, onRowSelected) {
  const tableId = tabConfig.tableId;

  if (tabulatorInstances[tableId]) {
    tabulatorInstances[tableId].destroy();
  }

  const { field: sortField, dir: sortDir } = tabConfig.defaultSort;

  const config = {
    data: data,
    columns: buildTabulatorColumns(tabConfig),
    initialSort: [{ column: sortField, dir: sortDir }],
    layout: "fitDataFill",
    pagination: true,
    paginationSize: 25,
    paginationSizeSelector: [10, 25, 50, 100],
    paginationMode: "local",
    paginationCounter: "rows",
    movableColumns: true,
    responsiveLayout: false,
    selectableRows: 1,
  };

  const table = new Tabulator("#" + tableId, config);

  if (onRowSelected) {
    table.on("rowClick", (e, row) => {
      onRowSelected(row.getData(), row);
    });
  }

  tabulatorInstances[tableId] = table;
  return table;
}

function applyTableData(tableId, data) {
  const table = tabulatorInstances[tableId];
  if (!table) return;
  const y = window.scrollY;
  table.replaceData(data).then(() => window.scrollTo({ top: y, behavior: "instant" }));
}

// ── Vue App ───────────────────────────────────────────────────

const { sport, tabs } = window.PROSTARS_CONFIG;

const prostarsApp = createApp({
  setup() {
    const activeTabId    = ref(tabs[0].id);
    const tabData        = ref({});
    const isLoading      = ref({});
    const loadError      = ref({});
    const filterOpen     = ref(false);
    const colPanelOpen   = ref(false);
    const filters        = ref({});
    const columnVisibility = ref({});
    const selectedPlayer = ref(null);

    tabs.forEach(tab => {
      filters.value[tab.id] = {};
      tab.filterItems.forEach(item => {
        filters.value[tab.id][item] = [];
      });
      columnVisibility.value[tab.id] = {};
      tab.headers.slice(1).forEach(h => {
        columnVisibility.value[tab.id][h] = true;
      });
    });

    // ── Computed ──────────────────────────────────────────────

    const activeTab = computed(() =>
      tabs.find(t => t.id === activeTabId.value)
    );

    const activeData = computed(() =>
      tabData.value[activeTabId.value] || []
    );

    // Filtered subset — drives both leaderboards and the Tabulator instance
    const filteredData = computed(() => {
      const tab = activeTab.value;
      if (!tab || !activeData.value.length) return activeData.value;
      return filterData(activeData.value, filters.value[tab.id], tab.filterItems);
    });

    const filterGroups = computed(() => {
      if (!activeData.value.length) return [];
      const tab = activeTab.value;
      const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
      return tab.filterItems.map(item => {
        const unique = [...new Set(activeData.value.map(r => String(r[item])))];
        if (item === "Night") {
          unique.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
        } else {
          unique.sort();
        }
        return { key: item, options: unique };
      });
    });

    const leaderboards = computed(() => {
      if (!filteredData.value.length) return [];
      return activeTab.value.leaderStats.map(stat => ({
        ...stat,
        leaders: getTopN(filteredData.value, stat.key, 3, stat.higherIsBetter),
      }));
    });

    // All seasons for the selected player (uses full dataset, not filtered)
    const playerSeasons = computed(() => {
      if (!selectedPlayer.value) return [];
      const tab = activeTab.value;
      if (!tab) return [];
      const all = tabData.value[tab.id] || [];
      return all
        .filter(r => r.Name === selectedPlayer.value)
        .sort((a, b) => b.Year - a.Year || String(b.Season).localeCompare(String(a.Season)));
    });

    // Distinct Type/Division values across all of a player's seasons
    const playerMeta = computed(() => {
      const rows = playerSeasons.value;
      if (!rows.length) return null;
      const uniq = k => [...new Set(rows.map(r => r[k]).filter(Boolean))].join(', ');
      return { types: uniq('Type'), divs: uniq('Division') };
    });

    // Career totals aggregated from all seasons
    const playerCareer = computed(() => {
      const rows = playerSeasons.value;
      if (!rows.length) return null;
      const tab = activeTab.value;
      const sum = k => rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);

      if (tab && tab.id === 'baseball-pitchers') {
        const G = sum('G'), GS = sum('GS'), W = sum('W'), L = sum('L'), SV = sum('SV'), RA = sum('RA');
        const IP = formatIP(rows.reduce((acc, r) => acc + ipToNum(r.IP), 0));
        return { type: 'pitcher', G, GS, IP, W, L, SV, RA, seasons: rows.length };
      }

      // Batters (default)
      const G   = sum('G'),  AB  = sum('AB'), H  = sum('H'),  BB = sum('BB');
      const R   = sum('R'),  HR  = sum('HR'), RBI = sum('RBI');
      const s1  = sum('1B'), s2  = sum('2B'), s3 = sum('3B');
      const AVG = AB > 0 ? H / AB : 0;
      const OBP = (AB + BB) > 0 ? (H + BB) / (AB + BB) : 0;
      const SLG = AB > 0 ? (s1 + 2*s2 + 3*s3 + 4*HR) / AB : 0;
      const OPS = OBP + SLG;
      return { type: 'batter', G, AB, H, HR, RBI, R, AVG, OBP, SLG, OPS, seasons: rows.length };
    });

    const activeFilterCount = computed(() => {
      const tab = activeTab.value;
      if (!tab) return 0;
      const f = filters.value[tab.id];
      return tab.filterItems.reduce((sum, item) => {
        const sel = f[item] || [];
        const all = [...new Set((activeData.value || []).map(r => String(r[item])))];
        return sum + (sel.length > 0 && sel.length < all.length ? 1 : 0);
      }, 0);
    });

    const activeChips = computed(() => {
      const tab = activeTab.value;
      if (!tab) return [];
      const f = filters.value[tab.id];
      return tab.filterItems
        .filter(item => {
          const sel = f[item] || [];
          const all = [...new Set((activeData.value || []).map(r => String(r[item])))];
          return sel.length > 0 && sel.length < all.length;
        })
        .map(item => {
          const sel = f[item] || [];
          const label = sel.length === 1 ? `${item}: ${sel[0]}` : `${item}: ${sel.length} selected`;
          return { key: item, label };
        });
    });

    // ── Default filter setup ──────────────────────────────────

    function initDefaultFilters(tab, data) {
      const f = filters.value[tab.id];

      const years = [...new Set(data.map(r => String(r.Year)))].sort();
      const latestYear = years[years.length - 1];
      if ("Year" in f) f["Year"] = [latestYear];

      if ("Season" in f) {
        const seasons = [
          ...new Set(
            data.filter(r => String(r.Year) === latestYear)
                .map(r => String(r.Season))
          ),
        ].sort();
        f["Season"] = [seasons[seasons.length - 1]];
      }

      tab.filterItems.forEach(item => {
        if (item !== "Year" && item !== "Season") {
          const all = [...new Set(data.map(r => String(r[item])))];
          f[item] = all;
        }
      });
    }

    // ── Load a tab ────────────────────────────────────────────

    async function loadTab(tabId) {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;

      if (tabData.value[tabId]) {
        await nextTick();
        if (tabulatorInstances[tab.tableId]) {
          tabulatorInstances[tab.tableId].redraw(true);
        }
        return;
      }

      isLoading.value = { ...isLoading.value, [tabId]: true };
      loadError.value = { ...loadError.value, [tabId]: null };

      try {
        const data = await fetchTableData(sport, tab.tableId);
        tabData.value = { ...tabData.value, [tabId]: data };
        initDefaultFilters(tab, data);

        // Compute heat scale from the filtered subset, then init table
        computeHeatStats(tab.tableId, filteredData.value, tab.heatmapColumns || []);

        isLoading.value = { ...isLoading.value, [tabId]: false };
        await nextTick();

        const onSel = tab.playerPanel
          ? (d, row) => {
              if (selectedPlayer.value === d.Name) {
                selectedPlayer.value = null;
                row.deselect();
              } else {
                selectedPlayer.value = d.Name;
              }
            }
          : null;
        initTabulator(tab, filteredData.value, onSel);
      } catch (err) {
        loadError.value = { ...loadError.value, [tabId]: err.message };
        console.error("Failed to load", tabId, err);
        isLoading.value = { ...isLoading.value, [tabId]: false };
      }
    }

    // ── Tab switching ─────────────────────────────────────────

    function switchTab(tabId) {
      if (activeTabId.value === tabId) return;
      selectedPlayer.value = null;
      activeTabId.value = tabId;
      filterOpen.value = false;
      colPanelOpen.value = false;
      loadTab(tabId);
    }

    // ── Filter actions ────────────────────────────────────────

    function applyFilters() {
      const tab = activeTab.value;
      const filtered = filteredData.value;
      selectedPlayer.value = null;
      computeHeatStats(tab.tableId, filtered, tab.heatmapColumns || []);
      applyTableData(tab.tableId, filtered);
      filterOpen.value = false;
    }

    function resetFilters() {
      const tab = activeTab.value;
      const data = tabData.value[tab.id];
      if (data) initDefaultFilters(tab, data);
      selectedPlayer.value = null;
      const filtered = filteredData.value;
      computeHeatStats(tab.tableId, filtered, tab.heatmapColumns || []);
      applyTableData(tab.tableId, filtered);
      filterOpen.value = false;
      // Reset column order and visibility
      const table = tabulatorInstances[tab.tableId];
      tab.headers.slice(1).forEach(h => { columnVisibility.value[tab.id][h] = true; });
      if (table) table.setColumns(buildTabulatorColumns(tab));
    }

    function selectAll(tabId, groupKey) {
      const data = tabData.value[tabId] || [];
      filters.value[tabId][groupKey] = [
        ...new Set(data.map(r => String(r[groupKey]))),
      ];
    }

    function clearGroup(tabId, groupKey) {
      filters.value[tabId][groupKey] = [];
    }

    function removeChip(tabId, key) {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      selectAll(tabId, key);
      const filtered = filteredData.value;
      computeHeatStats(tab.tableId, filtered, tab.heatmapColumns || []);
      applyTableData(tab.tableId, filtered);
    }

    function toggleColumn(tabId, header) {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      const visible = !columnVisibility.value[tabId][header];
      columnVisibility.value[tabId][header] = visible;
      const table = tabulatorInstances[tab.tableId];
      if (!table) return;
      const fieldMap = tab.fieldMap || {};
      const field = fieldMap[header] || header;
      if (visible) table.showColumn(field);
      else table.hideColumn(field);
    }

    function closePanel() {
      selectedPlayer.value = null;
      const tab = activeTab.value;
      if (tab) {
        const table = tabulatorInstances[tab.tableId];
        if (table) table.deselectRow();
      }
    }

    // Swipe-right-to-dismiss for mobile
    let _swipeStartX = 0;

    function onPanelTouchStart(e) {
      _swipeStartX = e.touches[0].clientX;
      e.currentTarget.style.transition = "none";
    }

    function onPanelTouchMove(e) {
      const delta = e.touches[0].clientX - _swipeStartX;
      if (delta > 0) {
        e.currentTarget.style.transform = `translateX(${delta}px)`;
      }
    }

    function onPanelTouchEnd(e) {
      const delta = e.changedTouches[0].clientX - _swipeStartX;
      if (delta > 90) {
        e.currentTarget.style.transition = "transform 0.2s ease";
        e.currentTarget.style.transform = "translateX(100%)";
        setTimeout(closePanel, 200);
      } else {
        e.currentTarget.style.transition = "transform 0.2s ease";
        e.currentTarget.style.transform = "";
      }
    }

    // ── Lifecycle ─────────────────────────────────────────────

    onMounted(() => loadTab(tabs[0].id));

    return {
      tabs,
      activeTabId,
      tabData,
      isLoading,
      loadError,
      filterOpen,
      colPanelOpen,
      filters,
      columnVisibility,
      toggleColumn,
      activeTab,
      activeData,
      filteredData,
      filterGroups,
      leaderboards,
      activeFilterCount,
      switchTab,
      applyFilters,
      resetFilters,
      selectAll,
      clearGroup,
      activeChips,
      removeChip,
      formatStatValue,
      selectedPlayer,
      playerSeasons,
      playerMeta,
      playerCareer,
      closePanel,
      onPanelTouchStart,
      onPanelTouchMove,
      onPanelTouchEnd,
    };
  },
});

// Use [[ ]] delimiters to avoid conflict with Jinja2's {{ }}
prostarsApp.config.compilerOptions.delimiters = ["[[", "]]"];
prostarsApp.mount("#prostars-app");
