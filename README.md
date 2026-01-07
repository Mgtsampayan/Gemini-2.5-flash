# 🌌 Gemini AI Chat Companion

A state-of-the-art, high-performance AI chatbot built with **Next.js 16**, **React 19**, and **Google Gemini 2.5 Flash**. This project combines minimalist aesthetics with powerful agentic capabilities, offering a seamless and intelligent chat experience.

![Premium UI](https://img.shields.io/badge/UI-Premium-blueviolet)
![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black)
![React](https://img.shields.io/badge/Library-React%2019-blue)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)

---

## ✨ Key Features

### 🧠 Advanced AI Reasoning
- **Gemini 2.5 Flash Integration**: Ultra-fast response times with deep contextual understanding.
- **Agentic Tools**: Equipped with specialized tools for complex tasks, including a secure mathematical calculator.
- **Contextual Memory**: Intelligent conversation threading and history management.

### 🎨 Premium User Experience
- **Fluid Animations**: High-fidelity transitions powered by `framer-motion`.
- **Dynamic Sidebar**: Collapsible, intuitive navigation for managing multiple conversations.
- **Glassmorphism Design**: Modern, translucent UI components with tailwindcss-optimized styling.
- **A11y First**: Fully accessible interface with keyboard navigation support and semantic HTML.

### 🛡️ Engineering Excellence
- **Rate Limiting**: Integrated protection to ensure service stability.
- **Secure Computation**: Math tool powered by `expr-eval` for safe expression parsing.
- **Optimistic UI**: Real-time feedback for message delivery and conversation management.
- **Token Management**: Efficient handling of AI tokens for cost-effective performance.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **AI Engine** | Google Generative AI (@google/generative-ai) |
| **Utilities** | Lucide React, Radix UI, Class Variance Authority |
| **Testing** | Vitest, JSDOM, React Testing Library |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- A Google Gemini API Key

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd ChatBotUsingGemini2025
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start chatting!

---

## 🏗️ Project Structure

```text
├── app/                  # Next.js App Router & Server Components
│   ├── components/       # Reusable UI Architecture
│   └── globals.css       # Design System & Tokens
├── lib/                  # Core Business Logic & AI Tools
│   ├── gemini/           # Gemini API Integration
│   └── workers/          # Background processing (Tokenization)
├── hooks/                # Custom React Hooks for Chat Logic
└── public/               # Static Assets & Icons
```

---

## 🧪 Testing

The project uses **Vitest** for unit and integration testing.

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui
```

---

## 🛡️ Best Practices & Architecture
This project adheres to the highest standards of modern web development:
- **Component Colocation**: Keeps logic and styles close to where they are used.
- **Hydration Safety**: Engineered to prevent common Next.js hydration pitfalls.
- **Performance Optimized**: Leverages Next.js Turbopack for lightning-fast development iterations.
