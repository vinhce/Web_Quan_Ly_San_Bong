const fs = require('fs');

const dataJson = JSON.parse(fs.readFileSync('data/data.json', 'utf8'));
const pitches = dataJson.pitches;

let dataJs = fs.readFileSync('js/data.js', 'utf8');

const regex = /const DEFAULT_PITCHES = \[[\s\S]*?\n\];/;
const newPitchesBlock = `const DEFAULT_PITCHES = ${JSON.stringify(pitches, null, 2)};`;

if (regex.test(dataJs)) {
  dataJs = dataJs.replace(regex, newPitchesBlock);
  fs.writeFileSync('js/data.js', dataJs, 'utf8');
  console.log('Successfully updated DEFAULT_PITCHES in js/data.js with', pitches.length, 'pitches');
} else {
  console.error('Failed to match DEFAULT_PITCHES regex in js/data.js');
}
