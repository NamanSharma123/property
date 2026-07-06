# Properly - Property Management System

**This Github Repository is for the Properly Property Management System(OZFirstChoice). This Codebase is the property of OZFirstChoice and is protected by copyright law. The Developers of this codebase are not responsible for any damage or loss of data that may occur as a result of using this codebase.They are not liable regarding any security issues or any other issues that may occur as a result of using this codebase for furthur development and Production.**


Properly is a comprehensive property management system designed to help landlords and property managers track properties, tenants, transactions, and expenses. It features advanced document parsing for automated data entry.

## 🚀 Project Structure

- **`/backend`**: Node.js Express API with SQL integration.
- **`/frontend`**: Next.js 15 application with a modern, responsive dashboard.

## 🛠️ Tech Stack

### Backend
- **Framework**: nodejs
- **Database**: SQL 
- **OCR/Parsing**:  (Images),  (PDFs)
- **Auth**: Argon2 password hashing
- **Middleware**: Helmet, CORS, Morgan

### Frontend
- **Framework**: Next.js 15 
- **Styling**: Tailwind CSS
- **Components**: Radix UI 
- **Icons**: Lucide React


## INSTALL NODE JS

## ✨ Key Features

- **Dashboard**: Real-time portfolio overview and financial statistics.
- **Property Management**: Track residential and commercial properties.
- **Tenant Tracking**: Manage leases, occupancy, and rent.
- **Smart Extraction**: Automatic transaction detection from PDFs and images using regex and OCR.
- **Bank Sync UI**: Manage connected bank accounts for transaction importing.
- **Support Center**: Integrated ticketing system for property issues.
- **Insights**: Trusted Advisor logic for portfolio optimization.

## 🚦 Getting Started

### Prerequisites
- Node.js 
### Backend Setup
1. Navigate to `/backend`
2. Install dependencies: `npm install`
3. Start development server: `npm start`
### Frontend Setup
1. Navigate to `/frontend`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

## 🔑 Demo Access
The system initializes with a default demo user:
- **Email**: `demo@example.com`
- **Password**: `password123`

## 📝 Important Notes
- **Parsing**: The system uses a deterministic regex-based parsing engine for document extraction.
 
