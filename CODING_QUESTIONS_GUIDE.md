# Coding Questions Feature Guide

This guide explains how to use the coding questions feature in your test portal.

## Overview

The test portal now supports coding questions alongside multiple-choice questions. Students can write, run, and submit code during tests, and admins can evaluate their submissions.

## Features Implemented

### 1. ✅ Judge0 API Setup
- Environment configuration for Judge0 API
- Support for RapidAPI and self-hosted Judge0
- See `JUDGE0_SETUP.md` for detailed setup instructions

### 2. ✅ Test Case Management
- Admins can add test cases when creating coding questions
- Each test case has:
  - Input: Test input for the code
  - Expected Output: Expected result
  - Weight: Points for passing this test case

### 3. ✅ Admin Evaluation
- View all student submissions in Results page
- Evaluate coding questions manually
- Add scores and feedback
- Automatic score recalculation

## How to Use

### For Admins: Creating Tests with Coding Questions

1. **Navigate to Create Test Page**
   - Go to Dashboard → Create Test

2. **Add a Section with Coding Questions**
   - In any section, scroll to "Coding Questions"
   - Click "Add Coding Question"

3. **Fill in Question Details**
   - **Title**: Name of the coding question
   - **Description**: Problem statement (supports multi-line)
   - **Starter Code**: Initial code template for students
   - **Language**: Choose from JavaScript, Python, C++, or Java

4. **Add Test Cases (Optional)**
   - Click "+ Add Test Case" for each test case
   - Enter Input and Expected Output
   - Set Weight (points) for each test case
   - Test cases enable automatic evaluation (future feature)

5. **Save the Test**
   - Click "Save Test" to create the test

### For Students: Taking Tests with Coding Questions

1. **Start the Test**
   - Enter name, email, and roll number
   - Click "Start Test"

2. **Navigate Between Questions**
   - Use tabs to switch between "Multiple Choice" and "Coding Questions"
   - Use Previous/Next buttons to navigate

3. **Write Code**
   - Select programming language (if multiple allowed)
   - Write your solution in the code editor
   - Code is auto-saved as you type

4. **Run Code (Optional)**
   - Click "▶ Run Code" to test your solution
   - Enter input in the "Standard Input" field if needed
   - View output in the Output section

5. **Submit Test**
   - Click "Submit Test" when finished
   - All code submissions are saved

### For Admins: Evaluating Coding Submissions

1. **View Results**
   - Go to Dashboard → Select a test → View Results

2. **View Student Details**
   - Click "View Details" next to any student
   - See all MCQ answers and coding submissions

3. **Evaluate Coding Questions**
   - Scroll to the coding question section
   - Review the student's code
   - Enter a score (0 to max points)
   - Add feedback (optional)
   - Click "Save Evaluation"

4. **Score Calculation**
   - MCQ scores are calculated automatically
   - Coding question scores are added when you evaluate
   - Total score updates automatically

## File Structure

### Frontend Components
- `CodeEditor.jsx`: Enhanced code editor with run/submit functionality
- `CreateTestPage.jsx`: Updated to support test cases
- `TestPage.jsx`: Updated to display coding questions
- `ResultsPage.jsx`: Updated to show and evaluate coding submissions

### Backend
- `routes/code.js`: Code execution endpoints
- `controllers/resultController.js`: Evaluation endpoints
- `models/testModel.js`: Updated schema for coding questions
- `models/resultModel.js`: Updated schema for coding answers

## Environment Variables

Add these to your `backend/.env` file:

```env
# Judge0 Configuration
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=your_rapidapi_key_here
```

## API Endpoints

### Code Execution
- `POST /api/code/run`: Run code and get output
- `POST /api/code/submit/:questionId`: Submit code for evaluation (standalone questions)

### Results & Evaluation
- `GET /api/results/:testId`: Get all results for a test
- `GET /api/results/:testId/:resultId`: Get detailed result
- `POST /api/results/:resultId/evaluate-coding`: Evaluate a coding question

## Future Enhancements

Potential improvements you could add:

1. **Automatic Evaluation**: Run test cases automatically when students submit
2. **Code Comparison**: Compare student code with solution
3. **Syntax Highlighting**: Enhanced editor features
4. **More Languages**: Add support for more programming languages
5. **Code Templates**: Pre-defined templates for common problems
6. **Time Tracking**: Track time spent on each coding question

## Troubleshooting

### Code Editor Not Loading
- Check browser console for errors
- Ensure Monaco Editor is installed: `npm install @monaco-editor/react`

### Code Execution Failing
- Verify Judge0 API is configured correctly
- Check backend logs for error messages
- Ensure API key is valid and not expired

### Test Cases Not Saving
- Check that test cases are properly formatted
- Verify backend is saving test cases in the database
- Check browser console for errors

### Evaluation Not Working
- Ensure you're logged in as admin
- Check that the result ID is correct
- Verify backend endpoint is accessible

## Support

For issues or questions:
1. Check the `JUDGE0_SETUP.md` for API setup
2. Review backend logs for errors
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly



