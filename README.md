# Assay Plate Designer

A comprehensive Next.js application for designing and managing laboratory assay plates with integrated project management and status monitoring.

## Features

- **Project Management**: Create, edit, and organize research projects
- **Plate Design**: Design 384-well plates with custom layouts and sample tracking
- **Status Monitoring**: Track plate progress through draft, active, completed, and archived states
- **User Authentication**: Secure login and user management with Clerk
- **Analytics Dashboard**: Visual insights into plate status distribution and timeline

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Database**: Vercel Postgres
- **Charts**: Recharts
- **UI Components**: Custom components with shadcn/ui styling

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Clerk account for authentication
- Vercel Postgres database

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Configure your Clerk authentication keys
   - Set up your Vercel Postgres connection

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Setup

#### Clerk Authentication

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your publishable and secret keys to `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### Database Setup

Set up your Vercel Postgres database and add the connection details to `.env.local`. The database schema is defined in `schema.sql`.

## Project Structure

- `/src/app/` - Next.js app router pages and API routes
- `/src/components/` - React components
- `/src/lib/` - Utility functions and services
- `/src/contexts/` - React context providers
- `/public/` - Static assets

## Key Components

- **Dashboard**: Main interface with analytics and navigation
- **AssayPlateManager**: Project and plate management interface  
- **AssayPlateDesigner**: 384-well plate design tool
- **DataContext**: Global state management for projects and plates

## API Routes

- `/api/projects/` - Project CRUD operations
- `/api/plates/` - Plate management and duplication

## Deployment

Deploy easily on [Vercel](https://vercel.com/new):

1. Connect your repository
2. Set environment variables in Vercel dashboard
3. Deploy

For other platforms, build the application:

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Add your license information here]
