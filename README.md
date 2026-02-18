## AI-Powered Test Automation Analyzer

This tool uses Google Gemini AI to analyze your test automation results and generate a professional HTML report with actionable insights.

### How to Use

1. **Add the Analyzer to Your Project**
   - Copy the entire `ai-analyzer` folder into your test automation project root.

2. **Allure Results Folder**
   - Make sure your project generates test results in an `allure-results` folder at the project root. The analyzer reads JSON files from this folder.

3. **Set Your Gemini API Key**
   - Open `ai.js` and replace `{{YOUR_KEY_HERE}}` with your Gemini API key, or set the `GEMINI_API_KEY` environment variable before running.
   - **Example:**
     ```sh
     set GEMINI_API_KEY=your-gemini-api-key-here
     node ai-analyzer/ai.js
     ```

4. **Run the Analyzer**
   - From your project root, run:
     ```sh
     node ai-analyzer/ai.js
     ```
   - The tool will read your Allure results, send them to Gemini, and generate an HTML report in the `ai-results` folder.

5. **View the Report**
   - Open `ai-results/ai-report.html` in your browser to see the analysis.

### Requirements

- Node.js 18+
- Allure results in JSON format in `allure-results/`
- Google Gemini API key

### Notes

- The report uses a template (`template.html`) for consistent styling and branding. Make sure the logo path in the template is correct for your project.
- The analyzer only reads files ending with `-result.json` in the `allure-results` folder.
- The tool is language-agnostic: you can use it with any test automation project that outputs Allure results.

---
**Enjoy AI-powered test analysis!**