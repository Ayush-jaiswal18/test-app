// Test the question extraction functionality
const fs = require('fs');
const { extractQuestions } = require('./utils/questionExtractor');

// Sample test text
const testText = `
1. What is JavaScript?
A) A database
B) A programming language *
C) An OS
D) A compiler

Answer: B

2. What is Node.js?
A) A browser
B) A runtime environment *
C) A database
D) A framework
`;

console.log('Testing question extraction...\n');

// Test with a mock PDF-like text
const mockBuffer = Buffer.from(testText);

// Note: This won't work directly as we need actual PDF parsing
// But let's test the parseQuestions function directly
const { parseQuestions } = require('./utils/questionExtractor');

const result = parseQuestions(testText);

console.log('Extraction Results:');
console.log('===================');
console.log(`Total questions found: ${result.length}\n`);

result.forEach((q, i) => {
    console.log(`Question ${i + 1}:`);
    console.log(`  Text: ${q.questionText}`);
    console.log(`  Type: ${q.type}`);
    if (q.options) {
        console.log('  Options:');
        q.options.forEach(opt => {
            console.log(`    ${opt.label}) ${opt.text}`);
        });
        console.log(`  Correct Answer: ${q.correctAnswer} (${String.fromCharCode(65 + q.correctAnswer)})`);
    }
    console.log('');
});
