require([
  "esri/Map",
  "esri/Basemap",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/OpenStreetMapLayer",
  "esri/widgets/Search",
  "esri/geometry/Extent",
  "esri/geometry/geometryEngine"
], function (
  Map,
  Basemap,
  MapView,
  FeatureLayer,
  OpenStreetMapLayer,
  Search,
  Extent,
  geometryEngine
) {

  // =========================================================
  // SETTINGS
  // =========================================================

  const FACILITIES_URL =
    "https://services-eu1.arcgis.com/z1y55jruXrgzzpdi/arcgis/rest/services/Sport_Ireland_Facilities_Mapping/FeatureServer/0";

  const CLICK_TOLERANCE_PIXELS = 14;

  const OSM_OPACITY = 0.45;

  const IRELAND_CENTER = [
    -8,
    53.4
  ];

  const IRELAND_ZOOM = 7;


  // =========================================================
  // MAIN SPORTS
  // =========================================================

  const mainSports = [
    {
      value: "Gaelic Games",
      label: "Gaelic Games"
    },
    {
      value: "Soccer",
      label: "Soccer"
    },
    {
      value: "Golf",
      label: "Golf"
    },
    {
      value: "Tennis",
      label: "Tennis"
    },
    {
      value: "Basketball",
      label: "Basketball"
    },
    {
      value: "Athletics",
      label: "Athletics"
    },
    {
      value: "Hockey",
      label: "Hockey"
    },
    {
      value: "Cricket",
      label: "Cricket"
    },
    {
      value: "Sports Hall",
      label: "Sports Halls"
    },
    {
      value: "Swimming Indoor",
      label: "Swimming Indoor"
    }
  ];


  // =========================================================
  // SPORT COLOURS
  // =========================================================

  const sportColours = {
    "Gaelic Games": [0, 176, 80],
    "Soccer": [25, 110, 235],
    "Golf": [120, 145, 95],
    "Tennis": [235, 205, 0],
    "Basketball": [255, 145, 20],
    "Athletics": [145, 65, 205],
    "Hockey": [55, 65, 175],
    "Cricket": [185, 90, 165],
    "Sports Hall": [105, 105, 140],
    "Swimming Indoor": [0, 185, 220],

    "Rugby": [230, 65, 55],
    "Swimming Outdoor": [70, 165, 195],
    "Equestrian": [145, 125, 105],
    "Badminton": [220, 95, 155],
    "Boxing": [185, 75, 55],
    "Cycling": [55, 155, 125],
    "Gym": [105, 105, 105],
    "Gymnastics": [170, 100, 195],
    "Rowing": [55, 125, 175],
    "Sailing": [45, 145, 185],
    "Padel": [230, 165, 30],
    "5-a-side": [70, 155, 230],
    "Pitch and Putt": [130, 140, 120],
    "Canoe/Kayak": [100, 130, 135],
    "GAA Handball": [115, 115, 115],
    "Multiple": [145, 95, 165],
    "Other": [145, 145, 145]
  };


  // =========================================================
  // RENDERER
  // =========================================================

  const rendererInfos =
    Object.entries(sportColours).map(
      function ([sport, colour]) {

        return {
          value: sport,

          symbol: {
            type: "simple-fill",

            color: [
              colour[0],
              colour[1],
              colour[2],
              0.44
            ],

            outline: {
              color: [
                colour[0],
                colour[1],
                colour[2],
                1
              ],

              width: 2
            }
          }
        };

      }
    );


  // =========================================================
  // FACILITY LAYER
  // =========================================================

  const facilitiesLayer =
    new FeatureLayer({

      url: FACILITIES_URL,

      outFields: [
        "OBJECTID",
        "Sport",
        "Infrastructure_Type",
        "Surface",
        "Floodlights",
        "Owner",
        "Facility_Size",
        "Owner_Name",
        "Quality",
        "Local_Authority",
        "LEA",
        "Multi_Use",
        "Area_msq"
      ],

      minScale: 0,

      popupEnabled: false,

      renderer: {
        type: "unique-value",

        field: "Sport",

        defaultSymbol: {
          type: "simple-fill",

          color: [
            145,
            145,
            145,
            0.27
          ],

          outline: {
            color: [
              100,
              100,
              100,
              1
            ],

            width: 1.5
          }
        },

        uniqueValueInfos:
          rendererInfos
      }

    });


  // =========================================================
  // BASEMAP
  // =========================================================

  const osmLayer =
    new OpenStreetMapLayer({
      opacity: OSM_OPACITY
    });


  const customBasemap =
    new Basemap({

      baseLayers: [
        osmLayer
      ],

      title:
        "Muted OpenStreetMap"

    });


  // =========================================================
  // MAP
  // =========================================================

  const map =
    new Map({

      basemap:
        customBasemap,

      layers: [
        facilitiesLayer
      ]

    });


  // =========================================================
  // VIEW
  // =========================================================

  const view =
    new MapView({

      container:
        "viewDiv",

      map:
        map,

      center:
        IRELAND_CENTER,

      zoom:
        IRELAND_ZOOM,

      background: {
        color: [
          245,
          246,
          245,
          1
        ]
      },

      constraints: {
        minZoom: 6
      },

      highlightOptions: {
        color: [
          0,
          190,
          175,
          1
        ],

        haloOpacity: 0.9,

        fillOpacity: 0.10
      }

    });


  // =========================================================
  // SEARCH
  // =========================================================

  const search =
    new Search({

      view: view,

      includeDefaultSources: true,

      locationEnabled: false

    });


  view.ui.add(
    search,
    "top-right"
  );


  // =========================================================
  // STATE
  // =========================================================

  let facilitiesLayerView =
    null;

  let highlightHandle =
    null;

  let currentOverlayGraphic =
    null;

  let selectedGraphics =
    [];

  let selectedIndex =
    0;

  let selectedGraphic =
    null;


  // =========================================================
  // HTML ELEMENTS
  // =========================================================

  const resultCount =
    document.getElementById(
      "resultCount"
    );

  const emptyState =
    document.getElementById(
      "emptyState"
    );

  const facilityDetails =
    document.getElementById(
      "facilityDetails"
    );

  const closeDetails =
    document.getElementById(
      "closeDetails"
    );

  const zoomToFacility =
    document.getElementById(
      "zoomToFacility"
    );

  const homeButton =
    document.getElementById(
      "homeButton"
    );

  const selectAllFilters =
    document.getElementById(
      "selectAllFilters"
    );

  const deselectAllFilters =
    document.getElementById(
      "deselectAllFilters"
    );

  const mainSportFilters =
    document.getElementById(
      "mainSportFilters"
    );

  const moreSportFilters =
    document.getElementById(
      "moreSportFilters"
    );

  const moreSportsButton =
    document.getElementById(
      "moreSportsButton"
    );

  const moreSportsArrow =
    document.getElementById(
      "moreSportsArrow"
    );

  const ownerFilters =
    document.getElementById(
      "ownerFilters"
    );

  const legendItems =
    document.getElementById(
      "legendItems"
    );

  const selectionNavigator =
    document.getElementById(
      "selectionNavigator"
    );

  const selectionPosition =
    document.getElementById(
      "selectionPosition"
    );

  const previousFacility =
    document.getElementById(
      "previousFacility"
    );

  const nextFacility =
    document.getElementById(
      "nextFacility"
    );


  // =========================================================
  // LOAD
  // =========================================================

  view.when(
    async function () {

      await facilitiesLayer.load();

      facilitiesLayerView =
        await view.whenLayerView(
          facilitiesLayer
        );

      buildFilterLists();

      buildLegend();

      await updateResultCount();

    }
  )
  .catch(
    function (error) {

      console.error(
        "LOAD ERROR:",
        error
      );

      if (resultCount) {

        resultCount.textContent =
          "Unable to load facilities";

      }

    }
  );


  // =========================================================
  // BUILD FILTERS
  // =========================================================

  function buildFilterLists() {

    buildSportFilters();

    buildDomainFilter(
      "Owner",
      ownerFilters,
      "owner-filter"
    );

  }


  // =========================================================
  // SPORT FILTERS
  // =========================================================

  function buildSportFilters() {

    const sportField =
      facilitiesLayer.fields.find(
        function (field) {

          return (
            field.name ===
            "Sport"
          );

        }
      );


    if (
      !sportField ||
      !sportField.domain ||
      !sportField.domain.codedValues
    ) {

      console.error(
        "Sport domain not found"
      );

      return;

    }


    mainSportFilters.innerHTML =
      "";

    moreSportFilters.innerHTML =
      "";


    const domainValues =
      sportField.domain.codedValues.slice();


    mainSports.forEach(
      function (mainSport) {

        const match =
          domainValues.find(
            function (codedValue) {

              return (
                codedValue.code ===
                  mainSport.value ||
                codedValue.name ===
                  mainSport.value
              );

            }
          );


        if (match) {

          addSportCheckbox(
            match,
            mainSportFilters,
            mainSport.label
          );

        }

      }
    );


    const mainValues =
      mainSports.map(
        function (sport) {

          return sport.value;

        }
      );


    domainValues

      .filter(
        function (codedValue) {

          return (
            !mainValues.includes(
              codedValue.code
            )
            &&
            !mainValues.includes(
              codedValue.name
            )
          );

        }
      )

      .sort(
        function (a, b) {

          return a.name.localeCompare(
            b.name
          );

        }
      )

      .forEach(
        function (codedValue) {

          addSportCheckbox(
            codedValue,
            moreSportFilters,
            codedValue.name
          );

        }
      );

  }


  // =========================================================
  // ADD SPORT CHECKBOX
  // =========================================================

  function addSportCheckbox(
    codedValue,
    container,
    displayLabel
  ) {

    const label =
      document.createElement(
        "label"
      );


    label.className =
      "checkbox-item";


    const checkbox =
      document.createElement(
        "input"
      );


    checkbox.type =
      "checkbox";


    checkbox.value =
      codedValue.code;


    checkbox.classList.add(
      "sport-filter"
    );


    checkbox.checked =
      true;


    label.appendChild(
      checkbox
    );


    const square =
      document.createElement(
        "span"
      );


    square.className =
      "colour-square";


    const colour =
      sportColours[
        codedValue.code
      ]
      ||
      sportColours[
        codedValue.name
      ]
      ||
      [
        145,
        145,
        145
      ];


    square.style.backgroundColor =
      "rgb(" +
      colour[0] +
      "," +
      colour[1] +
      "," +
      colour[2] +
      ")";


    label.appendChild(
      square
    );


    const text =
      document.createElement(
        "span"
      );


    text.textContent =
      displayLabel;


    label.appendChild(
      text
    );


    checkbox.addEventListener(
      "change",
      applyFilters
    );


    container.appendChild(
      label
    );

  }


  // =========================================================
  // OWNER FILTER
  // =========================================================

  function buildDomainFilter(
    fieldName,
    container,
    className
  ) {

    if (!container) {
      return;
    }


    const field =
      facilitiesLayer.fields.find(
        function (fieldItem) {

          return (
            fieldItem.name ===
            fieldName
          );

        }
      );


    if (
      !field ||
      !field.domain ||
      !field.domain.codedValues
    ) {

      return;

    }


    container.innerHTML =
      "";


    field.domain.codedValues.forEach(
      function (codedValue) {

        const label =
          document.createElement(
            "label"
          );


        label.className =
          "checkbox-item";


        const checkbox =
          document.createElement(
            "input"
          );


        checkbox.type =
          "checkbox";


        checkbox.value =
          codedValue.code;


        checkbox.classList.add(
          className
        );


        checkbox.checked =
          true;


        label.appendChild(
          checkbox
        );


        const text =
          document.createElement(
            "span"
          );


        text.textContent =
          codedValue.name;


        label.appendChild(
          text
        );


        checkbox.addEventListener(
          "change",
          applyFilters
        );


        container.appendChild(
          label
        );

      }
    );

  }


  // =========================================================
  // MORE SPORTS
  // =========================================================

  if (moreSportsButton) {

    moreSportsButton.addEventListener(
      "click",
      function () {

        const isHidden =
          moreSportFilters.classList.contains(
            "hidden"
          );


        if (isHidden) {

          moreSportFilters.classList.remove(
            "hidden"
          );

          moreSportsArrow.textContent =
            "▴";

        }
        else {

          moreSportFilters.classList.add(
            "hidden"
          );

          moreSportsArrow.textContent =
            "▾";

        }

      }
    );

  }


  // =========================================================
  // LEGEND
  // =========================================================

  function buildLegend() {

    if (!legendItems) {
      return;
    }


    legendItems.innerHTML =
      "";


    mainSports.forEach(
      function (sport) {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "legend-item";


        const square =
          document.createElement(
            "span"
          );


        square.className =
          "legend-colour";


        const colour =
          sportColours[
            sport.value
          ]
          ||
          [
            145,
            145,
            145
          ];


        square.style.backgroundColor =
          "rgb(" +
          colour[0] +
          "," +
          colour[1] +
          "," +
          colour[2] +
          ")";


        const text =
          document.createElement(
            "span"
          );


        text.textContent =
          sport.label;


        row.appendChild(
          square
        );


        row.appendChild(
          text
        );


        legendItems.appendChild(
          row
        );

      }
    );

  }


  // =========================================================
  // APPLY FILTERS
  // =========================================================

  async function applyFilters() {

    if (!facilitiesLayerView) {
      return;
    }


    const selectedSports =
      getCheckedValues(
        ".sport-filter"
      );


    const selectedOwners =
      getCheckedValues(
        ".owner-filter"
      );


    const totalSportBoxes =
      document.querySelectorAll(
        ".sport-filter"
      ).length;


    const totalOwnerBoxes =
      document.querySelectorAll(
        ".owner-filter"
      ).length;


    const nothingSelected =
      selectedSports.length === 0 &&
      selectedOwners.length === 0;


    if (nothingSelected) {

      facilitiesLayerView.filter = {
        where: "1=0"
      };


      clearSelection();

      await updateResultCount();

      return;

    }


    const clauses =
      [];


    if (
      selectedSports.length > 0 &&
      selectedSports.length <
        totalSportBoxes
    ) {

      clauses.push(
        buildInClause(
          "Sport",
          selectedSports
        )
      );

    }


    if (
      selectedOwners.length > 0 &&
      selectedOwners.length <
        totalOwnerBoxes
    ) {

      clauses.push(
        buildInClause(
          "Owner",
          selectedOwners
        )
      );

    }


    const whereClause =
      clauses.length > 0
        ? clauses.join(
            " AND "
          )
        : "1=1";


    facilitiesLayerView.filter = {
      where: whereClause
    };


    clearSelection();

    await updateResultCount();

  }


  // =========================================================
  // FILTER HELPERS
  // =========================================================

  function getCurrentWhereClause() {

    if (
      facilitiesLayerView &&
      facilitiesLayerView.filter &&
      facilitiesLayerView.filter.where
    ) {

      return (
        facilitiesLayerView.filter.where
      );

    }


    return "1=1";

  }


  function getCheckedValues(
    selector
  ) {

    return Array.from(

      document.querySelectorAll(
        selector + ":checked"
      )

    ).map(
      function (checkbox) {

        return checkbox.value;

      }
    );

  }


  function buildInClause(
    fieldName,
    values
  ) {

    const escapedValues =
      values.map(
        function (value) {

          return (
            "'" +
            String(value).replace(
              /'/g,
              "''"
            ) +
            "'"
          );

        }
      );


    return (
      fieldName +
      " IN (" +
      escapedValues.join(",") +
      ")"
    );

  }


  // =========================================================
  // SELECT ALL
  // =========================================================

  if (selectAllFilters) {

    selectAllFilters.addEventListener(
      "click",
      async function () {

        document
          .querySelectorAll(
            ".sport-filter, .owner-filter"
          )
          .forEach(
            function (checkbox) {

              checkbox.checked =
                true;

            }
          );


        if (facilitiesLayerView) {

          facilitiesLayerView.filter =
            null;

        }


        clearSelection();

        await updateResultCount();

      }
    );

  }


  // =========================================================
  // DESELECT ALL
  // =========================================================

  if (deselectAllFilters) {

    deselectAllFilters.addEventListener(
      "click",
      async function () {

        document
          .querySelectorAll(
            ".sport-filter, .owner-filter"
          )
          .forEach(
            function (checkbox) {

              checkbox.checked =
                false;

            }
          );


        if (facilitiesLayerView) {

          facilitiesLayerView.filter = {
            where: "1=0"
          };

        }


        clearSelection();

        await updateResultCount();

      }
    );

  }


  // =========================================================
  // RESULT COUNT
  // =========================================================

  async function updateResultCount() {

    if (!facilitiesLayerView) {
      return;
    }


    try {

      const query =
        facilitiesLayer.createQuery();


      query.where =
        getCurrentWhereClause();


      const count =
        await facilitiesLayer.queryFeatureCount(
          query
        );


      if (resultCount) {

        resultCount.textContent =
          count.toLocaleString(
            "en-IE"
          )
          +
          (
            count === 1
              ? " facility"
              : " facilities"
          );

      }

    }
    catch (error) {

      console.error(
        "COUNT ERROR:",
        error
      );

    }

  }


  // =========================================================
  // CLICK FACILITY
  // =========================================================

  view.on(
    "click",
    async function (event) {

      try {

        const clickedPoint =
          event.mapPoint;


        if (!clickedPoint) {

          clearSelection();

          return;

        }


        const topLeft =
          view.toMap({
            x:
              event.x -
              CLICK_TOLERANCE_PIXELS,

            y:
              event.y -
              CLICK_TOLERANCE_PIXELS
          });


        const bottomRight =
          view.toMap({
            x:
              event.x +
              CLICK_TOLERANCE_PIXELS,

            y:
              event.y +
              CLICK_TOLERANCE_PIXELS
          });


        if (
          !topLeft ||
          !bottomRight
        ) {

          clearSelection();

          return;

        }


        const searchExtent =
          new Extent({

            xmin:
              Math.min(
                topLeft.x,
                bottomRight.x
              ),

            ymin:
              Math.min(
                topLeft.y,
                bottomRight.y
              ),

            xmax:
              Math.max(
                topLeft.x,
                bottomRight.x
              ),

            ymax:
              Math.max(
                topLeft.y,
                bottomRight.y
              ),

            spatialReference:
              view.spatialReference

          });


        const query =
          facilitiesLayer.createQuery();


        query.geometry =
          searchExtent;


        query.spatialRelationship =
          "intersects";


        query.where =
          getCurrentWhereClause();


        query.returnGeometry =
          true;


        query.outFields = [
          "OBJECTID",
          "Sport",
          "Infrastructure_Type",
          "Surface",
          "Floodlights",
          "Owner",
          "Facility_Size",
          "Owner_Name",
          "Quality",
          "Local_Authority",
          "LEA",
          "Multi_Use",
          "Area_msq"
        ];


        const response =
          await facilitiesLayer.queryFeatures(
            query
          );


        const nearbyFacilities =
          response.features || [];


        if (
          nearbyFacilities.length === 0
        ) {

          clearSelection();

          return;

        }


        const overlappingFacilities =
          nearbyFacilities.filter(
            function (facility) {

              if (!facility.geometry) {
                return false;
              }


              try {

                return (
                  geometryEngine.intersects(
                    facility.geometry,
                    clickedPoint
                  )
                );

              }
              catch (error) {

                return false;

              }

            }
          );


        if (
          overlappingFacilities.length > 0
        ) {

          overlappingFacilities.sort(
            function (a, b) {

              return (
                getPolygonArea(
                  a.geometry
                )
                -
                getPolygonArea(
                  b.geometry
                )
              );

            }
          );


          selectFacilities(
            overlappingFacilities
          );


          return;

        }


        let nearestFacility =
          null;


        let nearestDistance =
          Infinity;


        nearbyFacilities.forEach(
          function (facility) {

            if (!facility.geometry) {
              return;
            }


            let distance;


            try {

              distance =
                geometryEngine.distance(
                  clickedPoint,
                  facility.geometry
                );

            }
            catch (error) {

              distance =
                Infinity;

            }


            if (
              distance === null ||
              distance === undefined ||
              isNaN(distance)
            ) {

              distance =
                Infinity;

            }


            if (
              distance <
              nearestDistance
            ) {

              nearestDistance =
                distance;

              nearestFacility =
                facility;

            }

          }
        );


        if (!nearestFacility) {

          nearestFacility =
            nearbyFacilities[0];

        }


        selectFacilities(
          [
            nearestFacility
          ]
        );

      }
      catch (error) {

        console.error(
          "FACILITY SELECTION ERROR:",
          error
        );

      }

    }
  );


  // =========================================================
  // SELECT FACILITIES
  // =========================================================

  function selectFacilities(
    graphics
  ) {

    clearMapHighlightsOnly();


    selectedGraphics =
      graphics || [];


    if (
      selectedGraphics.length === 0
    ) {

      clearSelection();

      return;

    }


    selectedIndex =
      0;


    if (facilitiesLayerView) {

      const objectIds =
        selectedGraphics

          .map(
            function (graphic) {

              return graphic.getObjectId();

            }
          )

          .filter(
            function (objectId) {

              return (
                objectId !== null &&
                objectId !== undefined
              );

            }
          );


      if (
        objectIds.length > 0
      ) {

        highlightHandle =
          facilitiesLayerView.highlight(
            objectIds
          );

      }

    }


    showCurrentFacility();

  }


  // =========================================================
  // SHOW CURRENT FACILITY
  // =========================================================

  function showCurrentFacility() {

    if (
      selectedGraphics.length === 0
    ) {

      clearSelection();

      return;

    }


    selectedGraphic =
      selectedGraphics[
        selectedIndex
      ];


    updateCurrentOverlay();


    showFacilityDetails(
      selectedGraphic.attributes
    );


    updateSelectionNavigator();

  }


  // =========================================================
  // CURRENT FACILITY STRONG OUTLINE
  // =========================================================

  function updateCurrentOverlay() {

    if (currentOverlayGraphic) {

      view.graphics.remove(
        currentOverlayGraphic
      );


      currentOverlayGraphic =
        null;

    }


    if (
      !selectedGraphic ||
      !selectedGraphic.geometry
    ) {

      return;

    }


    currentOverlayGraphic =
      selectedGraphic.clone();


    currentOverlayGraphic.symbol = {
      type: "simple-fill",

      color: [
        0,
        170,
        150,
        0.06
      ],

      outline: {
        color: [
          0,
          90,
          75,
          1
        ],

        width: 4
      }
    };


    view.graphics.add(
      currentOverlayGraphic
    );

  }


  // =========================================================
  // NAVIGATOR
  // =========================================================

  function updateSelectionNavigator() {

    if (
      selectedGraphics.length > 1
    ) {

      selectionNavigator.classList.remove(
        "hidden"
      );


      selectionPosition.textContent =
        (
          selectedIndex + 1
        )
        +
        " of "
        +
        selectedGraphics.length;

    }
    else {

      selectionNavigator.classList.add(
        "hidden"
      );

    }

  }


  if (previousFacility) {

    previousFacility.addEventListener(
      "click",
      function () {

        if (
          selectedGraphics.length <= 1
        ) {
          return;
        }


        selectedIndex =
          (
            selectedIndex -
            1 +
            selectedGraphics.length
          )
          %
          selectedGraphics.length;


        showCurrentFacility();

      }
    );

  }


  if (nextFacility) {

    nextFacility.addEventListener(
      "click",
      function () {

        if (
          selectedGraphics.length <= 1
        ) {
          return;
        }


        selectedIndex =
          (
            selectedIndex +
            1
          )
          %
          selectedGraphics.length;


        showCurrentFacility();

      }
    );

  }


  // =========================================================
  // POLYGON AREA
  // =========================================================

  function getPolygonArea(
    geometry
  ) {

    if (!geometry) {
      return Infinity;
    }


    try {

      const area =
        Math.abs(
          geometryEngine.geodesicArea(
            geometry,
            "square-meters"
          )
        );


      if (
        isFinite(area) &&
        area > 0
      ) {

        return area;

      }

    }
    catch (error) {
      // fallback below
    }


    if (geometry.extent) {

      return (
        geometry.extent.width *
        geometry.extent.height
      );

    }


    return Infinity;

  }


  // =========================================================
  // FACILITY DETAILS
  // =========================================================

  function showFacilityDetails(
    attributes
  ) {

    if (!attributes) {
      return;
    }


    let title =
      cleanValue(
        attributes.Owner_Name
      );


    if (
      title ===
      "Not recorded"
    ) {

      const sport =
        cleanValue(
          attributes.Sport
        );


      const type =
        cleanValue(
          attributes.Infrastructure_Type
        );


      title =
        sport !== "Not recorded" &&
        type !== "Not recorded"

          ? sport +
            " - " +
            type

          : sport +
            " facility";

    }


    setText(
      "detailTitle",
      title
    );


    setText(
      "detailSportTag",
      displaySportName(
        attributes.Sport
      )
    );


    setSportTagColour(
      attributes.Sport
    );


    setText(
      "detailTypeTag",
      cleanValue(
        attributes.Infrastructure_Type
      )
    );


    setText(
      "detailSport",
      displaySportName(
        attributes.Sport
      )
    );


    setText(
      "detailInfrastructure",
      cleanValue(
        attributes.Infrastructure_Type
      )
    );


    setText(
      "detailSurface",
      cleanValue(
        attributes.Surface
      )
    );


    setText(
      "detailFloodlights",
      formatFloodlights(
        attributes.Floodlights
      )
    );


    setText(
      "detailOwner",
      cleanValue(
        attributes.Owner
      )
    );


    setText(
      "detailOwnerName",
      cleanValue(
        attributes.Owner_Name
      )
    );


    setText(
      "detailSize",
      cleanValue(
        attributes.Facility_Size
      )
    );


    setText(
      "detailQuality",
      formatQuality(
        attributes.Quality
      )
    );


    setText(
      "detailMultiUse",
      cleanValue(
        attributes.Multi_Use
      )
    );


    setText(
      "detailLA",
      titleCase(
        attributes.Local_Authority
      )
    );


    setText(
      "detailLEA",
      titleCase(
        attributes.LEA
      )
    );


    setText(
      "detailArea",
      formatArea(
        attributes.Area_msq
      )
    );


    if (emptyState) {

      emptyState.classList.add(
        "hidden"
      );

    }


    if (facilityDetails) {

      facilityDetails.classList.remove(
        "hidden"
      );

    }

  }


  // =========================================================
  // SPORT DISPLAY
  // =========================================================

  function displaySportName(
    value
  ) {

    if (
      value ===
      "Sports Hall"
    ) {

      return "Sports Halls";

    }


    return cleanValue(
      value
    );

  }


  // =========================================================
  // SPORT TAG COLOUR
  // =========================================================

  function setSportTagColour(
    sport
  ) {

    const tag =
      document.getElementById(
        "detailSportTag"
      );


    if (!tag) {
      return;
    }


    const colour =
      sportColours[
        sport
      ]
      ||
      [
        130,
        130,
        130
      ];


    tag.style.backgroundColor =
      "rgb(" +
      colour[0] +
      "," +
      colour[1] +
      "," +
      colour[2] +
      ")";

  }


  // =========================================================
  // FORMATTERS
  // =========================================================

  function formatQuality(
    value
  ) {

    const labels = {
      1: "Poor",
      2: "Good / Satisfactory",
      3: "Excellent"
    };


    return (
      labels[value] ||
      cleanValue(
        value
      )
    );

  }


  function formatFloodlights(
    value
  ) {

    if (
      value ===
      "Floodlights"
    ) {

      return "Yes";

    }


    if (
      value ===
      "No Floodlights"
    ) {

      return "No";

    }


    return cleanValue(
      value
    );

  }


  function titleCase(
    value
  ) {

    const cleaned =
      cleanValue(
        value
      );


    if (
      cleaned ===
      "Not recorded"
    ) {

      return cleaned;

    }


    return cleaned
      .toLowerCase()
      .replace(
        /\b\w/g,
        function (letter) {

          return letter.toUpperCase();

        }
      );

  }


  // =========================================================
  // CLEAR MAP HIGHLIGHTS
  // =========================================================

  function clearMapHighlightsOnly() {

    if (highlightHandle) {

      highlightHandle.remove();

      highlightHandle =
        null;

    }


    if (currentOverlayGraphic) {

      view.graphics.remove(
        currentOverlayGraphic
      );

      currentOverlayGraphic =
        null;

    }

  }


  // =========================================================
  // CLEAR SELECTION
  // =========================================================

  function clearSelection() {

    clearMapHighlightsOnly();


    selectedGraphics =
      [];

    selectedIndex =
      0;

    selectedGraphic =
      null;


    if (selectionNavigator) {

      selectionNavigator.classList.add(
        "hidden"
      );

    }


    if (facilityDetails) {

      facilityDetails.classList.add(
        "hidden"
      );

    }


    if (emptyState) {

      emptyState.classList.remove(
        "hidden"
      );

    }

  }


  // =========================================================
  // CLOSE
  // =========================================================

  if (closeDetails) {

    closeDetails.addEventListener(
      "click",
      clearSelection
    );

  }


  // =========================================================
  // ZOOM TO CURRENT FACILITY
  // =========================================================

  if (zoomToFacility) {

    zoomToFacility.addEventListener(
      "click",
      async function () {

        if (
          !selectedGraphic ||
          !selectedGraphic.geometry
        ) {

          return;

        }


        try {

          const geometry =
            selectedGraphic.geometry;


          const target =
            geometry.extent

              ? geometry.extent.expand(
                  2.2
                )

              : geometry;


          view.padding = {
            top: 20,
            right: 140,
            bottom: 20,
            left: 20
          };


          await view.goTo(
            target,
            {
              duration: 800
            }
          );

        }
        catch (error) {

          if (
            error.name !==
            "AbortError"
          ) {

            console.error(
              "ZOOM ERROR:",
              error
            );

          }

        }

      }
    );

  }


  // =========================================================
  // FULL IRELAND
  // =========================================================

  if (homeButton) {

    homeButton.addEventListener(
      "click",
      async function () {

        try {

          view.padding = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          };


          await view.goTo(
            {
              center:
                IRELAND_CENTER,

              zoom:
                IRELAND_ZOOM
            },
            {
              duration:
                900
            }
          );

        }
        catch (error) {

          if (
            error.name !==
            "AbortError"
          ) {

            console.error(
              "HOME VIEW ERROR:",
              error
            );

          }

        }

      }
    );

  }


  // =========================================================
  // GENERIC HELPERS
  // =========================================================

  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(
        id
      );


    if (element) {

      element.textContent =
        value;

    }

  }


  function cleanValue(
    value
  ) {

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === " " ||
      value === "NULL"
    ) {

      return "Not recorded";

    }


    return String(
      value
    );

  }


  function formatArea(
    value
  ) {

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      isNaN(
        Number(value)
      )
    ) {

      return "Not recorded";

    }


    const area =
      Number(value);


    if (
      area >=
      10000
    ) {

      return (
        (
          area /
          10000
        ).toLocaleString(
          "en-IE",
          {
            maximumFractionDigits: 2
          }
        )
        +
        " ha"
      );

    }


    return (
      area.toLocaleString(
        "en-IE",
        {
          maximumFractionDigits: 0
        }
      )
      +
      " m²"
    );

  }

});
