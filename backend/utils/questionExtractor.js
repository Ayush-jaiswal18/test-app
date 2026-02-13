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
    } else {
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    const questions = parseQuestions(text);
    
    return {
        rawText: text,
        questions: questions,
        totalFound: questions.length
    };
}

module.exports = { 
    extractQuestions,
    extractTextFromPDF,
    extractTextFromDOCX,
    parseQuestions
};
