// =========================================================
// SPORT IRELAND FACILITIES EXPLORER
// POINT SEARCH + SPIDER MODE
// =========================================================


// =========================================================
// SETTINGS
// =========================================================

const FACILITIES_URL =
    "https://services-eu1.arcgis.com/z1y55jruXrgzzpdi/arcgis/rest/services/Sport_Ireland_Facilities_Mapping/FeatureServer/0/query";


const BASE_WHERE =
    "(Validation <> 'Remove' OR Validation IS NULL)";


const NEAREST_COUNT =
    8;


const CACHE_RADIUS_KM =
    45;


const PAGE_SIZE =
    2000;


const IRELAND_CENTER = [
    -8.0,
    53.4
];


const IRELAND_ZOOM =
    6.3;



// =========================================================
// STATE
// =========================================================

let currentMode =
    "point";


let selectedSport =
    "";


let searchPoint =
    null;


let regionalFeatures =
    [];


let cacheCentre =
    null;


let cacheSport =
    null;


let nearestFeatures =
    [];


let fetchRequestId =
    0;



// =========================================================
// HTML
// =========================================================

const pointModeButton =
    document.getElementById(
        "pointModeButton"
    );


const spiderModeButton =
    document.getElementById(
        "spiderModeButton"
    );


const pointSearchControls =
    document.getElementById(
        "pointSearchControls"
    );


const spiderControls =
    document.getElementById(
        "spiderControls"
    );


const sportSelect =
    document.getElementById(
        "sportSelect"
    );


const placeSearch =
    document.getElementById(
        "placeSearch"
    );


const searchButton =
    document.getElementById(
        "searchButton"
    );


const useMapCentreButton =
    document.getElementById(
        "useMapCentreButton"
    );


const searchMessage =
    document.getElementById(
        "searchMessage"
    );


const facilityCount =
    document.getElementById(
        "facilityCount"
    );


const averageDistance =
    document.getElementById(
        "averageDistance"
    );


const resultsStatus =
    document.getElementById(
        "resultsStatus"
    );


const resultsList =
    document.getElementById(
        "resultsList"
    );


const centreTarget =
    document.getElementById(
        "centreTarget"
    );


const mapStatus =
    document.getElementById(
        "mapStatus"
    );


const fullIrelandButton =
    document.getElementById(
        "fullIrelandButton"
    );



// =========================================================
// MAP
// =========================================================

