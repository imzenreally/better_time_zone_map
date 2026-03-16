/**
 * Simplify Time Zone Boundary Geometry Script
 *
 * Processes combined.json (already downloaded), simplifies polygons using Turf.js,
 * and converts to MapGeometry format.
 *
 * Prerequisites: combined.json must exist in scripts/ directory
 * Output: src/data/map-geometry.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as turf from '@turf/turf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_GEOJSON = path.join(__dirname, 'combined.json');
const OUTPUT_PATH = path.join(__dirname, '../src/data/map-geometry.json');
const SIMPLIFICATION_TOLERANCE = 0.21; // degrees (~23km at equator)
const DATA_VERSION = '2024b';

/**
 * Simplifies a GeoJSON geometry using Turf.js
 */
function simplifyGeometry(geometry, tolerance) {
  try {
    const feature = turf.feature(geometry);
    const simplified = turf.simplify(feature, {
      tolerance: tolerance,
      highQuality: false
    });
    return simplified.geometry;
  } catch (error) {
    console.warn(`Failed to simplify geometry: ${error.message}`);
    return geometry; // Return original if simplification fails
  }
}

/**
 * Converts GeoJSON coordinates to our Polygon format
 */
function convertPolygonCoordinates(coordinates) {
  // GeoJSON Polygon: [[[lon, lat], ...]]
  // Our format: Polygon { coordinates: [[lon, lat], ...] }
  if (!coordinates || !coordinates[0]) {
    return null;
  }

  // Use outer ring only (index 0), ignore holes
  return {
    coordinates: coordinates[0].map(([lon, lat]) => [lon, lat])
  };
}

/**
 * Converts GeoJSON feature to TimeZoneBoundary format
 */
function convertFeature(feature, tolerance) {
  const zoneId = feature.properties?.tzid;
  if (!zoneId) {
    console.warn('Feature missing tzid property, skipping');
    return null;
  }

  // Simplify the geometry
  const simplified = simplifyGeometry(feature.geometry, tolerance);

  const polygons = [];

  if (simplified.type === 'Polygon') {
    const polygon = convertPolygonCoordinates(simplified.coordinates);
    if (polygon) polygons.push(polygon);
  } else if (simplified.type === 'MultiPolygon') {
    // Handle multi-polygon (zones split by date line, etc.)
    for (const polyCoords of simplified.coordinates) {
      const polygon = convertPolygonCoordinates(polyCoords);
      if (polygon) polygons.push(polygon);
    }
  } else {
    console.warn(`Unsupported geometry type: ${simplified.type} for zone ${zoneId}`);
    return null;
  }

  if (polygons.length === 0) {
    console.warn(`No valid polygons for zone ${zoneId}`);
    return null;
  }

  return {
    zoneId,
    polygons
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Time Zone Geometry Simplification ===\n');

  try {
    // Step 1: Check input file exists
    if (!fs.existsSync(INPUT_GEOJSON)) {
      throw new Error(`Input file not found: ${INPUT_GEOJSON}\n` +
        'Please download timezones.geojson.zip from:\n' +
        'https://github.com/evansiroky/timezone-boundary-builder/releases\n' +
        'And extract combined.json to the scripts/ directory.');
    }

    // Step 2: Load GeoJSON
    console.log('Step 1: Loading GeoJSON data...');
    console.log(`File: ${INPUT_GEOJSON}`);
    const fileSizeMB = (fs.statSync(INPUT_GEOJSON).size / 1024 / 1024).toFixed(1);
    console.log(`Size: ${fileSizeMB} MB`);

    let geojson;
    try {
      const jsonData = fs.readFileSync(INPUT_GEOJSON, 'utf8');
      geojson = JSON.parse(jsonData);
      console.log(`✓ Loaded ${geojson.features?.length || 0} features\n`);
    } catch (error) {
      throw new Error(`Failed to load GeoJSON: ${error.message}`);
    }

    // Validate GeoJSON structure
    if (!geojson.features || !Array.isArray(geojson.features)) {
      throw new Error('Invalid GeoJSON: missing features array');
    }

    // Step 3: Process and simplify features
    console.log('Step 2: Simplifying geometries...');
    console.log(`Tolerance: ${SIMPLIFICATION_TOLERANCE} degrees (~1km at equator)`);
    console.log(`Processing ${geojson.features.length} time zones...\n`);

    const boundaries = [];
    let processedCount = 0;
    let skippedCount = 0;

    for (const feature of geojson.features) {
      processedCount++;
      if (processedCount % 50 === 0 || processedCount === geojson.features.length) {
        process.stdout.write(`Progress: ${processedCount}/${geojson.features.length} (${Math.round(processedCount/geojson.features.length*100)}%)\r`);
      }

      const boundary = convertFeature(feature, SIMPLIFICATION_TOLERANCE);
      if (boundary) {
        boundaries.push(boundary);
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✓ Processed ${processedCount} features`);
    console.log(`✓ Converted ${boundaries.length} time zones`);
    if (skippedCount > 0) {
      console.log(`⚠ Skipped ${skippedCount} invalid features\n`);
    } else {
      console.log('');
    }

    // Step 4: Create MapGeometry structure
    console.log('Step 3: Creating MapGeometry structure...');
    const mapGeometry = {
      version: DATA_VERSION,
      source: 'timezone-boundary-builder (github.com/evansiroky/timezone-boundary-builder)',
      simplified: true,
      simplificationTolerance: SIMPLIFICATION_TOLERANCE,
      boundaries
    };

    // Step 5: Write to file
    console.log('Step 4: Writing to file...');
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonString = JSON.stringify(mapGeometry, null, 2);
    fs.writeFileSync(OUTPUT_PATH, jsonString, 'utf8');

    const fileSizeKB = Math.round(jsonString.length / 1024);
    console.log(`✓ Written to: ${OUTPUT_PATH}`);
    console.log(`✓ File size: ${fileSizeKB} KB\n`);

    // Step 6: Summary
    console.log('=== Summary ===');
    console.log(`Time zones: ${boundaries.length}`);
    console.log(`Total polygons: ${boundaries.reduce((sum, b) => sum + b.polygons.length, 0)}`);
    console.log(`File size: ${fileSizeKB} KB`);
    console.log(`Simplification: ${SIMPLIFICATION_TOLERANCE}° tolerance`);
    console.log(`Compression: ${fileSizeMB} MB → ${fileSizeKB} KB (${Math.round(fileSizeKB / (parseFloat(fileSizeMB) * 1024) * 100)}% of original)`);

    if (fileSizeKB > 1000) {
      console.log('\n⚠ Warning: File size exceeds 1MB. Consider increasing simplification tolerance.');
    } else if (fileSizeKB < 100) {
      console.log('\n⚠ Warning: File size is very small. Geometry may be over-simplified.');
    } else {
      console.log('\n✓ File size is within acceptable range (100-1000 KB)');
    }

    console.log('\n✓ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
