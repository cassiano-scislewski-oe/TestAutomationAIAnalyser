
import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs/promises'; // We'll use promises for async I/O operations
import * as path from 'path';

// Gemini SDK (using the new '@google/genai' library)
// It will automatically fetch the GEMINI_API_KEY from the environment variable.
// **SECURITY FIX:** Do not hardcode your key. Use environment variables.
// Run the script with: GEMINI_API_KEY="YOUR_KEY_HERE" node ai.js
const ai = new GoogleGenAI({apiKey: '{{YOUR_KEY_HERE}}'});

// We'll use 'gemini-2.5-pro' for better reasoning and HTML structuring
const MODEL_NAME = 'gemini-2.5-pro';

// --- Date/Format Helpers ---

/**
 * Formats a timestamp in milliseconds to a readable date string.
 * @param {number} ms - Timestamp in milliseconds.
 * @returns {string} Formatted date.
 */
function formatTimestamp(ms) {
    if (typeof ms === 'number') {
        return new Date(ms).toLocaleString('en-US', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
    return "N/A";
}

// --- Main Analysis Functions ---

/**
 * Loads and parses Allure result files.
 * @param {string} folder - Path to the allure-results folder.
 * @returns {Promise<Array<Object>>} A promise that resolves to a list of results.
 */
async function loadAllureResults(folder = "./allure-results") {
    const results = [];
    try {
        const files = await fs.readdir(folder);
        for (const file of files) {
            if (file.endsWith("-result.json")) {
                const filePath = path.join(folder, file);
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                results.push({
                    test_case_id: data.testCaseId,
                    name: data.name,
                    status: data.status,
                    fullName: data.fullName,
                    description: data.description,
                    start: data.start,
                    stop: data.stop,
                    parameters: data.parameters
                });
            }
        }
    } catch (error) {
        console.error(`Error loading Allure results: ${error.message}`);
        return [];
    }
    return results;
}

async function readTemplateFile(filePath) {
    if (!filePath) {
        console.error("🚫 Cannot read file: path not provided.");
        return;
    }
    try {
        console.log(`\n--- Reading content from ${path.basename(filePath)} ---`);
        // Read file content asynchronously
        const htmlContent = await fs.readFile(filePath, 'utf-8');
        return htmlContent;
    } catch (error) {
        console.error(`❌ Error reading HTML file at ${filePath}:`, error.message);
    }
}

/**
 * Formats test results as a string for inclusion in the AI prompt.
 * @param {Array<Object>} results - List of raw test results.
 * @returns {string} Formatted string.
 */
function formatForPrompt(results) {
    const lines = results.map(r => {
        const name = r.fullName || r.name;
        const status = (r.status || "unknown").toUpperCase();
        const desc = r.description || "";
        const start = formatTimestamp(r.start);
        const stop = formatTimestamp(r.stop);
        const timeInfo = (start !== "N/A" && stop !== "N/A") ? ` ⏱️ Start: ${start} | End: ${stop}` : "";
        console.log('Generating Prompt');
        return `${status} - ${name} :: ${desc}${timeInfo}`;
    });
    return lines.join('\n');
}

/**
 * Sends formatted data to Gemini and saves the HTML report.
 * @param {string} model - Gemini model name.
 * @param {string} data - Formatted test data for the prompt.
 * @param {string} outputDir - Directory to save the report.
 * @returns {Promise<string|null>} Full path of the saved file or null.
 */
async function sendToLLM(model, data, outputDir = "ai-results") {
    const today = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `ai-report.html`;
    const prompt = `
    You are a test automation assistant. Below is our test data. You must analyze only the tests from the last execution, but include all of them in your final report regardless of status. Our data:

    --- TEST EXECUTION DATA ---
    ${data}
    --- END OF DATA ---

    You need to evaluate the following topics:

    1. For each test, present the following information in a table: Test Name, Status, Score of the possibility (%) of being an error related to the application (APP) vs. test automation code (AUTOMATION). If the test passed, the scoring should be N/A.
    2. Errors that could be solved by fixing other components (dependencies, environment, or configuration).
    3. Any recurring pattern or anti-pattern related to the failures.
    4. Recommended Actions to fix the most critical or recurring failures.

    The tone and structure should be professional, as in a technical report.

    The title should be AI-Powered Test Automation Analysis.

    The format must be a complete HTML document, including DOCTYPE, head (with modern font styling), and body.
    
    Here's our template file:
    ${await readTemplateFile('./ai-automation-analyzer/template.html')}
    add the date of the report generation in the header, and a summary of the total tests, passed, failed, and flaky.
    Don't forget to include our logo with the same location that is in the template
    `;

    try {
        console.log('Processing Response...')
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt
        });

        const fullText = response.text;
        // Regex to extract the full HTML content (including DOCTYPE and </html>)
        const htmlMatch = fullText.match(/(<!DOCTYPE html>.*?<\/html>)/si);

        if (htmlMatch) {
            const htmlContent = htmlMatch[1];
            // Create directory if it doesn't exist
            await fs.mkdir(outputDir, { recursive: true });
            // Save the HTML
            const fullPath = path.join(outputDir, fileName);
            await fs.writeFile(fullPath, htmlContent, "utf-8");
            console.log(`✅ HTML successfully saved at: ${fullPath}`);
            return fullPath;
        } else {
            console.log("⚠️ No valid HTML content found in the AI response. See raw log below.");
            console.log(fullText); // Print raw text for debug
            return null;
        }
    } catch (error) {
        console.error("❌ Error calling Gemini API:", error);
        return null;
    }
}

// --- Main Execution Function (Async/Await) ---
async function main() {
    console.log("Starting automation analysis with Gemini...");
    // 1. Load Results
    const results = await loadAllureResults();
    if (results.length === 0) {
        console.log("🚫 No test executions found or allure-results folder is empty/nonexistent.");
        return;
    }
    // 2. Format Results
    const formattedResults = formatForPrompt(results);
    // 3. Call LLM and Save
    await sendToLLM(MODEL_NAME, formattedResults);
}

// Run the main function
main();