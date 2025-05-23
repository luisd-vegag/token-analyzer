# Gemini Token Analyzer: Text vs. PDF

A web application that analyzes and compares token usage when sending content to Google's Gemini API in different formats - plain text versus PDF documents. This tool helps developers and researchers understand the impact of multimodal input formats on token consumption and API costs.

## 🌐 Try It Online

You can use the app directly at: [https://tokenanalyzer.luisvega.me](https://tokenanalyzer.luisvega.me)

No installation required — just enter your Gemini API key and start analyzing!

## 🎯 Purpose

Understanding token usage is crucial for optimizing AI API costs and performance. This app provides insights into:

- **Token Count Differences**: Compare how the same content consumes tokens when sent as text vs. PDF
- **Cost Optimization**: Make informed decisions about input format based on token efficiency
- **Multimodal Impact**: Understand the overhead of PDF processing in AI models
- **Interactive Testing**: Chat with your content in both formats to see real-time token usage

## ✨ Key Features

### Token Analysis
- **Text Input Analysis**: Count tokens for plain text stories or documents
- **PDF Upload Analysis**: Count tokens for PDF documents with the same content
- **Intelligent Comparison Widget**: Advanced comparison view with percentage differences and insights
- **Real-time Updates**: Instant token counting as you modify content

### Advanced Token Comparison
- **Percentage Analysis**: Calculates exact percentage differences between text and PDF token usage
- **Color-Coded Insights**: Visual indicators showing whether PDF uses more (red), fewer (green), or similar (cyan) tokens
- **Source Tracking**: Displays whether token counts came from direct analysis or chat interactions
- **Smart Messaging**: Contextual messages explaining the comparison results
- **Edge Case Handling**: Proper handling of zero token scenarios and identical counts

### Interactive Chat
- **Dual Chat Interface**: Chat with your content in both text and PDF contexts
- **Token Tracking**: Monitor token usage across chat sessions with detailed breakdowns
- **Session-Aware Comparison**: Token comparison updates automatically when chatting
- **Streaming Responses**: Real-time response streaming from Gemini API
- **Session Management**: Maintain separate chat sessions for each input format

### User Experience
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Error Handling**: Comprehensive error messages and validation
- **Loading States**: Clear visual feedback during API operations
- **File Validation**: Ensures only valid PDF files are processed

## 🚀 Benefits for Users

### For Developers
- **Cost Optimization**: Choose the most token-efficient input format for your use case
- **API Planning**: Better estimate token costs for production applications
- **Format Selection**: Data-driven decisions on whether to use text extraction or direct PDF processing
- **Performance Insights**: Understand token overhead from different input modalities

### For Researchers
- **Comparative Analysis**: Quantify the token overhead of different input modalities with precise percentage calculations
- **Performance Metrics**: Understand how format affects model processing efficiency
- **Documentation**: Generate reports on token usage patterns across formats
- **Statistical Analysis**: Access to absolute differences and percentage calculations

### For Content Creators
- **Content Strategy**: Optimize how you present content to AI models based on token efficiency
- **Efficiency Testing**: Test different content formats before production use with real-time feedback
- **Cost Awareness**: Understand the financial impact of your content format choices
- **Format Optimization**: Make informed decisions about content delivery methods

## 🔍 Token Comparison Features

The application includes an advanced **Token Usage Comparison** widget that provides:

### Visual Comparison
- **Percentage Differences**: Shows exact percentage increase or decrease when using PDF vs. text
- **Color-Coded Results**: 
  - 🔴 Red: PDF uses significantly more tokens than text
  - 🟢 Green: PDF uses fewer tokens than text  
  - 🔵 Cyan: Both formats use approximately the same tokens
- **Absolute Differences**: Displays the exact token count difference between formats

### Source Attribution
- **Analysis Source Tracking**: Indicates whether token counts came from:
  - Direct "Analyze" button usage
  - First meaningful message in chat sessions
- **Transparency**: Clear labeling of data sources for accurate interpretation

### Intelligent Messaging
- **Contextual Insights**: Dynamic messages explaining what the comparison means
- **Edge Case Handling**: Proper display for scenarios like zero tokens or identical counts
- **Actionable Information**: Clear guidance on which format is more token-efficient

## 🛠️ Technical Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS for modern, responsive design
- **API Integration**: Google Gemini AI API (@google/genai)
- **Build Tool**: Vite for fast development and optimized builds
- **File Processing**: Browser-based PDF to Base64 conversion

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Google Gemini API Key** (required for token analysis and chat features)

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to the provided local URL

4. **Enter your Gemini API Key** in the application interface

5. **Upload a PDF or enter text** to start analyzing token usage

6. **View the comparison** - The Token Usage Comparison widget will automatically appear once you've analyzed both formats

## 💡 Use Cases

- **API Cost Estimation**: Before implementing PDF processing in production, understand exact token overhead
- **Content Format Decision**: Use percentage differences to choose between text extraction vs. direct PDF processing
- **Token Budget Planning**: Understand token consumption patterns with precise metrics
- **Performance Optimization**: Identify the most efficient input format with quantified results
- **Educational Tool**: Learn about multimodal AI token usage with visual feedback
- **A/B Testing**: Compare token efficiency between different content preparation methods

## 🔒 Privacy & Security

- All processing happens in your browser
- API keys are stored locally in your session only
- No data is sent to external servers except the Gemini API
- Files are processed client-side before API submission

---

**Get Started**: Simply run the app, enter your Gemini API key, analyze both text and PDF formats, and view the intelligent comparison results to optimize your AI API usage!