const map =
    new maplibregl.Map({

        container:
            "map",

        style: {
            version: 8,

            sources: {

                osm: {
                    type:
                        "raster",

                    tiles: [
                        "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    ],

                    tileSize:
                        256,

                    attribution:
                        "© OpenStreetMap contributors"
                }

            },

            layers: [

                {
                    id:
                        "osm",

                    type:
                        "raster",

                    source:
                        "osm",

                    paint: {
                        "raster-opacity":
                            0.58,

                        "raster-saturation":
                            -0.45
                    }
                }

            ]
        },

        center:
            IRELAND_CENTER,

        zoom:
            IRELAND_ZOOM

    });



map.addControl(
    new maplibregl.NavigationControl(),
    "top-left"
);



// =========================================================
// MAP LOAD
// =========================================================

map.on(
    "load",
    async function () {

        addMapSourcesAndLayers();

        await loadSportValues();

        mapStatus.textContent =
            "Ready";

    }
);



// =========================================================
// SOURCES / LAYERS
// =========================================================

function addMapSourcesAndLayers() {

    // -----------------------------------------------------
    // NEAREST FACILITY POLYGONS
    // -----------------------------------------------------

    map.addSource(
        "nearest-facilities",
        {
            type:
                "geojson",

            data:
                emptyFeatureCollection()
        }
    );


    map.addLayer(
        {
            id:
                "nearest-facilities-fill",

            type:
                "fill",

            source:
                "nearest-facilities",

            paint: {

                "fill-color":
                    [
                        "case",

                        [
                            "==",
                            ["get", "Sport"],
                            "Gaelic Games"
                        ],
                        "#00a878",

                        [
                            "==",
                            ["get", "Sport"],
                            "Soccer"
                        ],
                        "#247be0",

                        [
                            "==",
                            ["get", "Sport"],
                            "Rugby"
                        ],
                        "#df4b42",

                        [
                            "==",
                            ["get", "Sport"],
                            "Basketball"
                        ],
                        "#f68b1f",

                        [
                            "==",
                            ["get", "Sport"],
                            "Tennis"
                        ],
                        "#d9c500",

                        "#787f7c"
                    ],

                "fill-opacity":
                    0.42
            }
        }
    );


    map.addLayer(
        {
            id:
                "nearest-facilities-outline",

            type:
                "line",

            source:
                "nearest-facilities",

            paint: {

                "line-color":
                    [
                        "case",

                        [
                            "==",
                            ["get", "Sport"],
                            "Gaelic Games"
                        ],
                        "#007f59",

                        [
                            "==",
                            ["get", "Sport"],
                            "Soccer"
                        ],
                        "#125cba",

                        [
                            "==",
                            ["get", "Sport"],
                            "Rugby"
                        ],
                        "#b52f29",

                        [
                            "==",
                            ["get", "Sport"],
                            "Basketball"
                        ],
                        "#c86a00",

                        [
                            "==",
                            ["get", "Sport"],
                            "Tennis"
                        ],
                        "#a99500",

                        "#555f5a"
                    ],

                "line-width":
                    2.5
            }
        }
    );


    // -----------------------------------------------------
    // SPIDER LINES
    // -----------------------------------------------------

    map.addSource(
        "spider-lines",
        {
            type:
                "geojson",

            data:
                emptyFeatureCollection()
        }
    );


    map.addLayer(
        {
            id:
                "spider-lines",

            type:
                "line",

            source:
                "spider-lines",

            paint: {
                "line-color":
                    "#006b4f",

                "line-width":
                    2,

                "line-opacity":
                    0.72,

                "line-dasharray":
                    [
                        2,
                        2
                    ]
            }
        },
        "nearest-facilities-fill"
    );


    // -----------------------------------------------------
    // SEARCH / CENTRE POINT
    // -----------------------------------------------------

    map.addSource(
        "origin-point",
        {
            type:
                "geojson",

            data:
                emptyFeatureCollection()
        }
    );


    map.addLayer(
        {
            id:
                "origin-point",

            type:
                "circle",

            source:
                "origin-point",

            paint: {
                "circle-radius":
                    7,

                "circle-color":
                    "#006b4f",

                "circle-stroke-color":
                    "#ffffff",

                "circle-stroke-width":
                    2
            }
        }
    );

}



// =========================================================
// MODE SWITCH
// =========================================================

pointModeButton.addEventListener(
    "click",
    function () {

        setMode(
            "point"
        );

    }
);


spiderModeButton.addEventListener(
    "click",
    function () {

        setMode(
            "spider"
        );

    }
);



function setMode(
    mode
) {

    currentMode =
        mode;


    const spiderMode =
        mode ===
        "spider";


    pointModeButton.classList.toggle(
        "active",
        !spiderMode
    );


    spiderModeButton.classList.toggle(
        "active",
        spiderMode
    );


    pointSearchControls.classList.toggle(
        "hidden",
        spiderMode
    );


    spiderControls.classList.toggle(
        "hidden",
        !spiderMode
    );


    centreTarget.classList.toggle(
        "hidden",
        !spiderMode
    );


    clearCurrentResults();


    if (spiderMode) {

        searchPoint =
            null;


        regionalFeatures =
            [];


        cacheCentre =
            null;


        refreshSpiderMode(
            true
        );

    }
    else {

        setOriginPoint(
            null
        );


        mapStatus.textContent =
            "Point Search";

    }

}



// =========================================================
// SPORT VALUES
// =========================================================

async function loadSportValues() {

    try {

        const url =
            new URL(
                FACILITIES_URL
            );


        url.searchParams.set(
            "where",
            BASE_WHERE
        );


        url.searchParams.set(
            "outFields",
            "Sport"
        );


        url.searchParams.set(
            "returnGeometry",
            "false"
        );


        url.searchParams.set(
            "returnDistinctValues",
            "true"
        );


        url.searchParams.set(
            "orderByFields",
            "Sport ASC"
        );


        url.searchParams.set(
            "f",
            "json"
        );


        const response =
            await fetch(
                url.toString()
            );


        const data =
            await response.json();


        const sports =
            [
                ...new Set(

                    (
                        data.features ||
                        []
                    )

                    .map(
                        function (feature) {

                            return (
                                feature.attributes &&
                                feature.attributes.Sport
                            );

                        }
                    )

                    .filter(
                        Boolean
                    )

                )
            ];


        sports.sort(
            function (a, b) {

                return a.localeCompare(
                    b
                );

            }
        );


        sports.forEach(
            function (sport) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    sport;


                option.textContent =
                    sport;


                sportSelect.appendChild(
                    option
                );

            }
        );

    }
    catch (error) {

        console.error(
            "SPORT LOAD ERROR:",
            error
        );

    }

}



