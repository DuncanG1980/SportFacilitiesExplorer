// ==========================================================
// CONFIGURATION
// ==========================================================

const FACILITIES_URL =
    "https://services-eu1.arcgis.com/z1y55jruXrgzzpdi/arcgis/rest/services/Facilities_view/FeatureServer/0";

const VALIDATION_FILTER =
    "(Validation <> 'Remove' OR Validation IS NULL)";

const PAGE_SIZE = 2000;

const SPIDER_COUNT = 8;
const SPIDER_FRAME_INTERVAL = 60;
const SPIDER_CACHE_RADIUS_KM = 45;


// ==========================================================
// DOM
// ==========================================================

const sportSelect = document.getElementById("sportSelect");
const numberSelect = document.getElementById("numberSelect");
const numberGroup = document.getElementById("numberGroup");

const typeSelect = document.getElementById("typeSelect");
const surfaceSelect = document.getElementById("surfaceSelect");
const sizeSelect = document.getElementById("sizeSelect");
const floodlightsSelect = document.getElementById("floodlightsSelect");
const ownerSelect = document.getElementById("ownerSelect");
const qualitySelect = document.getElementById("qualitySelect");

const pointModeButton = document.getElementById("pointModeButton");
const spiderModeButton = document.getElementById("spiderModeButton");

const modeDescription = document.getElementById("modeDescription");
const statusElement = document.getElementById("status");
const resultsElement = document.getElementById("results");
const clearButton = document.getElementById("clearButton");

const facilityCounter = document.getElementById("facilityCounter");

const spiderTarget = document.getElementById("spiderTarget");
const spiderBadge = document.getElementById("spiderBadge");

const facilityCard = document.getElementById("facilityCard");
const facilityCardContent = document.getElementById("facilityCardContent");
const closeFacilityCard = document.getElementById("closeFacilityCard");

const areaSummaryButton = document.getElementById("areaSummaryButton");
const areaSummary = document.getElementById("areaSummary");


// ==========================================================
// STATE
// ==========================================================

let currentMode = "point";

let searchMarker = null;
let searchPoint = null;

let layerInfo = null;

let backgroundRequestID = 0;

let spiderCache = [];
let spiderCacheBounds = null;
let spiderCacheKey = null;
let spiderCacheLoading = false;
let spiderCacheBuildID = 0;

let lastSpiderFrame = 0;


// ==========================================================
// MAP
// ==========================================================

const map = new maplibregl.Map({

    container: "map",

    center: [-8.0, 53.35],

    zoom: 6,

    style: {

        version: 8,

        sources: {

            osm: {

                type: "raster",

                tiles: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                ],

                tileSize: 256,

                attribution:
                    "© OpenStreetMap contributors"

            }

        },

        layers: [

            {
                id: "osm",
                type: "raster",
                source: "osm"
            }

        ]

    }

});


map.addControl(
    new maplibregl.NavigationControl(),
    "top-right"
);


// ==========================================================
// STARTUP
// ==========================================================

map.on("load", async () => {

    await loadLayerInformation();

    await loadVisibleFacilities();

    statusElement.textContent =
        "Choose a sport, then click anywhere on the map.";

});


// ==========================================================
// ARC GIS LAYER INFORMATION
// ==========================================================

async function loadLayerInformation() {

    try {

        const response =
            await fetch(`${FACILITIES_URL}?f=json`);

        layerInfo =
            await response.json();


        populateDomain(
            "Sport",
            sportSelect,
            "Choose sport..."
        );

        populateDomain(
            "Infrastructure_Type",
            typeSelect,
            "Any"
        );

        populateDomain(
            "Surface",
            surfaceSelect,
            "Any"
        );


        if (fieldExists("Size")) {

            populateDomain(
                "Size",
                sizeSelect,
                "Any"
            );

        }

        else if (fieldExists("Facility_Size")) {

            populateDomain(
                "Facility_Size",
                sizeSelect,
                "Any"
            );

        }


        populateDomain(
            "Floodlights",
            floodlightsSelect,
            "Any"
        );

        populateDomain(
            "Owner",
            ownerSelect,
            "Any"
        );

    }

    catch (error) {

        console.error(
            "Could not load layer information:",
            error
        );

        sportSelect.innerHTML =
            `<option value="">Could not load sports</option>`;

    }

}


function populateDomain(
    fieldName,
    select,
    blankLabel
) {

    if (
        !layerInfo ||
        !layerInfo.fields
    ) {
        return;
    }


    const field =
        layerInfo.fields.find(
            item => item.name === fieldName
        );


    select.innerHTML =
        `<option value="">${escapeHtml(blankLabel)}</option>`;


    if (
        !field ||
        !field.domain ||
        !field.domain.codedValues
    ) {
        return;
    }


    field.domain.codedValues.forEach(
        item => {

            const option =
                document.createElement("option");

            option.value =
                item.code;

            option.textContent =
                item.name;

            select.appendChild(option);

        }
    );

}


function fieldExists(fieldName) {

    return Boolean(

        layerInfo?.fields?.some(
            field => field.name === fieldName
        )

    );

}


// ==========================================================
// FILTERS
// ==========================================================

function buildWhereClause() {

    const clauses = [
        VALIDATION_FILTER
    ];


    addTextFilter(
        clauses,
        "Sport",
        sportSelect.value
    );

    addTextFilter(
        clauses,
        "Infrastructure_Type",
        typeSelect.value
    );

    addTextFilter(
        clauses,
        "Surface",
        surfaceSelect.value
    );


    if (fieldExists("Size")) {

        addTextFilter(
            clauses,
            "Size",
            sizeSelect.value
        );

    }

    else if (fieldExists("Facility_Size")) {

        addTextFilter(
            clauses,
            "Facility_Size",
            sizeSelect.value
        );

    }


    addTextFilter(
        clauses,
        "Floodlights",
        floodlightsSelect.value
    );

    addTextFilter(
        clauses,
        "Owner",
        ownerSelect.value
    );


    if (
        qualitySelect.value &&
        fieldExists("Quality")
    ) {

        clauses.push(
            `Quality = ${Number(qualitySelect.value)}`
        );

    }


    return clauses.join(" AND ");

}


