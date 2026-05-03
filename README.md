# Our Stationery - Business Manager

A full-featured business management application for stationery businesses, built with vanilla JavaScript and Supabase for real-time data synchronization.

## Features

- 📦 **Inventory Management** - Track stock levels, costs, and reorder points
- 💰 **Capital & Equity Tracking** - Monitor owner contributions and drawings
- 💵 **Income Statement** - Record monthly revenue and expenses
- ⚖️ **Balance Sheet** - View assets, liabilities, and equity
- 📊 **Dashboard** - Real-time business metrics and KPIs
- 🔄 **Real-time Sync** - Changes sync automatically across devices
- 📱 **Mobile Optimized** - Bottom navigation and responsive design
- 🔐 **User Authentication** - Secure login and multi-user support
- ☁️ **Cloud Storage** - Data stored securely in Supabase

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Build Tool**: Vite
- **Deployment**: Vercel
- **Authentication**: Supabase Auth

## Prerequisites

Before you begin, ensure you have:

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account ([Create one here](https://supabase.com))
- A Vercel account ([Create one here](https://vercel.com))
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ourstationery-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in your project details
4. Wait for the project to be created

#### Run the Database Schema

1. In your Supabase project, go to the **SQL Editor**
2. Open the `supabase-schema.sql` file from this repository
3. Copy and paste the entire contents into the SQL Editor
4. Click "Run" to execute the schema

This will create all necessary tables, indexes, and Row Level Security policies.

#### Get Your Supabase Credentials

1. Go to Project Settings → API
2. Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
3. Copy your **anon/public key** (starts with `eyJ...`)

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run Locally

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Add environment variables:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

5. Deploy to production:
```bash
vercel --prod
```

### Option 2: Deploy via GitHub + Vercel Dashboard

1. **Push to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Connect to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure the project:
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

3. **Add Environment Variables:**
   - In the Vercel project settings, go to "Environment Variables"
   - Add:
     - `VITE_SUPABASE_URL` = your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app
   - Your app will be live at `https://your-project.vercel.app`

### Automatic Deployments

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to `main` branch
- Create preview deployments for pull requests
- Show build logs and deployment status

## Project Structure

```
ourstationery-app/
├── src/
│   ├── lib/
│   │   ├── supabase.js      # Supabase client initialization
│   │   └── database.js      # Database operations & real-time
│   └── main.js              # Main application logic
├── index.html               # Main HTML file
├── vite.config.js          # Vite configuration
├── vercel.json             # Vercel deployment config
├── package.json            # Dependencies
├── supabase-schema.sql     # Database schema
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Database Schema

The application uses the following tables:

- **inventory** - Product inventory with quantities and costs
- **capital** - Owner capital and equity information
- **income** - Monthly revenue and expenses (12 records per user)
- **categories** - Custom inventory categories

All tables have:
- Row Level Security (RLS) enabled
- User-specific data isolation
- Real-time subscriptions enabled
- Automatic `updated_at` timestamps

## Features in Detail

### Real-time Synchronization

Changes made by one user are instantly reflected across all their devices:
- Inventory updates
- Capital modifications
- Income changes
- Category additions/deletions

### Mobile-Optimized Design

- Bottom navigation bar for easy thumb access
- Responsive tables with horizontal scrolling
- Touch-friendly buttons (44px minimum)
- Optimized for screens 320px and up

### Security

- Row Level Security ensures users only see their own data
- Supabase Auth handles authentication
- Environment variables protect API keys
- HTTPS enforced in production

## Usage

### First Time Setup

1. Sign up for an account
2. Log in with your credentials
3. Start adding inventory items
4. Set up your capital structure
5. Record monthly income and expenses

### Daily Operations

- **Add Inventory**: Click "Add Item" in the Inventory tab
- **Update Stock**: Edit quantities directly in the table
- **Record Income**: Click "Edit Income Data" and select the month
- **View Reports**: Check the Dashboard and Balance Sheet tabs

## Troubleshooting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Not Working

- Ensure `.env` file is in the root directory
- Restart the dev server after changing `.env`
- Vercel: Check environment variables are set in project settings

### Supabase Connection Issues

- Verify your Supabase URL and key are correct
- Check that RLS policies are properly set up
- Ensure tables exist by running the schema SQL

### Real-time Not Working

- Verify realtime is enabled for your tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE capital;
ALTER PUBLICATION supabase_realtime ADD TABLE income;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
```

## Development

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for your business needs.

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Open an issue on GitHub
- Check Supabase documentation: https://supabase.com/docs

## Roadmap

- [ ] Export to PDF reports
- [ ] Multi-currency support
- [ ] Invoice generation
- [ ] Chart visualizations
- [ ] Email notifications
- [ ] Mobile app (React Native)

---

Built with ❤️ using Supabase and Vercel