// =========================================================
// SPORT CHANGE
// =========================================================

sportSelect.addEventListener(
    "change",
    async function () {

        selectedSport =
            sportSelect.value;


        regionalFeatures =
            [];


        cacheCentre =
            null;


        cacheSport =
            null;


        if (
            currentMode ===
            "spider"
        ) {

            await refreshSpiderMode(
                true
            );

        }
        else if (
            searchPoint
        ) {

            await runPointSearch(
                searchPoint,
                true
            );

        }

    }
);



// =========================================================
// PLACE SEARCH
// =========================================================

searchButton.addEventListener(
    "click",
    runPlaceSearch
);


placeSearch.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Enter"
        ) {

            runPlaceSearch();

        }

    }
);



async function runPlaceSearch() {

    const query =
        placeSearch.value.trim();


    if (!query) {

        searchMessage.textContent =
            "Enter a town, address or place.";

        return;

    }


    searchMessage.textContent =
        "Searching…";


    try {

        const url =
            "https://nominatim.openstreetmap.org/search"
            +
            "?format=json"
            +
            "&limit=1"
            +
            "&countrycodes=ie"
            +
            "&q="
            +
            encodeURIComponent(
                query
            );


        const response =
            await fetch(
                url,
                {
                    headers: {
                        "Accept-Language":
                            "en"
                    }
                }
            );


        const results =
            await response.json();


        if (
            !results ||
            results.length === 0
        ) {

            searchMessage.textContent =
                "Location not found.";

            return;

        }


        const lon =
            Number(
                results[0].lon
            );


        const lat =
            Number(
                results[0].lat
            );


        searchPoint = [
            lon,
            lat
        ];


        searchMessage.textContent =
            results[0].display_name;


        map.flyTo(
            {
                center:
                    searchPoint,

                zoom:
                    Math.max(
                        map.getZoom(),
                        11
                    )
            }
        );


        await runPointSearch(
            searchPoint,
            true
        );

    }
    catch (error) {

        console.error(
            "PLACE SEARCH ERROR:",
            error
        );


        searchMessage.textContent =
            "Unable to search for that location.";

    }

}



// =========================================================
// USE MAP CENTRE
// =========================================================

useMapCentreButton.addEventListener(
    "click",
    async function () {

        const centre =
            map.getCenter();


        searchPoint = [
            centre.lng,
            centre.lat
        ];


        searchMessage.textContent =
            "Using current map centre.";


        await runPointSearch(
            searchPoint,
            true
        );

    }
);



// =========================================================
// SPIDER MAP MOVEMENT
// =========================================================

map.on(
    "move",
    function () {

        if (
            currentMode !==
            "spider"
        ) {

            return;

        }


        const centre =
            map.getCenter();


        const centrePoint = [
            centre.lng,
            centre.lat
        ];


        if (
            regionalFeatures.length >
            0
        ) {

            calculateNearest(
                centrePoint
            );

        }

    }
);



map.on(
    "moveend",
    async function () {

        if (
            currentMode !==
            "spider"
        ) {

            return;

        }


        await refreshSpiderMode(
            false
        );

    }
);



// =========================================================
// SPIDER MODE
// =========================================================

async function refreshSpiderMode(
    force
) {

    const centre =
        map.getCenter();


    const centrePoint = [
        centre.lng,
        centre.lat
    ];


    const needsRefresh =
        force ||
        !cacheCentre ||
        cacheSport !==
            selectedSport ||
        distanceKm(
            cacheCentre,
            centrePoint
        ) >
            CACHE_RADIUS_KM *
            0.45;


    if (
        needsRefresh
    ) {

        await fetchRegionalFacilities(
            centrePoint
        );

    }


    calculateNearest(
        centrePoint
    );

}