function addTextFilter(
    clauses,
    fieldName,
    value
) {

    if (
        !value ||
        !fieldExists(fieldName)
    ) {
        return;
    }


    const safe =
        String(value)
            .replaceAll(
                "'",
                "''"
            );


    clauses.push(
        `${fieldName} = '${safe}'`
    );

}


// ==========================================================
// BACKGROUND FACILITIES
// ==========================================================

async function loadVisibleFacilities() {

    if (currentMode === "spider") {
        return;
    }


    const requestID =
        ++backgroundRequestID;


    const bounds =
        map.getBounds();


    const envelope = [

        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()

    ].join(",");


    facilityCounter.textContent =
        "Loading facilities...";


    try {

        const features =
            await queryAllFacilitiesInEnvelope(
                envelope,
                VALIDATION_FILTER
            );


        if (
            requestID !==
            backgroundRequestID
        ) {
            return;
        }


        ensureBackgroundLayers();


        map.getSource(
            "background-facilities"
        ).setData(
            turf.featureCollection(features)
        );


        setBackgroundVisibility(true);


        facilityCounter.textContent =
            `${features.length.toLocaleString()} facilities in view`;


        console.log(
            `Displaying ${features.length} facilities in current extent`
        );

    }

    catch (error) {

        if (
            requestID !==
            backgroundRequestID
        ) {
            return;
        }


        console.error(
            "Background facilities failed:",
            error
        );


        facilityCounter.textContent =
            "Facilities unavailable";

    }

}


function ensureBackgroundLayers() {

    if (
        map.getSource(
            "background-facilities"
        )
    ) {
        return;
    }


    map.addSource(
        "background-facilities",
        {

            type: "geojson",

            data:
                turf.featureCollection([])

        }
    );


    map.addLayer({

        id: "facilities-fill",

        type: "fill",

        source:
            "background-facilities",

        paint: {

            "fill-color":
                "#4f86c6",

            "fill-opacity":
                0.35

        }

    });


    map.addLayer({

        id: "facilities-outline",

        type: "line",

        source:
            "background-facilities",

        paint: {

            "line-color":
                "#315b83",

            "line-width":
                1

        }

    });

}


function setBackgroundVisibility(visible) {

    const visibility =
        visible
            ? "visible"
            : "none";


    [
        "facilities-fill",
        "facilities-outline"

    ].forEach(
        layerID => {

            if (map.getLayer(layerID)) {

                map.setLayoutProperty(
                    layerID,
                    "visibility",
                    visibility
                );

            }

        }
    );


    if (currentMode === "spider") {

        facilityCounter.textContent =
            spiderCache.length
                ? `${spiderCache.length.toLocaleString()} facilities cached`
                : "Spider cache";

    }

}


// ==========================================================
// GENERIC PAGINATED QUERY
// ==========================================================

