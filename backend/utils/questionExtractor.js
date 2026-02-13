const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text content from a PDF file buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromPDF(buffer) {
    try {
        const pdfParser = new PDFParse({ data: buffer });
        const result = await pdfParser.getText();
        return result.text;
    } catch (error) {
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
}

/**
 * Extract text content from a DOCX file buffer
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromDOCX(buffer) {
    try {
        const result = await mammoth.extractRawText({ buffer: buffer });
        return result.value;
    } catch (error) {
        throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
}

/**
 * Parse questions from extracted text with correct answer detection
 * @param {string} text - Raw text from document
 * @returns {Array} - Array of question objects
 */
function parseQuestions(text) {
    const questions = [];
    
    // Split text into lines for processing
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Pattern for numbered questions
    const numberedPattern = /^(?:Q\.?\s*)?(\d+)[.\)]\s*(.+)/i;
    
    // Pattern for Q: format
    const qPrefixPattern = /^(?:Question|Q)\s*:?\s*(.+)/i;
    
    // Pattern for options with potential correct answer marker
    const optionPattern = /^(?:\()?([A-Da-d])(?:\)|\.|:)\s*(.+)/;
    
    // Pattern for answer line (Answer: B, Correct: B, Ans: B)
    const answerLinePattern = /^(?:Answer|Correct|Ans)\s*:?\s*([A-Da-d])/i;
    
    let currentQuestion = null;
    let currentOptions = [];
    let correctAnswerIndex = -1;
    let questionNumber = 0;
    
    const saveCurrentQuestion = () => {
        if (currentQuestion) {
            questions.push({
                questionNumber: currentQuestion.number,
                questionText: currentQuestion.text,
                options: currentOptions.length > 0 ? currentOptions : undefined,
                correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
                type: currentOptions.length > 0 ? 'mcq' : 'subjective'
            });
        }
    };
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for answer line (Answer: B)
        const answerMatch = line.match(answerLinePattern);
        if (answerMatch) {
            const answerLetter = answerMatch[1].toUpperCase();
            correctAnswerIndex = answerLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            continue;
        }
        
        // Check for option pattern
        const optionMatch = line.match(optionPattern);
        if (optionMatch) {
            const label = optionMatch[1].toUpperCase();
            let optionText = optionMatch[2].trim();
            
            // Check for correct answer markers: *, (correct), ✓, ✔, [correct]
            const isCorrect = /(\*|\(correct\)|\[correct\]|✓|✔|correct\s*$)/i.test(optionText);
            
            // Remove the marker from option text
            optionText = optionText.replace(/(\s*\*|\s*\(correct\)|\s*\[correct\]|\s*✓|\s*✔|\s*correct\s*$)/gi, '').trim();
            
            const optionIndex = label.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            
            if (isCorrect) {
                correctAnswerIndex = optionIndex;
            }
            
            currentOptions.push({
                label: label,
                text: optionText
            });
            continue;
        }
        
        // Check for numbered question
        const numberedMatch = line.match(numberedPattern);
        if (numberedMatch) {
            // Save previous question
            saveCurrentQuestion();
            
            currentQuestion = {
                number: parseInt(numberedMatch[1]),
                text: numberedMatch[2].trim()
            };
            currentOptions = [];
            correctAnswerIndex = -1;
            questionNumber = parseInt(numberedMatch[1]);
            continue;
        }
        
        // Check for Q: format
        const qPrefixMatch = line.match(qPrefixPattern);
        if (qPrefixMatch) {
            // Save previous question
            saveCurrentQuestion();
            
            questionNumber++;
            currentQuestion = {
                number: questionNumber,
                text: qPrefixMatch[1].trim()
            };
            currentOptions = [];
            correctAnswerIndex = -1;
            continue;
        }
        
        // Check if line ends with question mark and looks like a question
        if (line.endsWith('?') && line.length > 15 && !optionMatch) {
            // Save previous question
            saveCurrentQuestion();
            
            questionNumber++;
            currentQuestion = {
                number: questionNumber,
                text: line
            };
            currentOptions = [];
            correctAnswerIndex = -1;
            continue;
        }
        
        // Append to current question if it exists (multi-line question)
        if (currentQuestion && !optionMatch && !answerMatch) {
            // Only append if it doesn't look like a new section or header
            if (line.length > 3 && !line.match(/^(section|part|chapter)/i)) {
                currentQuestion.text += ' ' + line;
            }
        }
    }
    
    // Don't forget the last question
    saveCurrentQuestion();
    
    return questions;
}