// =========================================================
// POINT SEARCH
// =========================================================

async function runPointSearch(
    point,
    force
) {

    const needsRefresh =
        force ||
        !cacheCentre ||
        cacheSport !==
            selectedSport ||
        distanceKm(
            cacheCentre,
            point
        ) >
            CACHE_RADIUS_KM *
            0.45;


    if (
        needsRefresh
    ) {

        await fetchRegionalFacilities(
            point
        );

    }


    setOriginPoint(
        point
    );


    calculateNearest(
        point
    );

}



// =========================================================
// REGIONAL CACHE
// =========================================================

async function fetchRegionalFacilities(
    centre
) {

    const requestId =
        ++fetchRequestId;


    resultsStatus.textContent =
        "Loading";


    mapStatus.textContent =
        "Loading nearby facilities…";


    try {

        const bbox =
            bboxAroundPoint(
                centre,
                CACHE_RADIUS_KM
            );


        const whereParts = [
            BASE_WHERE
        ];


        if (
            selectedSport
        ) {

            whereParts.push(
                "Sport = '"
                +
                escapeSql(
                    selectedSport
                )
                +
                "'"
            );

        }


        const where =
            whereParts.join(
                " AND "
            );


        const allFeatures =
            [];


        let offset =
            0;


        while (true) {

            const page =
                await queryFacilitiesPage(
                    where,
                    bbox,
                    offset
                );


            if (
                requestId !==
                fetchRequestId
            ) {

                return;

            }


            allFeatures.push(
                ...page.features
            );


            if (
                page.features.length <
                PAGE_SIZE
            ) {

                break;

            }


            offset +=
                PAGE_SIZE;

        }


        if (
            requestId !==
            fetchRequestId
        ) {

            return;

        }


        regionalFeatures =
            allFeatures;


        cacheCentre =
            centre.slice();


        cacheSport =
            selectedSport;


        mapStatus.textContent =
            regionalFeatures.length.toLocaleString(
                "en-IE"
            )
            +
            " facilities cached";


        resultsStatus.textContent =
            "Ready";

    }
    catch (error) {

        console.error(
            "FACILITY LOAD ERROR:",
            error
        );


        mapStatus.textContent =
            "Unable to load facilities";


        resultsStatus.textContent =
            "Error";

    }

}



// =========================================================
// ARC GIS QUERY
// =========================================================

async function queryFacilitiesPage(
    where,
    bbox,
    offset
) {

    const url =
        new URL(
            FACILITIES_URL
        );


    url.searchParams.set(
        "where",
        where
    );


    url.searchParams.set(
        "geometry",
        bbox.join(
            ","
        )
    );


    url.searchParams.set(
        "geometryType",
        "esriGeometryEnvelope"
    );


    url.searchParams.set(
        "inSR",
        "4326"
    );


    url.searchParams.set(
        "spatialRel",
        "esriSpatialRelIntersects"
    );


    url.searchParams.set(
        "outSR",
        "4326"
    );


    url.searchParams.set(
        "outFields",
        [
            "OBJECTID",
            "GlobalID",
            "Sport",
            "Infrastructure_Type",
            "Surface",
            "Floodlights",
            "Owner",
            "Owner_Name",
            "Facility_Size",
            "Quality",
            "Local_Authority",
            "LEA",
            "Multi_Use",
            "Area_msq",
            "Validation"
        ].join(
            ","
        )
    );


    url.searchParams.set(
        "returnGeometry",
        "true"
    );


    url.searchParams.set(
        "resultOffset",
        String(
            offset
        )
    );


    url.searchParams.set(
        "resultRecordCount",
        String(
            PAGE_SIZE
        )
    );


    url.searchParams.set(
        "orderByFields",
        "OBJECTID ASC"
    );


    url.searchParams.set(
        "f",
        "geojson"
    );


    const response =
        await fetch(
            url.toString()
        );


    if (
        !response.ok
    ) {

        throw new Error(
            "Facility query failed"
        );

    }


    return await response.json();

}



