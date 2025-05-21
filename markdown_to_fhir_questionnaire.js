#!/usr/bin/env node
/**
 * Markdown to FHIR Questionnaire Converter
 *
 * Usage:
 *   node markdown_to_fhir_questionnaire.js input.md output.json
 *
 * - Parses a markdown file with sections and questions (like STAT MSQ)
 * - Outputs a FHIR Questionnaire JSON file (no LOINC codes required)
 *
 * Assumes markdown format:
 *   Section Title:
 *   Question 1: ☐ 0 ☐ 1 ☐ 2 ☐ 3 ☐ 4
 *   Question 2: ☐ 0 ☐ 1 ☐ 2 ☐ 3 ☐ 4
 *   ...
 *   Total Points: _______
 */
const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.error('Usage: node markdown_to_fhir_questionnaire.js input.md output.json');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

const md = fs.readFileSync(inputPath, 'utf8');

// Parse markdown into sections and questions
function parseMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const sections = [];
  let currentSection = null;
  for (let line of lines) {
    line = line.trim();
    // Section header: ends with ':' and not a question
    if (/^[A-Za-z /]+:$/.test(line) && !/Total Points/.test(line)) {
      if (currentSection) sections.push(currentSection);
      currentSection = { section: line.replace(/:$/, ''), questions: [] };
    } else if (/^.+: ☐ 0 ☐ 1 ☐ 2 ☐ 3 ☐ 4$/.test(line)) {
      // Question line
      const q = line.replace(/: ☐ 0 ☐ 1 ☐ 2 ☐ 3 ☐ 4$/, '');
      if (currentSection) currentSection.questions.push(q);
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections;
}

function toFhirQuestionnaire(msq, title = 'Imported Questionnaire') {
  return {
    resourceType: 'Questionnaire',
    title,
    status: 'draft',
    item: msq.map((section, sectionIdx) => ({
      linkId: `section${sectionIdx + 1}`,
      text: section.section,
      type: 'group',
      item: section.questions.map((q, qIdx) => ({
        linkId: `section${sectionIdx + 1}-q${qIdx + 1}`,
        text: q,
        type: 'choice',
        answerOption: [0, 1, 2, 3, 4].map(val => ({
          valueInteger: val,
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-optionPrefix',
              valueString: String(val)
            }
          ]
        }))
      }))
    }))
  };
}

const sections = parseMarkdown(md);
const title = path.basename(inputPath, path.extname(inputPath));
const fhirQuestionnaire = toFhirQuestionnaire(sections, title);

fs.writeFileSync(outputPath, JSON.stringify(fhirQuestionnaire, null, 2));
console.log(`FHIR Questionnaire written to ${outputPath}`); 