/**
 * Main function to extract questions from a file buffer
 * @param {Buffer} buffer - File buffer
 * @param {string} fileType - File extension (pdf, docx, doc)
 * @returns {Promise<Object>} - Extraction result
 */
async function extractQuestions(buffer, fileType) {
    let text;
    
    const normalizedType = fileType.toLowerCase().replace('.', '');
    
    if (normalizedType === 'pdf') {
        text = await extractTextFromPDF(buffer);
    } else if (normalizedType === 'docx' || normalizedType === 'doc') {
        text = await extractTextFromDOCX(buffer);
    } else if (normalizedType === 'txt' || normalizedType === 'text') {
        // Plain text files - just convert buffer to string
        text = buffer.toString('utf-8');
    } else {
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    const questions = parseQuestions(text);
    const codingQuestions = parseCodingQuestions(text);
    
    return {
        rawText: text,
        questions: questions,
        codingQuestions: codingQuestions,
        totalFound: questions.length,
        totalCodingFound: codingQuestions.length
    };
}

/**
 * Parse coding questions from extracted text
 * Detects patterns like:
 * - CODING: Title
 * - Coding Question 1: Title
 * - Problem 1: Title
 * - [CODING] Title
 * 
 * With sections for:
 * - Description
 * - Input/Output format
 * - Constraints
 * - Test Cases / Examples
 * - Sample Input/Output
 * 
 * @param {string} text - Raw text from document
 * @returns {Array} - Array of coding question objects
 */
function parseCodingQuestions(text) {
    const codingQuestions = [];
    
    // Split text into lines
    const lines = text.split('\n').map(line => line.trim());
    
    // Strong patterns that always indicate a coding question header
    const strongHeaderPatterns = [
        /^(?:CODING|Coding)\s*(?:Question|Problem|Q)?\s*[:\-]?\s*(\d+)?[.\):]?\s*(.+)?/i,
        /^\[CODING\]\s*(.+)?/i,
        /^(?:Problem|Prob)\s*(\d+)[.\):]\s*(.+)?/i,
        /^(?:Programming|Code)\s*(?:Question|Problem|Exercise)\s*(\d+)?[.\):]\s*(.+)?/i
    ];
    
    // Weak patterns - only use when NOT in an existing coding question context
    const weakHeaderPatterns = [
        /^(?:Write\s+a\s+(?:program|function|code))\s+(?:to|that|which)\s+(.+)/i,
        /^(?:Implement|Create|Develop|Design)\s+(?:a\s+)?(?:program|function|method|algorithm)\s+(?:to|that|which|for)\s+(.+)/i
    ];
    
    // Section headers within a coding question - more specific patterns
    const sectionPatterns = {
        description: /^(?:Description|Problem\s*Statement|Task|Overview)\s*:?\s*/i,
        input: /^(?:Input\s*Format|Input\s*Description|Input)\s*:?\s*/i,
        output: /^(?:Output\s*Format|Output\s*Description|Expected\s*Output|Output)\s*:?\s*/i,
        constraints: /^(?:Constraints?|Limitations?|Bounds?)\s*:?\s*/i,
        sampleInput: /^(?:Sample\s*Input|Input\s*Example|Example\s*Input|Test\s*Case\s*Input)\s*:?\s*(\d+)?\s*:?\s*/i,
        sampleOutput: /^(?:Sample\s*Output|Output\s*Example|Example\s*Output|Expected\s*Output\s*Example)\s*:?\s*(\d+)?\s*:?\s*/i,
        example: /^(?:Example|Sample|Test\s*Case)\s*:?\s*(\d+)?\s*:?\s*/i,
        explanation: /^(?:Explanation|Note|Hint)\s*:?\s*/i,
        starterCode: /^(?:Starter\s*Code|Template|Boilerplate|Initial\s*Code)\s*:?\s*/i,
        language: /^(?:Language|Programming\s*Language)\s*:?\s*/i
    };
    
    let currentCodingQuestion = null;
    let currentSection = 'description';
    let questionNumber = 0;
    let inCodeBlock = false;
    let codeBlockContent = [];
    let currentTestCase = null;
    
    const saveCodingQuestion = () => {
        if (currentCodingQuestion) {
            // Clean up the question
            currentCodingQuestion.description = currentCodingQuestion.description.trim();
            if (currentCodingQuestion.inputFormat) {
                currentCodingQuestion.inputFormat = currentCodingQuestion.inputFormat.trim();
            }
            if (currentCodingQuestion.outputFormat) {
                currentCodingQuestion.outputFormat = currentCodingQuestion.outputFormat.trim();
            }
            if (currentCodingQuestion.constraints) {
                currentCodingQuestion.constraints = currentCodingQuestion.constraints.trim();
            }
            
            // Only add if it has meaningful content
            if (currentCodingQuestion.title || currentCodingQuestion.description.length > 20) {
                codingQuestions.push(currentCodingQuestion);
            }
        }
    };
    
    const saveCurrentTestCase = () => {
        if (currentTestCase && currentCodingQuestion) {
            if (currentTestCase.input || currentTestCase.expectedOutput) {
                if (!currentCodingQuestion.testCases) {
                    currentCodingQuestion.testCases = [];
                }
                currentCodingQuestion.testCases.push({
                    input: (currentTestCase.input || '').trim(),
                    expectedOutput: (currentTestCase.expectedOutput || '').trim(),
                    weight: 1
                });
            }
        }
        currentTestCase = null;
    };
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const originalLine = line;
        
        // Check for code block markers
        if (line.startsWith('```') || line.startsWith('~~~')) {
            if (inCodeBlock) {
                // End of code block
                inCodeBlock = false;
                if (currentCodingQuestion && currentSection === 'starterCode') {
                    currentCodingQuestion.starterCode = codeBlockContent.join('\n');
                }
                codeBlockContent = [];
            } else {
                // Start of code block
                inCodeBlock = true;
                // Check if language is specified
                const langMatch = line.match(/^```(\w+)/);
                if (langMatch && currentCodingQuestion) {
                    currentCodingQuestion.language = detectLanguage(langMatch[1]);
                }
            }
            continue;
        }
        
        // If inside code block, collect content
        if (inCodeBlock) {
            codeBlockContent.push(originalLine);
            continue;
        }
        
        // Check for coding question header
        let isCodingHeader = false;
        
        // First check strong patterns (always create new question)
        for (const pattern of strongHeaderPatterns) {
            const match = line.match(pattern);
            if (match) {
                // Save previous coding question
                saveCurrentTestCase();
                saveCodingQuestion();
                
                questionNumber++;
                currentCodingQuestion = {
                    questionNumber: match[1] ? parseInt(match[1]) : questionNumber,
                    title: (match[2] || match[1] || '').trim(),
                    description: '',
                    inputFormat: '',
                    outputFormat: '',
                    constraints: '',
                    starterCode: '// Write your code here',
                    language: 'javascript',
                    allowedLanguages: ['javascript', 'python', 'java', 'cpp'],
                    testCases: [],
                    type: 'coding'
                };
                currentSection = 'description';
                isCodingHeader = true;
                break;
            }
        }
        
        // Then check weak patterns ONLY if not already in a coding question
        if (!isCodingHeader && !currentCodingQuestion) {
            for (const pattern of weakHeaderPatterns) {
                const match = line.match(pattern);
                if (match) {
                    questionNumber++;
                    currentCodingQuestion = {
                        questionNumber: questionNumber,
                        title: (match[1] || '').trim(),
                        description: '',
                        inputFormat: '',
                        outputFormat: '',
                        constraints: '',
                        starterCode: '// Write your code here',
                        language: 'javascript',
                        allowedLanguages: ['javascript', 'python', 'java', 'cpp'],
                        testCases: [],
                        type: 'coding'
                    };
                    currentSection = 'description';
                    isCodingHeader = true;
                    break;
                }
            }
        }
        
        if (isCodingHeader) continue;
        
        // If we're not in a coding question context, skip
        if (!currentCodingQuestion) continue;
        
        // Check for section headers
        let sectionFound = false;
        for (const [section, pattern] of Object.entries(sectionPatterns)) {
            if (pattern.test(line)) {
                sectionFound = true;
                
                // Handle sample input/output as test cases
                if (section === 'sampleInput' || section === 'example') {
                    // Save previous test case only when starting a NEW sample input
                    saveCurrentTestCase();
                    currentTestCase = { input: '', expectedOutput: '' };
                    currentSection = 'sampleInput';
                } else if (section === 'sampleOutput') {
                    // DON'T save the test case here - we're adding output to current test case
                    if (!currentTestCase) {
                        currentTestCase = { input: '', expectedOutput: '' };
                    }
                    currentSection = 'sampleOutput';
                } else {
                    // For other sections, save the current test case first
                    saveCurrentTestCase();
                    currentSection = section;
                }
                
                // Check if content is on the same line
                const contentAfterHeader = line.replace(pattern, '').trim();
                if (contentAfterHeader) {
                    appendToSection(currentCodingQuestion, currentSection, contentAfterHeader, currentTestCase);
                }
                break;
            }
        }
        
        if (sectionFound) continue;
        
        // Append line to current section
        if (line.length > 0) {
            appendToSection(currentCodingQuestion, currentSection, line, currentTestCase);
        }
    }
    
    // Save the last test case and question
    saveCurrentTestCase();
    saveCodingQuestion();
    
    return codingQuestions;
}

/**
 * Append content to the appropriate section of a coding question
 */
function appendToSection(question, section, content, testCase) {
    switch (section) {
        case 'description':
            question.description += (question.description ? '\n' : '') + content;
            break;
        case 'input':
            question.inputFormat += (question.inputFormat ? '\n' : '') + content;
            break;
        case 'output':
            question.outputFormat += (question.outputFormat ? '\n' : '') + content;
            break;
        case 'constraints':
            question.constraints += (question.constraints ? '\n' : '') + content;
            break;
        case 'starterCode':
            question.starterCode += '\n' + content;
            break;
        case 'sampleInput':
            if (testCase) {
                testCase.input += (testCase.input ? '\n' : '') + content;
            }
            break;
        case 'sampleOutput':
            if (testCase) {
                testCase.expectedOutput += (testCase.expectedOutput ? '\n' : '') + content;
            }
            break;
        case 'language':
            question.language = detectLanguage(content);
            break;
        case 'explanation':
            // Add to description as a note
            question.description += '\n\nNote: ' + content;
            break;
        default:
            // Default to description
            question.description += (question.description ? '\n' : '') + content;
    }
}

/**
 * Detect programming language from string
 */
function detectLanguage(langStr) {
    const lang = langStr.toLowerCase().trim();
    const languageMap = {
        'javascript': 'javascript',
        'js': 'javascript',
        'node': 'javascript',
        'nodejs': 'javascript',
        'python': 'python',
        'python3': 'python',
        'py': 'python',
        'java': 'java',
        'c++': 'cpp',
        'cpp': 'cpp',
        'c': 'c',
        'csharp': 'csharp',
        'c#': 'csharp',
        'ruby': 'ruby',
        'rb': 'ruby',
        'go': 'go',
        'golang': 'go',
        'rust': 'rust',
        'rs': 'rust',
        'typescript': 'typescript',
        'ts': 'typescript',
        'php': 'php',
        'swift': 'swift',
        'kotlin': 'kotlin',
        'kt': 'kotlin'
    };
    return languageMap[lang] || 'javascript';
}

module.exports = { 
    extractQuestions,
    extractTextFromPDF,
    extractTextFromDOCX,
    parseQuestions,
    parseCodingQuestions,
    detectLanguage
};