// =========================================================
// CALCULATE NEAREST
// =========================================================

function calculateNearest(
    origin
) {

    if (
        !origin ||
        regionalFeatures.length ===
            0
    ) {

        clearCurrentResults();

        return;

    }


    const originPoint =
        turf.point(
            origin
        );


    const scored =
        regionalFeatures

            .map(
                function (feature) {

                    const distance =
                        distanceToFeatureKm(
                            originPoint,
                            feature
                        );


                    return {
                        feature:
                            feature,

                        distance:
                            distance
                    };

                }
            )

            .filter(
                function (item) {

                    return (
                        Number.isFinite(
                            item.distance
                        )
                    );

                }
            )

            .sort(
                function (a, b) {

                    return (
                        a.distance -
                        b.distance
                    );

                }
            )

            .slice(
                0,
                NEAREST_COUNT
            );


    nearestFeatures =
        scored;


    updateMapResults(
        origin,
        scored
    );


    renderResults(
        scored
    );


    updateMetrics(
        scored
    );

}



// =========================================================
// DISTANCE TO POLYGON
// =========================================================

function distanceToFeatureKm(
    originPoint,
    feature
) {

    try {

        if (
            turf.booleanPointInPolygon(
                originPoint,
                feature
            )
        ) {

            return 0;

        }

    }
    catch (error) {
        // continue
    }


    try {

        const boundary =
            turf.polygonToLine(
                feature
            );


        return turf.pointToLineDistance(
            originPoint,
            boundary,
            {
                units:
                    "kilometers"
            }
        );

    }
    catch (error) {


        try {

            const centre =
                turf.centerOfMass(
                    feature
                );


            return turf.distance(
                originPoint,
                centre,
                {
                    units:
                        "kilometers"
                }
            );

        }
        catch (fallbackError) {

            return Infinity;

        }

    }

}



// =========================================================
// UPDATE MAP
// =========================================================

function updateMapResults(
    origin,
    scored
) {

    const features =
        scored.map(
            function (item) {

                const clone =
                    JSON.parse(
                        JSON.stringify(
                            item.feature
                        )
                    );


                clone.properties =
                    clone.properties ||
                    {};


                clone.properties.__distance_km =
                    item.distance;


                return clone;

            }
        );


    const facilitySource =
        map.getSource(
            "nearest-facilities"
        );


    if (facilitySource) {

        facilitySource.setData(
            {
                type:
                    "FeatureCollection",

                features:
                    features
            }
        );

    }


    const spiderLines =
        scored.map(
            function (item) {

                const target =
                    facilityPoint(
                        item.feature
                    );


                return turf.lineString(
                    [
                        origin,
                        target
                    ],
                    {
                        OBJECTID:
                            item.feature.properties
                                .OBJECTID
                    }
                );

            }
        );


    const spiderSource =
        map.getSource(
            "spider-lines"
        );


    if (spiderSource) {

        spiderSource.setData(
            {
                type:
                    "FeatureCollection",

                features:
                    spiderLines
            }
        );

    }


    if (
        currentMode ===
        "point"
    ) {

        setOriginPoint(
            origin
        );

    }
    else {

        setOriginPoint(
            null
        );

    }

}



// =========================================================
// ORIGIN POINT
// =========================================================

function setOriginPoint(
    point
) {

    const source =
        map.getSource(
            "origin-point"
        );


    if (!source) {

        return;

    }


    if (!point) {

        source.setData(
            emptyFeatureCollection()
        );

        return;

    }


    source.setData(
        turf.featureCollection(
            [
                turf.point(
                    point
                )
            ]
        )
    );

}



// =========================================================
// RESULTS
// =========================================================

