// Test the question extraction functionality
const fs = require('fs');
const { parseQuestions, parseCodingQuestions } = require('./utils/questionExtractor');

// Sample MCQ test text
const mcqTestText = `
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

// Sample Coding test text
const codingTestText = `
CODING QUESTION 1: Two Sum Problem

Description:
Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

Input Format:
First line contains n, the number of elements.
Second line contains n space-separated integers.

Output Format:
Print two space-separated indices.

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9

Sample Input 1:
4
2 7 11 15

Sample Output 1:
0 1

Sample Input 2:
3
3 2 4

Sample Output 2:
1 2

Language: JavaScript

-----------------------------------------------------------
Problem 2: Reverse String

Description:
Write a function that reverses a string.

Sample Input:
hello

Sample Output:
olleh
`;

console.log('=== Testing MCQ Extraction ===\n');
const mcqResult = parseQuestions(mcqTestText);

console.log(`Total MCQ questions found: ${mcqResult.length}\n`);

mcqResult.forEach((q, i) => {
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

console.log('\n=== Testing Coding Question Extraction ===\n');
const codingResult = parseCodingQuestions(codingTestText);

console.log(`Total Coding questions found: ${codingResult.length}\n`);

codingResult.forEach((q, i) => {
    console.log(`Coding Question ${i + 1}:`);
    console.log(`  Title: ${q.title}`);
    console.log(`  Language: ${q.language}`);
    console.log(`  Description: ${q.description}`);
    console.log(`  Input Format: ${q.inputFormat || 'N/A'}`);
    console.log(`  Output Format: ${q.outputFormat || 'N/A'}`);
    console.log(`  Constraints: ${q.constraints || 'N/A'}`);
    if (q.testCases && q.testCases.length > 0) {
        console.log(`  Test Cases: ${q.testCases.length}`);
        q.testCases.forEach((tc, j) => {
            console.log(`    Case ${j + 1}:`);
            console.log(`      Input: "${tc.input}"`);
            console.log(`      Output: "${tc.expectedOutput}"`);
        });
    }
    console.log('');
});