async function queryAllFacilitiesInEnvelope(
    envelope,
    whereClause = null
) {

    let offset = 0;

    let allFeatures = [];

    let keepGoing = true;


    while (keepGoing) {

        const params =
            new URLSearchParams({

                where:
                    whereClause ||
                    buildWhereClause(),

                geometry:
                    envelope,

                geometryType:
                    "esriGeometryEnvelope",

                inSR:
                    "4326",

                spatialRel:
                    "esriSpatialRelIntersects",

                outFields:
                    "*",

                returnGeometry:
                    "true",

                outSR:
                    "4326",

                resultOffset:
                    String(offset),

                resultRecordCount:
                    String(PAGE_SIZE),

                orderByFields:
                    "OBJECTID ASC",

                f:
                    "geojson"

            });


        const response =
            await fetch(

                FACILITIES_URL +
                "/query?" +
                params.toString()

            );


        if (!response.ok) {

            throw new Error(
                `ArcGIS returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!Array.isArray(data.features)) {

            console.error(
                "ArcGIS query response:",
                data
            );

            throw new Error(
                "ArcGIS query failed"
            );

        }


        allFeatures.push(
            ...data.features
        );


        console.log(
            `Loaded batch: ${data.features.length}`
        );


        if (
            data.features.length <
            PAGE_SIZE
        ) {

            keepGoing = false;

        }

        else {

            offset += PAGE_SIZE;

        }

    }


    return allFeatures;

}


// ==========================================================
// POINT SEARCH
// ==========================================================

map.on("click", event => {

    if (currentMode !== "point") {
        return;
    }


    if (event.originalEvent?.shiftKey) {
        return;
    }


    if (!sportSelect.value) {

        statusElement.textContent =
            "Choose a sport first.";

        return;

    }


    searchPoint =
        turf.point([

            event.lngLat.lng,
            event.lngLat.lat

        ]);


    if (searchMarker) {
        searchMarker.remove();
    }


    const markerElement =
        document.createElement("div");

    markerElement.className =
        "search-marker";


    searchMarker =
        new maplibregl.Marker({
            element: markerElement
        })
            .setLngLat(event.lngLat)
            .addTo(map);


    runNearestSearch(
        searchPoint,
        Number(numberSelect.value)
    );

});


// ==========================================================
// NEAREST SEARCH
// ==========================================================

async function runNearestSearch(
    point,
    number
) {

    if (!sportSelect.value) {
        return;
    }


    statusElement.textContent =
        "Finding nearest facilities...";


    const radii = [

        5,
        10,
        20,
        40,
        80,
        160,
        300

    ];


    let candidates = [];


    try {

        for (const radius of radii) {

            candidates =
                await queryCandidates(
                    point,
                    radius
                );


            console.log(
                `${candidates.length} ${sportSelect.value} candidates within ${radius} km search box`
            );


            if (
                candidates.length >=
                number
            ) {
                break;
            }

        }


        if (
            candidates.length === 0
        ) {

            statusElement.textContent =
                "No matching facilities found.";

            clearSpiderGraphics();

            resultsElement.innerHTML =
                "";

            return;

        }


        const ranked =
            rankFacilities(
                point,
                candidates
            );


        const nearest =
            ranked
                .slice(0, number)
                .map(
                    item => item.feature
                );


        drawSpider(nearest);

        displayResults(nearest);


        statusElement.textContent =
            `${nearest.length} nearest facilities found.`;


        fitMapToResults(nearest);

    }

    catch (error) {

        console.error(
            "Nearest search failed:",
            error
        );


        statusElement.textContent =
            "Search failed.";

    }

}


// ==========================================================
// SEARCH CANDIDATES
// ==========================================================

async function queryCandidates(
    point,
    radiusKm
) {

    const [
        lng,
        lat
    ] =
        point.geometry.coordinates;


    const latDegrees =
        radiusKm /
        111.32;


    const longitudeScale =
        Math.max(

            0.1,

            Math.cos(
                lat *
                Math.PI /
                180
            )

        );


    const lngDegrees =
        radiusKm /
        (
            111.32 *
            longitudeScale
        );


    const envelope = [

        lng - lngDegrees,
        lat - latDegrees,
        lng + lngDegrees,
        lat + latDegrees

    ].join(",");


    return await queryAllFacilitiesInEnvelope(
        envelope,
        buildWhereClause()
    );

}


// ==========================================================
// DISTANCE RANKING
// ==========================================================

function rankFacilities(
    point,
    features
) {

    return features
        .map(
            feature => {

                let distance;


                try {

                    distance =
                        turf.pointToPolygonDistance(

                            point,
                            feature,

                            {
                                units:
                                    "kilometers"
                            }

                        );


                    distance =
                        Math.max(
                            0,
                            distance
                        );

                }

                catch (error) {

                    const centre =
                        turf.centroid(
                            feature
                        );


                    distance =
                        turf.distance(

                            point,
                            centre,

                            {
                                units:
                                    "kilometers"
                            }

                        );

                }


                feature.properties =
                    feature.properties ||
                    {};


                feature.properties._distanceKm =
                    distance;


                return {

                    feature:
                        feature,

                    distance:
                        distance

                };

            }
        )
        .sort(
            (a, b) =>
                a.distance -
                b.distance
        );

}


// ==========================================================
// SPIDER GRAPHICS
// ==========================================================

function ensureSpiderLayers() {

    if (!map.getSource("spider-lines")) {

        map.addSource(
            "spider-lines",
            {

                type: "geojson",

                data:
                    turf.featureCollection([])

            }
        );


        map.addLayer({

            id:
                "spider-lines-layer",

            type:
                "line",

            source:
                "spider-lines",

            paint: {

                "line-color":
                    "#222222",

                "line-width":
                    1.5,

                "line-opacity":
                    0.72

            }

        });

    }


    if (!map.getSource("nearest-facilities")) {

        map.addSource(
            "nearest-facilities",
            {

                type:
                    "geojson",

                data:
                    turf.featureCollection([])

            }
        );


        map.addLayer({

            id:
                "nearest-fill",

            type:
                "fill",

            source:
                "nearest-facilities",

            paint: {

                "fill-color":
                    "#e36b2c",

                "fill-opacity":
                    0.72

            }

        });


        map.addLayer({

            id:
                "nearest-outline",

            type:
                "line",

            source:
                "nearest-facilities",

            paint: {

                "line-color":
                    "#9d3d13",

                "line-width":
                    2

            }

        });

    }


    if (!map.getSource("facility-labels")) {

        map.addSource(
            "facility-labels",
            {

                type:
                    "geojson",

                data:
                    turf.featureCollection([])

            }
        );


        map.addLayer({

            id:
                "facility-number-circles",

            type:
                "circle",

            source:
                "facility-labels",

            paint: {

                "circle-radius":
                    9,

                "circle-color":
                    "#222222",

                "circle-stroke-color":
                    "#ffffff",

                "circle-stroke-width":
                    1.5

            }

        });


        map.addLayer({

            id:
                "facility-numbers",

            type:
                "symbol",

            source:
                "facility-labels",

            layout: {

                "text-field":
                    ["get", "label"],

                "text-size":
                    11,

                "text-allow-overlap":
                    true

            },

            paint: {

                "text-color":
                    "#ffffff"

            }

        });

    }

}


function drawSpider(facilities) {

    ensureSpiderLayers();


    if (!searchPoint) {
        return;
    }


    const lines = [];

    const labels = [];


    facilities.forEach(
        (feature, index) => {

            feature.properties =
                feature.properties ||
                {};


            feature.properties._rank =
                index + 1;


            let centre;


            try {

                centre =
                    turf.centroid(feature);

            }

            catch {

                return;

            }


            lines.push(

                turf.lineString(

                    [

                        searchPoint
                            .geometry
                            .coordinates,

                        centre
                            .geometry
                            .coordinates

                    ],

                    {
                        rank:
                            index + 1
                    }

                )

            );


            centre.properties = {

                rank:
                    index + 1,

                label:
                    String(index + 1)

            };


            labels.push(centre);

        }
    );


    map.getSource(
        "nearest-facilities"
    ).setData(
        turf.featureCollection(facilities)
    );


    map.getSource(
        "spider-lines"
    ).setData(
        turf.featureCollection(lines)
    );


    map.getSource(
        "facility-labels"
    ).setData(
        turf.featureCollection(labels)
    );

}


function clearSpiderGraphics() {

    if (map.getSource("nearest-facilities")) {

        map.getSource(
            "nearest-facilities"
        ).setData(
            turf.featureCollection([])
        );

    }


    if (map.getSource("spider-lines")) {

        map.getSource(
            "spider-lines"
        ).setData(
            turf.featureCollection([])
        );

    }


    if (map.getSource("facility-labels")) {

        map.getSource(
            "facility-labels"
        ).setData(
            turf.featureCollection([])
        );

    }

}


// ==========================================================
// ACCESS STATISTICS
// ==========================================================

function calculateAccessStatistics(
    facilities
) {

    const distances =
        facilities
            .map(
                feature =>
                    Number(
                        feature
                            .properties
                            ?._distanceKm
                    )
            )
            .filter(
                distance =>
                    Number.isFinite(distance)
            )
            .sort(
                (a, b) =>
                    a - b
            );


    if (
        distances.length === 0
    ) {

        return {

            nearest:
                null,

            average:
                null,

            within5:
                0,

            within10:
                0,

            count:
                0

        };

    }


    const total =
        distances.reduce(
            (sum, distance) =>
                sum + distance,
            0
        );


    return {

        nearest:
            distances[0],

        average:
            total /
            distances.length,

        within5:
            distances.filter(
                distance =>
                    distance <= 5
            ).length,

        within10:
            distances.filter(
                distance =>
                    distance <= 10
            ).length,

        count:
            distances.length

    };

}


function buildAccessSummary(
    facilities
) {

    const stats =
        calculateAccessStatistics(
            facilities
        );


    if (
        stats.count === 0
    ) {
        return "";
    }


    const sport =
        sportSelect.value ||
        "facility";


    return `

        <div class="area-summary">

            <div class="summary-header">

                <strong>
                    Access from this location
                </strong>

                <div class="summary-subtitle">
                    Distance to the nearest ${escapeHtml(sport)} facilities
                </div>

            </div>


            <div class="summary-grid">

                ${summaryStat(
                    formatDistance(
                        stats.nearest
                    ),
                    "Nearest"
                )}

                ${summaryStat(
                    formatDistance(
                        stats.average
                    ),
                    `Avg. nearest ${stats.count}`
                )}

                ${summaryStat(
                    stats.within5.toLocaleString(),
                    "Within 5 km"
                )}

                ${summaryStat(
                    stats.within10.toLocaleString(),
                    "Within 10 km"
                )}

            </div>

        </div>

    `;

}


// ==========================================================
// RESULTS
// ==========================================================

function displayResults(
    facilities
) {

    if (
        !facilities ||
        facilities.length === 0
    ) {

        resultsElement.innerHTML =
            "";

        return;

    }


    const accessSummary =
        buildAccessSummary(
            facilities
        );


    const facilityRows =
        facilities
            .map(
                (feature, index) => {

                    const p =
                        feature.properties ||
                        {};


                    const title =
                        p.Owner_Name ||
                        p.Infrastructure_Type ||
                        p.Sport ||
                        "Facility";


                    const distance =
                        Number(
                            p._distanceKm
                        );


                    const distanceText =
                        Number.isFinite(
                            distance
                        )
                            ? formatDistance(
                                distance
                            )
                            : "—";


                    const area =
                        getFacilityArea(
                            feature
                        );


                    const details = [

                        p.Infrastructure_Type,

                        p.Surface,

                        area
                            ? `${Math.round(area).toLocaleString()} m²`
                            : null,

                        p.Quality
                            ? qualityLabel(
                                p.Quality
                            )
                            : null

                    ]
                        .filter(Boolean)
                        .map(escapeHtml)
                        .join(" • ");


                    return `

                        <div
                            class="result-item"
                            data-result-index="${index}"
                        >

                            <div class="result-header">

                                <div class="result-number">
                                    ${index + 1}
                                </div>

                                <div class="result-title">
                                    ${escapeHtml(title)}
                                </div>

                            </div>

                            <div class="result-details">

                                <div class="result-distance">
                                    ${escapeHtml(distanceText)}
                                </div>

                                <div>
                                    ${details}
                                </div>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    resultsElement.innerHTML =
        accessSummary +
        facilityRows;


    resultsElement
        .querySelectorAll(
            ".result-item"
        )
        .forEach(
            item => {

                const index =
                    Number(
                        item.dataset.resultIndex
                    );


                const feature =
                    facilities[index];


                item.addEventListener(
                    "mouseenter",
                    () =>
                        highlightResult(
                            feature
                        )
                );


                item.addEventListener(
                    "mouseleave",
                    clearHighlight
                );


                // ------------------------------------------
                // CLICK RESULT:
                // OPEN CARD + ZOOM TO FACILITY
                // WORKS IN BOTH MODES
                // ------------------------------------------

                item.addEventListener(
                    "click",
                    () => {

                        showFacilityCard(
                            feature
                        );

                        zoomToFeature(
                            feature
                        );

                    }
                );

            }
        );

}


function formatDistance(
    distanceKm
) {

    if (
        distanceKm === null ||
        distanceKm === undefined ||
        !Number.isFinite(
            Number(distanceKm)
        )
    ) {

        return "—";

    }


    distanceKm =
        Number(distanceKm);


    if (distanceKm < 1) {

        return `${Math.round(distanceKm * 1000)} m`;

    }


    return `${distanceKm.toFixed(2)} km`;

}


// ==========================================================
// RESULT HIGHLIGHT
// ==========================================================

function highlightResult(feature) {

    if (!feature) {
        return;
    }


    if (!map.getSource("highlight-facility")) {

        map.addSource(
            "highlight-facility",
            {

                type:
                    "geojson",

                data:
                    feature

            }
        );


        map.addLayer({

            id:
                "highlight-fill",

            type:
                "fill",

            source:
                "highlight-facility",

            paint: {

                "fill-color":
                    "#ff9a3d",

                "fill-opacity":
                    0.8

            }

        });


        map.addLayer({

            id:
                "highlight-outline",

            type:
                "line",

            source:
                "highlight-facility",

            paint: {

                "line-color":
                    "#111111",

                "line-width":
                    3

            }

        });

    }

    else {

        map.getSource(
            "highlight-facility"
        ).setData(feature);

    }

}


function clearHighlight() {

    if (
        map.getSource(
            "highlight-facility"
        )
    ) {

        map.getSource(
            "highlight-facility"
        ).setData(
            turf.featureCollection([])
        );

    }

}


// ==========================================================
// FIT / ZOOM
// ==========================================================

function fitMapToResults(
    facilities
) {

    if (
        !facilities ||
        facilities.length === 0 ||
        !searchPoint
    ) {
        return;
    }


    try {

        const collection =
            turf.featureCollection([

                searchPoint,
                ...facilities

            ]);


        const bbox =
            turf.bbox(collection);


        map.fitBounds(

            [

                [bbox[0], bbox[1]],
                [bbox[2], bbox[3]]

            ],

            {

                padding: {

                    top:
                        80,

                    right:
                        80,

                    bottom:
                        80,

                    left:
                        330

                },

                maxZoom:
                    15,

                duration:
                    650

            }

        );

    }

    catch (error) {

        console.warn(
            "Could not fit results:",
            error
        );

    }

}


function zoomToFeature(feature) {

    try {

        const bbox =
            turf.bbox(feature);


        map.fitBounds(

            [

                [bbox[0], bbox[1]],
                [bbox[2], bbox[3]]

            ],

            {

                padding: {

                    top:
                        100,

                    right:
                        350,

                    bottom:
                        100,

                    left:
                        330

                },

                maxZoom:
                    18,

                duration:
                    700

            }

        );

    }

    catch (error) {

        console.warn(
            "Could not zoom to facility:",
            error
        );

    }

}


// ==========================================================
// SPIDER MODE
// ==========================================================

async function activateSpiderMode() {

    currentMode =
        "spider";


    backgroundRequestID++;


    pointModeButton
        .classList
        .remove(
            "active"
        );


    spiderModeButton
        .classList
        .add(
            "active"
        );


    spiderTarget
        .classList
        .remove(
            "hidden"
        );


    spiderBadge
        .classList
        .remove(
            "hidden"
        );


    numberGroup
        .classList
        .add(
            "hidden"
        );


    modeDescription.textContent =
        "Pan or zoom the map. The spider continuously follows the map centre.";


    if (searchMarker) {

        searchMarker.remove();

        searchMarker = null;

    }


    setBackgroundVisibility(
        false
    );


    clearResults();


    spiderCache = [];
    spiderCacheBounds = null;
    spiderCacheKey = null;
    spiderCacheLoading = false;


    /*
        IMPORTANT:

        Spider Mode no longer disables any
        MapLibre navigation controls.

        Scroll zoom, double-click zoom,
        touch zoom, keyboard controls and
        +/- buttons all continue to work.
    */


    statusElement.textContent =
        sportSelect.value
            ? "Preparing Spider Mode..."
            : "Choose a sport to start Spider Mode.";


    if (sportSelect.value) {

        await buildSpiderCache();

        updateLiveSpider();

    }

}


// ==========================================================
// POINT MODE
// ==========================================================

function activatePointMode() {

    currentMode =
        "point";


    spiderCacheBuildID++;

    spiderCacheLoading =
        false;


    pointModeButton
        .classList
        .add(
            "active"
        );


    spiderModeButton
        .classList
        .remove(
            "active"
        );


    spiderTarget
        .classList
        .add(
            "hidden"
        );


    spiderBadge
        .classList
        .add(
            "hidden"
        );


    numberGroup
        .classList
        .remove(
            "hidden"
        );


    modeDescription.textContent =
        "Choose a sport, then click anywhere on the map.";


    /*
        Ensure normal navigation is enabled.
    */

    map.scrollZoom.enable();

    map.doubleClickZoom.enable();

    map.touchZoomRotate.enable();

    map.boxZoom.enable();

    map.keyboard.enable();


    clearResults();

    clearSpiderGraphics();


    setBackgroundVisibility(
        true
    );


    statusElement.textContent =
        sportSelect.value
            ? "Click anywhere on the map."
            : "Choose a sport to begin.";


    loadVisibleFacilities();

}


// ==========================================================
// SPIDER REGIONAL CACHE
// ==========================================================

async function buildSpiderCache() {

    if (
        currentMode !== "spider" ||
        !sportSelect.value ||
        spiderCacheLoading
    ) {
        return;
    }


    spiderCacheLoading =
        true;


    const buildID =
        ++spiderCacheBuildID;


    const centre =
        map.getCenter();


    const radiusKm =
        SPIDER_CACHE_RADIUS_KM;


    const latDegrees =
        radiusKm /
        111.32;


    const longitudeScale =
        Math.max(

            0.1,

            Math.cos(
                centre.lat *
                Math.PI /
                180
            )

        );


    const lngDegrees =
        radiusKm /
        (
            111.32 *
            longitudeScale
        );


    const envelope = [

        centre.lng - lngDegrees,
        centre.lat - latDegrees,
        centre.lng + lngDegrees,
        centre.lat + latDegrees

    ].join(",");


    /*
        The downloaded cache covers 45 km.

        We rebuild it before the map centre
        reaches the edge of that cache.
    */

    const proposedBounds = {

        west:
            centre.lng -
            lngDegrees *
            0.55,

        east:
            centre.lng +
            lngDegrees *
            0.55,

        south:
            centre.lat -
            latDegrees *
            0.55,

        north:
            centre.lat +
            latDegrees *
            0.55

    };


    const newCacheKey =
        getSpiderFilterKey();


    statusElement.textContent =
        "Loading regional Spider cache...";


    try {

        const features =
            await queryAllFacilitiesInEnvelope(

                envelope,
                buildWhereClause()

            );


        if (
            buildID !==
            spiderCacheBuildID ||
            currentMode !==
            "spider"
        ) {

            return;

        }


        if (
            newCacheKey !==
            getSpiderFilterKey()
        ) {

            return;

        }


        spiderCache =
            features;


        spiderCacheBounds =
            proposedBounds;


        spiderCacheKey =
            newCacheKey;


        console.log(
            `Spider cache ready: ${spiderCache.length} facilities`
        );


        facilityCounter.textContent =
            `${spiderCache.length.toLocaleString()} facilities cached`;


        if (
            spiderCache.length === 0
        ) {

            statusElement.textContent =
                "No matching facilities in this region.";

            clearSpiderGraphics();

            resultsElement.innerHTML =
                "";

            return;

        }


        statusElement.textContent =
            `${spiderCache.length.toLocaleString()} facilities cached • pan or zoom to explore`;


        updateLiveSpider();

    }

    catch (error) {

        console.error(
            "Spider cache failed:",
            error
        );


        statusElement.textContent =
            "Could not load Spider facilities.";

    }

    finally {

        if (
            buildID ===
            spiderCacheBuildID
        ) {

            spiderCacheLoading =
                false;

        }

    }

}


// ==========================================================
// LIVE SPIDER
// ==========================================================

function updateLiveSpider() {

    if (
        currentMode !== "spider" ||
        !sportSelect.value ||
        spiderCache.length === 0
    ) {
        return;
    }


    const centre =
        map.getCenter();


    const point =
        turf.point([

            centre.lng,
            centre.lat

        ]);


    /*
        In Spider Mode the centre of the
        screen is always the search point.
    */

    searchPoint =
        point;


    const ranked =
        rankFacilities(
            point,
            spiderCache
        );


    const nearest =
        ranked
            .slice(
                0,
                SPIDER_COUNT
            )
            .map(
                item => item.feature
            );


    drawSpider(nearest);

    displayResults(nearest);

}


// ==========================================================
// SPIDER CACHE HELPERS
// ==========================================================

function getSpiderFilterKey() {

    return [

        sportSelect.value,
        typeSelect.value,
        surfaceSelect.value,
        sizeSelect.value,
        floodlightsSelect.value,
        ownerSelect.value,
        qualitySelect.value

    ].join("|");

}


function spiderCentreInsideCache() {

    if (!spiderCacheBounds) {
        return false;
    }


    const centre =
        map.getCenter();


    return (

        centre.lng >
            spiderCacheBounds.west &&

        centre.lng <
            spiderCacheBounds.east &&

        centre.lat >
            spiderCacheBounds.south &&

        centre.lat <
            spiderCacheBounds.north

    );

}


// ==========================================================
// MAP MOVEMENT
// ==========================================================

map.on("move", () => {

    if (
        currentMode !==
        "spider"
    ) {
        return;
    }


    const now =
        performance.now();


    if (
        now -
        lastSpiderFrame <
        SPIDER_FRAME_INTERVAL
    ) {
        return;
    }


    lastSpiderFrame =
        now;


    /*
        "move" fires for BOTH pan and zoom,
        so the spider follows the map centre
        continuously during either action.
    */

    updateLiveSpider();

});


map.on("moveend", async () => {

    if (
        currentMode ===
        "spider"
    ) {

        updateLiveSpider();


        /*
            If the user has travelled outside
            the safe part of the regional cache,
            download a new cache around the
            current map centre.
        */

        if (
            !spiderCentreInsideCache() &&
            !spiderCacheLoading &&
            sportSelect.value
        ) {

            await buildSpiderCache();

        }

    }

    else {

        loadVisibleFacilities();

    }

});


// ==========================================================
// MODE BUTTONS
// ==========================================================

pointModeButton.addEventListener(
    "click",
    activatePointMode
);


spiderModeButton.addEventListener(
    "click",
    activateSpiderMode
);


// ==========================================================
// FILTER CHANGES
// ==========================================================

const searchControls = [

    sportSelect,
    typeSelect,
    surfaceSelect,
    sizeSelect,
    floodlightsSelect,
    ownerSelect,
    qualitySelect

];


searchControls.forEach(
    control => {

        control.addEventListener(
            "change",
            async () => {

                areaSummary
                    .classList
                    .add(
                        "hidden"
                    );


                hideFacilityCard();


                if (
                    currentMode ===
                    "spider"
                ) {

                    /*
                        Invalidate any old cache request.
                    */

                    spiderCacheBuildID++;


                    spiderCache = [];
                    spiderCacheBounds = null;
                    spiderCacheKey = null;
                    spiderCacheLoading = false;


                    clearResults();


                    if (
                        sportSelect.value
                    ) {

                        statusElement.textContent =
                            "Updating Spider facilities...";


                        await buildSpiderCache();

                    }

                    else {

                        statusElement.textContent =
                            "Choose a sport to start Spider Mode.";

                        facilityCounter.textContent =
                            "Spider cache";

                    }

                }

                else {

                    clearResults();


                    statusElement.textContent =
                        sportSelect.value
                            ? "Click anywhere on the map."
                            : "Choose a sport to begin.";

                }

            }
        );

    }
);


// ==========================================================
// CLEAR
// ==========================================================

clearButton.addEventListener(
    "click",
    () => {

        clearResults();

        hideFacilityCard();


        areaSummary
            .classList
            .add(
                "hidden"
            );


        if (searchMarker) {

            searchMarker.remove();

            searchMarker = null;

        }


        if (
            currentMode ===
            "spider"
        ) {

            if (
                sportSelect.value &&
                spiderCache.length
            ) {

                updateLiveSpider();

            }


            statusElement.textContent =
                sportSelect.value
                    ? "Pan or zoom the map to explore."
                    : "Choose a sport to start Spider Mode.";

        }

        else {

            statusElement.textContent =
                sportSelect.value
                    ? "Click anywhere on the map."
                    : "Choose a sport to begin.";

        }

    }
);


function clearResults() {

    resultsElement.innerHTML =
        "";

    clearSpiderGraphics();

    clearHighlight();

}


// ==========================================================
// FACILITY INFORMATION CARD
// ==========================================================

function showFacilityCard(feature) {

    if (!feature) {
        return;
    }


    const p =
        feature.properties ||
        {};


    const name =
        p.Owner_Name ||
        p.Infrastructure_Type ||
        p.Sport ||
        "Sports Facility";


    const sport =
        p.Sport ||
        "Sport not recorded";


    const area =
        getFacilityArea(feature);


    facilityCardContent.innerHTML = `

        <div class="facility-name">
            ${escapeHtml(name)}
        </div>

        <div class="facility-sport">
            ${escapeHtml(sport)}
        </div>


        <div class="facility-info-grid">

            ${facilityInfoItem(
                "Type",
                p.Infrastructure_Type
            )}

            ${facilityInfoItem(
                "Surface",
                p.Surface
            )}

            ${facilityInfoItem(
                "Size",
                p.Size ||
                p.Facility_Size
            )}

            ${facilityInfoItem(
                "Floodlights",
                p.Floodlights
            )}

            ${facilityInfoItem(
                "Owner",
                p.Owner
            )}

            ${facilityInfoItem(
                "Quality",
                qualityLabel(
                    p.Quality
                )
            )}

            ${facilityInfoItem(
                "Usage",
                p.Multi_Use
            )}

            ${facilityInfoItem(
                "Area",
                area
                    ? `${Math.round(area).toLocaleString()} m²`
                    : null
            )}

        </div>


        <div class="facility-location">

            ${
                p.LEA
                    ? `
                        <strong>LEA:</strong>
                        ${escapeHtml(p.LEA)}
                        <br>
                    `
                    : ""
            }

            ${
                p.Local_Authority
                    ? `
                        <strong>Local Authority:</strong>
                        ${escapeHtml(p.Local_Authority)}
                    `
                    : ""
            }

        </div>


        ${
            p.GlobalID
                ? `
                    <div class="facility-id">
                        ${escapeHtml(p.GlobalID)}
                    </div>
                `
                : ""
        }

    `;


    facilityCard
        .classList
        .remove(
            "hidden"
        );

}


function facilityInfoItem(
    label,
    value
) {

    const displayValue =
        value !== null &&
        value !== undefined &&
        value !== ""
            ? value
            : "Not recorded";


    return `

        <div class="facility-info-item">

            <span class="facility-info-label">
                ${escapeHtml(label)}
            </span>

            <span class="facility-info-value">
                ${escapeHtml(displayValue)}
            </span>

        </div>

    `;

}


function hideFacilityCard() {

    facilityCard
        .classList
        .add(
            "hidden"
        );

}


closeFacilityCard.addEventListener(
    "click",
    hideFacilityCard
);


// ==========================================================
// FACILITY AREA
// ==========================================================

function getFacilityArea(feature) {

    const p =
        feature.properties ||
        {};


    const areaMSQ =
        Number(
            p.Area_msq
        );


    if (
        Number.isFinite(areaMSQ) &&
        areaMSQ > 0
    ) {

        return areaMSQ;

    }


    const shapeArea =
        Number(
            p.Shape__Area
        );


    if (
        Number.isFinite(shapeArea) &&
        shapeArea > 0
    ) {

        return shapeArea;

    }


    try {

        return turf.area(feature);

    }

    catch {

        return null;

    }

}


// ==========================================================
// FACILITY CLICK EVENTS
// ==========================================================

map.on(
    "click",
    "facilities-fill",
    event => {

        /*
            In Point Mode a normal click is
            reserved for creating the search
            point.

            Shift-click opens the facility card.
        */

        if (
            currentMode === "point" &&
            !event.originalEvent?.shiftKey
        ) {
            return;
        }


        const feature =
            event.features?.[0];


        if (feature) {

            showFacilityCard(
                feature
            );

        }

    }
);


map.on(
    "mouseenter",
    "facilities-fill",
    () => {

        map.getCanvas()
            .style
            .cursor =
                "pointer";

    }
);


map.on(
    "mouseleave",
    "facilities-fill",
    () => {

        map.getCanvas()
            .style
            .cursor =
                "";

    }
);


// ==========================================================
// CLICK HIGHLIGHTED SPIDER FACILITY
// ==========================================================

map.on(
    "click",
    "nearest-fill",
    event => {

        const feature =
            event.features?.[0];


        if (!feature) {
            return;
        }


        /*
            Open facility information.
        */

        showFacilityCard(
            feature
        );


        /*
            Zoom directly to the selected
            highlighted facility.

            Spider Mode remains active.
        */

        zoomToFeature(
            feature
        );

    }
);


map.on(
    "mouseenter",
    "nearest-fill",
    () => {

        map.getCanvas()
            .style
            .cursor =
                "pointer";

    }
);


map.on(
    "mouseleave",
    "nearest-fill",
    () => {

        map.getCanvas()
            .style
            .cursor =
                "";

    }
);


// ==========================================================
// AREA SUMMARY
// ==========================================================

areaSummaryButton.addEventListener(
    "click",
    runAreaSummary
);


async function runAreaSummary() {

    areaSummaryButton.disabled =
        true;


    areaSummaryButton.textContent =
        "Analysing...";


    const bounds =
        map.getBounds();


    const envelope = [

        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()

    ].join(",");


    try {

        const features =
            await queryAllFacilitiesInEnvelope(

                envelope,
                buildWhereClause()

            );


        displayAreaSummary(
            features
        );

    }

    catch (error) {

        console.error(
            "Area summary failed:",
            error
        );


        areaSummary.innerHTML = `

            <div class="summary-header">

                <strong>
                    Analysis unavailable
                </strong>

                <div class="summary-subtitle">
                    The facilities could not be loaded.
                </div>

            </div>

        `;


        areaSummary
            .classList
            .remove(
                "hidden"
            );

    }

    finally {

        areaSummaryButton.disabled =
            false;


        areaSummaryButton.textContent =
            "📊 Summarise View";

    }

}


// ==========================================================
// AREA SUMMARY STATISTICS
// ==========================================================

function displayAreaSummary(features) {

    const count =
        features.length;


    if (count === 0) {

        areaSummary.innerHTML = `

            <div class="summary-header">

                <strong>
                    No facilities found
                </strong>

                <div class="summary-subtitle">
                    Try changing the filters or viewing a larger area.
                </div>

            </div>

        `;


        areaSummary
            .classList
            .remove(
                "hidden"
            );


        return;

    }


    let totalArea = 0;

    let floodlit = 0;

    let synthetic = 0;

    let multiUse = 0;


    const sportCounts = {};


    features.forEach(
        feature => {

            const p =
                feature.properties ||
                {};


            const sport =
                p.Sport ||
                "Unknown";


            sportCounts[sport] =
                (
                    sportCounts[sport] ||
                    0
                ) + 1;


            const area =
                getFacilityArea(feature);


            if (
                Number.isFinite(area) &&
                area > 0
            ) {

                totalArea += area;

            }


            const floodlightValue =
                String(
                    p.Floodlights ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                floodlightValue ===
                "floodlights"
            ) {

                floodlit++;

            }


            const surface =
                String(
                    p.Surface ||
                    ""
                )
                    .toLowerCase();


            if (
                surface.includes(
                    "synthetic"
                )
            ) {

                synthetic++;

            }


            const usage =
                String(
                    p.Multi_Use ||
                    ""
                )
                    .toLowerCase();


            if (
                usage.includes(
                    "multi"
                )
            ) {

                multiUse++;

            }

        }
    );


    const floodlitPercent =
        Math.round(
            floodlit /
            count *
            100
        );


    const syntheticPercent =
        Math.round(
            synthetic /
            count *
            100
        );


    const multiUsePercent =
        Math.round(
            multiUse /
            count *
            100
        );


    const sortedSports =
        Object.entries(
            sportCounts
        )
            .sort(
                (a, b) =>
                    b[1] -
                    a[1]
            )
            .slice(
                0,
                6
            );


    const largestSportCount =
        sortedSports[0]?.[1] ||
        1;


    let sportRows = "";


    if (
        !sportSelect.value &&
        sortedSports.length > 1
    ) {

        sportRows = `

            <div class="summary-sports">

                <div class="summary-sports-title">
                    Most common sports
                </div>

                ${
                    sortedSports
                        .map(
                            ([
                                sport,
                                sportCount
                            ]) => {

                                const width =
                                    Math.round(

                                        sportCount /
                                        largestSportCount *
                                        100

                                    );


                                return `

                                    <div class="summary-sport-row">

                                        <div class="summary-sport-name">
                                            ${escapeHtml(sport)}
                                        </div>

                                        <div class="summary-sport-bar-container">

                                            <div
                                                class="summary-sport-bar"
                                                style="width:${width}%"
                                            ></div>

                                        </div>

                                        <div class="summary-sport-count">
                                            ${sportCount}
                                        </div>

                                    </div>

                                `;

                            }
                        )
                        .join("")
                }

            </div>

        `;

    }


    const selectedSport =
        sportSelect.value
            ? `${sportSelect.value} • `
            : "";


    const averageArea =
        count > 0 &&
        totalArea > 0
            ? Math.round(
                totalArea /
                count
            )
            : null;


    areaSummary.innerHTML = `

        <div class="summary-header">

            <strong>
                ${escapeHtml(selectedSport)}Current View
            </strong>

            <div class="summary-subtitle">
                Facilities intersecting the visible map area using the current filters.
            </div>

        </div>


        <div class="summary-grid">

            ${summaryStat(
                count.toLocaleString(),
                "Facilities"
            )}

            ${summaryStat(
                formatArea(totalArea),
                "Mapped area"
            )}

            ${summaryStat(
                `${floodlitPercent}%`,
                "Floodlit"
            )}

            ${summaryStat(
                `${syntheticPercent}%`,
                "Synthetic"
            )}

            ${summaryStat(
                `${multiUsePercent}%`,
                "Multi-use"
            )}

            ${summaryStat(
                averageArea
                    ? `${averageArea.toLocaleString()} m²`
                    : "—",
                "Average size"
            )}

        </div>


        ${sportRows}

    `;


    areaSummary
        .classList
        .remove(
            "hidden"
        );

}


function summaryStat(
    value,
    label
) {

    return `

        <div class="summary-stat">

            <div class="summary-stat-value">
                ${escapeHtml(value)}
            </div>

            <div class="summary-stat-label">
                ${escapeHtml(label)}
            </div>

        </div>

    `;

}


function formatArea(
    squareMetres
) {

    if (
        !squareMetres ||
        squareMetres <= 0
    ) {

        return "—";

    }


    if (
        squareMetres >=
        1000000
    ) {

        return (
            squareMetres /
            1000000
        ).toFixed(1) +
        " km²";

    }


    return (
        Math.round(
            squareMetres
        ).toLocaleString() +
        " m²"
    );

}


// ==========================================================
// QUALITY
// ==========================================================

function qualityLabel(
    quality
) {

    const value =
        Number(quality);


    if (value === 1) {
        return "Poor";
    }


    if (value === 2) {
        return "Good / Satisfactory";
    }


    if (value === 3) {
        return "Excellent";
    }


    return "Not recorded";

}


// ==========================================================
// HTML SAFETY
// ==========================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}