function renderResults(
    scored
) {

    resultsList.innerHTML =
        "";


    if (
        scored.length ===
        0
    ) {

        resultsList.innerHTML =
            '<div class="search-message">No facilities found.</div>';

        return;

    }


    scored.forEach(
        function (
            item,
            index
        ) {

            const feature =
                item.feature;


            const props =
                feature.properties ||
                {};


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "result-card";


            const name =
                facilityName(
                    props
                );


            const sport =
                cleanValue(
                    props.Sport
                );


            const type =
                cleanValue(
                    props.Infrastructure_Type
                );


            card.innerHTML =
                `
                <div class="result-title-row">

                    <span class="result-rank">
                        ${index + 1}
                    </span>

                    <span class="result-title">
                        ${escapeHtml(name)}
                    </span>

                </div>

                <div class="result-meta">

                    <span>
                        ${escapeHtml(sport)}
                    </span>

                    <span>
                        ${escapeHtml(type)}
                    </span>

                    <span class="result-distance">
                        ${formatDistance(item.distance)}
                    </span>

                </div>
                `;


            card.addEventListener(
                "click",
                function () {

                    zoomToFeature(
                        feature
                    );


                    showFeaturePopup(
                        feature
                    );

                }
            );


            resultsList.appendChild(
                card
            );

        }
    );

}



// =========================================================
// METRICS
// =========================================================

function updateMetrics(
    scored
) {

    facilityCount.textContent =
        scored.length;


    if (
        scored.length ===
        0
    ) {

        averageDistance.textContent =
            "—";

        return;

    }


    const average =
        scored.reduce(
            function (
                sum,
                item
            ) {

                return (
                    sum +
                    item.distance
                );

            },
            0
        )
        /
        scored.length;


    averageDistance.textContent =
        formatDistance(
            average
        );

}



// =========================================================
// POLYGON CLICK
// =========================================================

map.on(
    "click",
    "nearest-facilities-fill",
    function (event) {

        if (
            !event.features ||
            event.features.length ===
                0
        ) {

            return;

        }


        const clicked =
            event.features[0];


        const objectId =
            clicked.properties &&
            clicked.properties.OBJECTID;


        const match =
            nearestFeatures.find(
                function (item) {

                    return (
                        String(
                            item.feature.properties
                                .OBJECTID
                        )
                        ===
                        String(
                            objectId
                        )
                    );

                }
            );


        if (match) {

            zoomToFeature(
                match.feature
            );


            showFeaturePopup(
                match.feature
            );

        }

    }
);



map.on(
    "mouseenter",
    "nearest-facilities-fill",
    function () {

        map.getCanvas().style.cursor =
            "pointer";

    }
);


map.on(
    "mouseleave",
    "nearest-facilities-fill",
    function () {

        map.getCanvas().style.cursor =
            "";

    }
);



// =========================================================
// POPUP
// =========================================================

function showFeaturePopup(
    feature
) {

    const props =
        feature.properties ||
        {};


    const point =
        facilityPoint(
            feature
        );


    const name =
        facilityName(
            props
        );


    const sport =
        cleanValue(
            props.Sport
        );


    const type =
        cleanValue(
            props.Infrastructure_Type
        );


    const owner =
        cleanValue(
            props.Owner_Name
        );


    const area =
        formatArea(
            props.Area_msq
        );


    new maplibregl.Popup({
        closeButton:
            true,

        closeOnClick:
            true
    })

        .setLngLat(
            point
        )

        .setHTML(
            `
            <div class="popup-title">
                ${escapeHtml(name)}
            </div>

            <div class="popup-row">
                <strong>Sport:</strong>
                ${escapeHtml(sport)}
            </div>

            <div class="popup-row">
                <strong>Type:</strong>
                ${escapeHtml(type)}
            </div>

            <div class="popup-row">
                <strong>Owner:</strong>
                ${escapeHtml(owner)}
            </div>

            <div class="popup-row">
                <strong>Area:</strong>
                ${escapeHtml(area)}
            </div>
            `
        )

        .addTo(
            map
        );

}



// =========================================================
// ZOOM TO FEATURE
// =========================================================

function zoomToFeature(
    feature
) {

    try {

        const bbox =
            turf.bbox(
                feature
            );


        map.fitBounds(
            [
                [
                    bbox[0],
                    bbox[1]
                ],

                [
                    bbox[2],
                    bbox[3]
                ]
            ],
            {
                padding:
                    90,

                maxZoom:
                    16,

                duration:
                    700
            }
        );

    }
    catch (error) {

        const point =
            facilityPoint(
                feature
            );


        map.flyTo(
            {
                center:
                    point,

                zoom:
                    15
            }
        );

    }

}



// =========================================================
// FACILITY POINT
// =========================================================

function facilityPoint(
    feature
) {

    try {

        const centre =
            turf.centerOfMass(
                feature
            );


        return (
            centre.geometry.coordinates
        );

    }
    catch (error) {


        try {

            const centre =
                turf.center(
                    feature
                );


            return (
                centre.geometry.coordinates
            );

        }
        catch (fallbackError) {

            return IRELAND_CENTER;

        }

    }

}



// =========================================================
// FACILITY NAME
// =========================================================

function facilityName(
    props
) {

    const ownerName =
        cleanValueRaw(
            props.Owner_Name
        );


    if (ownerName) {

        return ownerName;

    }


    const sport =
        cleanValueRaw(
            props.Sport
        );


    const type =
        cleanValueRaw(
            props.Infrastructure_Type
        );


    if (
        sport &&
        type
    ) {

        return (
            sport +
            " - " +
            type
        );

    }


    if (sport) {

        return (
            sport +
            " facility"
        );

    }


    return "Sports facility";

}



// =========================================================
// FULL IRELAND
// =========================================================

fullIrelandButton.addEventListener(
    "click",
    function () {

        map.flyTo(
            {
                center:
                    IRELAND_CENTER,

                zoom:
                    IRELAND_ZOOM,

                duration:
                    800
            }
        );

    }
);



// =========================================================
// CLEAR RESULTS
// =========================================================

function clearCurrentResults() {

    nearestFeatures =
        [];


    resultsList.innerHTML =
        "";


    facilityCount.textContent =
        "0";


    averageDistance.textContent =
        "—";


    const facilitiesSource =
        map.getSource(
            "nearest-facilities"
        );


    if (facilitiesSource) {

        facilitiesSource.setData(
            emptyFeatureCollection()
        );

    }


    const spiderSource =
        map.getSource(
            "spider-lines"
        );


    if (spiderSource) {

        spiderSource.setData(
            emptyFeatureCollection()
        );

    }

}



// =========================================================
// BBOX AROUND POINT
// =========================================================

function bboxAroundPoint(
    centre,
    radiusKm
) {

    const lat =
        centre[1];


    const lon =
        centre[0];


    const latDelta =
        radiusKm /
        111.32;


    const lonDelta =
        radiusKm /
        (
            111.32 *
            Math.cos(
                lat *
                Math.PI /
                180
            )
        );


    return [
        lon -
            lonDelta,

        lat -
            latDelta,

        lon +
            lonDelta,

        lat +
            latDelta
    ];

}



// =========================================================
// DISTANCE BETWEEN COORDINATES
// =========================================================

function distanceKm(
    pointA,
    pointB
) {

    return turf.distance(
        turf.point(
            pointA
        ),

        turf.point(
            pointB
        ),

        {
            units:
                "kilometers"
        }
    );

}



// =========================================================
// FORMATTING
// =========================================================

function formatDistance(
    distance
) {

    if (
        !Number.isFinite(
            distance
        )
    ) {

        return "—";

    }


    if (
        distance <
        1
    ) {

        return (
            Math.round(
                distance *
                1000
            )
            +
            " m"
        );

    }


    return (
        distance.toLocaleString(
            "en-IE",
            {
                maximumFractionDigits:
                    1
            }
        )
        +
        " km"
    );

}



function formatArea(
    value
) {

    const area =
        Number(
            value
        );


    if (
        !Number.isFinite(
            area
        )
    ) {

        return "Not recorded";

    }


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
                    maximumFractionDigits:
                        2
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
                maximumFractionDigits:
                    0
            }
        )
        +
        " m²"
    );

}



function cleanValue(
    value
) {

    const cleaned =
        cleanValueRaw(
            value
        );


    return (
        cleaned ||
        "Not recorded"
    );

}



function cleanValueRaw(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === " " ||
        value === "NULL"
    ) {

        return "";

    }


    return String(
        value
    );

}



function escapeSql(
    value
) {

    return String(
        value
    ).replace(
        /'/g,
        "''"
    );

}



function escapeHtml(
    value
) {

    return String(
        value
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}



// =========================================================
// EMPTY GEOJSON
// =========================================================

function emptyFeatureCollection() {

    return {
        type:
            "FeatureCollection",

        features:
            []
    };

}
